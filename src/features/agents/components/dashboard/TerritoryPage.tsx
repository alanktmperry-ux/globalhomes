import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Plus, Trash2, Loader2, Search, Phone, Mail, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { autocomplete, getPlaceDetails, loadGoogleMapsScript } from '@/shared/lib/googleMapsService';
import DashboardHeader from './DashboardHeader';

interface AgentLocation {
  id?: string;
  agent_id?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  lat: number;
  lng: number;
}

const emptyLocation: Omit<AgentLocation, 'id' | 'agent_id'> = {
  name: '', address: '', phone: '', email: '', lat: 0, lng: 0,
};

const TerritoryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [locations, setLocations] = useState<AgentLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);

  // Add-form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyLocation);
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Load agent + locations
  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data: agent } = await supabase
        .from('agents').select('id').eq('user_id', user.id).maybeSingle();
      if (!agent) { setLoading(false); return; }
      setAgentId(agent.id);

      const { data: locs } = await supabase
        .from('agent_locations').select('*').eq('agent_id', agent.id).order('created_at');
      setLocations((locs as AgentLocation[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initialise map once
  useEffect(() => {
    if (!mapContainerRef.current || mapReady) return;
    loadGoogleMapsScript().then(() => {
      if (!mapContainerRef.current) return;
      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 25, lng: 55 },
        zoom: 3,
        mapId: 'territory-map',
        disableDefaultUI: true,
        zoomControl: true,
      });
      mapRef.current = map;
      setMapReady(true);
    }).catch(console.error);
  }, [mapContainerRef.current]);

  // Sync markers to locations
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    // Clear old markers
    markersRef.current.forEach(m => (m.map = null));
    markersRef.current = [];

    if (locations.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    locations.forEach(loc => {
      const pos = { lat: loc.lat, lng: loc.lng };
      bounds.extend(pos);

      const pin = document.createElement('div');
      pin.className = 'w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg text-primary-foreground text-xs font-bold';
      pin.textContent = loc.name.charAt(0).toUpperCase();

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: pos,
        title: loc.name,
        content: pin,
      });
      markersRef.current.push(marker);
    });

    mapRef.current.fitBounds(bounds, 60);
    if (locations.length === 1) mapRef.current.setZoom(14);
  }, [locations, mapReady]);

  // Address autocomplete with debounce
  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await autocomplete(val);
      setSuggestions(results);
      setSearching(false);
    }, 350);
  }, []);

  const handleSelectPlace = async (place: { description: string; place_id: string }) => {
    setSuggestions([]);
    setSearchQuery(place.description);
    setSearching(true);
    const details = await getPlaceDetails(place.place_id);
    setSearching(false);
    if (details) {
      setForm(prev => ({ ...prev, address: details.address, lat: details.lat, lng: details.lng }));
      // Pan map to selection
      if (mapRef.current) {
        mapRef.current.panTo({ lat: details.lat, lng: details.lng });
        mapRef.current.setZoom(14);
      }
    }
  };

  const handleSave = async () => {
    if (!agentId) return;
    if (!form.name.trim() || !form.address.trim() || form.lat === 0) {
      toast({ title: 'Missing info', description: 'Please search and select an address, and give the location a name.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('agent_locations').insert({
        agent_id: agentId,
        name: form.name,
        address: form.address,
        phone: form.phone || null,
        email: form.email || null,
        lat: form.lat,
        lng: form.lng,
      } as any).select().single();
      if (error) throw error;
      setLocations(prev => [...prev, data as AgentLocation]);
      setForm(emptyLocation);
      setSearchQuery('');
      setShowForm(false);
      toast({ title: 'Location added' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('agent_locations').delete().eq('id', id);
      if (error) throw error;
      setLocations(prev => prev.filter(l => l.id !== id));
      toast({ title: 'Location removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  }

  return (
    <div>
      <DashboardHeader title="Territory & Locations" subtitle="Manage your agency office locations" />
      <div className="p-4 sm:p-6 max-w-5xl space-y-6">
        {/* Map */}
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div ref={mapContainerRef} className="w-full h-[320px] sm:h-[400px]" />
        </div>

        {/* Location Cards */}
        {locations.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            {locations.map(loc => (
              <div key={loc.id} className="bg-card border border-border rounded-xl p-4 space-y-2 relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-destructive"
                  onClick={() => loc.id && handleDelete(loc.id)}
                >
                  <Trash2 size={14} />
                </Button>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-sm text-foreground">{loc.name}</h4>
                    <p className="text-xs text-muted-foreground flex items-start gap-1 mt-0.5">
                      <MapPin size={11} className="mt-0.5 shrink-0" /> {loc.address}
                    </p>
                  </div>
                </div>
                {(loc.phone || loc.email) && (
                  <div className="flex flex-wrap gap-3 pl-12 text-xs text-muted-foreground">
                    {loc.phone && <span className="flex items-center gap-1"><Phone size={11} /> {loc.phone}</span>}
                    {loc.email && <span className="flex items-center gap-1"><Mail size={11} /> {loc.email}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Location */}
        {!showForm ? (
          <Button variant="outline" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Add Location
          </Button>
        ) : (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-display text-sm font-bold text-foreground">New Location</h3>

            {/* Address Search */}
            <div className="space-y-1.5 relative">
              <Label className="text-xs">Search Address</Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="Type an address to search..."
                  className="pl-9"
                />
                {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </div>
              {suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map(s => (
                    <button
                      key={s.place_id}
                      onClick={() => handleSelectPlace(s)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-start gap-2"
                    >
                      <MapPin size={13} className="mt-0.5 text-muted-foreground shrink-0" />
                      <span className="text-foreground">{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {form.address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin size={11} /> {form.address}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Location Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Dubai Marina Office"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+971 ..."
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="office@example.com"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Save Location
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setForm(emptyLocation); setSearchQuery(''); setSuggestions([]); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerritoryPage;

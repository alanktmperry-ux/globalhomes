import { Badge } from '@/components/ui/badge';
import type { PropertyRow } from '@/features/agents/types/listing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Calendar, Clock, Plus, Trash2, GraduationCap } from 'lucide-react';
import ListingCompleteness from './ListingCompleteness';

const FEATURE_OPTIONS = [
  'Air Conditioning', 'Heating', 'Pool', 'Spa', 'Garage', 'Built-in Wardrobes',
  'Dishwasher', 'Balcony', 'Courtyard', 'Garden', 'Solar Panels', 'NBN Ready',
  'Floorboards', 'Ensuite', 'Study', 'Outdoor Entertaining', 'Gym', 'Lift',
  'Intercom', 'Pet Friendly', 'Furnished',
];

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });

interface InspectionSlot {
  date: string;
  start: string;
  end: string;
}

interface Props {
  listing: PropertyRow;
  onUpdate: (updates: Partial<PropertyRow>) => void;
}

const ListingDetailsTab = ({ listing, onUpdate }: Props) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: listing.title || '',
    property_type: listing.property_type || 'House',
    beds: listing.beds || 0,
    baths: listing.baths || 0,
    parking: listing.parking || 0,
    sqm: listing.sqm || 0,
    land_size: listing.land_size || '',
    agency_authority: listing.agency_authority || 'exclusive',
    status: listing.status || 'whisper',
    description: listing.description || '',
    features: (listing.features || []) as string[],
  });

  const [schoolZoneTop, setSchoolZoneTop] = useState<boolean>(Boolean((listing as any).school_zone_top));
  const [schoolZoneName, setSchoolZoneName] = useState<string>((listing as any).school_zone_name || '');
  const [savingSchoolZone, setSavingSchoolZone] = useState(false);

  // Inspection times management
  const inspectionTimes: InspectionSlot[] = (listing.inspection_times as unknown as InspectionSlot[]) || [];
  const [newSlot, setNewSlot] = useState<InspectionSlot>({ date: '', start: '10:00', end: '10:30' });
  const [showAddSlot, setShowAddSlot] = useState(false);

  const handleSave = () => {
    onUpdate({
      ...form,
      land_size: form.land_size ? Number(form.land_size) : null,
      school_zone_top: schoolZoneTop,
      school_zone_name: schoolZoneTop ? (schoolZoneName.trim() || null) : null,
    } as Partial<PropertyRow>);
    setEditing(false);
  };

  const handleSaveSchoolZone = async () => {
    setSavingSchoolZone(true);
    await onUpdate({
      school_zone_top: schoolZoneTop,
      school_zone_name: schoolZoneTop ? (schoolZoneName.trim() || null) : null,
    } as Partial<PropertyRow>);
    setSavingSchoolZone(false);
  };

  const toggleFeature = (f: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(f)
        ? prev.features.filter(x => x !== f)
        : [...prev.features, f],
    }));
  };

  const handleAddInspection = () => {
    if (!newSlot.date || !newSlot.start || !newSlot.end) return;
    if (newSlot.start >= newSlot.end) return;

    const updated = [...inspectionTimes, { ...newSlot }].sort((a, b) =>
      `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)
    );
    onUpdate({ inspection_times: updated as unknown as PropertyRow['inspection_times'] });
    setNewSlot({ date: '', start: '10:00', end: '10:30' });
    setShowAddSlot(false);
  };

  const handleRemoveInspection = (index: number) => {
    const updated = inspectionTimes.filter((_, i) => i !== index);
    onUpdate({ inspection_times: updated as unknown as PropertyRow['inspection_times'] });
  };

  return (
    <div className="space-y-6">
      <ListingCompleteness listing={listing} />

      {/* Hero image */}
      {listing.image_url && (
        <img src={listing.image_url} alt="" className="w-full h-48 object-cover rounded-xl" />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">{listing.title}</h2>
          <p className="text-sm text-muted-foreground">{listing.address}</p>
          <p className="text-lg font-display font-bold text-primary mt-1">{listing.price_formatted || AUD.format(listing.price)}</p>
          {listing.updated_at && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Last updated {new Date(listing.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(listing.updated_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <Button size="sm" variant={editing ? 'default' : 'outline'} onClick={() => editing ? handleSave() : setEditing(true)}>
          {editing ? 'Save' : 'Edit Details'}
        </Button>
      </div>

      {editing ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-card border border-border rounded-xl p-4">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Property Type</Label>
            <Select value={form.property_type} onValueChange={v => setForm(f => ({...f, property_type: v}))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['House', 'Apartment', 'Townhouse', 'Land', 'Commercial', 'Rural'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Agency Authority</Label>
            <Select value={form.agency_authority} onValueChange={v => setForm(f => ({...f, agency_authority: v}))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exclusive">Exclusive</SelectItem>
                <SelectItem value="sole">Sole Agency</SelectItem>
                <SelectItem value="open">Open Listing</SelectItem>
                <SelectItem value="auction">Auction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Beds</Label>
            <Input type="number" value={form.beds} onChange={e => setForm(f => ({...f, beds: Number(e.target.value)}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Baths</Label>
            <Input type="number" value={form.baths} onChange={e => setForm(f => ({...f, baths: Number(e.target.value)}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Parking</Label>
            <Input type="number" value={form.parking} onChange={e => setForm(f => ({...f, parking: Number(e.target.value)}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Floor Area (sqm)</Label>
            <Input type="number" value={form.sqm} onChange={e => setForm(f => ({...f, sqm: Number(e.target.value)}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Land Size (sqm)</Label>
            <Input type="number" value={form.land_size} onChange={e => setForm(f => ({...f, land_size: e.target.value}))} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending (Draft)</SelectItem>
                <SelectItem value="whisper">Whisper</SelectItem>
                <SelectItem value="coming-soon">Coming Soon</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 md:col-span-3">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={5}
              className="text-sm"
              placeholder="Describe the property — highlights, location, lifestyle..."
            />
          </div>
          <div className="col-span-2 md:col-span-3">
            <Label className="text-xs mb-2 block">Features</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FEATURE_OPTIONS.map(f => (
                <label key={f} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={form.features.includes(f)}
                    onCheckedChange={() => toggleFeature(f)}
                  />
                  <span>{f}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Type', value: listing.property_type || 'House' },
            { label: 'Authority', value: (listing.agency_authority || 'exclusive').replace(/^\w/, (c: string) => c.toUpperCase()) },
            { label: 'Beds', value: listing.beds },
            { label: 'Baths', value: listing.baths },
            { label: 'Parking', value: listing.parking },
            { label: 'Floor Area', value: `${listing.sqm} sqm` },
            { label: 'Land Size', value: listing.land_size ? `${listing.land_size} sqm` : '—' },
            { label: 'Status', value: listing.status },
          ].map((item) => (
            <div key={item.label} className="bg-card border border-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
              <p className="text-sm font-semibold mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Inspection Times Management */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            Inspection / Open Home Times
          </h3>
          <Button size="sm" variant="outline" onClick={() => setShowAddSlot(!showAddSlot)} className="gap-1.5 text-xs h-8">
            <Plus size={14} />
            Add Time
          </Button>
        </div>

        {/* Add new slot form */}
        {showAddSlot && (
          <div className="mb-4 p-3 rounded-lg bg-secondary border border-border space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={newSlot.date}
                  onChange={e => setNewSlot(s => ({ ...s, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Start</Label>
                <Input
                  type="time"
                  value={newSlot.start}
                  onChange={e => setNewSlot(s => ({ ...s, start: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">End</Label>
                <Input
                  type="time"
                  value={newSlot.end}
                  onChange={e => setNewSlot(s => ({ ...s, end: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs" onClick={handleAddInspection} disabled={!newSlot.date || !newSlot.start || !newSlot.end}>
                Save Inspection
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowAddSlot(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing slots */}
        {inspectionTimes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No inspection times scheduled. Add times to let buyers book viewings.
          </p>
        ) : (
          <div className="space-y-2">
            {inspectionTimes.map((slot, i) => {
              const dateObj = new Date(slot.date);
              const dayStr = dateObj.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
              const isPast = new Date(`${slot.date}T${slot.end}`) < new Date();
              return (
                <div
                  key={`${slot.date}-${slot.start}-${i}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isPast ? 'border-border bg-muted/30 opacity-60' : 'border-border bg-secondary'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{dayStr}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> {slot.start} – {slot.end}
                      {isPast && <span className="ml-1 text-destructive">(Past)</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveInspection(i)}
                    className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {listing.description && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-2">Description</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{listing.description}</p>
        </div>
      )}

      {listing.features?.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-2">Features</h3>
          <div className="flex flex-wrap gap-1.5">
            {listing.features.map((f: string) => (
              <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingDetailsTab;

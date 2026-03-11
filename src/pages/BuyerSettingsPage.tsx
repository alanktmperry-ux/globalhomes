import { useState, useEffect, useRef } from 'react';
import { User, Bell, MapPin, DollarSign, Camera, Loader2, ArrowLeft, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';

const PROPERTY_TYPES = ['House', 'Apartment', 'Townhouse', 'Land', 'Villa', 'Unit'];

const BuyerSettingsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [preferredBeds, setPreferredBeds] = useState('');
  const [preferredBaths, setPreferredBaths] = useState('');
  const [preferredLocations, setPreferredLocations] = useState('');
  const [preferredPropertyTypes, setPreferredPropertyTypes] = useState<string[]>([]);

  // Notification preferences (local state, persisted via localStorage)
  const [notifNewListings, setNotifNewListings] = useState(true);
  const [notifPriceDrops, setNotifPriceDrops] = useState(true);
  const [notifSavedUpdates, setNotifSavedUpdates] = useState(true);
  const [notifWeeklyDigest, setNotifWeeklyDigest] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Load profile + preferences in parallel
      const [profileRes, prefsRes, buyerRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('user_preferences').select('*').eq('user_id', user.id).single(),
        supabase.from('buyer_profiles').select('*').eq('user_id', user.id).single(),
      ]);

      if (profileRes.data) {
        setAvatarUrl(profileRes.data.avatar_url);
        setDisplayName(profileRes.data.display_name || '');
        setPhone(profileRes.data.phone || '');
        setPreferredLanguage(profileRes.data.preferred_language || 'en');
      }

      if (prefsRes.data) {
        setBudgetMin(prefsRes.data.budget_min?.toString() || '');
        setBudgetMax(prefsRes.data.budget_max?.toString() || '');
        setPreferredBeds(prefsRes.data.preferred_beds?.toString() || '');
        setPreferredBaths(prefsRes.data.preferred_baths?.toString() || '');
        setPreferredLocations(prefsRes.data.preferred_locations?.join(', ') || '');
      }

      if (buyerRes.data) {
        setPreferredPropertyTypes(buyerRes.data.preferred_property_types || []);
      }

      // Load notification prefs from localStorage
      try {
        const notifs = JSON.parse(localStorage.getItem('gh-notif-prefs') || '{}');
        if (notifs.newListings !== undefined) setNotifNewListings(notifs.newListings);
        if (notifs.priceDrops !== undefined) setNotifPriceDrops(notifs.priceDrops);
        if (notifs.savedUpdates !== undefined) setNotifSavedUpdates(notifs.savedUpdates);
        if (notifs.weeklyDigest !== undefined) setNotifWeeklyDigest(notifs.weeklyDigest);
      } catch {}

      setLoading(false);
    };
    load();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB.', variant: 'destructive' });
      return;
    }
    setAvatarLoading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
      setAvatarUrl(publicUrl);
      toast({ title: 'Avatar updated' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Update profile
      await supabase.from('profiles').update({
        display_name: displayName,
        phone,
        preferred_language: preferredLanguage,
      }).eq('user_id', user.id);

      // Upsert preferences
      const locationsArr = preferredLocations
        .split(',')
        .map(l => l.trim())
        .filter(Boolean);

      const { data: existingPrefs } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const prefsPayload = {
        user_id: user.id,
        budget_min: budgetMin ? parseInt(budgetMin) : null,
        budget_max: budgetMax ? parseInt(budgetMax) : null,
        preferred_beds: preferredBeds ? parseInt(preferredBeds) : null,
        preferred_baths: preferredBaths ? parseInt(preferredBaths) : null,
        preferred_locations: locationsArr,
      };

      if (existingPrefs) {
        await supabase.from('user_preferences').update(prefsPayload).eq('user_id', user.id);
      } else {
        await supabase.from('user_preferences').insert(prefsPayload);
      }

      // Upsert buyer profile
      const { data: existingBuyer } = await supabase
        .from('buyer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const buyerPayload = {
        user_id: user.id,
        budget_min: budgetMin ? parseInt(budgetMin) : null,
        budget_max: budgetMax ? parseInt(budgetMax) : null,
        preferred_property_types: preferredPropertyTypes,
      };

      if (existingBuyer) {
        await supabase.from('buyer_profiles').update(buyerPayload).eq('user_id', user.id);
      } else {
        await supabase.from('buyer_profiles').insert(buyerPayload);
      }

      // Save notification prefs to localStorage
      localStorage.setItem('gh-notif-prefs', JSON.stringify({
        newListings: notifNewListings,
        priceDrops: notifPriceDrops,
        savedUpdates: notifSavedUpdates,
        weeklyDigest: notifWeeklyDigest,
      }));

      toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/profile')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Profile Section */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
            <User size={14} /> Your Profile
          </h3>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-border">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-primary" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
              >
                {avatarLoading ? <Loader2 size={18} className="text-background animate-spin" /> : <Camera size={18} className="text-background" />}
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Profile Photo</p>
              <p className="text-xs text-muted-foreground">Click to change your avatar</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Display Name</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+61 400 000 000" className="bg-secondary border-border" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Preferred Language</Label>
            <select
              value={preferredLanguage}
              onChange={e => setPreferredLanguage(e.target.value)}
              className="w-full mt-1 rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="zh">中文</option>
              <option value="ar">العربية</option>
              <option value="hi">हिंदी</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="pt">Português</option>
            </select>
          </div>
        </div>

        {/* Search Preferences */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
            <DollarSign size={14} /> Search Preferences
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Min Budget ($)</Label>
              <Input
                type="number"
                value={budgetMin}
                onChange={e => setBudgetMin(e.target.value)}
                placeholder="200,000"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="text-xs">Max Budget ($)</Label>
              <Input
                type="number"
                value={budgetMax}
                onChange={e => setBudgetMax(e.target.value)}
                placeholder="1,500,000"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="text-xs">Min Bedrooms</Label>
              <Input
                type="number"
                value={preferredBeds}
                onChange={e => setPreferredBeds(e.target.value)}
                placeholder="3"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="text-xs">Min Bathrooms</Label>
              <Input
                type="number"
                value={preferredBaths}
                onChange={e => setPreferredBaths(e.target.value)}
                placeholder="2"
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Preferred Locations</Label>
            <Input
              value={preferredLocations}
              onChange={e => setPreferredLocations(e.target.value)}
              placeholder="Melbourne, Sydney, Gold Coast"
              className="bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground mt-1">Separate locations with commas</p>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Property Types</Label>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPreferredPropertyTypes(prev =>
                    prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                  )}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    preferredPropertyTypes.includes(type)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
            <Bell size={14} /> Notifications
          </h3>
          {[
            { label: 'New listings in my area', desc: 'Get alerted when new properties match your preferences', value: notifNewListings, set: setNotifNewListings },
            { label: 'Price drops', desc: 'When saved properties reduce their asking price', value: notifPriceDrops, set: setNotifPriceDrops },
            { label: 'Saved property updates', desc: 'Status changes on properties you\'ve saved', value: notifSavedUpdates, set: setNotifSavedUpdates },
            { label: 'Weekly market digest', desc: 'Summary of new listings every Monday', value: notifWeeklyDigest, set: setNotifWeeklyDigest },
          ].map(n => (
            <div key={n.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch checked={n.value} onCheckedChange={n.set} />
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</> : 'Save Changes'}
        </Button>
      </main>

      <BottomNav />
    </div>
  );
};

export default BuyerSettingsPage;

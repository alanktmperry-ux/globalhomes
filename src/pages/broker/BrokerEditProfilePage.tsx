/**
 * BrokerEditProfilePage.tsx
 * Lets an approved broker update their own profile details:
 * name, company, tagline, languages, specialties, calendar URL, photo URL.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const LANGUAGE_OPTIONS = [
  'English', 'Mandarin', 'Vietnamese', 'Punjabi', 'Hindi', 'Cantonese',
  'Korean', 'Arabic', 'Tamil', 'Gujarati', 'Tagalog', 'Italian', 'Greek',
];

const SPECIALTY_OPTIONS = [
  'First Home Buyers', 'Investment Loans', 'Refinancing', 'Commercial',
  'Construction Loans', 'SMSF Lending', 'Low Doc Loans', 'Foreign Buyer Finance',
  'Bridging Finance', 'Debt Consolidation',
];

interface BrokerProfile {
  id: string;
  name: string;
  full_name: string | null;
  company: string | null;
  tagline: string | null;
  languages: string[] | null;
  specialties: string[] | null;
  calendar_url: string | null;
  photo_url: string | null;
  suburb: string | null;
  state: string | null;
}

export default function BrokerEditProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<BrokerProfile | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [tagline, setTagline] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('');
  const [calendarUrl, setCalendarUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/broker/login'); return; }

      const { data, error } = await supabase
        .from('brokers')
        .select('id, name, full_name, company, tagline, languages, specialties, calendar_url, photo_url, suburb, state')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (error || !data) {
        toast.error('Could not load your profile.');
        navigate('/broker/portal');
        return;
      }

      setProfile(data as BrokerProfile);
      setName(data.name || '');
      setFullName(data.full_name || '');
      setCompany(data.company || '');
      setTagline(data.tagline || '');
      setSuburb(data.suburb || '');
      setState(data.state || '');
      setCalendarUrl(data.calendar_url || '');
      setPhotoUrl(data.photo_url || '');
      setSelectedLanguages(data.languages || []);
      setSelectedSpecialties(data.specialties || []);

      setLoading(false);
    })();
  }, [navigate]);

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!name.trim()) { toast.error('Display name is required.'); return; }

    setSaving(true);
    const { error } = await supabase
      .from('brokers')
      .update({
        name: name.trim(),
        full_name: fullName.trim() || null,
        company: company.trim() || null,
        tagline: tagline.trim() || null,
        suburb: suburb.trim() || null,
        state: state.trim() || null,
        calendar_url: calendarUrl.trim() || null,
        photo_url: photoUrl.trim() || null,
        languages: selectedLanguages,
        specialties: selectedSpecialties.length > 0 ? selectedSpecialties : null,
      })
      .eq('id', profile.id);

    setSaving(false);

    if (error) {
      toast.error('Could not save profile: ' + error.message);
    } else {
      toast.success('Profile updated successfully.');
      navigate('/broker/portal');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[#1A2E4A] text-white px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/broker/portal')}
          className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Back to Portal
        </button>
        <span className="text-white font-bold text-lg ml-2">Edit Profile</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Basic Info */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground border-b pb-2">Basic Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display Name <span className="text-destructive">*</span></Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Raj Singh" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Legal Name</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="As on your ACL" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company">Company Name</Label>
            <Input id="company" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Singh Finance Pty Ltd" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline / Short Bio</Label>
            <Textarea
              id="tagline"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="e.g. Helping multicultural families secure their first home in Melbourne for 10+ years."
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="suburb">Primary Suburb</Label>
              <Input id="suburb" value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="e.g. Chadstone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={state} onChange={e => setState(e.target.value)} placeholder="e.g. VIC" maxLength={3} />
            </div>
          </div>
        </section>

        {/* Languages */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground border-b pb-2">Languages Spoken</h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selectedLanguages.includes(lang)
                    ? 'bg-[#1A2E4A] text-white border-[#1A2E4A]'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
          {selectedLanguages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedLanguages.map(l => (
                <Badge key={l} variant="secondary" className="gap-1">
                  {l}
                  <button onClick={() => toggleLanguage(l)} className="hover:text-destructive">
                    <X size={10} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </section>

        {/* Specialties */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground border-b pb-2">Specialties</h2>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map(spec => (
              <button
                key={spec}
                type="button"
                onClick={() => toggleSpecialty(spec)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selectedSpecialties.includes(spec)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-background text-muted-foreground border-border hover:border-blue-400'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </section>

        {/* Booking & Photo */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground border-b pb-2">Booking & Profile Photo</h2>

          <div className="space-y-1.5">
            <Label htmlFor="calendarUrl">Booking / Calendar URL</Label>
            <Input
              id="calendarUrl"
              value={calendarUrl}
              onChange={e => setCalendarUrl(e.target.value)}
              placeholder="https://calendly.com/yourname or any booking link"
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              This is the link buyers click when they want to book an appointment with you. Calendly, Cal.com, or any booking page URL.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="photoUrl">Profile Photo URL</Label>
            <Input
              id="photoUrl"
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
            {photoUrl && (
              <img src={photoUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover border mt-2" />
            )}
          </div>
        </section>

        {/* Save */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-[#1A2E4A] hover:bg-[#243d5f] text-white"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : 'Save Profile'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/broker/portal')}>
            Cancel
          </Button>
        </div>

      </div>
    </div>
  );
}

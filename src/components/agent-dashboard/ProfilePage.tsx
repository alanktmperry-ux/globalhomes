import { useState, useEffect, useRef } from 'react';
import {
  User, Building2, Mail, Phone, Globe, Camera, Loader2, Shield, Star,
  CheckCircle2, Clock, Upload, Trash2, Plus, Briefcase, MapPin, Languages,
  Instagram, Linkedin, Facebook, Twitter, FileText, Award,
} from 'lucide-react';
import ServiceAreaMapPicker from './ServiceAreaMapPicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import DashboardHeader from './DashboardHeader';

interface AgentData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  agency: string | null;
  agency_id: string | null;
  avatar_url: string | null;
  user_id: string;
  license_number: string | null;
  office_address: string | null;
  years_experience: number | null;
  specialization: string | null;
  bio: string | null;
  website_url: string | null;
  social_links: Record<string, string> | null;
  languages_spoken: string[] | null;
  service_areas: string[] | null;
  profile_photo_url: string | null;
  title_position: string | null;
  verification_badge_level: string | null;
  is_approved: boolean | null;
  is_subscribed: boolean;
  created_at: string;
}

interface Credential {
  id: string;
  document_type: string;
  document_url: string;
  verified_status: string;
  uploaded_at: string;
  verified_at: string | null;
}

const ProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [newArea, setNewArea] = useState('');
  const [newLang, setNewLang] = useState('');
  const [docType, setDocType] = useState('license');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    agency: '',
    license_number: '',
    office_address: '',
    years_experience: 0,
    specialization: 'Residential',
    bio: '',
    website_url: '',
    title_position: 'Agent',
    social_instagram: '',
    social_linkedin: '',
    social_facebook: '',
    social_twitter: '',
  });

  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;

      setAgent(data as unknown as AgentData);
      const social = (data.social_links as Record<string, string>) || {};
      setForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        agency: data.agency || '',
        license_number: data.license_number || '',
        office_address: data.office_address || '',
        years_experience: data.years_experience || 0,
        specialization: data.specialization || 'Residential',
        bio: (data as any).bio || '',
        website_url: (data as any).website_url || '',
        title_position: (data as any).title_position || 'Agent',
        social_instagram: social.instagram || '',
        social_linkedin: social.linkedin || '',
        social_facebook: social.facebook || '',
        social_twitter: social.twitter || '',
      });
      setServiceAreas((data as any).service_areas || []);
      setLanguages((data as any).languages_spoken || []);

      // Load credentials
      const { data: creds } = await supabase
        .from('agent_credentials')
        .select('*')
        .eq('agent_id', data.id)
        .order('uploaded_at', { ascending: false });
      setCredentials((creds as unknown as Credential[]) || []);
    } catch (err) {
      console.error('Error loading agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agent) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB.', variant: 'destructive' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${agent.user_id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('agents').update({ avatar_url: publicUrl }).eq('id', agent.id);
      setAgent(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast({ title: 'Photo updated' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agent || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10MB.', variant: 'destructive' });
      return;
    }

    setUploadingDoc(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('agent-documents').upload(filePath, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('agent-documents').getPublicUrl(filePath);

      const { error: insertErr } = await supabase.from('agent_credentials').insert({
        agent_id: agent.id,
        document_type: docType,
        document_url: publicUrl,
      });
      if (insertErr) throw insertErr;

      toast({ title: 'Document uploaded' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const deleteCredential = async (id: string) => {
    await supabase.from('agent_credentials').delete().eq('id', id);
    setCredentials(prev => prev.filter(c => c.id !== id));
    toast({ title: 'Document removed' });
  };

  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agents')
        .update({
          name: form.name,
          email: form.email,
          phone: form.phone,
          agency: form.agency,
          license_number: form.license_number,
          office_address: form.office_address,
          years_experience: form.years_experience,
          specialization: form.specialization,
          bio: form.bio,
          website_url: form.website_url,
          title_position: form.title_position,
          social_links: {
            instagram: form.social_instagram,
            linkedin: form.social_linkedin,
            facebook: form.social_facebook,
            twitter: form.social_twitter,
          },
          languages_spoken: languages,
          service_areas: serviceAreas,
        } as any)
        .eq('id', agent.id);
      if (error) throw error;
      toast({ title: 'Profile saved', description: 'All changes have been saved successfully.' });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addArea = () => {
    if (newArea.trim() && !serviceAreas.includes(newArea.trim())) {
      setServiceAreas(prev => [...prev, newArea.trim()]);
      setNewArea('');
    }
  };

  const addLanguage = () => {
    if (newLang.trim() && !languages.includes(newLang.trim())) {
      setLanguages(prev => [...prev, newLang.trim()]);
      setNewLang('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (!agent) {
    return <div className="text-center py-20 text-muted-foreground">Agent profile not found.</div>;
  }

  const verificationItems = [
    { label: 'Email Verified', icon: Mail, done: !!agent.email, date: agent.created_at },
    { label: 'Phone Verified', icon: Phone, done: !!agent.phone, date: agent.created_at },
    { label: 'License Verified', icon: FileText, done: agent.is_approved || false, date: null },
    { label: 'Premium Agent', icon: Star, done: agent.is_subscribed, date: null },
  ];

  return (
    <div>
      <DashboardHeader title="Agent Profile" subtitle="Manage your professional profile and credentials" />

      <div className="p-4 sm:p-6 max-w-4xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
          </TabsList>

          {/* ===== PROFILE TAB ===== */}
          <TabsContent value="profile" className="space-y-6">
            {/* Avatar + Basic */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                <User size={14} /> Personal Information
              </h3>
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-border">
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={28} className="text-primary" />
                    )}
                  </div>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {uploadingAvatar ? <Loader2 size={18} className="text-background animate-spin" /> : <Camera size={18} className="text-background" />}
                  </button>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{form.title_position} • {form.agency || 'Independent'}</p>
                  {agent.is_approved && (
                    <Badge className="mt-1 bg-success/20 text-success border-success/30 text-[10px]">
                      <CheckCircle2 size={10} className="mr-1" /> Verified Agent
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Full Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Title / Position</Label>
                  <Input value={form.title_position} onChange={e => setForm(f => ({ ...f, title_position: e.target.value }))} placeholder="Senior Agent, Owner, etc." />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label className="text-xs">Bio / Description</Label>
                <Textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell potential clients about yourself..."
                  rows={4}
                />
              </div>
            </div>

            {/* Agency Info */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                <Building2 size={14} /> Agency Information
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Agency Name</Label>
                  <Input value={form.agency} onChange={e => setForm(f => ({ ...f, agency: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">License Number</Label>
                  <Input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Office Address</Label>
                  <Input value={form.office_address} onChange={e => setForm(f => ({ ...f, office_address: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Years of Experience</Label>
                  <Input type="number" min={0} max={50} value={form.years_experience} onChange={e => setForm(f => ({ ...f, years_experience: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label className="text-xs">Specialization</Label>
                  <select
                    value={form.specialization}
                    onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {['Residential', 'Commercial', 'Land', 'Luxury', 'Rural', 'Industrial'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Website URL</Label>
                  <Input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://" />
                </div>
              </div>
            </div>

            {/* Languages */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                <Languages size={14} /> Languages Spoken
              </h3>
              <div className="flex flex-wrap gap-2">
                {languages.map(l => (
                  <Badge key={l} variant="secondary" className="gap-1">
                    {l}
                    <button onClick={() => setLanguages(prev => prev.filter(x => x !== l))} className="ml-0.5 hover:text-destructive">×</button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newLang} onChange={e => setNewLang(e.target.value)} placeholder="Add language" className="max-w-xs"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLanguage())} />
                <Button variant="outline" size="sm" onClick={addLanguage}><Plus size={14} /></Button>
              </div>
            </div>

            {/* Service Areas */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                <MapPin size={14} /> Service Areas
              </h3>
              <p className="text-xs text-muted-foreground">Search or click on the map to add your service areas.</p>
              <ServiceAreaMapPicker
                serviceAreas={serviceAreas}
                onAreasChange={setServiceAreas}
                maxAreas={10}
              />
            </div>

            {/* Social Links */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                <Globe size={14} /> Social Media
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Instagram size={16} className="text-muted-foreground shrink-0" />
                  <Input value={form.social_instagram} onChange={e => setForm(f => ({ ...f, social_instagram: e.target.value }))} placeholder="Instagram URL" />
                </div>
                <div className="flex items-center gap-2">
                  <Linkedin size={16} className="text-muted-foreground shrink-0" />
                  <Input value={form.social_linkedin} onChange={e => setForm(f => ({ ...f, social_linkedin: e.target.value }))} placeholder="LinkedIn URL" />
                </div>
                <div className="flex items-center gap-2">
                  <Facebook size={16} className="text-muted-foreground shrink-0" />
                  <Input value={form.social_facebook} onChange={e => setForm(f => ({ ...f, social_facebook: e.target.value }))} placeholder="Facebook URL" />
                </div>
                <div className="flex items-center gap-2">
                  <Twitter size={16} className="text-muted-foreground shrink-0" />
                  <Input value={form.social_twitter} onChange={e => setForm(f => ({ ...f, social_twitter: e.target.value }))} placeholder="X / Twitter URL" />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</> : 'Save All Changes'}
            </Button>
          </TabsContent>

          {/* ===== CREDENTIALS TAB ===== */}
          <TabsContent value="credentials" className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                <FileText size={14} /> Upload Document
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="license">License</option>
                  <option value="id">ID Verification</option>
                  <option value="insurance">Insurance Certificate</option>
                  <option value="tax">Tax Document</option>
                  <option value="other">Other</option>
                </select>
                <input ref={docInputRef} type="file" className="hidden" onChange={handleDocUpload} />
                <Button variant="outline" onClick={() => docInputRef.current?.click()} disabled={uploadingDoc}>
                  {uploadingDoc ? <><Loader2 size={14} className="animate-spin mr-2" /> Uploading...</> : <><Upload size={14} className="mr-2" /> Choose File</>}
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                <Award size={14} /> Uploaded Documents
              </h3>
              {credentials.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {credentials.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium capitalize">{c.document_type}</p>
                          <p className="text-xs text-muted-foreground">{new Date(c.uploaded_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={c.verified_status === 'approved' ? 'default' : c.verified_status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {c.verified_status === 'approved' && <CheckCircle2 size={10} className="mr-1" />}
                          {c.verified_status === 'pending' && <Clock size={10} className="mr-1" />}
                          {c.verified_status}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCredential(c.id)}>
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== VERIFICATION TAB ===== */}
          <TabsContent value="verification" className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5">
                <Shield size={14} /> Verification Status
              </h3>
              <div className="space-y-3">
                {verificationItems.map(v => (
                  <div key={v.label} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${v.done ? 'bg-success/20' : 'bg-muted'}`}>
                        <v.icon size={14} className={v.done ? 'text-success' : 'text-muted-foreground'} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{v.label}</p>
                        {v.done && v.date && (
                          <p className="text-[10px] text-muted-foreground">Since {new Date(v.date).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    {v.done ? (
                      <CheckCircle2 size={18} className="text-success" />
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        <Clock size={10} className="mr-1" /> Pending
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-display text-sm font-bold">How to get verified</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. <strong className="text-foreground">Email</strong> — Verify your email address during sign-up</p>
                <p>2. <strong className="text-foreground">Phone</strong> — Add and verify your phone number</p>
                <p>3. <strong className="text-foreground">License</strong> — Upload your real estate license in the Credentials tab. Our team will review it within 2 business days.</p>
                <p>4. <strong className="text-foreground">Premium</strong> — Subscribe to a Pro or Agency plan to unlock the Premium Agent badge.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;

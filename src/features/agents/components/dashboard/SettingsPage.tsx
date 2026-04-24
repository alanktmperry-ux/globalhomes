import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Mail, Phone, Shield, Bell, Globe, Camera, Loader2, Package, GitBranch } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import DashboardHeader from './DashboardHeader';
import SuppliersSettings from './SuppliersSettings';
import LeadUrgencySettings from './LeadUrgencySettings';
import PipelineStagesSettings from './PipelineStagesSettings';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface AgentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  agency: string;
  avatar_url: string | null;
  user_id: string;
}

const SettingsPage = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    const next = new URLSearchParams(searchParams);
    if (v === 'profile') next.delete('tab'); else next.set('tab', v);
    setSearchParams(next, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [agentData, setAgentData] = useState<AgentProfile | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    agency: ''
  });

  useEffect(() => {
    if (user) {
      loadAgentData();
    }
  }, [user]);

  const loadAgentData = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) { setLoading(false); return; }
      
      setAgentData(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        agency: data.agency || ''
      });
    } catch (err) {
      console.error('Error loading agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agentData) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file — Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large — Max file size is 5MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${agentData.user_id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('agents')
        .update({ avatar_url: publicUrl })
        .eq('id', agentData.id);
      if (updateError) throw updateError;

      setAgentData(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Avatar updated — Your profile photo has been uploaded.');
    } catch (err: unknown) {
      toast.error(`Upload failed — ${(getErrorMessage(err))}`);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!agentData) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agents')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          agency: formData.agency
        })
        .eq('id', agentData.id);
      
      if (error) throw error;
      
      toast.success('Profile updated — Your changes have been saved.');
      await loadAgentData(); // Refresh data
    } catch (err: unknown) {
      toast.error(`Error — ${(getErrorMessage(err))}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (!agentData) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Agent profile not found</p>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader title="Settings" subtitle="Manage your agent profile and preferences" />

      <div className="p-4 sm:p-6 max-w-2xl">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-secondary mb-6 gap-1 p-1">
            <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
            <TabsTrigger value="pipeline" className="text-xs gap-1.5">
              <GitBranch size={12} /> Pipeline
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs gap-1.5">
              <Package size={12} /> Suppliers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5"><User size={14} /> Agent Profile</h3>
              
              {/* Avatar Upload */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-border">
                    {agentData.avatar_url ? (
                      <img src={agentData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-primary" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {uploadingAvatar ? (
                      <Loader2 size={18} className="text-background animate-spin" />
                    ) : (
                      <Camera size={18} className="text-background" />
                    )}
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Profile Photo</p>
                  <p className="text-xs text-muted-foreground">Click to upload a new avatar</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Full Name</Label>
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-secondary border-border" 
                  />
                </div>
                <div>
                  <Label className="text-xs">Agency</Label>
                  <Input 
                    value={formData.agency}
                    onChange={(e) => setFormData(prev => ({ ...prev, agency: e.target.value }))}
                    className="bg-secondary border-border" 
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input 
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-secondary border-border" 
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input 
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-secondary border-border" 
                  />
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5"><Bell size={14} /> Notifications</h3>
              {[
                { label: 'New voice match alerts', desc: 'When a buyer voice search matches your listing', default: true },
                { label: 'Lead qualification updates', desc: 'When a lead provides pre-approval or contact info', default: true },
                { label: 'Network co-broke requests', desc: 'When another agent wants to bring a buyer', default: true },
                { label: 'Weekly analytics digest', desc: 'Performance summary every Monday', default: false },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch defaultChecked={n.default} />
                </div>
              ))}
            </div>

            {/* Lead urgency thresholds */}
            <LeadUrgencySettings />

            {/* Territory */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-display text-sm font-bold flex items-center gap-1.5"><Globe size={14} /> Territory</h3>
              <p className="text-xs text-muted-foreground">Your primary suburbs for voice lead matching</p>
              <div className="flex flex-wrap gap-1.5">
                {['Berwick', 'Narre Warren', 'Officer', 'Clyde North', 'Pakenham'].map((s) => (
                  <span key={s} className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">{s}</span>
                ))}
              </div>
              <Button variant="outline" size="sm" className="text-xs">Edit Suburbs</Button>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</> : 'Save Changes'}
            </Button>
          </TabsContent>

          <TabsContent value="suppliers">
            <SuppliersSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
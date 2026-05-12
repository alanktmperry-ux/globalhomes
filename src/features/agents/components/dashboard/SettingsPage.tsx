import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Mail, Phone, Shield, Bell, Globe, Camera, Loader2, Package, GitBranch, Languages, ShieldCheck } from 'lucide-react';
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
import MessageTemplatesSettings from './MessageTemplatesSettings';
import NotificationPreferencesSettings from './NotificationPreferencesSettings';
import { MFAManager } from '@/features/auth/components/MFAManager';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { useTranslation } from '@/shared/lib/i18n';

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
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0a0f1e] tracking-tight">Settings</h1>
        <p className="text-sm font-light text-[#6B7280] mt-1">Manage your agent profile and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList
          className="bg-white mb-6 gap-1 p-1 rounded-[10px] h-auto"
          style={{ border: '1px solid #E5E7EB' }}
        >
          <TabsTrigger
            value="profile"
            className="text-sm px-4 py-2 rounded-[8px] data-[state=active]:bg-[#EFF6FF] data-[state=active]:text-[#2563EB] data-[state=active]:font-semibold text-[#6B7280] font-medium"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="pipeline"
            className="text-sm px-4 py-2 rounded-[8px] gap-1.5 data-[state=active]:bg-[#EFF6FF] data-[state=active]:text-[#2563EB] data-[state=active]:font-semibold text-[#6B7280] font-medium"
          >
            <GitBranch size={14} /> Pipeline
          </TabsTrigger>
          <TabsTrigger
            value="suppliers"
            className="text-sm px-4 py-2 rounded-[8px] gap-1.5 data-[state=active]:bg-[#EFF6FF] data-[state=active]:text-[#2563EB] data-[state=active]:font-semibold text-[#6B7280] font-medium"
          >
            <Package size={14} /> Suppliers
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="text-sm px-4 py-2 rounded-[8px] gap-1.5 data-[state=active]:bg-[#EFF6FF] data-[state=active]:text-[#2563EB] data-[state=active]:font-semibold text-[#6B7280] font-medium"
          >
            <Languages size={14} /> Templates
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="text-sm px-4 py-2 rounded-[8px] gap-1.5 data-[state=active]:bg-[#EFF6FF] data-[state=active]:text-[#2563EB] data-[state=active]:font-semibold text-[#6B7280] font-medium"
          >
            <ShieldCheck size={14} /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile */}
          <div className="bg-white rounded-[12px] p-6" style={{ border: '1px solid #E5E7EB' }}>
            <div className="mb-5">
              <h3 className="text-base font-bold text-[#0a0f1e] flex items-center gap-2">
                <User size={16} /> Agent Profile
              </h3>
              <p className="text-xs text-[#6B7280] mt-1 font-light">
                Your public-facing identity for buyers and across the platform.
              </p>
            </div>

            {/* Avatar Upload */}
            <div className="flex items-center gap-5 mb-6">
              <div className="relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div
                  className="w-20 h-20 rounded-full overflow-hidden bg-[#EFF6FF] flex items-center justify-center"
                  style={{ border: '2px solid #FFFFFF', boxShadow: '0 0 0 1px #E5E7EB' }}
                >
                  {agentData.avatar_url ? (
                    <img src={agentData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#2563EB] font-bold text-xl">
                      {(agentData.name || '?').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  {uploadingAvatar ? (
                    <Loader2 size={20} className="text-white animate-spin" />
                  ) : (
                    <Camera size={20} className="text-white" />
                  )}
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0a0f1e]">Profile Photo</p>
                <p className="text-xs text-[#6B7280] mt-0.5 font-light">PNG, JPG up to 5MB. Click photo to upload.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-[#374151]">Full Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#374151]">Agency</Label>
                <Input
                  value={formData.agency}
                  onChange={(e) => setFormData(prev => ({ ...prev, agency: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#374151]">Email</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#374151]">Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Notifications — granular per-event preferences */}
          <NotificationPreferencesSettings />

          {/* Lead urgency thresholds */}
          <LeadUrgencySettings />

          {/* Territory */}
          <div className="bg-white rounded-[12px] p-6" style={{ border: '1px solid #E5E7EB' }}>
            <h3 className="text-base font-bold text-[#0a0f1e] flex items-center gap-2 mb-1">
              <Globe size={16} /> Territory
            </h3>
            <p className="text-xs text-[#6B7280] mb-4 font-light">
              Your primary suburbs for voice lead matching.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['Berwick', 'Narre Warren', 'Officer', 'Clyde North', 'Pakenham'].map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 bg-[#EFF6FF] text-[#1E40AF] text-xs font-semibold rounded-full"
                >
                  {s}
                </span>
              ))}
            </div>
            <button
              className="bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] font-semibold rounded-[10px] px-4 py-2 text-sm transition-all"
            >
              Edit Suburbs
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-[10px] px-4 py-3 text-sm font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save Changes'}
          </button>
        </TabsContent>

        <TabsContent value="pipeline">
          <PipelineStagesSettings />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersSettings />
        </TabsContent>

        <TabsContent value="templates">
          <MessageTemplatesSettings />
        </TabsContent>

        <TabsContent value="security">
          <MFAManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
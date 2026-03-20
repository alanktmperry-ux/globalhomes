import { useState, useEffect, useCallback, useRef } from 'react';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import UpgradeGate from '@/features/agents/components/shared/UpgradeGate';
import { Copy, Plus, Trash2, UserPlus, Building2, Shield, Users, RefreshCw, Loader2, Camera, Upload, LogIn, ArrowRight, Mail, MapPin, Eye, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface AgencyMember {
  id: string;
  user_id: string;
  role: string;
  access_level: string;
  joined_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
  agents?: { name: string; email: string | null; phone: string | null } | null;
}

interface InviteCode {
  id: string;
  code: string;
  role: string;
  max_uses: number | null;
  uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const roleBadgeClass: Record<string, string> = {
  principal: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  owner: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  admin: 'bg-primary/10 text-primary border-primary/20',
  agent: 'bg-secondary text-foreground border-border',
};

const accessBadgeClass: Record<string, string> = {
  full: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  read: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const TeamPage = () => {
  const { user } = useAuth();
  const { canAccessTeam, seatLimit, loading: subLoading } = useSubscription();
  const { toast } = useToast();

  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState('');
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const [agencyAddress, setAgencyAddress] = useState('');
  const [agencyEmail, setAgencyEmail] = useState('');
  const [agencyPhone, setAgencyPhone] = useState('');
  const [agencyDescription, setAgencyDescription] = useState('');
  const [myRole, setMyRole] = useState<string | null>(null);
  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [emailInviteDialogOpen, setEmailInviteDialogOpen] = useState(false);
  const [newInviteRole, setNewInviteRole] = useState<string>('agent');
  const [newInviteMaxUses, setNewInviteMaxUses] = useState('10');
  const [creating, setCreating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [editingBranding, setEditingBranding] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('agent');
  const [inviteAccessLevel, setInviteAccessLevel] = useState<string>('full');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Create agency form
  const [newAgencyName, setNewAgencyName] = useState('');
  const [newAgencyEmail, setNewAgencyEmail] = useState('');
  const [newAgencyPhone, setNewAgencyPhone] = useState('');
  const [newAgencyDescription, setNewAgencyDescription] = useState('');
  const [newAgencyAddress, setNewAgencyAddress] = useState('');
  const [creatingAgency, setCreatingAgency] = useState(false);
  const [newAgencyLogoFile, setNewAgencyLogoFile] = useState<File | null>(null);
  const [newAgencyLogoPreview, setNewAgencyLogoPreview] = useState<string | null>(null);
  const newLogoInputRef = useRef<HTMLInputElement>(null);

  // Join agency form
  const [joinCode, setJoinCode] = useState('');
  const [joiningAgency, setJoiningAgency] = useState(false);

  const isPrincipalOrOwner = myRole === 'principal' || myRole === 'owner';
  const isOwnerOrAdmin = isPrincipalOrOwner || myRole === 'admin';

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: membership } = await supabase
        .from('agency_members')
        .select('agency_id, role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!membership) {
        setLoading(false);
        return;
      }

      setAgencyId(membership.agency_id);
      setMyRole(membership.role);

      const { data: agency } = await supabase
        .from('agencies')
        .select('name, logo_url, address, email, phone, description')
        .eq('id', membership.agency_id)
        .single();
      if (agency) {
        setAgencyName(agency.name);
        setAgencyLogo(agency.logo_url);
        setAgencyAddress(agency.address || '');
        setAgencyEmail(agency.email || '');
        setAgencyPhone(agency.phone || '');
        setAgencyDescription(agency.description || '');
      }

      const { data: membersData } = await supabase
        .from('agency_members')
        .select('id, user_id, role, access_level, joined_at')
        .eq('agency_id', membership.agency_id)
        .order('joined_at', { ascending: true });

      if (membersData) {
        const enriched = await Promise.all(
          membersData.map(async (m) => {
            const { data: agentData } = await supabase
              .from('agents')
              .select('name, email, phone')
              .eq('user_id', m.user_id)
              .single();
            return { ...m, agents: agentData } as AgencyMember;
          })
        );
        setMembers(enriched);
      }

      if (membership.role === 'owner' || membership.role === 'admin' || membership.role === 'principal') {
        const { data: codes } = await supabase
          .from('agency_invite_codes')
          .select('*')
          .eq('agency_id', membership.agency_id)
          .order('created_at', { ascending: false });
        if (codes) setInviteCodes(codes as InviteCode[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleCreateInvite = async () => {
    if (!agencyId || !user) return;
    setCreating(true);
    try {
      const code = generateCode();
      const { error } = await supabase.from('agency_invite_codes').insert({
        agency_id: agencyId,
        code,
        created_by: user.id,
        role: newInviteRole as any,
        max_uses: parseInt(newInviteMaxUses) || null,
      });
      if (error) throw error;
      toast({ title: 'Invite code created', description: `Code: ${code}` });
      setInviteDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleSendEmailInvite = async () => {
    if (!agencyId || !inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: {
          agencyId,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          accessLevel: inviteAccessLevel,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data.isExisting) {
        toast({
          title: 'Member added',
          description: `${inviteEmail} has been added to your agency.`,
        });
      } else if (data.inviteCode) {
        // Show invite code prominently — email may not have been delivered
        toast({
          title: data.emailSent ? 'Invite sent + code generated' : 'Invite code generated',
          description: data.emailSent
            ? `Email sent to ${inviteEmail}. Backup code: ${data.inviteCode}`
            : `Share this code with ${inviteEmail} to join: ${data.inviteCode}`,
          duration: 15000,
        });
        // Copy code to clipboard for easy sharing
        try { await navigator.clipboard.writeText(data.inviteCode); } catch {}
      } else {
        toast({
          title: 'Invitation sent',
          description: `An invite has been sent to ${inviteEmail}.`,
        });
      }
      setEmailInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('agent');
      setInviteAccessLevel('full');
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleDeactivateCode = async (id: string) => {
    await supabase.from('agency_invite_codes').update({ is_active: false }).eq('id', id);
    loadData();
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      toast({ title: 'Error', description: "You can't remove yourself", variant: 'destructive' });
      return;
    }
    await supabase.from('agency_members').delete().eq('id', memberId);
    toast({ title: 'Member removed' });
    loadData();
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('agency_members')
        .update({ role: newRole as any })
        .eq('id', memberId);
      if (error) throw error;
      toast({ title: 'Role updated', description: `Member role changed to ${newRole}` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleChangeAccess = async (memberId: string, newAccess: string) => {
    try {
      const { error } = await supabase
        .from('agency_members')
        .update({ access_level: newAccess })
        .eq('id', memberId);
      if (error) throw error;
      toast({ title: 'Access updated', description: `Access changed to ${newAccess}` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: `${code} copied to clipboard` });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agencyId) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 5MB.', variant: 'destructive' });
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${agencyId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('agency-logos')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('agency-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('agencies')
        .update({ logo_url: publicUrl })
        .eq('id', agencyId);
      if (updateError) throw updateError;

      setAgencyLogo(publicUrl);
      toast({ title: 'Logo updated' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveBranding = async () => {
    if (!agencyId) return;
    setSavingBranding(true);
    try {
      const { error } = await supabase
        .from('agencies')
        .update({
          name: agencyName,
          address: agencyAddress || null,
          email: agencyEmail || null,
          phone: agencyPhone || null,
          description: agencyDescription || null,
        })
        .eq('id', agencyId);
      if (error) throw error;
      toast({ title: 'Agency details saved' });
      setEditingBranding(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingBranding(false);
    }
  };

  const handleNewAgencyLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB.', variant: 'destructive' });
      return;
    }
    setNewAgencyLogoFile(file);
    setNewAgencyLogoPreview(URL.createObjectURL(file));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6);

  const handleCreateAgency = async () => {
    if (!user || !newAgencyName.trim()) return;
    setCreatingAgency(true);
    try {
      const slug = generateSlug(newAgencyName);
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: newAgencyName.trim(),
          slug,
          owner_user_id: user.id,
          email: newAgencyEmail || null,
          phone: newAgencyPhone || null,
          description: newAgencyDescription || null,
          address: newAgencyAddress || null,
        })
        .select('id')
        .single();
      if (agencyError) throw agencyError;

      // Upload logo if selected
      if (newAgencyLogoFile) {
        const ext = newAgencyLogoFile.name.split('.').pop();
        const filePath = `${agency.id}/logo.${ext}`;
        await supabase.storage.from('agency-logos').upload(filePath, newAgencyLogoFile, { upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('agency-logos').getPublicUrl(filePath);
        await supabase.from('agencies').update({ logo_url: publicUrl }).eq('id', agency.id);
      }

      // Add self as principal (master admin)
      const { error: memberError } = await supabase
        .from('agency_members')
        .insert({
          agency_id: agency.id,
          user_id: user.id,
          role: 'principal' as any,
          access_level: 'full',
        });
      if (memberError) throw memberError;

      // Link or create agent record
      const { data: agentRecord } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (agentRecord) {
        await supabase
          .from('agents')
          .update({ agency_id: agency.id, agency: newAgencyName.trim() })
          .eq('id', agentRecord.id);
      } else {
        // Create agent record if it doesn't exist (e.g. admin user creating agency)
        await supabase
          .from('agents')
          .insert({
            user_id: user.id,
            name: user.email || 'Principal',
            email: user.email || newAgencyEmail || null,
            agency_id: agency.id,
            agency: newAgencyName.trim(),
          });
        // Ensure agent role exists
        await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: 'agent' as any })
          .then(() => {});
      }

      toast({ title: 'Agency created!', description: `${newAgencyName} is ready. You are the Principal.` });
      setNewAgencyName('');
      setNewAgencyEmail('');
      setNewAgencyPhone('');
      setNewAgencyDescription('');
      setNewAgencyAddress('');
      setNewAgencyLogoFile(null);
      setNewAgencyLogoPreview(null);
      loadData();
    } catch (err: any) {
      toast({ title: 'Error creating agency', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingAgency(false);
    }
  };

  const handleJoinAgency = async () => {
    if (!user || !joinCode.trim()) return;
    setJoiningAgency(true);
    try {
      const { data: invite, error: inviteError } = await supabase
        .from('agency_invite_codes')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (inviteError) throw inviteError;
      if (!invite) {
        toast({ title: 'Invalid code', description: 'This invite code is invalid or has been deactivated.', variant: 'destructive' });
        setJoiningAgency(false);
        return;
      }

      if (invite.max_uses && invite.uses >= invite.max_uses) {
        toast({ title: 'Code expired', description: 'This invite code has reached its max usage.', variant: 'destructive' });
        setJoiningAgency(false);
        return;
      }

      const { data: existing } = await supabase
        .from('agency_members')
        .select('id')
        .eq('agency_id', invite.agency_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Already a member', description: 'You are already part of this agency.', variant: 'destructive' });
        setJoiningAgency(false);
        return;
      }

      const { error: joinError } = await supabase
        .from('agency_members')
        .insert({
          agency_id: invite.agency_id,
          user_id: user.id,
          role: invite.role as any,
          access_level: 'full',
        });
      if (joinError) throw joinError;

      await supabase
        .from('agency_invite_codes')
        .update({ uses: invite.uses + 1 })
        .eq('id', invite.id);

      const { data: agentRecord } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (agentRecord) {
        const { data: agencyData } = await supabase
          .from('agencies')
          .select('id, name')
          .eq('id', invite.agency_id)
          .single();
        if (agencyData) {
          await supabase
            .from('agents')
            .update({ agency_id: agencyData.id, agency: agencyData.name })
            .eq('id', agentRecord.id);
        }
      }

      toast({ title: 'Joined agency!', description: `Welcome to the team as ${invite.role}.` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error joining', description: err.message, variant: 'destructive' });
    } finally {
      setJoiningAgency(false);
    }
  };

  // No agency - show setup
  if (!agencyId) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <Building2 size={48} className="text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Set Up Your Agency</h2>
          <p className="text-sm text-muted-foreground">
            Create a new agency to manage your team, or join an existing one with an invite code.
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="create" className="text-xs gap-1.5">
              <Plus size={14} /> Create Agency
            </TabsTrigger>
            <TabsTrigger value="join" className="text-xs gap-1.5">
              <LogIn size={14} /> Join with Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              {/* Logo upload */}
              <div className="flex items-center gap-4">
                <input
                  ref={newLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleNewAgencyLogoSelect}
                />
                <button
                  onClick={() => newLogoInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center transition-colors shrink-0 overflow-hidden"
                >
                  {newAgencyLogoPreview ? (
                    <img src={newAgencyLogoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={20} className="text-muted-foreground" />
                  )}
                </button>
                <div>
                  <Label className="text-xs font-medium">Agency Logo</Label>
                  <p className="text-[11px] text-muted-foreground">Upload your agency branding (max 5MB)</p>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Agency Name *</Label>
                <Input
                  placeholder="e.g. Elite Property Group"
                  value={newAgencyName}
                  onChange={(e) => setNewAgencyName(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Office Address</Label>
                <Input
                  placeholder="e.g. 123 Collins St, Melbourne VIC 3000"
                  value={newAgencyAddress}
                  onChange={(e) => setNewAgencyAddress(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Email</Label>
                  <Input
                    type="email"
                    placeholder="office@agency.com"
                    value={newAgencyEmail}
                    onChange={(e) => setNewAgencyEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Phone</Label>
                  <Input
                    placeholder="+61 4xx xxx xxx"
                    value={newAgencyPhone}
                    onChange={(e) => setNewAgencyPhone(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  placeholder="Tell clients about your agency..."
                  value={newAgencyDescription}
                  onChange={(e) => setNewAgencyDescription(e.target.value)}
                  className="mt-1.5 resize-none"
                  rows={3}
                />
              </div>
              <Button
                onClick={handleCreateAgency}
                disabled={creatingAgency || !newAgencyName.trim()}
                className="w-full"
              >
                {creatingAgency ? (
                  <><Loader2 size={14} className="animate-spin mr-2" /> Creating...</>
                ) : (
                  <><Building2 size={14} className="mr-2" /> Create Agency</>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                You'll be set as the <strong>Principal</strong> (master admin) with full control.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="join">
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div>
                <Label className="text-xs font-medium">Invite Code</Label>
                <Input
                  placeholder="e.g. ABCD1234"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="mt-1.5 font-mono tracking-widest text-center text-lg"
                  maxLength={8}
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Ask your agency principal or admin for an invite code.
                </p>
              </div>
              <Button
                onClick={handleJoinAgency}
                disabled={joiningAgency || joinCode.trim().length < 4}
                className="w-full"
              >
                {joiningAgency ? (
                  <><Loader2 size={14} className="animate-spin mr-2" /> Joining...</>
                ) : (
                  <><ArrowRight size={14} className="mr-2" /> Join Agency</>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (!subLoading && !canAccessTeam) {
    return <UpgradeGate requiredPlan="Agency plan" message="Team management is available on the Agency plan. Invite up to 8 agents under one account with separate logins and centralised billing." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 sm:p-6">
      {/* Header with Logo */}
      <div className="flex items-center gap-5">
        <div className="relative group shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
            disabled={!isOwnerOrAdmin}
          />
          {agencyLogo ? (
            <img src={agencyLogo} alt={agencyName} className="w-16 h-16 rounded-2xl object-cover border border-border shadow-sm" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-border">
              <Building2 size={24} className="text-primary" />
            </div>
          )}
          {isOwnerOrAdmin && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="absolute inset-0 rounded-2xl bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
            >
              {uploadingLogo ? (
                <Loader2 size={18} className="text-background animate-spin" />
              ) : (
                <Camera size={18} className="text-background" />
              )}
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground truncate">{agencyName}</h1>
            {isPrincipalOrOwner && (
              <Badge variant="outline" className={roleBadgeClass['principal']}>Principal</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-0.5">
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            {agencyAddress && (
              <span className="flex items-center gap-1">
                <MapPin size={12} className="shrink-0" /> {agencyAddress}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {isOwnerOrAdmin && (
            <Button variant="outline" size="sm" onClick={() => setEditingBranding(true)}>
              Edit Details
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Team Members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Team Members</h2>
          {isOwnerOrAdmin && (
            <div className="flex flex-col gap-2">
              {members.length >= seatLimit && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-foreground">
                  Your Agency plan includes up to {seatLimit} agent logins. You have used {members.length} of {seatLimit} seats. To add more agents, contact us at sales@listhq.com.au for Enterprise pricing.
                </div>
              )}
              <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEmailInviteDialogOpen(true)} disabled={members.length >= seatLimit}>
                <Mail size={14} className="mr-1.5" /> Invite by Email
              </Button>
              <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
                <UserPlus size={14} className="mr-1.5" /> Create Code
              </Button>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {m.agents?.name || 'Unknown'}
                  {m.user_id === user?.id && <span className="text-muted-foreground ml-1">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">{m.agents?.email || ''}</p>
              </div>
              {/* Access level badge */}
              <Badge variant="outline" className={`text-[10px] ${accessBadgeClass[m.access_level] || accessBadgeClass['full']}`}>
                {m.access_level === 'read' ? (
                  <><Eye size={10} className="mr-1" /> Read</>
                ) : (
                  <><Lock size={10} className="mr-1" /> Full</>
                )}
              </Badge>
              {/* Role badge or selector */}
              {isOwnerOrAdmin && m.user_id !== user?.id && m.role !== 'principal' && m.role !== 'owner' ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={m.role}
                    onValueChange={(newRole) => handleChangeRole(m.id, newRole)}
                  >
                    <SelectTrigger className="w-[110px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={m.access_level || 'full'}
                    onValueChange={(newAccess) => handleChangeAccess(m.id, newAccess)}
                  >
                    <SelectTrigger className="w-[90px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Access</SelectItem>
                      <SelectItem value="read">Read Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Badge variant="outline" className={`text-[10px] ${roleBadgeClass[m.role] || ''}`}>
                  {m.role === 'principal' ? 'Principal' : m.role}
                </Badge>
              )}
              {isOwnerOrAdmin && m.user_id !== user?.id && m.role !== 'principal' && m.role !== 'owner' && (
                <button
                  onClick={() => handleRemoveMember(m.id, m.user_id)}
                  className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                >
                  <Trash2 size={14} className="text-destructive" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite Codes */}
      {isOwnerOrAdmin && inviteCodes.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Invite Codes</h2>
          <div className="space-y-2">
            {inviteCodes.map((code) => (
              <div key={code.id} className={`flex items-center gap-4 p-4 rounded-2xl bg-card border border-border ${!code.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-bold tracking-widest text-foreground">{code.code}</code>
                    <button onClick={() => copyCode(code.code)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Copy size={12} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Role: {code.role} · Used {code.uses}/{code.max_uses ?? '∞'} times
                    {!code.is_active && ' · Deactivated'}
                  </p>
                </div>
                {code.is_active && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeactivateCode(code.id)} className="text-xs text-destructive hover:text-destructive">
                    Deactivate
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Invite Code Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Invite Code</DialogTitle>
            <DialogDescription>
              Generate a code that staff can use to join your agency.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Role for new members</label>
              <Select value={newInviteRole} onValueChange={setNewInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Max uses</label>
              <Input
                type="number"
                min="1"
                value={newInviteMaxUses}
                onChange={(e) => setNewInviteMaxUses(e.target.value)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground mt-1">How many people can use this code</p>
            </div>
            <Button onClick={handleCreateInvite} disabled={creating} className="w-full">
              {creating ? <><Loader2 size={14} className="animate-spin mr-2" /> Creating…</> : 'Generate Code'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Invite Dialog */}
      <Dialog open={emailInviteDialogOpen} onOpenChange={setEmailInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an email invitation to add someone to your agency.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Email Address *</Label>
              <Input
                type="email"
                placeholder="agent@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Access Level</Label>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {inviteAccessLevel === 'full' ? 'Full Access' : 'Read Only'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inviteAccessLevel === 'full'
                      ? 'Can create, edit, and delete listings, leads, and settings'
                      : 'Can view listings, leads, and analytics only'
                    }
                  </p>
                </div>
                <Switch
                  checked={inviteAccessLevel === 'full'}
                  onCheckedChange={(checked) => setInviteAccessLevel(checked ? 'full' : 'read')}
                />
              </div>
            </div>
            <Button
              onClick={handleSendEmailInvite}
              disabled={sendingInvite || !inviteEmail.trim()}
              className="w-full"
            >
              {sendingInvite ? (
                <><Loader2 size={14} className="animate-spin mr-2" /> Sending...</>
              ) : (
                <><Mail size={14} className="mr-2" /> Send Invitation</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Branding Dialog */}
      <Dialog open={editingBranding} onOpenChange={setEditingBranding}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Agency Details</DialogTitle>
            <DialogDescription>
              Update your agency branding, address, and contact information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-medium">Agency Name</Label>
              <Input
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Office Address</Label>
              <Input
                placeholder="123 Collins St, Melbourne VIC 3000"
                value={agencyAddress}
                onChange={(e) => setAgencyAddress(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  type="email"
                  value={agencyEmail}
                  onChange={(e) => setAgencyEmail(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Phone</Label>
                <Input
                  value={agencyPhone}
                  onChange={(e) => setAgencyPhone(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                value={agencyDescription}
                onChange={(e) => setAgencyDescription(e.target.value)}
                className="mt-1.5 resize-none"
                rows={3}
              />
            </div>
            <Button onClick={handleSaveBranding} disabled={savingBranding} className="w-full">
              {savingBranding ? <><Loader2 size={14} className="animate-spin mr-2" /> Saving...</> : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPage;

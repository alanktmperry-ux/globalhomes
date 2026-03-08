import { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Plus, Trash2, UserPlus, Building2, Shield, Users, RefreshCw, Loader2, Camera, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  owner: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  admin: 'bg-primary/10 text-primary border-primary/20',
  agent: 'bg-secondary text-foreground border-border',
};

const TeamPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState('');
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [newInviteRole, setNewInviteRole] = useState<string>('agent');
  const [newInviteMaxUses, setNewInviteMaxUses] = useState('10');
  const [creating, setCreating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin';

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Find user's agency membership
      const { data: membership } = await supabase
        .from('agency_members')
        .select('agency_id, role')
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        setLoading(false);
        return;
      }

      setAgencyId(membership.agency_id);
      setMyRole(membership.role);

      // Get agency info
      const { data: agency } = await supabase
        .from('agencies')
        .select('name')
        .eq('id', membership.agency_id)
        .single();
      if (agency) setAgencyName(agency.name);

      // Get members with their profile info
      const { data: membersData } = await supabase
        .from('agency_members')
        .select('id, user_id, role, joined_at')
        .eq('agency_id', membership.agency_id)
        .order('joined_at', { ascending: true });

      if (membersData) {
        // Fetch agent details for each member
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

      // Get invite codes (only if owner/admin)
      if (membership.role === 'owner' || membership.role === 'admin') {
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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: `${code} copied to clipboard` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (!agencyId) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <Building2 size={48} className="text-muted-foreground mx-auto mb-4" />
        <h2 className="font-display text-xl font-bold mb-2">No Agency Found</h2>
        <p className="text-sm text-muted-foreground">
          You're not part of an agency yet. Create one from your agent settings or join using an invite code.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{agencyName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
          {isOwnerOrAdmin && (
            <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
              <UserPlus size={14} className="mr-1.5" /> Create Invite Code
            </Button>
          )}
        </div>
      </div>

      {/* Team Members */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Team Members</h2>
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
              <Badge variant="outline" className={`text-[10px] ${roleBadgeClass[m.role] || ''}`}>
                {m.role}
              </Badge>
              {isOwnerOrAdmin && m.user_id !== user?.id && m.role !== 'owner' && (
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

      {/* Create Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Invite Code</DialogTitle>
            <DialogDescription>
              Generate a code that staff can use to join your agency when they sign up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Role for new members</label>
              <Select value={newInviteRole} onValueChange={setNewInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Admin (can manage staff)</SelectItem>
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
    </div>
  );
};

export default TeamPage;

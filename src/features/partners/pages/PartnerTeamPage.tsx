import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePartner } from './PartnerDashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, UserPlus, Trash2, Users, Mail, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getErrorMessage } from '@/shared/lib/errorUtils';

interface TeamMember {
  id: string;
  user_id: string | null;
  role: string;
  joined_at: string | null;
  invite_token: string | null;
  invite_expires_at: string | null;
  created_at: string;
}

const PartnerTeamPage = () => {
  const { user } = useAuth();
  const { role: memberRole } = usePartner();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('');

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isOwner = memberRole === 'owner';

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: membership } = await supabase
      .from('partner_members')
      .select('partner_id, partners(company_name)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) { setLoading(false); return; }

    const pid = (membership as any).partner_id;
    setPartnerId(pid);
    setPartnerName((membership as any).partners?.company_name || '');

    const { data: team } = await supabase
      .from('partner_members')
      .select('id, user_id, role, joined_at, invite_token, invite_expires_at, created_at')
      .eq('partner_id', pid)
      .order('created_at', { ascending: true });

    setMembers((team || []) as unknown as TeamMember[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-partner-member', {
        body: { email: inviteEmail.trim(), partnerName },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(
        data?.alreadyUser
          ? `${inviteEmail} has been added to the team.`
          : `Invitation sent to ${inviteEmail}.`
      );
      setShowInvite(false);
      setInviteEmail('');
      fetchData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
    setInviting(false);
  };

  const handleRemove = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('partner_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      toast.success('Team member removed.');
      setDeletingId(null);
      fetchData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Users size={22} className="text-primary" />
            Team
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isOwner && (
          <Button onClick={() => setShowInvite(true)} className="gap-1.5">
            <UserPlus size={14} />
            Invite team member
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                {isOwner && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => {
                const isPending = !m.joined_at && !!m.invite_token;
                const isExpired = isPending && m.invite_expires_at && new Date(m.invite_expires_at) < new Date();
                const isSelf = m.user_id === user?.id;

                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isPending ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail size={14} />
                            <span className="text-sm italic">Pending invite</span>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-foreground">
                            {m.user_id || '—'}
                            {isSelf && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.role === 'owner' ? 'default' : 'secondary'}
                        className={
                          m.role === 'owner'
                            ? 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-0'
                            : ''
                        }
                      >
                        <Shield size={10} className="mr-1" />
                        {m.role === 'owner' ? 'Owner' : 'Member'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.joined_at ? format(new Date(m.joined_at), 'dd MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      {isPending ? (
                        isExpired ? (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock size={10} />
                            Pending
                            {m.invite_expires_at && (
                              <span className="text-muted-foreground ml-1">
                                · expires {format(new Date(m.invite_expires_at), 'dd MMM')}
                              </span>
                            )}
                          </Badge>
                        )
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-xs">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    {isOwner && (
                      <TableCell>
                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(m.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Email address</Label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If this person already has a ListHQ account, they'll be added immediately. Otherwise, they'll receive an email invitation to create one.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? <><Loader2 className="animate-spin mr-1" size={14} /> Sending…</> : 'Send invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This person will lose access to all client agencies managed by your team. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletingId && handleRemove(deletingId)}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerTeamPage;

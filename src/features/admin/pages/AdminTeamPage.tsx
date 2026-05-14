import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Search, Shield, Users, Mail, History, Ban, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

type Role = 'admin' | 'support' | 'partner';
const ROLE_OPTIONS: Role[] = ['admin', 'support', 'partner'];

interface TeamMember {
  id: string;
  email: string | null;
  display_name: string | null;
  roles: string[];
  last_sign_in_at: string | null;
  created_at: string | null;
  disabled: boolean;
}
interface PendingInvite {
  id: string;
  email: string;
  invited_at: string;
  roles: string[];
}

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    'Full access to all admin pages',
    'Approve/reject agents, listings, partners',
    'Manage team & roles',
    'View revenue, costs, audit log',
  ],
  support: [
    'Access /support dashboard and tickets',
    'View agents and revenue (read-only)',
    'Cannot grant roles or moderate listings',
  ],
  partner: [
    'Access partner-only portals (referral, broker, etc.)',
    'Cannot access /admin/*',
  ],
};

async function callTeam(action: string, payload: Record<string, unknown> = {}) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error('No active session.');
  const { data, error } = await supabase.functions.invoke('admin-team', {
    body: { action, ...payload },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AdminTeamPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TeamMember | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await callTeam('list');
      setTeam(res.team ?? []);
      setPending(res.pendingInvites ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return team;
    return team.filter(
      (m) =>
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.display_name ?? '').toLowerCase().includes(q),
    );
  }, [team, search]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Shield size={22} /> Team & Roles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage admin, support, and partner accounts. Grant or revoke access.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus size={16} className="mr-1.5" /> Add team member
        </Button>
      </div>

      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">
            <Users size={14} className="mr-1.5" /> Team ({team.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Mail size={14} className="mr-1.5" /> Pending invites ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="permissions">Roles & permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Last sign-in</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium">{m.display_name ?? m.email ?? 'Unknown'}</div>
                          {m.display_name && (
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {m.roles.map((r) => (
                              <Badge key={r} variant="secondary" className="capitalize">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.last_sign_in_at
                            ? new Date(m.last_sign_in_at).toLocaleString('en-AU')
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          {m.disabled ? (
                            <Badge variant="destructive">Disabled</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditTarget(m)}>
                            Edit roles
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await callTeam(m.disabled ? 'enable' : 'disable', { user_id: m.id });
                                toast.success(m.disabled ? 'Re-enabled' : 'Disabled');
                                load();
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : 'Failed');
                              }
                            }}
                          >
                            {m.disabled ? (
                              <CheckCircle2 size={14} className="mr-1" />
                            ) : (
                              <Ban size={14} className="mr-1" />
                            )}
                            {m.disabled ? 'Enable' : 'Disable'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/admin/audit?actor=${m.id}`)}
                          >
                            <History size={14} className="mr-1" /> Audit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No team members.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Invited role(s)</TableHead>
                    <TableHead>Invited at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.email}</TableCell>
                      <TableCell>
                        {p.roles.map((r) => (
                          <Badge key={r} variant="secondary" className="capitalize mr-1">
                            {r}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.invited_at).toLocaleString('en-AU')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {pending.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No pending invites.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardContent className="p-6 space-y-6">
              {ROLE_OPTIONS.map((role) => (
                <div key={role}>
                  <h3 className="font-semibold capitalize mb-2">{role}</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                    {ROLE_PERMISSIONS[role].map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-xs text-muted-foreground border-t pt-4">
                Note: <code>super_admin</code> is not a separate role in this system — admins manage
                admins. To restrict role-management to a single super-admin, grant the <code>admin</code>{' '}
                role to only one account.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvited={load} />
      <EditRolesDialog
        member={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={load}
      />
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('support');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim()) return toast.error('Email required');
    setBusy(true);
    try {
      await callTeam('invite', { email: email.trim(), role, notes: notes || null });
      toast.success('Invitation sent');
      setEmail('');
      setNotes('');
      setRole('support');
      onOpenChange(false);
      onInvited();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invite failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            They'll receive an email invite. Choose admin sparingly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : 'Send invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRolesDialog({
  member,
  onOpenChange,
  onSaved,
}: {
  member: TeamMember | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRoles((member?.roles ?? []).filter((r): r is Role => ROLE_OPTIONS.includes(r as Role)));
  }, [member]);

  if (!member) return null;

  const toggle = (r: Role) =>
    setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  const save = async () => {
    setBusy(true);
    try {
      await callTeam('set_roles', { user_id: member.id, roles });
      toast.success('Roles updated');
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit roles</DialogTitle>
          <DialogDescription>{member.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {ROLE_OPTIONS.map((r) => (
            <label key={r} className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={roles.includes(r)} onCheckedChange={() => toggle(r)} />
              <span className="capitalize text-sm">{r}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

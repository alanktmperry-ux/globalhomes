/**
 * BrokerTeamPage
 * Principal-only view: see all team members, invite associates, view per-member stats.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Copy, ShieldCheck, User as UserIcon, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BrokerPortalLayout from "./BrokerPortalLayout";
import type { BrokerRecord } from "./brokerPortalUtils";

interface TeamMember {
  id: string;
  full_name: string | null;
  name: string;
  email: string;
  agency_role: 'principal' | 'associate';
  is_active: boolean;
  leadCount: number;
  settledCount: number;
}

interface PendingInvite {
  id: string;
  email: string;
  full_name: string | null;
  token: string;
  created_at: string;
}

export default function BrokerTeamPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [broker, setBroker] = useState<BrokerRecord | null>(null);
  const [agencyName, setAgencyName] = useState<string>("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async (b: BrokerRecord) => {
    if (!b.agency_id) return;

    // agency
    const { data: agency } = await supabase
      .from("broker_agencies")
      .select("name")
      .eq("id", b.agency_id)
      .maybeSingle();
    if (agency) setAgencyName(agency.name);

    // members
    const { data: brokers } = await supabase
      .from("brokers")
      .select("id, name, full_name, email, agency_role, is_active")
      .eq("agency_id", b.agency_id)
      .order("agency_role", { ascending: true });

    // lead counts per member
    const memberIds = (brokers ?? []).map(m => m.id);
    const { data: leads } = memberIds.length > 0
      ? await supabase
          .from("referral_leads")
          .select("assigned_broker_id, status")
          .in("assigned_broker_id", memberIds)
      : { data: [] as { assigned_broker_id: string; status: string }[] };

    const counts = new Map<string, { total: number; settled: number }>();
    (leads ?? []).forEach(l => {
      if (!l.assigned_broker_id) return;
      const c = counts.get(l.assigned_broker_id) ?? { total: 0, settled: 0 };
      c.total++;
      if (l.status === "settled") c.settled++;
      counts.set(l.assigned_broker_id, c);
    });

    setMembers((brokers ?? []).map(m => ({
      ...m,
      agency_role: (m.agency_role as 'principal' | 'associate') ?? 'associate',
      leadCount: counts.get(m.id)?.total ?? 0,
      settledCount: counts.get(m.id)?.settled ?? 0,
    })));

    // pending invites
    const { data: inv } = await supabase
      .from("broker_agency_invites")
      .select("id, email, full_name, token, created_at")
      .eq("agency_id", b.agency_id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    setInvites((inv ?? []) as PendingInvite[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/broker/login"); return; }
      const { data: brokerRow } = await supabase
        .from("brokers")
        .select("id, name, full_name, email, company, acl_number, loan_types, languages, is_exclusive, is_active, agency_id, agency_role")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!brokerRow) { navigate("/broker/login"); return; }
      const b = brokerRow as BrokerRecord;
      setBroker(b);
      if (b.agency_role !== 'principal') {
        toast.error("Only principals can manage the team.");
        navigate("/broker/portal");
        return;
      }
      await loadAll(b);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate, loadAll]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broker?.agency_id) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) { toast.error("Enter an email"); return; }
    setSubmitting(true);
    const { error } = await supabase
      .from("broker_agency_invites")
      .insert({
        agency_id: broker.agency_id,
        email,
        full_name: inviteName.trim() || null,
        invited_by: broker.id,
      });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Invite created — share the signup link with your associate");
    setInviteEmail("");
    setInviteName("");
    if (broker) loadAll(broker);
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/broker/login?invite=${token}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Invite link copied"),
      () => toast.error("Could not copy"),
    );
  };

  const revokeInvite = async (id: string) => {
    const { error } = await supabase.from("broker_agency_invites").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Invite revoked");
    if (broker) loadAll(broker);
  };

  const removeMember = async (memberId: string) => {
    if (!broker?.agency_id) return;
    if (memberId === broker.id) { toast.error("You can't remove yourself"); return; }
    if (!confirm("Remove this associate from the team? Their leads will remain assigned to them but you will lose visibility.")) return;
    const { error } = await supabase
      .from("brokers")
      .update({ agency_id: null })
      .eq("id", memberId);
    if (error) { toast.error(error.message); return; }
    toast.success("Member removed from team");
    loadAll(broker);
  };

  if (loading || !broker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <BrokerPortalLayout broker={broker} active="team" onTabChange={(t) => navigate(`/broker/portal${t === 'team' ? '/team' : ''}`)}>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500 mt-1">{agencyName || 'Your agency'}</p>
        </div>

        {/* Invite associate */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Invite an associate</h2>
          </div>
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="Full name (optional)"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
            <Input
              type="email"
              placeholder="associate@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Send invite'}
            </Button>
          </form>
          <p className="text-xs text-slate-500 mt-3">
            Associates only see leads assigned to them. As principal, you see everything across your agency.
          </p>
        </section>

        {/* Pending invites */}
        {invites.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Pending invites</h2>
            <ul className="divide-y divide-slate-100">
              {invites.map(inv => (
                <li key={inv.id} className="py-3 flex items-center gap-3">
                  <Mail size={16} className="text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{inv.full_name || inv.email}</p>
                    {inv.full_name && <p className="text-xs text-slate-500 truncate">{inv.email}</p>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyInviteLink(inv.token)}>
                    <Copy size={14} className="mr-1.5" /> Copy link
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => revokeInvite(inv.id)}>
                    <Trash2 size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Team members */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Members ({members.length})</h2>
          <ul className="divide-y divide-slate-100">
            {members.map(m => (
              <li key={m.id} className="py-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                  m.agency_role === 'principal' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {m.agency_role === 'principal' ? <ShieldCheck size={18} /> : <UserIcon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-slate-900 truncate">{m.full_name || m.name}</p>
                    <Badge variant={m.agency_role === 'principal' ? 'default' : 'outline'} className="text-[10px] h-5 px-1.5 capitalize">
                      {m.agency_role}
                    </Badge>
                    {!m.is_active && <Badge variant="outline" className="text-[10px] h-5 px-1.5">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{m.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-900">{m.leadCount} leads</p>
                  <p className="text-xs text-slate-500">{m.settledCount} settled</p>
                </div>
                {m.id !== broker.id && (
                  <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </BrokerPortalLayout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, Users, AlertTriangle, CheckCircle2, XCircle, Clock,
  RefreshCw, ChevronDown, ChevronUp, Mail, Shield,
} from 'lucide-react';

interface PartnerRow {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  abn: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  agencyCount: number;
  activeAgencyCount: number;
  pendingAgencyCount: number;
  totalAgents: number;
  overdueRecCount: number;
  overdrawCount: number;
  activeTenancies: number;
  arrearsCount: number;
  memberCount: number;
  lastActivityAt: string | null;
}

interface AgencyDetail {
  id: string;
  name: string;
  status: string;
  accessLevel: string;
  acceptedAt: string | null;
  agentCount: number;
  trustBalance: number;
  lastReconciledDate: string | null;
  daysSinceRec: number | null;
  activeTenancies: number;
  arrearsCount: number;
}

const fmt = (n: number) =>
  n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

const ACCESS_LABELS: Record<string, string> = {
  trust_only: 'Trust only',
  trust_and_pm: 'Trust + PM',
  full_pm: 'Full PM',
};

function KPI({ label, value, icon: Icon, color = 'text-primary', sub }: {
  label: string; value: string | number; icon: any; color?: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function PartnerRowComponent({ partner }: { partner: PartnerRow }) {
  const [expanded, setExpanded] = useState(false);
  const [agencies, setAgencies] = useState<AgencyDetail[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);

  const loadAgencies = async () => {
    if (agencies.length > 0) return;
    setLoadingAgencies(true);
    try {
      const now = new Date();
      const { data: paRows } = await (supabase
        .from('partner_agencies')
        .select('agency_id, status, access_level, accepted_at, agencies(id, name)')
        .eq('partner_id', partner.id) as any);

      if (!paRows || paRows.length === 0) { setLoadingAgencies(false); return; }

      const agencyIds = paRows.map((r: any) => r.agency_id);

      const [agentsRes, balancesRes] = await Promise.all([
        supabase.from('agents').select('id, agency_id').in('agency_id', agencyIds),
        supabase.from('trust_account_balances').select('agent_id, current_balance, last_reconciled_date'),
      ]);

      const agentsByAgency = new Map<string, number>();
      const agentToAgency = new Map<string, string>();
      const allAgentIdsHere: string[] = [];
      (agentsRes.data || []).forEach((a: any) => {
        if (!a.agency_id) return;
        agentToAgency.set(a.id, a.agency_id);
        agentsByAgency.set(a.agency_id, (agentsByAgency.get(a.agency_id) || 0) + 1);
        allAgentIdsHere.push(a.id);
      });

      const tenanciesRes = allAgentIdsHere.length > 0
        ? await supabase.from('tenancies').select('agent_id, status').in('agent_id', allAgentIdsHere)
        : { data: [] as { agent_id: string; current_balance: number; last_reconciled_date: string | null }[] };

      const trustByAgency = new Map<string, { balance: number; lastRec: string | null }>();
      (balancesRes.data || []).forEach((b: any) => {
        const agId = agentToAgency.get(b.agent_id);
        if (!agId) return;
        const cur = trustByAgency.get(agId) || { balance: 0, lastRec: null };
        cur.balance += b.current_balance;
        if (!cur.lastRec || b.last_reconciled_date > cur.lastRec) cur.lastRec = b.last_reconciled_date;
        trustByAgency.set(agId, cur);
      });

      const activeByAgency = new Map<string, number>();
      const arrearsByAgency = new Map<string, number>();
      (tenanciesRes.data || []).forEach((t: any) => {
        const agId = agentToAgency.get(t.agent_id);
        if (!agId) return;
        if (t.status === 'active') activeByAgency.set(agId, (activeByAgency.get(agId) || 0) + 1);
        if (t.status === 'arrears') arrearsByAgency.set(agId, (arrearsByAgency.get(agId) || 0) + 1);
      });

      const details: AgencyDetail[] = paRows.map((r: any) => {
        const trust = trustByAgency.get(r.agency_id);
        const lastRec = trust?.lastRec || null;
        const daysSinceRec = lastRec ? Math.floor((now.getTime() - new Date(lastRec).getTime()) / 86400000) : null;
        return {
          id: r.agency_id,
          name: r.agencies?.name || 'Unknown Agency',
          status: r.status,
          accessLevel: r.access_level,
          acceptedAt: r.accepted_at,
          agentCount: agentsByAgency.get(r.agency_id) || 0,
          trustBalance: trust?.balance || 0,
          lastReconciledDate: lastRec,
          daysSinceRec,
          activeTenancies: activeByAgency.get(r.agency_id) || 0,
          arrearsCount: arrearsByAgency.get(r.agency_id) || 0,
        };
      });

      setAgencies(details);
    } finally {
      setLoadingAgencies(false);
    }
  };

  const handleExpand = () => {
    setExpanded(e => !e);
    if (!expanded) loadAgencies();
  };

  const hasIssues = partner.overdueRecCount > 0 || partner.overdrawCount > 0 || partner.arrearsCount > 0;

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-colors ${hasIssues ? 'border-amber-500/30' : 'border-border'}`}>
      <button onClick={handleExpand} className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
          {partner.companyName[0]?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{partner.companyName}</p>
            {partner.isVerified
              ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium flex items-center gap-0.5"><CheckCircle2 size={9} /> Verified</span>
              : <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-medium flex items-center gap-0.5"><Clock size={9} /> Unverified</span>
            }
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {partner.contactName} · {partner.contactEmail}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-center shrink-0">
          <div>
            <p className="text-sm font-bold text-foreground">{partner.agencyCount}</p>
            <p className="text-[10px] text-muted-foreground">agencies</p>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{partner.totalAgents}</p>
            <p className="text-[10px] text-muted-foreground">agents</p>
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{partner.activeTenancies}</p>
            <p className="text-[10px] text-muted-foreground">tenancies</p>
          </div>
          {partner.arrearsCount > 0 && (
            <div>
              <p className="text-sm font-bold text-destructive">{partner.arrearsCount}</p>
              <p className="text-[10px] text-destructive">in arrears</p>
            </div>
          )}
          {partner.overdueRecCount > 0 && (
            <div>
              <p className="text-sm font-bold text-amber-500">{partner.overdueRecCount}</p>
              <p className="text-[10px] text-amber-500">overdue rec</p>
            </div>
          )}
        </div>

        <div className="text-muted-foreground shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <a href={`mailto:${partner.contactEmail}`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
              <Mail size={12} /> Email partner
            </a>
            {!partner.isVerified && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-lg">
                <Shield size={12} /> Needs verification — go to Users tab
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-muted/30 rounded-lg p-2.5">
              <p className="text-muted-foreground">ABN</p>
              <p className="font-medium text-foreground mt-0.5">{partner.abn || 'Not provided'}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5">
              <p className="text-muted-foreground">Team members</p>
              <p className="font-medium text-foreground mt-0.5">{partner.memberCount}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5">
              <p className="text-muted-foreground">Joined</p>
              <p className="font-medium text-foreground mt-0.5">{fmtDate(partner.createdAt)}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5">
              <p className="text-muted-foreground">Agencies active</p>
              <p className="font-medium text-foreground mt-0.5">{partner.activeAgencyCount} of {partner.agencyCount}</p>
            </div>
          </div>

          {loadingAgencies ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading agency details…</span>
            </div>
          ) : agencies.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">Linked Agencies</p>
              {agencies.map(ag => (
                <div key={ag.id} className={`bg-muted/20 border rounded-lg p-3 ${ag.arrearsCount > 0 || (ag.daysSinceRec !== null && ag.daysSinceRec > 30) ? 'border-amber-500/20' : 'border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 size={13} className="text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">{ag.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{ag.status}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{ACCESS_LABELS[ag.accessLevel] || ag.accessLevel}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{ag.agentCount} agent{ag.agentCount !== 1 ? 's' : ''}</span>
                    <span>{ag.activeTenancies} tenancies</span>
                    {ag.arrearsCount > 0 && <span className="text-destructive font-medium">{ag.arrearsCount} in arrears</span>}
                    <span>Trust: {fmt(ag.trustBalance)}{ag.trustBalance < 0 && ' ⚠ OVERDRAWN'}</span>
                    {ag.daysSinceRec !== null && (
                      <span className={ag.daysSinceRec > 30 ? 'text-amber-500 font-medium' : ''}>
                        Rec: {ag.daysSinceRec}d ago{ag.daysSinceRec > 30 && ' ⚠'}
                      </span>
                    )}
                    {ag.acceptedAt && <span>Connected {fmtDate(ag.acceptedAt)}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No agencies linked yet</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PartnerPerformance() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'issues'>('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();

      const [partnersRes, paRes, memberRes] = await Promise.all([
        supabase.from('partners').select('*').order('created_at', { ascending: false }),
        supabase.from('partner_agencies').select('partner_id, agency_id, status'),
        supabase.from('partner_members').select('partner_id'),
      ]);

      const allPartners = partnersRes.data || [];
      const allPA = paRes.data || [];
      const allMembers = memberRes.data || [];

      if (allPartners.length === 0) { setPartners([]); setLoading(false); return; }

      const allAgencyIds = [...new Set(allPA.map((r: any) => r.agency_id))];

      const agentsRes = allAgencyIds.length > 0
        ? await supabase.from('agents').select('id, agency_id').in('agency_id', allAgencyIds)
        : { data: [] as { id: string; agency_id: string }[] };

      const allAgents = agentsRes.data || [];
      const agentIds = allAgents.map((a: any) => a.id);

      const balancesRes = agentIds.length > 0
        ? await supabase.from('trust_account_balances').select('agent_id, current_balance, last_reconciled_date').in('agent_id', agentIds)
        : { data: [] as { agent_id: string; current_balance: number; last_reconciled_date: string | null }[] };

      const tenanciesRes = agentIds.length > 0
        ? await supabase.from('tenancies').select('agent_id, status').in('agent_id', agentIds)
        : { data: [] as { agent_id: string; status: string }[] };

      const agentToAgency = new Map<string, string>();
      const agentsByAgency = new Map<string, string[]>();
      allAgents.forEach((a: any) => {
        if (!a.agency_id) return;
        agentToAgency.set(a.id, a.agency_id);
        const arr = agentsByAgency.get(a.agency_id) || [];
        arr.push(a.id);
        agentsByAgency.set(a.agency_id, arr);
      });

      const trustByAgent = new Map<string, { balance: number; lastRec: string | null }>();
      (balancesRes.data || []).forEach((b: any) => {
        trustByAgent.set(b.agent_id, { balance: b.current_balance, lastRec: b.last_reconciled_date });
      });

      const activeTensByAgency = new Map<string, number>();
      const arrearsByAgency = new Map<string, number>();
      (tenanciesRes.data || []).forEach((t: any) => {
        const agId = agentToAgency.get(t.agent_id);
        if (!agId) return;
        if (t.status === 'active') activeTensByAgency.set(agId, (activeTensByAgency.get(agId) || 0) + 1);
        if (t.status === 'arrears') arrearsByAgency.set(agId, (arrearsByAgency.get(agId) || 0) + 1);
      });

      const rows: PartnerRow[] = allPartners.map((p: any) => {
        const myPA = allPA.filter((r: any) => r.partner_id === p.id);
        const myAgencyIds = myPA.map((r: any) => r.agency_id);
        const myAgentIds = myAgencyIds.flatMap((id: string) => agentsByAgency.get(id) || []);

        let overdueRecCount = 0;
        let overdrawCount = 0;
        myAgentIds.forEach((aid: string) => {
          const trust = trustByAgent.get(aid);
          if (!trust) return;
          if (trust.balance < 0) overdrawCount++;
          if (trust.lastRec) {
            const days = Math.floor((now.getTime() - new Date(trust.lastRec).getTime()) / 86400000);
            if (days > 30) overdueRecCount++;
          } else {
            overdueRecCount++;
          }
        });

        const activeTenancies = myAgencyIds.reduce((s: number, id: string) => s + (activeTensByAgency.get(id) || 0), 0);
        const arrearsCount = myAgencyIds.reduce((s: number, id: string) => s + (arrearsByAgency.get(id) || 0), 0);
        const memberCount = allMembers.filter((m: any) => m.partner_id === p.id).length;

        return {
          id: p.id,
          companyName: p.company_name,
          contactName: p.contact_name,
          contactEmail: p.contact_email,
          contactPhone: p.contact_phone,
          abn: p.abn,
          isVerified: p.is_verified,
          verifiedAt: p.verified_at,
          createdAt: p.created_at,
          agencyCount: myPA.length,
          activeAgencyCount: myPA.filter((r: any) => r.status === 'active').length,
          pendingAgencyCount: myPA.filter((r: any) => r.status === 'pending').length,
          totalAgents: myAgentIds.length,
          overdueRecCount,
          overdrawCount,
          activeTenancies,
          arrearsCount,
          memberCount,
          lastActivityAt: p.updated_at,
        };
      });

      setPartners(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = partners.filter(p => {
    if (filter === 'verified') return p.isVerified;
    if (filter === 'unverified') return !p.isVerified;
    if (filter === 'issues') return p.overdueRecCount > 0 || p.overdrawCount > 0 || p.arrearsCount > 0;
    return true;
  });

  const totalAgencies = partners.reduce((s, p) => s + p.agencyCount, 0);
  const totalAgents = partners.reduce((s, p) => s + p.totalAgents, 0);
  const totalArrears = partners.reduce((s, p) => s + p.arrearsCount, 0);
  const totalIssues = partners.filter(p => p.overdueRecCount > 0 || p.overdrawCount > 0 || p.arrearsCount > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Partner Performance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">All partner firms, linked agencies, trust health, and rent roll status</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Partner firms" value={partners.length} icon={Building2} sub={`${partners.filter(p => p.isVerified).length} verified`} />
        <KPI label="Linked agencies" value={totalAgencies} icon={Users} sub={`${totalAgents} agents total`} />
        <KPI label="Active tenancies" value={partners.reduce((s, p) => s + p.activeTenancies, 0)} icon={Clock} />
        <KPI label="Issues flagged" value={totalIssues} icon={AlertTriangle} color={totalIssues > 0 ? 'text-amber-500' : 'text-emerald-500'} sub={totalArrears > 0 ? `${totalArrears} tenancies in arrears` : 'All clear'} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'all' as const, label: `All (${partners.length})` },
          { key: 'verified' as const, label: `Verified (${partners.filter(p => p.isVerified).length})` },
          { key: 'unverified' as const, label: `Unverified (${partners.filter(p => !p.isVerified).length})` },
          { key: 'issues' as const, label: `Has Issues (${totalIssues})` },
        ]).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 size={32} className="text-muted-foreground mx-auto mb-3" strokeWidth={1.2} />
          <p className="text-sm text-muted-foreground">
            {partners.length === 0 ? 'No partner firms yet' : 'No partners match this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <PartnerRowComponent key={p.id} partner={p} />
          ))}
        </div>
      )}
    </div>
  );
}
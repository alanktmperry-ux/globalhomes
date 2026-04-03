import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  Calendar,
  AlertOctagon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type RiskLevel = 'critical' | 'warning' | 'ok';

interface AgentComplianceRow {
  id: string;
  name: string;
  email: string;
  agency: string | null;
  licenseNumber: string | null;
  licenceExpiryDate: string | null;
  handlesTrust: boolean;
  lastReconciledDate: string | null;
  daysSinceRec: number | null;
  recStatus: RiskLevel;
  trustBalance: number;
  balanceStatus: RiskLevel;
  largeTransactions: {
    id: string;
    amount: number;
    description: string;
    date: string;
  }[];
  amlStatus: RiskLevel;
  licenceStatus: RiskLevel;
  licenceDaysLeft: number | null;
  overallRisk: RiskLevel;
  riskScore: number;
}

interface SummaryStats {
  totalWithTrust: number;
  overdueRec: number;
  overdrawns: number;
  amlFlags: number;
  licenceExpiring: number;
  platformComplianceScore: number;
}

const fmt = (n: number) =>
  n.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

function riskBadge(level: RiskLevel, label: string) {
  const cls =
    level === 'critical'
      ? 'bg-destructive/10 text-destructive border-destructive/20'
      : level === 'warning'
      ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
      : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  const Icon =
    level === 'critical'
      ? XCircle
      : level === 'warning'
      ? AlertTriangle
      : CheckCircle2;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  level = 'ok',
  sub,
}: {
  label: string;
  value: string | number;
  icon: any;
  level?: RiskLevel;
  sub?: string;
}) {
  const color =
    level === 'critical'
      ? 'text-destructive'
      : level === 'warning'
      ? 'text-amber-500'
      : 'text-emerald-500';
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon size={14} className={color} />
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function AgentCompRow({ agent }: { agent: AgentComplianceRow }) {
  const [expanded, setExpanded] = useState(false);

  const rowBorder =
    agent.overallRisk === 'critical'
      ? 'border-destructive/30'
      : agent.overallRisk === 'warning'
      ? 'border-amber-500/30'
      : 'border-border';

  return (
    <div className={`bg-card border ${rowBorder} rounded-xl overflow-hidden transition-all`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/40 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            agent.overallRisk === 'critical'
              ? 'bg-destructive'
              : agent.overallRisk === 'warning'
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{agent.name}</div>
          <div className="text-xs text-muted-foreground truncate">{agent.agency || agent.email}</div>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {agent.handlesTrust &&
            riskBadge(
              agent.recStatus,
              agent.lastReconciledDate ? `Rec ${agent.daysSinceRec}d ago` : 'Never reconciled'
            )}
          {agent.handlesTrust &&
            riskBadge(
              agent.balanceStatus,
              agent.balanceStatus === 'critical' ? `Overdrawn ${fmt(agent.trustBalance)}` : 'Balance OK'
            )}
          {agent.amlStatus !== 'ok' &&
            riskBadge(
              agent.amlStatus,
              `${agent.largeTransactions.length} AML flag${agent.largeTransactions.length > 1 ? 's' : ''}`
            )}
          {agent.licenceStatus !== 'ok' &&
            riskBadge(
              agent.licenceStatus,
              agent.licenceDaysLeft !== null ? `Licence ${agent.licenceDaysLeft}d left` : 'No licence'
            )}
          {agent.overallRisk === 'ok' && riskBadge('ok', 'Compliant')}
        </div>

        <div className="text-center min-w-[50px]">
          <div
            className={`text-lg font-bold ${
              agent.riskScore >= 70
                ? 'text-destructive'
                : agent.riskScore >= 40
                ? 'text-amber-500'
                : 'text-emerald-500'
            }`}
          >
            {agent.riskScore}
          </div>
          <div className="text-[10px] text-muted-foreground">risk score</div>
        </div>

        <div className="text-muted-foreground">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar size={11} /> Bank Reconciliation
              </div>
              {agent.lastReconciledDate ? (
                <>
                  <div className="text-sm font-medium text-foreground">{fmtDate(agent.lastReconciledDate)}</div>
                  <div className="text-[11px] text-muted-foreground">{agent.daysSinceRec} days ago</div>
                </>
              ) : (
                <div className="text-sm text-destructive font-medium">Never reconciled</div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <DollarSign size={11} /> Trust Balance
              </div>
              <div className="text-sm font-medium text-foreground">{fmt(agent.trustBalance)}</div>
              {agent.trustBalance < 0 && (
                <div className="text-[11px] text-destructive font-semibold">⚠ OVERDRAWN</div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <FileText size={11} /> Licence
              </div>
              <div className="text-sm font-medium text-foreground">{agent.licenseNumber || 'Not entered'}</div>
              {agent.licenceExpiryDate ? (
                <div className="text-[11px] text-muted-foreground">Expires {fmtDate(agent.licenceExpiryDate)}</div>
              ) : (
                <div className="text-[11px] text-amber-500">No expiry date set</div>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertOctagon size={11} /> AML / CTF
              </div>
              {agent.largeTransactions.length > 0 ? (
                <>
                  <div className="text-sm font-medium text-amber-600">
                    {agent.largeTransactions.length} transaction{agent.largeTransactions.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-[11px] text-muted-foreground">≥ $10,000 — review required</div>
                </>
              ) : (
                <div className="text-sm text-emerald-500 font-medium">No flags</div>
              )}
            </div>
          </div>

          {agent.largeTransactions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Transactions ≥ $10,000 requiring AUSTRAC review
              </div>
              <div className="space-y-1">
                {agent.largeTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                    <span className="text-xs text-foreground">{t.description || 'No description'}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground">{fmtDate(t.date)}</span>
                      <span className="text-xs font-semibold text-foreground">{fmt(t.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <a
              href={`mailto:${agent.email}?subject=Trust accounting compliance reminder`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              <FileText size={11} />
              Email compliance reminder
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function exportCSV(agents: AgentComplianceRow[]) {
  const headers = [
    'Agent',
    'Agency',
    'Email',
    'Licence No.',
    'Licence Expiry',
    'Trust Active',
    'Last Reconciled',
    'Days Since Rec',
    'Trust Balance',
    'AML Flags',
    'Overall Risk',
    'Risk Score',
  ];
  const rows = agents.map((a) => [
    a.name,
    a.agency || '',
    a.email,
    a.licenseNumber || '',
    a.licenceExpiryDate ? fmtDate(a.licenceExpiryDate) : '',
    a.handlesTrust ? 'Yes' : 'No',
    a.lastReconciledDate ? fmtDate(a.lastReconciledDate) : 'Never',
    a.daysSinceRec ?? '',
    a.trustBalance,
    a.largeTransactions.length,
    a.overallRisk,
    a.riskScore,
  ]);
  const csv = [
    `ListHQ Compliance & Risk Report — ${new Date().toLocaleDateString('en-AU')}`,
    '',
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `listhq-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ComplianceMonitor() {
  const [agents, setAgents] = useState<AgentComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'ok'>('all');
  const [summary, setSummary] = useState<SummaryStats | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const AML_THRESHOLD = 10000;

      const [agentsRes, balancesRes, transactionsRes] = await Promise.all([
        supabase
          .from('agents')
          .select('id, name, email, agency, license_number, licence_expiry_date, handles_trust_accounting'),
        supabase.from('trust_account_balances').select('agent_id, current_balance, last_reconciled_date'),
        supabase
          .from('trust_transactions')
          .select('id, trust_account_id, amount, description, created_at')
          .gte('amount', AML_THRESHOLD)
          .order('created_at', { ascending: false }),
      ]);

      const trustAccRes = await supabase.from('trust_accounts').select('id, agent_id');

      const trustAccountToAgent = new Map<string, string>();
      (trustAccRes.data || []).forEach((ta: any) => {
        if (ta.agent_id) trustAccountToAgent.set(ta.id, ta.agent_id);
      });

      const amlByAgent = new Map<string, any[]>();
      (transactionsRes.data || []).forEach((t: any) => {
        const agentId = trustAccountToAgent.get(t.trust_account_id);
        if (!agentId) return;
        const arr = amlByAgent.get(agentId) || [];
        arr.push(t);
        amlByAgent.set(agentId, arr);
      });

      const balanceByAgent = new Map<string, { balance: number; lastRec: string | null }>();
      (balancesRes.data || []).forEach((b: any) => {
        balanceByAgent.set(b.agent_id, {
          balance: b.current_balance,
          lastRec: b.last_reconciled_date,
        });
      });

      const rows: AgentComplianceRow[] = (agentsRes.data || []).map((a: any) => {
        const bal = balanceByAgent.get(a.id);
        const trustBalance = bal?.balance ?? 0;
        const lastReconciledDate = bal?.lastRec || null;
        const daysSinceRec = lastReconciledDate
          ? Math.floor((now.getTime() - new Date(lastReconciledDate).getTime()) / 86400000)
          : null;

        const recStatus: RiskLevel = !a.handles_trust_accounting
          ? 'ok'
          : daysSinceRec === null
          ? 'critical'
          : daysSinceRec > 30
          ? 'critical'
          : daysSinceRec > 14
          ? 'warning'
          : 'ok';

        const balanceStatus: RiskLevel = trustBalance < 0 ? 'critical' : 'ok';

        const amlTxns = amlByAgent.get(a.id) || [];
        const amlStatus: RiskLevel = amlTxns.length > 0 ? 'warning' : 'ok';

        let licenceStatus: RiskLevel = 'ok';
        let licenceDaysLeft: number | null = null;
        if (a.licence_expiry_date) {
          licenceDaysLeft = Math.ceil(
            (new Date(a.licence_expiry_date).getTime() - now.getTime()) / 86400000
          );
          if (licenceDaysLeft <= 0) licenceStatus = 'critical';
          else if (licenceDaysLeft <= 30) licenceStatus = 'critical';
          else if (licenceDaysLeft <= 90) licenceStatus = 'warning';
        }

        const overallRisk: RiskLevel =
          recStatus === 'critical' || balanceStatus === 'critical' || licenceStatus === 'critical'
            ? 'critical'
            : recStatus === 'warning' || amlStatus === 'warning' || licenceStatus === 'warning'
            ? 'warning'
            : 'ok';

        let riskScore = 0;
        if (recStatus === 'critical') riskScore += 35;
        else if (recStatus === 'warning') riskScore += 20;
        if (balanceStatus === 'critical') riskScore += 35;
        if (amlStatus === 'warning') riskScore += 20;
        if (licenceStatus === 'critical') riskScore += 30;
        else if (licenceStatus === 'warning') riskScore += 15;
        riskScore = Math.min(100, riskScore);

        return {
          id: a.id,
          name: a.name,
          email: a.email,
          agency: a.agency,
          licenseNumber: a.license_number,
          licenceExpiryDate: a.licence_expiry_date,
          handlesTrust: a.handles_trust_accounting || false,
          lastReconciledDate,
          daysSinceRec,
          recStatus,
          trustBalance,
          balanceStatus,
          largeTransactions: amlTxns.map((t: any) => ({
            id: t.id,
            amount: t.amount,
            description: t.description,
            date: t.created_at,
          })),
          amlStatus,
          licenceStatus,
          licenceDaysLeft,
          overallRisk,
          riskScore,
        };
      });

      rows.sort((a, b) => b.riskScore - a.riskScore);
      setAgents(rows);

      const withTrust = rows.filter((r) => r.handlesTrust);
      const complianceScores = rows.map((r) => 100 - r.riskScore);
      const platformScore =
        complianceScores.length > 0
          ? Math.round(complianceScores.reduce((s, v) => s + v, 0) / complianceScores.length)
          : 100;

      setSummary({
        totalWithTrust: withTrust.length,
        overdueRec: rows.filter((r) => r.recStatus === 'critical').length,
        overdrawns: rows.filter((r) => r.balanceStatus === 'critical').length,
        amlFlags: rows.filter((r) => r.amlStatus === 'warning').length,
        licenceExpiring: rows.filter((r) => r.licenceStatus !== 'ok').length,
        platformComplianceScore: platformScore,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = agents.filter((a) => {
    if (filter === 'all') return true;
    return a.overallRisk === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Compliance & Risk Monitor</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trust accounting, AML/CTF, licence expiry — CEO liability overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(agents)} className="gap-1.5 text-xs">
            <Download size={13} />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5 text-xs">
            <RefreshCw size={13} />
            Refresh
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard
            label="Platform Score"
            value={`${summary.platformComplianceScore}%`}
            icon={Shield}
            level={
              summary.platformComplianceScore >= 80
                ? 'ok'
                : summary.platformComplianceScore >= 60
                ? 'warning'
                : 'critical'
            }
            sub="Compliance health"
          />
          <SummaryCard
            label="Overdue Rec."
            value={summary.overdueRec}
            icon={Clock}
            level={summary.overdueRec > 0 ? 'critical' : 'ok'}
            sub="30+ days overdue"
          />
          <SummaryCard
            label="Overdrawns"
            value={summary.overdrawns}
            icon={DollarSign}
            level={summary.overdrawns > 0 ? 'critical' : 'ok'}
            sub="Negative balance"
          />
          <SummaryCard
            label="AML Flags"
            value={summary.amlFlags}
            icon={AlertOctagon}
            level={summary.amlFlags > 0 ? 'warning' : 'ok'}
            sub="≥$10k transactions"
          />
          <SummaryCard
            label="Licence Issues"
            value={summary.licenceExpiring}
            icon={FileText}
            level={summary.licenceExpiring > 0 ? 'warning' : 'ok'}
            sub="Expiring or missing"
          />
        </div>
      )}

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-muted-foreground">
        <span className="font-semibold text-amber-600">CEO Liability Note:</span> Under the{' '}
        <span className="font-medium">Estate Agents Act 1980</span> (Vic) and equivalent state legislation,
        principal licensees are personally liable for trust accounting breaches. Bank reconciliations must be
        completed monthly. AUSTRAC reporting is mandatory for transactions ≥ $10,000 under the{' '}
        <span className="font-medium">AML/CTF Act 2006</span> (Cth). Licence expiry results in immediate
        trading cessation.
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: 'all', label: `All agents (${agents.length})` },
            {
              key: 'critical',
              label: `Critical (${agents.filter((a) => a.overallRisk === 'critical').length})`,
            },
            {
              key: 'warning',
              label: `Warning (${agents.filter((a) => a.overallRisk === 'warning').length})`,
            },
            { key: 'ok', label: `Compliant (${agents.filter((a) => a.overallRisk === 'ok').length})` },
          ] as { key: typeof filter; label: string }[]
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No agents match this filter.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <AgentCompRow key={a.id} agent={a} />
          ))}
        </div>
      )}
    </div>
  );
}

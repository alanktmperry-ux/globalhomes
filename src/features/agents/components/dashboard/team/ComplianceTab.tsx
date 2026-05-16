import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTeamAgents, TeamAgent } from '@/features/agents/hooks/useTeamAgents';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const Ico = ({ icon, size = 16, color }: { icon: string; size?: number; color?: string }) =>
  // @ts-expect-error iconify web component
  <iconify-icon icon={icon} width={size} height={size} style={{ color, display: 'inline-block' }} />;

type Urgency = 'compliant' | 'due_soon' | 'overdue' | 'missing';

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function agentUrgency(agent: TeamAgent): { urgency: Urgency; issues: string[] } {
  const issues: string[] = [];
  let urgency: Urgency = 'compliant';

  const licDays = daysUntil(agent.licence_expiry_date);
  if (licDays === null) { issues.push('No licence expiry set'); urgency = 'missing'; }
  else if (licDays < 0) { issues.push(`Licence expired ${Math.abs(licDays)}d`); urgency = 'overdue'; }
  else if (licDays < 60) { issues.push(`Licence due in ${licDays}d`); if (urgency === 'compliant') urgency = 'due_soon'; }

  if (agent.cpd_hours_completed < agent.cpd_hours_required) {
    issues.push(`CPD ${agent.cpd_hours_completed}/${agent.cpd_hours_required}h`);
    if (urgency === 'compliant') urgency = 'due_soon';
  }

  const piDays = daysUntil(agent.professional_indemnity_expiry);
  if (piDays !== null) {
    if (piDays < 0) { issues.push(`PI insurance expired ${Math.abs(piDays)}d`); urgency = 'overdue'; }
    else if (piDays < 60) { issues.push(`PI due in ${piDays}d`); if (urgency === 'compliant') urgency = 'due_soon'; }
  }

  return { urgency, issues };
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function urgencyDateColor(d: string | null) {
  const days = daysUntil(d);
  if (days === null) return '#6a6a6a';
  if (days < 0) return '#DC2626';
  if (days < 60) return '#D97706';
  return '#065F46';
}

export default function ComplianceTab() {
  const { agents, loading, refetch } = useTeamAgents();
  const [editAgent, setEditAgent] = useState<TeamAgent | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | Urgency>('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    license_number: '',
    licence_expiry_date: '',
    cpd_hours_completed: 0,
    cpd_hours_required: 12,
    professional_indemnity_expiry: '',
  });

  const enriched = useMemo(() => agents.map(a => ({ agent: a, ...agentUrgency(a) })), [agents]);

  const counts = useMemo(() => {
    const c = { compliant: 0, due_soon: 0, overdue: 0, missing: 0 };
    enriched.forEach(e => { c[e.urgency]++; });
    return c;
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter(e => {
      if (filter !== 'all' && e.urgency !== filter) return false;
      if (search && !e.agent.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [enriched, filter, search]);

  const openEdit = (agent: TeamAgent) => {
    setEditAgent(agent);
    setForm({
      license_number: agent.license_number || '',
      licence_expiry_date: agent.licence_expiry_date || '',
      cpd_hours_completed: agent.cpd_hours_completed,
      cpd_hours_required: agent.cpd_hours_required,
      professional_indemnity_expiry: agent.professional_indemnity_expiry || '',
    });
  };

  const handleSave = async () => {
    if (!editAgent) return;
    setSaving(true);
    const { error } = await supabase
      .from('agents')
      .update({
        license_number: form.license_number || null,
        licence_expiry_date: form.licence_expiry_date || null,
        cpd_hours_completed: form.cpd_hours_completed,
        cpd_hours_required: form.cpd_hours_required,
        professional_indemnity_expiry: form.professional_indemnity_expiry || null,
      } as any)
      .eq('id', editAgent.id);
    setSaving(false);
    if (error) { toast.error('Failed to update compliance data'); return; }
    toast.success('Compliance data updated');
    setEditAgent(null);
    refetch();
  };

  const exportCsv = () => {
    const headers = ['Agent', 'Licence #', 'Licence Expiry', 'CPD Completed', 'CPD Required', 'PI Expiry', 'Status'];
    const rows = enriched.map(({ agent, issues }) => [
      agent.name,
      agent.license_number || '',
      agent.licence_expiry_date || '',
      agent.cpd_hours_completed,
      agent.cpd_hours_required,
      agent.professional_indemnity_expiry || '',
      issues.length === 0 ? 'Compliant' : issues.join('; '),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#2563EB]" size={28} /></div>;
  }

  const overdueCount = counts.overdue;
  const dueSoonCount = counts.due_soon + counts.missing;

  const statCards = [
    { key: 'compliant', label: 'COMPLIANT', value: counts.compliant, sub: `of ${enriched.length} agents`, icon: 'solar:shield-check-bold', iconColor: '#065F46', iconBg: '#ECFDF5', highlight: false },
    { key: 'due_soon', label: 'DUE SOON', value: dueSoonCount, sub: 'expiring in next 60 days', icon: 'solar:clock-circle-bold', iconColor: '#D97706', iconBg: '#FFFBEB', highlight: dueSoonCount > 0, highlightColor: '#D97706' },
    { key: 'overdue', label: 'OVERDUE', value: overdueCount, sub: 'past renewal — action required', icon: 'solar:danger-triangle-bold', iconColor: '#DC2626', iconBg: '#FEF2F2', highlight: overdueCount > 0, highlightColor: '#DC2626' },
    { key: 'agents', label: 'ACTIVE AGENTS', value: enriched.length, sub: 'tracked across the agency', icon: 'solar:users-group-rounded-bold', iconColor: '#2563EB', iconBg: '#EFF6FF', highlight: false },
  ] as const;

  const filterChips: { key: 'all' | Urgency; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'compliant', label: 'Compliant' },
    { key: 'due_soon', label: 'Due soon' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'missing', label: 'Missing data' },
  ];

  const urgencyPill = (u: Urgency, issues: string[]) => {
    if (u === 'compliant') return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.10em] bg-[#ECFDF5] text-[#065F46]">
        <CheckCircle2 size={11} style={{ display: 'inline-flex', flexShrink: 0 }} /> Compliant
      </span>
    );
    if (u === 'overdue') return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.10em] bg-[#FEF2F2] text-[#991B1B]">
        <AlertTriangle size={11} style={{ display: 'inline-flex', flexShrink: 0 }} /> Overdue
      </span>
    );
    if (u === 'missing') return (
      <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.10em] bg-[#F3F4F6] text-[#374151]">Missing data</span>
    );
    return (
      <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.10em] bg-[#FFFBEB] text-[#92400E]">{issues[0] || 'Due soon'}</span>
    );
  };

  return (
    <div className="max-w-[1480px] mx-auto px-0 md:px-0 py-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 flex-wrap mb-8">
        <div>
          <h1 className="font-extrabold tracking-[-0.04em] text-[#0a0f1e]" style={{ fontSize: 'clamp(32px,4vw,48px)' }}>
            Compliance
          </h1>
          <p className="text-[14px] text-[#6a6a6a] font-medium mt-2 max-w-[640px]">
            Agent licences, CPD hours, and professional indemnity — every legal requirement, every team member, tracked automatically.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCsv} className="inline-flex items-center gap-2 bg-white border border-[#E5E5E5] rounded-full px-4 py-2.5 text-[13px] font-bold text-[#0a0f1e] hover:border-[#0a0f1e] transition">
            <Download size={16} style={{ display: 'inline-flex', flexShrink: 0 }} /> Export report
          </button>
          <button className="inline-flex items-center gap-2 bg-white border border-[#E5E5E5] rounded-full px-4 py-2.5 text-[13px] font-bold text-[#0a0f1e] hover:border-[#0a0f1e] transition" onClick={() => agents[0] && openEdit(agents[0])}>
            <UserPlus size={16} style={{ display: 'inline-flex', flexShrink: 0 }} /> Add credentials
          </button>
          <button onClick={() => agents.find(a => agentUrgency(a).urgency === 'overdue' || agentUrgency(a).urgency === 'due_soon') && openEdit(agents.find(a => agentUrgency(a).urgency === 'overdue' || agentUrgency(a).urgency === 'due_soon')!)} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:shadow-[0_8px_28px_rgba(37,99,235,0.45)] transition" style={{ background: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)' }}>
            <ShieldCheck size={16} style={{ display: 'inline-flex', flexShrink: 0 }} /> Schedule review
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(c => (
          <div key={c.key} className="bg-white rounded-3xl border border-[#E5E5E5] p-5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: c.iconBg }}>
              <Ico icon={c.icon} size={20} color={c.iconColor} />
            </div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold mt-4">{c.label}</div>
            <div className="font-extrabold tabular-nums mt-2" style={{ fontSize: 36, color: c.highlight ? (c as any).highlightColor : '#0a0f1e' }}>{c.value}</div>
            <div className="text-[12px] text-[#6a6a6a] mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Banners */}
      {overdueCount > 0 && (
        <div className="mb-8 bg-[#FEF2F2] border border-[#DC2626]/25 rounded-3xl p-5 flex items-center gap-5 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0">
            <AlertTriangle size={24} style={{ display: 'inline-flex', flexShrink: 0 }} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[15px] font-extrabold text-[#991B1B]">{overdueCount} compliance {overdueCount === 1 ? 'item is' : 'items are'} overdue</div>
            <div className="text-[13px] text-[#991B1B]/85">Agents may face legal exposure. Renew licences or insurance now to restore compliance.</div>
          </div>
          <button onClick={() => setFilter('overdue')} className="bg-[#DC2626] text-white rounded-full px-5 py-2.5 text-[13px] font-bold hover:bg-[#991B1B] transition">Review overdue</button>
        </div>
      )}
      {overdueCount === 0 && dueSoonCount > 0 && (
        <div className="mb-8 bg-[#FFFBEB] border border-[#F59E0B]/25 rounded-3xl p-5 flex items-center gap-5 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0">
            <Clock size={24} style={{ display: 'inline-flex', flexShrink: 0 }} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[15px] font-extrabold text-[#92400E]">{dueSoonCount} {dueSoonCount === 1 ? 'item' : 'items'} due in the next 60 days</div>
            <div className="text-[13px] text-[#92400E]/85">Schedule renewals now to avoid lapses.</div>
          </div>
          <button onClick={() => setFilter('due_soon')} className="bg-[#D97706] text-white rounded-full px-5 py-2.5 text-[13px] font-bold hover:bg-[#92400E] transition">Review upcoming</button>
        </div>
      )}

      {/* Filter strip */}
      <div className="bg-white border border-[#E5E5E5] rounded-3xl p-3 flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {filterChips.map(c => {
            const active = filter === c.key;
            return (
              <button key={c.key} onClick={() => setFilter(c.key)} className={`px-4 py-2 rounded-full text-[13px] font-semibold transition ${active ? 'bg-[#0a0f1e] text-white' : 'bg-[#F9FAFB] text-[#6a6a6a] hover:text-[#0a0f1e]'}`}>
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <div className="relative flex-1 max-w-[280px] min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><Search size={16} style={{ display: 'inline-flex', flexShrink: 0 }} /></span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by agent name..."
            className="w-full bg-[#F9FAFB] rounded-full pl-9 pr-4 py-2.5 text-[13px] text-[#0a0f1e] placeholder:text-[#9ca3af] border border-transparent focus:border-[#E5E5E5] focus:bg-white outline-none"
          />
        </div>
      </div>

      {/* Items grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E5E5E5] py-20 px-8 text-center">
          <div className="flex justify-center"><ShieldCheck size={56} style={{ display: 'inline-flex', flexShrink: 0 }} /></div>
          <h3 className="text-[22px] font-bold text-[#0a0f1e] mt-6">No compliance records to show</h3>
          <p className="text-[14px] text-[#6a6a6a] max-w-[460px] mx-auto leading-[1.55] mt-3">
            {enriched.length === 0
              ? "Add agents to your team and ListHQ will auto-generate a compliance schedule based on your state's regulator rules."
              : 'No agents match the current filters. Try a different urgency or clear your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map(({ agent, urgency, issues }) => (
            <div key={agent.id} className="bg-white rounded-3xl border border-[#E5E5E5] p-6 transition hover:border-[#2563EB]/40 hover:shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
              {/* Top row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold">Agent licence</span>
                </div>
                {urgencyPill(urgency, issues)}
              </div>

              {/* Middle */}
              <div className="mt-3">
                <div className="text-[18px] font-extrabold text-[#0a0f1e] tracking-[-0.02em] leading-tight">{agent.name}</div>
                <div className="text-[12px] text-[#6a6a6a] mt-1">{agent.license_number ? `Licence #${agent.license_number}` : 'No licence number on file'}</div>
              </div>

              {/* Detail rows */}
              <div className="mt-5 space-y-3 text-[13px]">
                <div className="flex items-center gap-3">
                  <Calendar size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
                  <span className="text-[#6a6a6a] flex-1">Licence expiry</span>
                  <span className="font-bold" style={{ color: urgencyDateColor(agent.licence_expiry_date) }}>{fmtDate(agent.licence_expiry_date)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Bell size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
                  <span className="text-[#6a6a6a] flex-1">CPD hours</span>
                  <span className="font-bold" style={{ color: agent.cpd_hours_completed >= agent.cpd_hours_required ? '#065F46' : '#D97706' }}>
                    {agent.cpd_hours_completed}/{agent.cpd_hours_required}h
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <UserCheck size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
                  <span className="text-[#6a6a6a] flex-1">PI insurance</span>
                  <span className="font-bold" style={{ color: urgencyDateColor(agent.professional_indemnity_expiry) }}>{fmtDate(agent.professional_indemnity_expiry)}</span>
                </div>
              </div>

              {/* Issues pill */}
              {issues.length > 0 && (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#F9FAFB] border border-[#E5E5E5]">
                  <Info size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
                  <span className="text-[12px] font-medium text-[#374151] flex-1 truncate">{issues.join(' · ')}</span>
                </div>
              )}

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-[#F3F4F6] flex items-center justify-between">
                <button className="text-[12px] text-[#6a6a6a] hover:text-[#2563EB] transition">Audit trail</button>
                {urgency === 'compliant' ? (
                  <button onClick={() => openEdit(agent)} className="rounded-full border border-[#E5E5E5] px-4 py-2 text-[12px] font-bold text-[#0a0f1e] hover:border-[#0a0f1e] transition">View details</button>
                ) : urgency === 'overdue' ? (
                  <button onClick={() => openEdit(agent)} className="bg-[#DC2626] text-white rounded-full px-4 py-2 text-[12px] font-bold hover:bg-[#991B1B] transition">Renew now →</button>
                ) : (
                  <button onClick={() => openEdit(agent)} className="bg-[#D97706] text-white rounded-full px-4 py-2 text-[12px] font-bold hover:bg-[#92400E] transition">Schedule renewal →</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Dialog open={!!editAgent} onOpenChange={() => setEditAgent(null)}>
        <DialogContent className="sm:max-w-[520px] bg-white rounded-3xl border-0 p-7 shadow-[0_30px_90px_rgba(0,0,0,0.15)]">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
              <ShieldCheck size={22} style={{ display: 'inline-flex', flexShrink: 0 }} />
            </div>
            <h3 className="text-[20px] font-extrabold text-[#0a0f1e] mt-4 tracking-[-0.02em]">Edit compliance</h3>
            <p className="text-[13px] text-[#6a6a6a] mt-1">{editAgent?.name}</p>
          </div>

          <div className="space-y-4 mt-6">
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold">Licence number</label>
              <input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} className="mt-2 w-full bg-[#F9FAFB] border border-[#E5E5E5] rounded-2xl px-4 py-2.5 text-[14px] text-[#0a0f1e] focus:bg-white focus:border-[#0a0f1e] outline-none" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold">Licence expiry date</label>
              <input type="date" value={form.licence_expiry_date} onChange={e => setForm(f => ({ ...f, licence_expiry_date: e.target.value }))} className="mt-2 w-full bg-[#F9FAFB] border border-[#E5E5E5] rounded-2xl px-4 py-2.5 text-[14px] text-[#0a0f1e] focus:bg-white focus:border-[#0a0f1e] outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold">CPD completed</label>
                <input type="number" value={form.cpd_hours_completed} onChange={e => setForm(f => ({ ...f, cpd_hours_completed: parseInt(e.target.value) || 0 }))} className="mt-2 w-full bg-[#F9FAFB] border border-[#E5E5E5] rounded-2xl px-4 py-2.5 text-[14px] text-[#0a0f1e] focus:bg-white focus:border-[#0a0f1e] outline-none" />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold">CPD required</label>
                <input type="number" value={form.cpd_hours_required} onChange={e => setForm(f => ({ ...f, cpd_hours_required: parseInt(e.target.value) || 12 }))} className="mt-2 w-full bg-[#F9FAFB] border border-[#E5E5E5] rounded-2xl px-4 py-2.5 text-[14px] text-[#0a0f1e] focus:bg-white focus:border-[#0a0f1e] outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#6a6a6a] font-bold">PI insurance expiry</label>
              <input type="date" value={form.professional_indemnity_expiry} onChange={e => setForm(f => ({ ...f, professional_indemnity_expiry: e.target.value }))} className="mt-2 w-full bg-[#F9FAFB] border border-[#E5E5E5] rounded-2xl px-4 py-2.5 text-[14px] text-[#0a0f1e] focus:bg-white focus:border-[#0a0f1e] outline-none" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-7">
            <button onClick={() => setEditAgent(null)} className="rounded-full border border-[#E5E5E5] px-5 py-2.5 text-[13px] font-bold text-[#0a0f1e] hover:border-[#0a0f1e] transition">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(37,99,235,0.35)] hover:shadow-[0_8px_28px_rgba(37,99,235,0.45)] transition disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%)' }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} style={{ display: 'inline-flex', flexShrink: 0 }} />}
              Save changes
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

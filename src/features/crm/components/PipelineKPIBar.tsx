import { useCRMLeads } from '../hooks/useCRMLeads';
import type { LeadStage } from '../types';

export function PipelineKPIBar() {
  const { leads, loading } = useCRMLeads({ stage: 'all' });

  if (loading) return <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />;

  const active = leads.filter(l => !['settled', 'lost'].includes(l.stage));
  const hotLeads = active.filter(l => l.priority === 'high').length;
  const totalValue = active.reduce((sum, l) => sum + (l.budget_max ?? 0), 0);
  const overdue = active.filter(l =>
    !l.last_contacted || (Date.now() - new Date(l.last_contacted).getTime()) > 7 * 86400000
  ).length;
  const settled30d = leads.filter(l =>
    l.stage === 'settled' &&
    (Date.now() - new Date(l.updated_at).getTime()) < 30 * 86400000
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: 'Active Leads', value: active.length, sub: `${hotLeads} hot`, color: 'text-foreground' },
        { label: 'Pipeline Value', value: `$${(totalValue / 1_000_000).toFixed(1)}m`, sub: 'combined budget', color: 'text-foreground' },
        { label: 'Needs Contact', value: overdue, sub: 'no contact 7+ days', color: overdue > 0 ? 'text-destructive' : 'text-foreground' },
        { label: 'Settled (30d)', value: settled30d, sub: 'this month', color: 'text-primary' },
      ].map(({ label, value, sub, color }) => (
        <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
      ))}
    </div>
  );
}

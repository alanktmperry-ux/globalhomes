import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, Trash2, Share2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCmaReports } from '@/features/market/hooks/useCmaReport';
import { toast } from 'sonner';
import DashboardHeader from '@/features/agents/components/dashboard/DashboardHeader';

const formatAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

const CmaDashboardPage = () => {
  const navigate = useNavigate();
  const { reports, loading, deleteReport } = useCmaReports();

  return (
    <div>
      <DashboardHeader
        title="CMA Reports"
        subtitle="Comparative Market Analyses for vendor presentations"
        actions={
          <Button size="sm" onClick={() => navigate('/dashboard/cma/new')} className="gap-1.5 text-xs">
            <Plus size={14} /> New CMA
          </Button>
        }
      />
      <div className="p-4 sm:p-6 max-w-5xl">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">No CMA reports yet.</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/cma/new')} className="mt-4 gap-1.5">
              <Plus size={14} /> Create your first CMA
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/dashboard/cma/${r.id}`)}>
                  <p className="text-sm font-medium text-foreground truncate">{r.subject_address}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.subject_suburb}, {r.subject_state} · {r.subject_bedrooms ?? '?'} bed {r.subject_property_type}
                    {r.agent_recommended_price ? ` · ${formatAUD(r.agent_recommended_price)}` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(r.created_at).toLocaleDateString('en-AU')}
                    {r.is_shared && <span className="ml-2 text-primary">● Shared</span>}
                    {r.view_count > 0 && ` · ${r.view_count} views`}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/cma/${r.id}`)}><Eye size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={async () => { await deleteReport(r.id); toast.success('Deleted'); }}><Trash2 size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CmaDashboardPage;

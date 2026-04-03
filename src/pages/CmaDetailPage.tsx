import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCmaReportById } from '@/features/market/hooks/useCmaReport';
import { CmaReportView } from '@/features/market/components/CmaReportView';
import { CmaSharePanel } from '@/features/market/components/CmaSharePanel';
import { useState } from 'react';
import type { CmaReport } from '@/types/market';

const CmaDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { report, comparables, loading } = useCmaReportById(id);
  const [localReport, setLocalReport] = useState<CmaReport | null>(null);
  const displayReport = localReport ?? report;

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!displayReport) return <div className="text-center py-24 text-muted-foreground">CMA report not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/cma')} className="gap-1.5 text-xs">
        <ArrowLeft size={14} /> All CMA Reports
      </Button>
      <CmaReportView report={displayReport} comparables={comparables} isAgentView={true} />
      <CmaSharePanel report={displayReport} onUpdate={setLocalReport} />
    </div>
  );
};

export default CmaDetailPage;

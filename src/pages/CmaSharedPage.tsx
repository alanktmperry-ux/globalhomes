import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useSharedCma } from '@/features/market/hooks/useCmaReport';
import { CmaReportView } from '@/features/market/components/CmaReportView';

const CmaSharedPage = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { report, comparables, loading } = useSharedCma(shareToken);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  if (!report) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-4">
        <p className="text-lg font-semibold text-foreground">Report not found</p>
        <p className="text-sm text-muted-foreground mt-2">This link may have expired or sharing has been disabled.</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{report.report_title} — {report.subject_address}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="px-4 py-8">
        <CmaReportView report={report} comparables={comparables} isAgentView={false} />
      </div>
    </>
  );
};

export default CmaSharedPage;

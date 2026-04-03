import { CmaBuilder } from '@/features/market/components/CmaBuilder';
import DashboardHeader from '@/features/agents/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CmaNewPage = () => {
  const navigate = useNavigate();
  return (
    <div>
      <DashboardHeader
        title="New CMA Report"
        subtitle="Build a Comparative Market Analysis"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/cma')} className="gap-1.5 text-xs">
            <ArrowLeft size={14} /> Back
          </Button>
        }
      />
      <div className="p-4 sm:p-6">
        <CmaBuilder />
      </div>
    </div>
  );
};

export default CmaNewPage;

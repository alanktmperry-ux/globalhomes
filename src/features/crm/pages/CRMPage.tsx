import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PipelineBoard } from '../components/PipelineBoard';
import { CRMListView } from '../components/CRMListView';
import { PipelineKPIBar } from '../components/PipelineKPIBar';
import { CRMTasksWidget } from '../components/CRMTasksWidget';
import { DailyCallList } from '../components/DailyCallList';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { LayoutList, Kanban, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UrgencyTier } from '../lib/urgency';
import type { CRMLead } from '../types';

export default function CRMPage() {
  const [view, setView] = useState<'board' | 'list'>('board');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyTier[]>([]);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);

  const handleUrgencyTileClick = (tier: UrgencyTier) => {
    setUrgencyFilter([tier]);
    setView('list');
  };

  return (
    <>
      <Helmet>
        <title>Buyer Pipeline — ListHQ</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0a0f1e] tracking-tight mb-1">Buyer Pipeline</h1>
            <p className="text-sm font-light text-[#6B7280] mb-8">
              All leads auto-synced from enquiries, open homes, and EOIs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/crm/import"
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-sm font-medium text-[#374151] hover:bg-[#F3F4F6] transition"
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
            >
              <Upload size={14} /> Import contacts
            </Link>
            <button
              onClick={() => setView('board')}
              className={`p-2 rounded-[10px] transition ${
                view === 'board'
                  ? 'bg-[#2563EB] text-white border border-[#2563EB]'
                  : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#0a0f1e]'
              }`}
              title="Kanban view"
            >
              <Kanban size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-[10px] transition ${
                view === 'list'
                  ? 'bg-[#2563EB] text-white border border-[#2563EB]'
                  : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#0a0f1e]'
              }`}
              title="List view"
            >
              <LayoutList size={16} />
            </button>
          </div>
        </div>

        <PipelineKPIBar onUrgencyClick={handleUrgencyTileClick} />

        <div className="flex gap-6 flex-col lg:flex-row">
          <div className="flex-1 min-w-0">
            {view === 'board'
              ? <PipelineBoard />
              : <CRMListView urgencyFilter={urgencyFilter} onUrgencyFilterChange={setUrgencyFilter} />}
          </div>
          <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
            <DailyCallList onSelectLead={(lead) => setSelectedLead(lead)} />
            <CRMTasksWidget />
          </div>
        </div>
      </div>
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={() => setSelectedLead(null)}
        />
      )}
    </>
  );
}

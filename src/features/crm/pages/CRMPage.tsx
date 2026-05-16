import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PipelineBoard } from '../components/PipelineBoard';
import { CRMListView } from '../components/CRMListView';
import { PipelineKPIBar } from '../components/PipelineKPIBar';
import { CRMTasksWidget } from '../components/CRMTasksWidget';
import { DailyCallList } from '../components/DailyCallList';
import { LeadDetailModal } from '../components/LeadDetailModal';
import LeadContactForm from '@/shared/components/LeadContactForm';
import { useAgentId } from '../hooks/useAgentId';
import { useCRMLeads } from '../hooks/useCRMLeads';
import { Link } from 'react-router-dom';
import { List, LayoutGrid, Upload, UserPlus } from 'lucide-react';
import type { UrgencyTier } from '../lib/urgency';
import type { CRMLead } from '../types';

export default function CRMPage() {
  const [view, setView] = useState<'board' | 'list'>('list');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyTier[]>([]);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const agentId = useAgentId();
  const { leads } = useCRMLeads({ stage: 'all' });
  const activeCount = leads.filter((l) => !['settled', 'lost'].includes(l.stage)).length;

  const handleUrgencyTileClick = (tier: UrgencyTier) => {
    setUrgencyFilter([tier]);
    setView('list');
  };

  return (
    <>
      <Helmet>
        <title>Buyer Pipeline — ListHQ</title>
      </Helmet>

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-6 flex-wrap mb-8">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="font-extrabold tracking-[-0.04em] text-[#0a0f1e]"
                style={{ fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.05 }}
              >
                Buyer Pipeline
              </h1>
              <span className="bg-[#EFF6FF] border border-[#2563EB]/15 text-[#1E40AF] rounded-full px-3 py-1 text-[12px] font-bold">
                {activeCount} active {activeCount === 1 ? 'buyer' : 'buyers'}
              </span>
            </div>
            <p className="text-[14px] text-[#6a6a6a] font-medium mt-2 max-w-[640px]">
              Every buyer who's interacted with your listings, scored and ranked by intent.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="bg-[#F9FAFB] rounded-full p-1 flex items-center">
              <button
                type="button"
                onClick={() => setView('list')}
                aria-label="List view"
                className={
                  view === 'list'
                    ? 'w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)] text-[#0a0f1e]'
                    : 'w-9 h-9 rounded-full flex items-center justify-center text-[#6a6a6a]'
                }
              >
                <List size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
              </button>
              <button
                type="button"
                onClick={() => setView('board')}
                aria-label="Kanban view"
                className={
                  view === 'board'
                    ? 'w-9 h-9 rounded-full flex items-center justify-center bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08)] text-[#0a0f1e]'
                    : 'w-9 h-9 rounded-full flex items-center justify-center text-[#6a6a6a]'
                }
              >
                <LayoutGrid size={16} style={{ display: 'inline-flex', flexShrink: 0 }} />
              </button>
            </div>

            <Link
              to="/dashboard/crm/import"
              className="text-[#374151] border border-[#E5E5E5] bg-white rounded-full px-4 py-2 text-[13px] font-bold hover:border-[#2563EB] hover:text-[#2563EB] transition-all inline-flex items-center gap-2"
            >
              <Upload size={14} style={{ display: 'inline-flex', flexShrink: 0 }} /> Import contacts
            </Link>

            <button
              type="button"
              onClick={() => setShowAddLead(true)}
              className="rounded-full px-5 py-2.5 text-[14px] font-bold text-white inline-flex items-center gap-2 transition-all hover:shadow-[0_8px_24px_rgba(37,99,235,0.3)]"
              style={{ background: 'linear-gradient(135deg, #2563EB, #4F88FF, #93C5FD)' }}
            >
              <UserPlus size={16} color="#fff" style={{ display: 'inline-flex', flexShrink: 0 }} /> Add buyer
            </button>
          </div>
        </div>

        {/* Heat summary cards */}
        <PipelineKPIBar onUrgencyClick={handleUrgencyTileClick} />

        {/* Main content + sidebar */}
        <div className="flex gap-6 flex-col lg:flex-row mt-8">
          <div className="flex-1 min-w-0">
            {view === 'board' ? (
              <PipelineBoard />
            ) : (
              <CRMListView
                urgencyFilter={urgencyFilter}
                onUrgencyFilterChange={setUrgencyFilter}
              />
            )}
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

      {showAddLead && agentId && (
        <LeadContactForm
          context="lead"
          agentId={agentId}
          onClose={() => setShowAddLead(false)}
          onSaved={() => setShowAddLead(false)}
        />
      )}
    </>
  );
}

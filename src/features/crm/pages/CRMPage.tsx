import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PipelineBoard } from '../components/PipelineBoard';
import { CRMListView } from '../components/CRMListView';
import { PipelineKPIBar } from '../components/PipelineKPIBar';
import { CRMTasksWidget } from '../components/CRMTasksWidget';
import { LayoutList, Kanban } from 'lucide-react';
import type { UrgencyTier } from '../lib/urgency';

export default function CRMPage() {
  const [view, setView] = useState<'board' | 'list'>('board');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyTier[]>([]);

  const handleUrgencyTileClick = (tier: UrgencyTier) => {
    setUrgencyFilter([tier]);
    setView('list');
  };

  return (
    <>
      <Helmet>
        <title>Lead Pipeline — ListHQ</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Lead Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              All leads auto-synced from enquiries, open homes, and EOIs
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView('board')}
              className={`p-2 rounded-lg border transition
                ${view === 'board'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                }`}
              title="Kanban view"
            >
              <Kanban size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg border transition
                ${view === 'list'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
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
          <div className="w-full lg:w-72 flex-shrink-0">
            <CRMTasksWidget />
          </div>
        </div>
      </div>
    </>
  );
}

import { useMemo } from 'react';
import { Phone, MessageSquare } from 'lucide-react';
import { useCRMLeads } from '../hooks/useCRMLeads';
import { useCRMTasks } from '../hooks/useCRMTasks';
import { URGENCY_CONFIG, type UrgencyTier } from '../lib/urgency';

interface Props { onSelectLead: (lead: any) => void; }

export function DailyCallList({ onSelectLead }: Props) {
  const { leads } = useCRMLeads({ stage: 'all' });
  const { tasks } = useCRMTasks();

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const overdueTasks = useMemo(
    () => tasks.filter(t => new Date(t.due_at) <= today),
    [tasks]
  );
  const overdueLeadIds = new Set(overdueTasks.map(t => t.lead_id));

  const callList = useMemo(() => {
    const urgent = leads.filter((l: any) =>
      ['hot', 'warm'].includes(l.urgency) &&
      !['settled', 'lost'].includes(l.stage) &&
      !(l as any).do_not_contact
    );
    return [...urgent].sort((a: any, b: any) => {
      const aOver = overdueLeadIds.has(a.id) ? 0 : 1;
      const bOver = overdueLeadIds.has(b.id) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return URGENCY_CONFIG[a.urgency as UrgencyTier].order - URGENCY_CONFIG[b.urgency as UrgencyTier].order;
    });
  }, [leads, overdueLeadIds]);

  if (callList.length === 0) return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-foreground mb-2">📋 Today's Call List</h3>
      <p className="text-xs text-muted-foreground text-center py-4">
        All caught up — no urgent leads to contact.
      </p>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">📋 Today's Call List</h3>
        <span className="text-xs bg-destructive/10 text-destructive font-medium px-2 py-0.5 rounded-full">
          {callList.length} to contact
        </span>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {callList.map((lead: any) => {
          const cfg = URGENCY_CONFIG[lead.urgency as UrgencyTier];
          const hasOverdue = overdueLeadIds.has(lead.id);
          const overdueTask = overdueTasks.find(t => t.lead_id === lead.id);
          return (
            <div
              key={lead.id}
              onClick={() => onSelectLead(lead)}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/40 cursor-pointer transition group"
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {lead.first_name} {lead.last_name ?? ''}
                </p>
                {hasOverdue && overdueTask && (
                  <p className="text-[11px] text-destructive truncate">
                    ⚠️ {overdueTask.title}
                  </p>
                )}
                {!hasOverdue && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {lead.last_contacted
                      ? `Last contact: ${Math.floor((Date.now() - new Date(lead.last_contacted).getTime()) / 86400000)}d ago`
                      : 'Never contacted'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`}
                    onClick={e => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition"
                    title={`Call ${lead.phone}`}>
                    <Phone size={13} />
                  </a>
                )}
                {lead.phone && (
                  <a href={`sms:${lead.phone}`}
                    onClick={e => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition"
                    title="SMS">
                    <MessageSquare size={13} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

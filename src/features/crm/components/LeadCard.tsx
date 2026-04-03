import type { CRMLead } from '../types';
import { Phone, Mail, Home, AlertCircle } from 'lucide-react';

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-destructive',
  medium: 'bg-primary',
  low: 'bg-muted-foreground',
};

const SOURCE_ICON: Record<string, string> = {
  enquiry_form: '💬',
  open_home: '🏠',
  eoi: '📋',
  pre_approval: '✅',
  referral: '🤝',
  portal: '🌐',
  manual: '✏️',
};

interface Props {
  lead: CRMLead;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function LeadCard({ lead, onClick, onDragStart, onDragEnd }: Props) {
  const daysInStage = Math.floor(
    (Date.now() - new Date(lead.updated_at).getTime()) / 86400000
  );
  const isOverdue = !lead.last_contacted ||
    (Date.now() - new Date(lead.last_contacted).getTime()) > 7 * 86400000;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-3 cursor-grab active:cursor-grabbing
                 hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[lead.priority]}`} />
          <span className="text-sm font-semibold text-foreground truncate">
            {lead.first_name} {lead.last_name ?? ''}
          </span>
        </div>
        <span className="text-xs flex-shrink-0">
          {SOURCE_ICON[lead.source] ?? '✏️'}
        </span>
      </div>

      {lead.property && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1 truncate">
          <Home size={10} />
          {lead.property.address}
        </p>
      )}

      {lead.budget_max && (
        <p className="text-xs text-muted-foreground mb-1.5">
          Budget: up to ${(lead.budget_max / 1000).toFixed(0)}k
          {lead.pre_approved && (
            <span className="text-primary ml-1">· Pre-approved</span>
          )}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {lead.email && <Mail size={10} />}
          {lead.phone && <Phone size={10} />}
        </div>
        <div className="flex items-center gap-1.5">
          {isOverdue && <AlertCircle size={10} className="text-destructive" />}
          <span className="text-[10px] text-muted-foreground">{daysInStage}d</span>
        </div>
      </div>
    </div>
  );
}

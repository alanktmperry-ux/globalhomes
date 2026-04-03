import type { DocumentAccessLevel } from '../types';
import { Badge } from '@/components/ui/badge';

const CONFIG: Record<DocumentAccessLevel, { label: string; icon: string; className: string }> = {
  public: { label: 'Public', icon: '🌐', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0' },
  registered_buyers: { label: 'Buyers', icon: '👤', className: 'bg-primary/15 text-primary border-0' },
  agent_only: { label: 'Agent Only', icon: '🔒', className: 'bg-muted text-muted-foreground border-0' },
  parties_only: { label: 'Parties', icon: '🤝', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0' },
};

interface Props {
  accessLevel: DocumentAccessLevel;
}

export function DocumentAccessBadge({ accessLevel }: Props) {
  const cfg = CONFIG[accessLevel] ?? CONFIG.agent_only;
  return (
    <Badge className={`text-[10px] gap-0.5 ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreBand(score: number | null) {
  if (score == null) return { label: 'No Data', bg: 'bg-muted', text: 'text-muted-foreground' };
  if (score >= 75) return { label: 'Healthy', bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' };
  if (score >= 50) return { label: 'Monitor', bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' };
  return { label: 'At Risk', bg: 'bg-destructive/15', text: 'text-destructive' };
}

export function StrataHealthBadge({ score, size = 'md' }: Props) {
  const { label, bg, text } = getScoreBand(score);
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2 font-semibold',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center rounded-full font-medium ${bg} ${text} ${sizeClasses[size]}`}>
          {score != null && <span>{score}</span>}
          <span>·</span>
          <span>{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-center">
        Strata Health Score measures building financial health based on sinking fund adequacy, levy history, capital works planning, and defect status.
      </TooltipContent>
    </Tooltip>
  );
}

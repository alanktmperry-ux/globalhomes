import { Badge } from '@/components/ui/badge';

interface Props {
  score: number | null | undefined;
  variant?: 'agent' | 'seeker';
}

/**
 * Quality badge for Halo.
 *  - 80–100: green "High quality"
 *  - 50–79: amber "Good"
 *  - 0–49: nothing (agent), score shown plain (seeker)
 */
export function HaloQualityBadge({ score, variant = 'agent' }: Props) {
  if (score == null) return null;
  if (score >= 80) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
        High quality {variant === 'seeker' ? `· ${score}` : ''}
      </Badge>
    );
  }
  if (score >= 50) {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        Good {variant === 'seeker' ? `· ${score}` : ''}
      </Badge>
    );
  }
  if (variant === 'seeker') {
    return (
      <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
        Score {score}
      </Badge>
    );
  }
  return null;
}

export default HaloQualityBadge;

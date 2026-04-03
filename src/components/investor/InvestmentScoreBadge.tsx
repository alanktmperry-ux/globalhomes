import { investmentScore, scoreLabel } from '@/lib/investorCalcs';

interface Props {
  grossYield: number;
  suburbGrowth5yr: number | null;
  vacancyRate: number | null;
  daysOnMarket: number | null;
  isNewBuild: boolean;
}

export function InvestmentScoreBadge(props: Props) {
  const score = investmentScore(props);
  const { label, color } = scoreLabel(score);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      <span className="font-bold">{score}</span>
      <span className="opacity-80">/100</span>
      <span className="ml-1">{label}</span>
    </span>
  );
}

import { TrendingUp } from 'lucide-react';
import { useInvestorMode } from '@/context/InvestorModeContext';

export function InvestorModeToggle() {
  const { investorMode, toggleInvestorMode } = useInvestorMode();

  return (
    <button
      onClick={toggleInvestorMode}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
        investorMode
          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
          : 'bg-secondary text-muted-foreground border-border hover:border-amber-300 hover:text-amber-600'
      }`}
      title={investorMode ? 'Switch to buyer mode' : 'Switch to investor mode'}
    >
      <TrendingUp className="w-4 h-4" />
      <span className="hidden sm:inline">{investorMode ? 'Investor' : 'Invest'}</span>
    </button>
  );
}

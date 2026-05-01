import { useNavigate } from 'react-router-dom';
import { Coins, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHaloCreditsBalance } from '@/features/halo/hooks/useHaloCreditsBalance';

export function AgentCreditBadge({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { balance } = useHaloCreditsBalance();

  const isZero = balance === 0;

  const baseClass = isZero
    ? 'gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse shadow-md'
    : 'gap-1.5 bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200';

  return (
    <Button
      type="button"
      size="sm"
      variant={isZero ? 'default' : 'secondary'}
      onClick={() => navigate('/dashboard/buy-credits')}
      className={className ?? baseClass}
      aria-label={`${balance} ${balance === 1 ? 'credit' : 'credits'} — buy more`}
    >
      <Coins size={14} />
      <span className="font-semibold">
        {balance} {balance === 1 ? 'credit' : 'credits'}
      </span>
      <span className="mx-1 opacity-50">·</span>
      <Plus size={12} />
      <span className="text-xs">Top up</span>
    </Button>
  );
}

export default AgentCreditBadge;

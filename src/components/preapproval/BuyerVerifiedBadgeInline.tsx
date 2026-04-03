import { ShieldCheck } from 'lucide-react';
import { useBuyerPreApprovalBadge } from '@/hooks/useBuyerPreApprovalBadge';

interface Props {
  buyerUserId: string;
}

export function BuyerVerifiedBadgeInline({ buyerUserId }: Props) {
  const badge = useBuyerPreApprovalBadge(buyerUserId);

  if (!badge?.pre_approval_verified) return null;

  const amount = badge.pre_approval_amount;
  const formatAmount = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1000).toFixed(0)}k`;

  return (
    <span
      className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full px-2 py-0.5 ml-1"
      title={`Finance pre-approved${amount ? ` up to ${formatAmount(amount)}` : ''}${badge.pre_approval_lender ? ` via ${badge.pre_approval_lender}` : ''}`}
    >
      <ShieldCheck className="w-3 h-3" />
      Pre-Approved{amount ? ` ${formatAmount(amount)}` : ''}
    </span>
  );
}

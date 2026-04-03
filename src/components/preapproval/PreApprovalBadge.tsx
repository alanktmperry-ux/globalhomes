import { ShieldCheck, Clock, AlertCircle } from 'lucide-react';

interface Props {
  verified: boolean;
  amount: number | null;
  expiry: string | null;
  lender: string | null;
  size?: 'compact' | 'full';
}

function formatAmount(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${(n / 1000).toFixed(0)}k`;
}

function isExpiringSoon(expiry: string | null): boolean {
  if (!expiry) return false;
  const daysLeft = (new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysLeft > 0 && daysLeft <= 30;
}

export function PreApprovalBadge({ verified, amount, expiry, lender, size = 'full' }: Props) {
  if (!verified) return null;

  const expiringSoon = isExpiringSoon(expiry);

  if (size === 'compact') {
    return (
      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full px-2 py-0.5">
        <ShieldCheck className="w-3 h-3" />
        Pre-Approved{amount ? ` ${formatAmount(amount)}` : ''}
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-green-800">
              Finance Pre-Approved ✓
            </span>
            {expiringSoon && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                <Clock className="w-3 h-3" /> Expiring soon
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {amount && (
              <span className="text-sm font-bold text-green-900">
                Up to {formatAmount(amount)}
              </span>
            )}
            {lender && (
              <span className="text-xs text-green-600">via {lender}</span>
            )}
          </div>
          {expiry && (
            <p className="text-xs text-green-600 mt-1">
              Valid until {new Date(expiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PreApprovalPendingBadge() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
      <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-amber-800">Verification in progress</p>
        <p className="text-xs text-amber-600 mt-0.5">
          Your pre-approval document is being reviewed. This usually takes 1–2 business days.
          We'll notify you once verified.
        </p>
      </div>
    </div>
  );
}

export function PreApprovalRejectedBadge({ reason }: { reason: string | null }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-800">Document could not be verified</p>
        {reason && <p className="text-xs text-red-600 mt-0.5">{reason}</p>}
        <p className="text-xs text-red-600 mt-1">
          Please re-submit with a clearer document or contact support.
        </p>
      </div>
    </div>
  );
}

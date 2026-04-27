import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useCurrentAgent } from '@/features/agents/hooks/useCurrentAgent';

interface AgentPaymentState {
  subscriptionStatus: string | null;
  paymentFailedAt: string | null;
  adminGraceUntil: string | null;
}

function getDaysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * PaymentStatusBanner — renders warning/critical banners or a locked overlay
 * for agents with payment issues. Only renders for authenticated agents.
 */
export function PaymentStatusBanner() {
  const { agent } = useCurrentAgent();
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem('payment-banner-dismissed') === 'true'
  );

  const state: AgentPaymentState | null = agent
    ? {
        subscriptionStatus: agent.subscription_status ?? 'active',
        paymentFailedAt: agent.payment_failed_at ?? null,
        adminGraceUntil: agent.admin_grace_until ?? null,
      }
    : null;

  if (!agent || !state) return null;

  // Check admin grace period
  if (state.adminGraceUntil && new Date(state.adminGraceUntil) > new Date()) {
    return null;
  }

  const { subscriptionStatus, paymentFailedAt } = state;

  // STATE 3 — LOCKED
  if (subscriptionStatus === 'locked') {
    return <LockedOverlay />;
  }

  // TRIAL COUNTDOWN — only when not subscribed and no payment issues
  if (
    subscriptionStatus !== 'payment_failed' &&
    subscriptionStatus !== 'expired' &&
    !agent.is_subscribed &&
    agent.created_at
  ) {
    const trialEndsAt = new Date(new Date(agent.created_at).getTime() + 60 * 86400 * 1000);
    const daysLeft = Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000);

    if (daysLeft >= 0 && daysLeft <= 30) {
      return <TrialBanner daysLeft={daysLeft} />;
    }
  }

  if (subscriptionStatus !== 'payment_failed' || !paymentFailedAt) return null;

  const daysSinceFailure = getDaysSince(paymentFailedAt);

  // STATE 2 — CRITICAL (days 8-14)
  if (daysSinceFailure >= 8 && daysSinceFailure <= 14) {
    const daysRemaining = 15 - daysSinceFailure;
    return (
      <div className="sticky top-0 z-40 w-full bg-red-600 text-white px-4 py-3 text-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 text-center">
          <span>
            🚨 Action required: Payment overdue. Your listings will be hidden in{' '}
            <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> unless payment is resolved.{' '}
            <Link to="/dashboard/billing" className="underline font-semibold hover:text-white/90">
              Update payment method →
            </Link>
          </span>
        </div>
      </div>
    );
  }

  // STATE 1 — WARNING (days 1-7)
  if (daysSinceFailure >= 1 && daysSinceFailure <= 7) {
    if (dismissed) return null;
    return (
      <div className="sticky top-0 z-40 w-full bg-amber-500 text-white px-4 py-3 text-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <span className="flex-1 text-center">
            ⚠️ Payment issue detected. Your account is active but listings may be hidden if not resolved.{' '}
            <Link to="/dashboard/billing" className="underline font-semibold hover:text-white/90">
              Update payment method →
            </Link>
          </span>
          <button
            onClick={() => {
              setDismissed(true);
              sessionStorage.setItem('payment-banner-dismissed', 'true');
            }}
            className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function LockedOverlay() {
  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <span className="text-2xl font-bold tracking-tight text-foreground">ListHQ</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">Account Suspended</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your subscription payment could not be processed. Your listings are currently hidden from buyers.
        </p>
        <Link
          to="/dashboard/billing"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Update Payment Method
        </Link>
        <p className="text-xs text-muted-foreground">
          Need help? Contact{' '}
          <a href="mailto:support@listhq.com.au" className="underline">
            support@listhq.com.au
          </a>
        </p>
      </div>
    </div>
  );
}

export default PaymentStatusBanner;

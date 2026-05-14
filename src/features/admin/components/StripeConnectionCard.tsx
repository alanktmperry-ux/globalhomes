import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Loader2, Zap, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  fetchStripeStatus,
  type StripeStatus,
} from '@/features/admin/lib/stripeStatus';

const fmtRel = (iso: string | null) => {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

interface Props {
  onStatusLoaded?: (status: StripeStatus) => void;
}

export default function StripeConnectionCard({ onStatusLoaded }: Props) {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await fetchStripeStatus();
      if (cancelled) return;
      setStatus(s);
      setLoading(false);
      onStatusLoaded?.(s);
    })();
    return () => { cancelled = true; };
  }, [onStatusLoaded]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking Stripe connection…</span>
      </div>
    );
  }

  const state = status?.state ?? 'not_connected';
  const h = status?.health;

  if (state === 'not_connected') {
    return (
      <div className="bg-card border border-dashed border-amber-500/40 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <CreditCard size={20} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground">Stripe not connected</h3>
              <Badge variant="secondary" className="text-[10px]">Setup required</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Add <code className="text-[11px] bg-muted px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code>,{' '}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">STRIPE_SUBSCRIPTION_WEBHOOK_SECRET</code> and{' '}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">STRIPE_WEBHOOK_SECRET</code>{' '}
              to Lovable Cloud secrets. Subscription, credit, billing-portal and webhook functions are pre-deployed and will go live the moment the keys appear.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="gap-1.5 text-xs">
                <a href="https://dashboard.stripe.com/register" target="_blank" rel="noreferrer">
                  <Zap size={14} /> Create Stripe account
                  <ExternalLink size={12} />
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer">
                  Get API keys <ExternalLink size={12} />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'configured') {
    return (
      <div className="bg-card border border-blue-500/30 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={20} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground">Stripe configured — awaiting first transaction</h3>
              <Badge className="text-[10px] bg-blue-500/15 text-blue-700 hover:bg-blue-500/15">Ready</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Keys detected. No subscriptions or credit purchases recorded yet. The first successful checkout will flip this card to live data.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <KeyRow label="Secret key" present={!!h?.keys_present} />
              <KeyRow label="Subscription webhook" present={!!h?.subscription_webhook_secret_present} />
              <KeyRow label="Credit webhook" present={!!h?.credit_webhook_secret_present} />
              <KeyRow label="Subscriptions" present={(h?.subscription_count ?? 0) > 0} suffix={`${h?.subscription_count ?? 0}`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // live
  return (
    <div className="bg-card border border-emerald-500/30 rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={20} className="text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground">Stripe live</h3>
            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Active</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mt-2">
            <Stat label="Active subs" value={`${h?.subscription_count ?? 0}`} />
            <Stat label="Credit purchases (30d)" value={`${h?.credit_purchase_count_30d ?? 0}`} />
            <Stat label="Last subscription event" value={fmtRel(h?.last_subscription_webhook_at ?? null)} />
            <Stat label="Last successful charge" value={fmtRel(h?.last_successful_charge_at ?? null)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyRow({ label, present, suffix }: { label: string; present: boolean; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      {present ? (
        <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
      ) : (
        <AlertCircle size={12} className="text-amber-500 flex-shrink-0" />
      )}
      <span className="text-muted-foreground truncate">{label}</span>
      {suffix && <span className="text-foreground font-medium ml-auto">{suffix}</span>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

import { useState } from 'react';
import { Users, CheckCircle, Bell } from 'lucide-react';
import { useAuctionRegistration } from '@/hooks/useAuctionRegistration';
import { useAuth } from '@/features/auth/AuthProvider';

interface Props {
  propertyId: string;
  auctionDate: string | null;
  registrationCount: number;
}

export function AuctionRegisterPanel({ propertyId, auctionDate, registrationCount }: Props) {
  const { user } = useAuth();
  const { register, loading, registered, error } = useAuctionRegistration(propertyId);
  const [name, setName] = useState(user?.user_metadata?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [expanded, setExpanded] = useState(false);

  const auctionLabel = auctionDate
    ? new Date(auctionDate).toLocaleDateString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Date TBC';

  if (registered) {
    return (
      <div className="flex items-start gap-3 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">You're registered</p>
          <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
            We'll send reminders before the auction. The agent may contact you with
            pre-auction offer opportunities.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground flex items-center gap-2">
              <Bell size={16} className="text-primary" />
              Register interest
            </p>
            <p className="text-sm text-muted-foreground mt-1">Auction: {auctionLabel}</p>
            {registrationCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Users size={12} />
                {registrationCount} buyer{registrationCount !== 1 ? 's' : ''} registered
              </p>
            )}
          </div>
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Register
            </button>
          )}
        </div>

        {expanded && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name *"
                className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email *"
                type="email"
                className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              type="tel"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={() => register(name, email, phone)}
                disabled={loading || !name || !email}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Registering…' : 'Confirm registration'}
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="px-4 py-2.5 text-primary text-sm hover:underline"
              >
                Cancel
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Your details are shared with the listing agent only. You may receive pre-auction
              offer opportunities. Unsubscribe at any time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

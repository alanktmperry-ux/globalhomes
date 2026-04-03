import { useState } from 'react';
import { Calendar, Clock, Users, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { useOpenHomeRegistration } from '../hooks/useOpenHomeRegistration';
import { useAuth } from '@/features/auth/AuthProvider';
import type { OpenHomeWithCounts } from '../hooks/useOpenHomes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  session: OpenHomeWithCounts;
  propertyAddress: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function OpenHomeCard({ session, propertyAddress }: Props) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(user?.user_metadata?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');

  const { register, loading, registered, onWaitlist, error } =
    useOpenHomeRegistration(session.id, session.is_full);

  const spotsLeft = session.max_attendees > 0
    ? session.max_attendees - session.registered_count
    : null;
  const isLive = session.status === 'in_progress';

  if (registered) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-start gap-3">
          {onWaitlist
            ? <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            : <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold text-foreground text-sm">
              {onWaitlist ? "You're on the waitlist" : "You're registered!"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {onWaitlist
                ? "We'll notify you if a spot opens up."
                : `See you ${formatDate(session.starts_at)} at ${formatTime(session.starts_at)}.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      {isLive && (
        <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Open now
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
            <Calendar size={14} className="text-primary shrink-0" />
            {formatDate(session.starts_at)}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock size={14} className="shrink-0" />
            {formatTime(session.starts_at)} – {formatTime(session.ends_at)}
          </div>
          {session.notes && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={12} className="shrink-0" />
              {session.notes}
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          {session.max_attendees > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users size={12} />
              {session.registered_count} registered
            </div>
          )}
          {spotsLeft !== null && (
            <p className={`text-xs font-medium mt-0.5 ${session.is_full ? 'text-amber-600' : 'text-green-600'}`}>
              {session.is_full ? 'Full — join waitlist' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
            </p>
          )}
        </div>
      </div>

      {!expanded ? (
        <Button
          onClick={() => setExpanded(true)}
          className="mt-3 w-full"
          size="sm"
        >
          {session.is_full ? 'Join waitlist' : 'Register to attend'}
        </Button>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name *"
            />
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email *"
              type="email"
            />
          </div>
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Mobile (for SMS reminders)"
            type="tel"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => register(name, email, phone)}
              disabled={loading || !name || !email}
              className="flex-1"
              size="sm"
            >
              {loading ? 'Registering…' : session.is_full ? 'Join waitlist' : 'Confirm registration'}
            </Button>
            <button onClick={() => setExpanded(false)} className="px-4 text-sm text-muted-foreground hover:underline">
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            You'll receive a reminder before the inspection. Your details are shared with the listing agent only.
          </p>
        </div>
      )}
    </div>
  );
}

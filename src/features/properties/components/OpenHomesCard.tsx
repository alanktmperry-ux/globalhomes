import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';

interface OpenHome {
  id: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  max_attendees: number | null;
  rsvp_count: number;
  user_registered: boolean;
}

function formatSession(starts: string, ends: string): string {
  const s = new Date(starts);
  const e = new Date(ends);
  const datePart = s.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  const startTime = s.toLocaleTimeString('en-AU', timeOpts);
  const endTime = e.toLocaleTimeString('en-AU', timeOpts);
  return `${datePart}, ${startTime} – ${endTime}`;
}

export function OpenHomesCard({ propertyId }: { propertyId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<OpenHome[] | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data: openHomes } = await supabase
        .from('open_homes')
        .select('id, starts_at, ends_at, notes, max_attendees')
        .eq('property_id', propertyId)
        .gte('starts_at', nowIso)
        .order('starts_at', { ascending: true })
        .limit(3) as any;

      if (cancelled || !openHomes || openHomes.length === 0) {
        if (!cancelled) setSessions([]);
        return;
      }

      const ids = openHomes.map((o: any) => o.id);
      const { data: regs } = await supabase
        .from('open_home_registrations')
        .select('open_home_id, user_id')
        .in('open_home_id', ids) as any;

      const counts = new Map<string, number>();
      const mine = new Set<string>();
      (regs ?? []).forEach((r: any) => {
        counts.set(r.open_home_id, (counts.get(r.open_home_id) ?? 0) + 1);
        if (user && r.user_id === user.id) mine.add(r.open_home_id);
      });

      if (cancelled) return;
      setSessions(
        openHomes.map((o: any) => ({
          ...o,
          rsvp_count: counts.get(o.id) ?? 0,
          user_registered: mine.has(o.id),
        }))
      );
    })();
    return () => { cancelled = true; };
  }, [propertyId, user]);

  const handleRegister = async (oh: OpenHome) => {
    if (!user) {
      toast.info('Please sign in to register for an open home');
      navigate('/auth');
      return;
    }
    setRegistering(oh.id);
    const { error } = await supabase
      .from('open_home_registrations')
      .insert({
        open_home_id: oh.id,
        user_id: user.id,
        email: user.email ?? '',
      } as any);
    setRegistering(null);
    if (error) {
      toast.error('Could not register — please try again');
      return;
    }
    toast.success("You're registered!");
    setSessions((prev) =>
      prev
        ? prev.map((s) =>
            s.id === oh.id
              ? { ...s, user_registered: true, rsvp_count: s.rsvp_count + 1 }
              : s
          )
        : prev
    );
  };

  if (!sessions || sessions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={16} className="text-primary" />
        <h3 className="font-display font-bold text-foreground text-[15px]">Open Homes</h3>
      </div>
      <ul className="space-y-3">
        {sessions.map((oh) => {
          const fullyBooked =
            oh.max_attendees != null && oh.rsvp_count >= oh.max_attendees;
          return (
            <li
              key={oh.id}
              className="flex items-center justify-between gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {formatSession(oh.starts_at, oh.ends_at)}
                </p>
                {oh.notes && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {oh.notes}
                  </p>
                )}
              </div>
              {oh.user_registered ? (
                <span className="shrink-0 px-2 py-1 rounded-full bg-success/15 text-success text-[11px] font-semibold">
                  Registered
                </span>
              ) : fullyBooked ? (
                <span className="shrink-0 px-2 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold">
                  Fully Booked
                </span>
              ) : (
                <button
                  onClick={() => handleRegister(oh)}
                  disabled={registering === oh.id}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                >
                  {registering === oh.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <>Register →</>
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default OpenHomesCard;

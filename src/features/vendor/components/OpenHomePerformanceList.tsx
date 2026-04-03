import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Props {
  propertyId: string;
}

interface OpenHomeRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  registrations: number;
  attended: number;
  waitlist: number;
}

export function OpenHomePerformanceList({ propertyId }: Props) {
  const [sessions, setSessions] = useState<OpenHomeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('open_homes')
      .select('id, starts_at, ends_at, status, open_home_registrations(id, attended, on_waitlist)')
      .eq('property_id', propertyId)
      .order('starts_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []).map((oh: any) => {
          const regs = oh.open_home_registrations ?? [];
          return {
            id: oh.id,
            starts_at: oh.starts_at,
            ends_at: oh.ends_at,
            status: oh.status,
            registrations: regs.filter((r: any) => !r.on_waitlist).length,
            attended: regs.filter((r: any) => r.attended).length,
            waitlist: regs.filter((r: any) => r.on_waitlist).length,
          };
        });
        setSessions(rows);
        setLoading(false);
      });
  }, [propertyId]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Open Homes</h3>
        {[1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    );
  }

  const statusVariant = (s: string) => {
    if (s === 'scheduled') return 'default';
    if (s === 'completed') return 'secondary';
    if (s === 'cancelled') return 'destructive';
    return 'outline';
  };

  const attendanceLabel = (rate: number) => {
    if (rate >= 80) return { text: 'Strong turnout', color: 'text-green-600' };
    if (rate >= 40) return { text: 'Good', color: 'text-amber-600' };
    return { text: 'Low attendance', color: 'text-muted-foreground' };
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">Open Home Performance</h3>
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open homes scheduled yet.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const rate = s.registrations > 0 ? Math.round((s.attended / s.registrations) * 100) : 0;
            const aLabel = attendanceLabel(rate);
            return (
              <div key={s.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(s.starts_at).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' '}
                    {new Date(s.starts_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                    –{new Date(s.ends_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Registered: {s.registrations} · Attended: {s.attended} · Waitlist: {s.waitlist}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.status === 'completed' && (
                    <span className={`text-xs font-medium ${aLabel.color}`}>{rate}% — {aLabel.text}</span>
                  )}
                  <Badge variant={statusVariant(s.status) as any} className="text-xs capitalize">{s.status}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

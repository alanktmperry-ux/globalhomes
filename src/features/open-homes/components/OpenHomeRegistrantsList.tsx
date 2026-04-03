import { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Mail, Phone, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import type { OpenHomeWithCounts } from '../hooks/useOpenHomes';

interface Registrant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  on_waitlist: boolean;
  attended: boolean;
  registered_at: string;
}

interface Props {
  session: OpenHomeWithCounts;
  propertyAddress: string;
  onClose: () => void;
}

export function OpenHomeRegistrantsList({ session, propertyAddress, onClose }: Props) {
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('open_home_registrations')
      .select('id, name, email, phone, on_waitlist, attended, registered_at')
      .eq('open_home_id', session.id)
      .order('on_waitlist', { ascending: true })
      .order('registered_at', { ascending: true })
      .then(({ data }) => {
        setRegistrants((data ?? []) as Registrant[]);
        setLoading(false);
      });
  }, [session.id]);

  const toggleAttendance = async (regId: string, current: boolean) => {
    await supabase
      .from('open_home_registrations')
      .update({ attended: !current, attended_at: !current ? new Date().toISOString() : null } as any)
      .eq('id', regId);
    setRegistrants(prev => prev.map(r => r.id === regId ? { ...r, attended: !current } : r));
  };

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Phone', 'Attended', 'Waitlist'],
      ...registrants.map(r => [r.name, r.email, r.phone ?? '', r.attended ? 'Yes' : 'No', r.on_waitlist ? 'Yes' : 'No']),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open-home-${session.id.slice(0, 8)}.csv`;
    a.click();
  };

  const confirmed = registrants.filter(r => !r.on_waitlist);
  const waitlist = registrants.filter(r => r.on_waitlist);
  const attendedCount = registrants.filter(r => r.attended).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-start justify-between px-6 pt-6 pb-3">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Registrants</h2>
            <p className="text-xs text-muted-foreground">{propertyAddress}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(session.starts_at).toLocaleString('en-AU', {
                weekday: 'short', day: 'numeric', month: 'short',
                hour: '2-digit', minute: '2-digit', hour12: true,
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 text-xs">
              <Download size={12} /> CSV
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-3 text-xs text-muted-foreground">
          <span>{confirmed.length} registered</span>
          {waitlist.length > 0 && <span className="text-amber-600">{waitlist.length} waitlist</span>}
          <span className="text-green-600">{attendedCount} attended</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : confirmed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No registrations yet</p>
          ) : (
            <>
              {confirmed.map(reg => (
                <div key={reg.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <button onClick={() => toggleAttendance(reg.id, reg.attended)} className="shrink-0">
                    {reg.attended
                      ? <CheckSquare size={18} className="text-green-600" />
                      : <Square size={18} className="text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{reg.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 truncate"><Mail size={10} /> {reg.email}</span>
                      {reg.phone && <span className="flex items-center gap-1"><Phone size={10} /> {reg.phone}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {waitlist.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground pt-3">Waitlist</p>
                  {waitlist.map(reg => (
                    <div key={reg.id} className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <Square size={18} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{reg.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{reg.email}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface UnreadResponse {
  id: string;
  halo_id: string;
  agent_id: string;
  unlocked_at: string;
  created_at: string;
  halo: { suburbs: string[] | null; intent: string } | null;
  agent: { name: string | null; agency: string | null } | null;
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export function SeekerNotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UnreadResponse[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      // Get my halo ids first (RLS enforces ownership)
      const { data: myHalos } = await supabase
        .from('halos')
        .select('id, suburbs, intent')
        .eq('seeker_id', user.id);
      const haloMap = new Map((myHalos ?? []).map((h: any) => [h.id, h]));
      if (haloMap.size === 0) {
        if (!cancelled) setItems([]);
        return;
      }
      const { data: resp } = await supabase
        .from('halo_responses')
        .select('id, halo_id, agent_id, unlocked_at, created_at')
        .in('halo_id', Array.from(haloMap.keys()))
        .eq('viewed_by_seeker', false)
        .order('created_at', { ascending: false })
        .limit(20);
      const agentIds = Array.from(new Set((resp ?? []).map((r: any) => r.agent_id)));
      const profileMap = new Map<string, any>();
      if (agentIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, name, agency')
          .in('user_id', agentIds);
        (profs ?? []).forEach((p: any) => profileMap.set(p.user_id, p));
      }
      if (cancelled) return;
      setItems((resp ?? []).map((r: any) => ({
        ...r,
        halo: haloMap.get(r.halo_id) ?? null,
        agent: profileMap.get(r.agent_id) ?? null,
      })));
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user, open]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAllRead = async () => {
    if (!user || items.length === 0) return;
    const ids = items.map((i) => i.id);
    await supabase.from('halo_responses').update({ viewed_by_seeker: true }).in('id', ids);
    setItems([]);
  };

  const openItem = async (item: UnreadResponse) => {
    await supabase.from('halo_responses').update({ viewed_by_seeker: true }).eq('id', item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setOpen(false);
    navigate('/seeker/inbox');
  };

  const count = items.length;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold bg-[#DC2626] text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-xl shadow-elevated overflow-hidden z-[100]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <p className="text-sm font-semibold">Notifications</p>
            {count > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#2563EB] hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {count === 0 ? (
              <p className="px-4 py-8 text-sm text-center text-muted-foreground">No new responses</p>
            ) : (
              items.map((it) => {
                const initials = (it.agent?.name ?? '??').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
                const suburb = it.halo?.suburbs?.[0] ?? 'Halo';
                return (
                  <button
                    key={it.id}
                    onClick={() => openItem(it)}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3 border-b border-border last:border-b-0"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{it.agent?.name ?? 'An agent'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {it.agent?.agency ?? 'Independent'} · {suburb} {it.halo?.intent === 'rent' ? 'Rent' : 'Buy'}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(it.created_at)}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-[#2563EB] mt-2 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/seeker/inbox'); }}
            className="block w-full text-center text-xs font-semibold text-[#2563EB] py-2.5 border-t border-border hover:bg-accent transition-colors"
          >
            View all in inbox →
          </button>
        </div>
      )}
    </div>
  );
}

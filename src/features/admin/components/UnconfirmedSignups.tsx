import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mail, RefreshCw, Clock, Trash2, CheckCircle2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface UnconfirmedUser {
  id: string;
  email: string;
  created_at: string;
  provider: string;
}

type FilterKey = 'all' | 'fresh' | 'stale' | 'dead' | 'test';

const PER_PAGE = 25;

function ageDays(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
}

function isTestAccount(email: string) {
  return email.includes('+');
}

export function UnconfirmedSignups() {
  const [users, setUsers] = useState<UnconfirmedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list_users', page: 1, perPage: 1000 },
      });
      if (error || !data?.users) return;

      const unconfirmed = (data.users as any[])
        .filter((u) => !u.email_confirmed_at && u.email)
        .map((u) => ({
          id: u.id,
          email: u.email as string,
          created_at: u.created_at as string,
          provider: (u.app_metadata?.provider ?? 'email') as string,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setUsers(unconfirmed);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [filter]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const days = ageDays(u.created_at);
      switch (filter) {
        case 'fresh': return days < 2;
        case 'stale': return days >= 3 && days <= 30;
        case 'dead': return days > 30;
        case 'test': return isTestAccount(u.email);
        default: return true;
      }
    });
  }, [users, filter]);

  const counts = useMemo(() => ({
    all: users.length,
    fresh: users.filter((u) => ageDays(u.created_at) < 2).length,
    stale: users.filter((u) => { const d = ageDays(u.created_at); return d >= 3 && d <= 30; }).length,
    dead: users.filter((u) => ageDays(u.created_at) > 30).length,
    test: users.filter((u) => isTestAccount(u.email)).length,
  }), [users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const allVisibleSelected = visible.length > 0 && visible.every((u) => selected.has(u.id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((u) => next.delete(u.id));
      else visible.forEach((u) => next.add(u.id));
      return next;
    });
  };

  const runBulk = async (action: 'delete_user' | 'confirm_email' | 'reset_password') => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const label = action === 'delete_user' ? 'Delete' : action === 'confirm_email' ? 'Confirm' : 'Resend';
    if (action === 'delete_user' && !confirm(`Permanently delete ${ids.length} user account${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;

    setBusy(true);
    let ok = 0; let fail = 0;
    for (const id of ids) {
      const user = users.find((u) => u.id === id);
      const body: Record<string, unknown> = { action };
      if (action === 'delete_user') body.user_id = id;
      else if (action === 'reset_password') { body.userId = id; body.email = user?.email; }
      else body.userId = id;
      try {
        const { error } = await supabase.functions.invoke('admin-users', { body });
        if (error) fail++; else ok++;
      } catch { fail++; }
    }
    setBusy(false);
    toast[fail === 0 ? 'success' : 'message'](
      `${label}: ${ok} succeeded${fail ? `, ${fail} failed` : ''}`,
    );
    await load();
  };

  const FilterChip = ({ k, label, count, tone }: { k: FilterKey; label: string; count: number; tone?: string }) => (
    <button
      onClick={() => setFilter(k)}
      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
        filter === k
          ? 'bg-foreground text-background border-foreground'
          : `bg-card hover:bg-muted/50 border-border ${tone ?? 'text-muted-foreground'}`
      }`}
    >
      {label} <span className="opacity-60">({count})</span>
    </button>
  );

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Mail size={16} className="text-amber-500" />
            Unconfirmed Signups
            {!loading && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                {users.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Users who signed up but haven't confirmed their email — or whose signup didn't complete.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading || busy}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <FilterChip k="all" label="All" count={counts.all} />
        <FilterChip k="fresh" label="< 48h" count={counts.fresh} tone="text-emerald-600" />
        <FilterChip k="stale" label="3–30 days" count={counts.stale} tone="text-amber-600" />
        <FilterChip k="dead" label="> 30 days" count={counts.dead} tone="text-rose-600" />
        <FilterChip k="test" label="Test accounts" count={counts.test} tone="text-violet-600" />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 p-2.5 bg-muted/40 border border-border rounded-lg text-xs">
          <span className="font-medium text-foreground">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => runBulk('confirm_email')}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-700 hover:bg-green-500/20 disabled:opacity-50 font-medium"
            >
              <CheckCircle2 size={13} /> Confirm
            </button>
            <button
              onClick={() => runBulk('reset_password')}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 font-medium"
            >
              <Send size={13} /> Resend link
            </button>
            <button
              onClick={() => runBulk('delete_user')}
              disabled={busy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 font-medium"
            >
              <Trash2 size={13} /> Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              disabled={busy}
              className="text-muted-foreground hover:text-foreground px-2 py-1.5"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          {users.length === 0 ? 'No unconfirmed signups.' : 'No signups match this filter.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left pb-2 pr-2 w-8">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="rounded border-border cursor-pointer"
                      aria-label="Select all visible"
                    />
                  </th>
                  <th className="text-left pb-2 font-medium">Email</th>
                  <th className="text-left pb-2 font-medium">Signed up</th>
                  <th className="text-left pb-2 font-medium">Provider</th>
                  <th className="text-right pb-2 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((u) => {
                  const days = Math.floor(ageDays(u.created_at));
                  const dayLabel = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`;
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-2">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggle(u.id)}
                          className="rounded border-border cursor-pointer"
                          aria-label={`Select ${u.email}`}
                        />
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-foreground">{u.email}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {dayLabel}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground capitalize">{u.provider}</td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isTestAccount(u.email) && (
                            <span className="text-[10px] uppercase tracking-wide bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">test</span>
                          )}
                          {days > 30 && (
                            <span className="text-[10px] uppercase tracking-wide bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">dead</span>
                          )}
                          {days < 2 && (
                            <span className="text-[10px] uppercase tracking-wide bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">new</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border border-border rounded disabled:opacity-40">←</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 border border-border rounded disabled:opacity-40">→</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UnconfirmedSignups;

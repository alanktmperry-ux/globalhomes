import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mail, RefreshCw, Clock } from 'lucide-react';

interface UnconfirmedUser {
  id: string;
  email: string;
  created_at: string;
  provider: string;
}

export function UnconfirmedSignups() {
  const [users, setUsers] = useState<UnconfirmedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list_users', page: 1, perPage: 500 },
      });
      if (error || !data?.users) return;

      const unconfirmed = (data.users as any[])
        .filter((u) => !u.email_confirmed_at && u.email)
        .map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          provider: u.app_metadata?.provider ?? 'email',
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setUsers(unconfirmed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resend = async (userId: string, email: string) => {
    setResending(userId);
    try {
      await supabase.functions.invoke('admin-users', {
        body: { action: 'reset_password', userId, email },
      });
    } finally {
      setResending(null);
    }
  };

  const daysAgo = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const PER_PAGE = 20;
  const totalPages = Math.ceil(users.length / PER_PAGE);
  const visible = users.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
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
            Users who entered their email but never clicked the confirmation link.
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
      ) : users.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">No unconfirmed signups.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left pb-2 font-medium">Email</th>
                  <th className="text-left pb-2 font-medium">Signed up</th>
                  <th className="text-left pb-2 font-medium">Provider</th>
                  <th className="text-right pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{u.email}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {daysAgo(u.created_at)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground capitalize">{u.provider}</td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => resend(u.id, u.email)}
                        disabled={resending === u.id}
                        className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {resending === u.id ? 'Sending…' : 'Resend link'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
              <span>Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, users.length)} of {users.length}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border border-border rounded disabled:opacity-40">←</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 border border-border rounded disabled:opacity-40">→</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UnconfirmedSignups;

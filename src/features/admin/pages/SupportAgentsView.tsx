import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';

interface AgentRow {
  id: string;
  name: string;
  email: string | null;
  agency: string | null;
  is_subscribed: boolean | null;
  created_at: string;
  agent_subscriptions?: { plan_type: string | null }[] | null;
}

export default function SupportAgentsView() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, name, email, agency, is_subscribed, created_at, agent_subscriptions(plan_type)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) setAgents((data as any) || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) =>
      [a.name, a.email, a.agency].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [agents, query]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-[22px] font-semibold text-stone-900 mb-1">Agents</h1>
      <p className="text-[13px] text-stone-500 mb-6">Read-only directory of platform agents.</p>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Search by name, email, or agency…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-stone-200 bg-white text-[14px] text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-stone-400" size={24} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[13px] text-stone-500">No agents found.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left text-[12px] font-medium text-stone-500 uppercase tracking-wide px-4 py-3">Name</th>
                <th className="text-left text-[12px] font-medium text-stone-500 uppercase tracking-wide px-4 py-3">Agency</th>
                <th className="text-left text-[12px] font-medium text-stone-500 uppercase tracking-wide px-4 py-3">Plan</th>
                <th className="text-left text-[12px] font-medium text-stone-500 uppercase tracking-wide px-4 py-3">Email</th>
                <th className="text-left text-[12px] font-medium text-stone-500 uppercase tracking-wide px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const plan = a.agent_subscriptions?.[0]?.plan_type || (a.is_subscribed ? 'subscribed' : 'free');
                return (
                  <tr key={a.id} className="border-b border-stone-50 last:border-0">
                    <td className="px-4 py-3 text-[14px] text-stone-900">{a.name}</td>
                    <td className="px-4 py-3 text-[14px] text-stone-600">{a.agency || '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-stone-600">{plan}</td>
                    <td className="px-4 py-3 text-[13px] text-stone-600">{a.email || '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-stone-500">
                      {a.created_at ? format(new Date(a.created_at), 'd MMM yyyy') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

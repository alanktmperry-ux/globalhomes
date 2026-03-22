import { motion } from 'framer-motion';

interface StatCard {
  label: string;
  value: number;
  color: string;
}

interface Props {
  stats: { totalUsers: number; totalAgents: number; totalListings: number; totalLeads: number; totalVoiceSearches: number };
  users: { id: string; display_name?: string; email: string; roles: string[]; created_at: string; last_sign_in_at?: string | null }[];
}

const AdminOverview = ({ stats, users }: Props) => {
  const cards: StatCard[] = [
    { label: 'Total Users', value: stats.totalUsers, color: 'text-primary' },
    { label: 'Agents', value: stats.totalAgents, color: 'text-emerald-500' },
    { label: 'Listings', value: stats.totalListings, color: 'text-purple-500' },
    { label: 'Leads', value: stats.totalLeads, color: 'text-amber-500' },
    { label: 'Voice Searches', value: stats.totalVoiceSearches, color: 'text-cyan-500' },
  ];

  const now = Date.now();
  const DAY = 86400000;

  const activeToday = users.filter(
    u => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < DAY
  );
  const activeWeek = users.filter(
    u => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < 7 * DAY
  );
  const activeMonth = users.filter(
    u => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() < 30 * DAY
  );

  const agentsToday = activeToday.filter(u => u.roles.includes('agent')).length;
  const seekersToday = activeToday.filter(u => !u.roles.includes('agent') && !u.roles.includes('admin')).length;
  const agentsWeek = activeWeek.filter(u => u.roles.includes('agent')).length;
  const seekersWeek = activeWeek.filter(u => !u.roles.includes('agent') && !u.roles.includes('admin')).length;
  const agentsMonth = activeMonth.filter(u => u.roles.includes('agent')).length;
  const seekersMonth = activeMonth.filter(u => !u.roles.includes('agent') && !u.roles.includes('admin')).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">User Activity</h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Today */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today</p>
            <div className="bg-primary/5 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{activeToday.length}</p>
              <p className="text-[11px] text-muted-foreground">total active</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-emerald-600">{agentsToday}</p>
                <p className="text-[10px] text-muted-foreground">agents</p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-blue-600">{seekersToday}</p>
                <p className="text-[10px] text-muted-foreground">seekers</p>
              </div>
            </div>
          </div>

          {/* Last 7 days */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last 7 days</p>
            <div className="bg-primary/5 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{activeWeek.length}</p>
              <p className="text-[11px] text-muted-foreground">total active</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-emerald-600">{agentsWeek}</p>
                <p className="text-[10px] text-muted-foreground">agents</p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-blue-600">{seekersWeek}</p>
                <p className="text-[10px] text-muted-foreground">seekers</p>
              </div>
            </div>
          </div>

          {/* Last 30 days */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last 30 days</p>
            <div className="bg-primary/5 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">{activeMonth.length}</p>
              <p className="text-[11px] text-muted-foreground">total active</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-emerald-600">{agentsMonth}</p>
                <p className="text-[10px] text-muted-foreground">agents</p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-blue-600">{seekersMonth}</p>
                <p className="text-[10px] text-muted-foreground">seekers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-3">Recent Users</h3>
        <div className="space-y-2">
          {users.slice(0, 10).map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{u.display_name || u.email}</p>
                <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1">
                {u.roles.map((r) => (
                  <span key={r} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r === 'admin' ? 'bg-red-500/20 text-red-500' :
                    r === 'agent' ? 'bg-emerald-500/20 text-emerald-500' :
                    'bg-muted text-muted-foreground'
                  }`}>{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminOverview;

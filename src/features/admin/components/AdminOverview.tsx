import { motion } from 'framer-motion';

interface StatCard {
  label: string;
  value: number;
  color: string;
}

interface Props {
  stats: { totalUsers: number; totalAgents: number; totalListings: number; totalLeads: number; totalVoiceSearches: number };
  users: { id: string; display_name?: string; email: string; roles: string[]; created_at: string }[];
}

const AdminOverview = ({ stats, users }: Props) => {
  const cards: StatCard[] = [
    { label: 'Total Users', value: stats.totalUsers, color: 'text-primary' },
    { label: 'Agents', value: stats.totalAgents, color: 'text-emerald-500' },
    { label: 'Listings', value: stats.totalListings, color: 'text-purple-500' },
    { label: 'Leads', value: stats.totalLeads, color: 'text-amber-500' },
    { label: 'Voice Searches', value: stats.totalVoiceSearches, color: 'text-cyan-500' },
  ];

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

import { motion } from 'framer-motion';
import { Search, Shield } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

interface UserRow {
  id: string;
  email: string;
  display_name?: string;
  roles: string[];
  created_at: string;
}

interface Props {
  users: UserRow[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRoleChange: (userId: string, role: 'user' | 'agent' | 'admin', action: 'add' | 'remove') => void;
}

const AdminRoles = ({ users, searchQuery, onSearchChange, onRoleChange }: Props) => {
  const filtered = users.filter((u) =>
    (u.display_name || u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users to manage roles..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{u.display_name || u.email}</p>
              <p className="text-xs text-muted-foreground">ID: {u.id.slice(0, 8)}...</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['user', 'agent', 'admin'] as const).map((role) => {
                const hasRole = u.roles.includes(role);
                return (
                  <button
                    key={role}
                    onClick={() => onRoleChange(u.id, role, hasRole ? 'remove' : 'add')}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      hasRole
                        ? role === 'admin' ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' :
                          role === 'agent' ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' :
                          'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {hasRole ? `✓ ${role}` : `+ ${role}`}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default AdminRoles;

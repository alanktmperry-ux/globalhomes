import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [pendingAdminGrant, setPendingAdminGrant] = useState<UserRow | null>(null);

  const filtered = users.filter((u) =>
    (u.display_name || u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClick = (user: UserRow, role: 'user' | 'agent' | 'admin', hasRole: boolean) => {
    // Require explicit confirmation when granting (not removing) admin
    if (role === 'admin' && !hasRole) {
      setPendingAdminGrant(user);
      return;
    }
    onRoleChange(user.id, role, hasRole ? 'remove' : 'add');
  };

  const confirmAdminGrant = () => {
    if (pendingAdminGrant) {
      onRoleChange(pendingAdminGrant.id, 'admin', 'add');
      setPendingAdminGrant(null);
    }
  };

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
                    onClick={() => handleClick(u, role, hasRole)}
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

      <AlertDialog open={!!pendingAdminGrant} onOpenChange={(open) => !open && setPendingAdminGrant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant admin access?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to grant admin access to{' '}
              <strong>{pendingAdminGrant?.display_name || pendingAdminGrant?.email}</strong>?
              This gives full platform control.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAdminGrant}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Grant admin access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default AdminRoles;

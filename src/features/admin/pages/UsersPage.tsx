import AdminUsers from '@/features/admin/components/AdminUsers';

export default function UsersPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All agents, seekers, demo accounts and partners. Delete, ban, or impersonate any user.
        </p>
      </div>
      <AdminUsers />
    </div>
  );
}

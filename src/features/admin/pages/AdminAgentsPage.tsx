import { EmptyState } from '@/components/ui/empty-state';

export default function AdminAgentsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Agents</h1>
      <EmptyState
        icon="solar:users-group-rounded-linear"
        title="Agent management is in progress"
        body="Agent lifecycle, users, and roles will live here. We'll notify you when it's ready."
      />
    </div>
  );
}

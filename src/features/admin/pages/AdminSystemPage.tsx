import { EmptyState } from '@/components/ui/empty-state';

export default function AdminSystemPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">System</h1>
      <EmptyState
        icon="solar:shield-check-linear"
        title="System tools are in progress"
        body="Database, reports, compliance, and pre-launch checklist will live here."
      />
    </div>
  );
}

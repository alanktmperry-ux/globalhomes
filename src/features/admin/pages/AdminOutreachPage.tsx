import { EmptyState } from '@/components/ui/empty-state';

export default function AdminOutreachPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Outreach</h1>
      <EmptyState
        icon="solar:letter-linear"
        title="Outreach tools are in progress"
        body="Comms, partners, and press outreach will live here."
      />
    </div>
  );
}

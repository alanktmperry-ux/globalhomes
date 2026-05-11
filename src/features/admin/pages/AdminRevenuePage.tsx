import { EmptyState } from '@/components/ui/empty-state';

export default function AdminRevenuePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
      <EmptyState
        icon="solar:wallet-2-linear"
        title="Revenue dashboard is in progress"
        body="Billing, subscriptions, and growth funnels will live here."
      />
    </div>
  );
}

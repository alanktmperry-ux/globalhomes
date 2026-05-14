import RevenueBilling from '@/features/admin/components/RevenueBilling';
import FailedPaymentsQueue from '@/features/admin/components/FailedPaymentsQueue';

export default function AdminRevenuePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          MRR, ARR, plan breakdown, churn, failed payments, and renewal pipeline.
        </p>
      </div>
      <RevenueBilling />
      <FailedPaymentsQueue />
    </div>
  );
}

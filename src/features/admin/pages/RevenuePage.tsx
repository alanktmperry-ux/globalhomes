import RevenueBilling from '@/features/admin/components/RevenueBilling';

export default function RevenuePage() {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          MRR, ARR, plan mix, billing history and add-on revenue.
        </p>
      </div>
      <RevenueBilling />
    </div>
  );
}

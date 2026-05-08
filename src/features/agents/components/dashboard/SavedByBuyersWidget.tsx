import { useEffect, useState } from 'react';
import { Heart, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  listingId: string;
}

export default function SavedByBuyersWidget({ listingId }: Props) {
  const [stats, setStats] = useState<{ save_count: number; recent_count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_listing_save_stats', { _property_id: listingId });
      if (cancelled) return;
      if (!error && data && data.length > 0) {
        setStats({
          save_count: Number(data[0].save_count) || 0,
          recent_count: Number(data[0].recent_count) || 0,
        });
      } else {
        setStats({ save_count: 0, recent_count: 0 });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [listingId]);

  if (loading) {
    return <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />;
  }

  const count = stats?.save_count ?? 0;
  const recent = stats?.recent_count ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
          <Heart size={15} className="text-rose-500 fill-rose-500" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Saved by buyers</h3>
      </div>

      {count === 0 ? (
        <p className="text-xs text-muted-foreground">
          No buyers have saved this listing yet. Saves are a strong warm-lead signal.
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-2xl font-bold text-foreground">{count}</span>
            <span className="text-xs text-muted-foreground">
              buyer{count === 1 ? '' : 's'} saved
            </span>
          </div>
          {recent > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingUp size={11} />
              <span>+{recent} in the last 7 days</span>
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            Buyers who save are warm leads — consider sending an open-home invite or price update.
          </p>
        </>
      )}
    </div>
  );
}

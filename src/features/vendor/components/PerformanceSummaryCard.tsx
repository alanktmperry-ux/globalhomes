import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

interface Props {
  propertyId: string;
}

export function PerformanceSummaryCard({ propertyId }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<{ views: number; enquiries: number; saves: number; sparkline: { v: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('get_property_performance', { p_property_id: propertyId, p_days: 7 }).then(({ data: perf }) => {
      if (perf) {
        const p = perf as any;
        setData({
          views: p.total_views ?? 0,
          enquiries: p.total_enquiries ?? 0,
          saves: p.total_saves ?? 0,
          sparkline: (p.daily_views ?? []).map((d: any) => ({ v: d.views })),
        });
      }
      setLoading(false);
    });
  }, [propertyId]);

  if (loading) return <Skeleton className="h-10 rounded" />;
  if (!data) return null;

  return (
    <button
      onClick={() => navigate(`/dashboard/listings/${propertyId}/performance`)}
      className="flex items-center gap-3 w-full bg-muted/50 hover:bg-muted rounded-lg px-3 py-2 transition text-left"
    >
      <div className="w-16 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.sparkline}>
            <Line type="monotone" dataKey="v" stroke="hsl(217, 91%, 53%)" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <span className="text-xs text-muted-foreground">
        {data.views} views · {data.enquiries} enquiries · {data.saves} saves
      </span>
    </button>
  );
}

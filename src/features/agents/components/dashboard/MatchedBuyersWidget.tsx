import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props { listingId: string }

interface Row {
  id: string;
  match_score: number | null;
  readiness_score: number | null;
  match_reasoning: string | null;
  buyer_intent: {
    suburbs: string[] | null;
    bedrooms: number | null;
    max_price: number | null;
    intent_summary: string | null;
    last_searched_at: string | null;
  } | null;
}

const fmt = (n: number | null | undefined) => {
  if (!n) return '';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
};

export const MatchedBuyersWidget = ({ listingId }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('listing_buyer_matches')
        .select('id,match_score,readiness_score,match_reasoning,buyer_intent:buyer_intent_id(suburbs,bedrooms,max_price,intent_summary,last_searched_at)')
        .eq('listing_id', listingId)
        .neq('status', 'archived')
        .order('match_score', { ascending: false })
        .limit(3);
      setRows((data || []) as any);
      setLoading(false);
    })();
  }, [listingId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          Matched Buyers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No matches yet — buyers who search for properties like this will appear here automatically.
          </p>
        ) : (
          <>
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">Match {r.match_score ?? '—'}</Badge>
                  <span className="text-muted-foreground">Readiness {r.readiness_score ?? 0}</span>
                </div>
                <p className="text-foreground">
                  {r.buyer_intent?.bedrooms ? `${r.buyer_intent.bedrooms} bed · ` : ''}
                  {r.buyer_intent?.suburbs?.[0] || 'Open suburb'}
                  {r.buyer_intent?.max_price ? ` · under ${fmt(r.buyer_intent.max_price)}` : ''}
                </p>
                {r.buyer_intent?.last_searched_at && (
                  <p className="text-muted-foreground">
                    Active {formatDistanceToNow(new Date(r.buyer_intent.last_searched_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full text-xs gap-1" asChild>
              <Link to={`/dashboard/concierge?listing=${listingId}`}>
                View all matches <ArrowRight size={12} />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchedBuyersWidget;

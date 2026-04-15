import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Target, Copy, Mail, Loader2, Eye, Clock, Home, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import DashboardHeader from './DashboardHeader';

interface ScoredProperty {
  property_id: string;
  address: string;
  suburb: string;
  state: string;
  bedrooms: number | null;
  price: number | null;
  views: number;
  score: number;
  age_months: number;
  days_since_update: number;
}

interface AgentInfo {
  name: string;
  agency: string | null;
  phone: string | null;
}

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

function scoreColor(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-800 border-green-300';
  if (score >= 40) return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-muted text-muted-foreground border-border';
}

function scoreLabel(score: number) {
  if (score >= 70) return 'Hot';
  if (score >= 40) return 'Warm';
  return 'Low';
}

const SellerScoringPage = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<ScoredProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [outreachProperty, setOutreachProperty] = useState<ScoredProperty | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch scored properties
      const { data, error } = await supabase.functions.invoke('seller-score');
      if (error) {
        console.error('seller-score error:', error);
        toast.error('Could not load seller scores');
      } else if (Array.isArray(data)) {
        setProperties(data);
      }

      // Fetch agent info
      if (user) {
        const { data: agent } = await supabase
          .from('agents')
          .select('name, agency, phone')
          .eq('user_id', user.id)
          .maybeSingle();
        if (agent) setAgentInfo(agent as AgentInfo);
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const outreachMessage = useMemo(() => {
    if (!outreachProperty || !agentInfo) return '';
    return `Hi, I'm ${agentInfo.name} from ${agentInfo.agency || 'our agency'}. I noticed your property at ${outreachProperty.address} and wanted to reach out — we currently have buyers actively searching in ${outreachProperty.suburb}. If you've ever considered selling, I'd love to have a confidential conversation. No obligation. Call me on ${agentInfo.phone || '[your number]'}.`;
  }, [outreachProperty, agentInfo]);

  if (loading) {
    return (
      <div>
        <DashboardHeader title="Off-Market Opportunities" subtitle="Properties ranked by seller likelihood" />
        <div className="p-6 flex items-center justify-center min-h-[40vh]">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <DashboardHeader
        title="Off-Market Opportunities"
        subtitle="Properties ranked by seller likelihood based on listing age, seeker interest, and owner activity"
      />

      <div className="p-4 sm:p-6 max-w-[1200px] space-y-5">
        {/* Score Legend */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="font-semibold text-muted-foreground">Score:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-muted border border-border" />
            <span className="text-muted-foreground">0–39 Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-muted-foreground">40–69 Warm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">70–100 Hot</span>
          </div>
        </div>

        {properties.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center space-y-3">
              <Target size={36} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No off-market properties found. As agents add pocket listings, they'll appear here ranked by seller likelihood.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {properties.map((p) => (
              <Card key={p.property_id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Score Badge */}
                    <div className={`w-20 sm:w-24 flex flex-col items-center justify-center shrink-0 border-r ${scoreColor(p.score)}`}>
                      <span className="text-2xl sm:text-3xl font-bold leading-none">{p.score}</span>
                      <span className="text-[10px] font-medium mt-0.5">{scoreLabel(p.score)}</span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 p-3 sm:p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{p.address || 'Address unavailable'}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.suburb}{p.state ? `, ${p.state}` : ''}
                          </p>
                        </div>
                        {p.price && (
                          <span className="text-sm font-bold text-primary shrink-0">{AUD.format(p.price)}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                        {p.bedrooms != null && (
                          <span className="flex items-center gap-1">
                            <Home size={11} /> {p.bedrooms} bed{p.bedrooms !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarDays size={11} /> Listed {p.age_months} month{p.age_months !== 1 ? 's' : ''} ago
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> Last active {p.days_since_update} day{p.days_since_update !== 1 ? 's' : ''} ago
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={11} /> {p.views} view{p.views !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1.5"
                          onClick={() => setOutreachProperty(p)}
                        >
                          <Mail size={12} /> Draft Outreach
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Outreach Modal */}
      <Dialog open={!!outreachProperty} onOpenChange={(open) => !open && setOutreachProperty(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Draft Seller Outreach</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-2">
            Personalised message for <span className="font-semibold text-foreground">{outreachProperty?.address}</span>
          </p>
          <Textarea
            value={outreachMessage}
            readOnly
            className="min-h-[120px] text-sm"
            rows={5}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(outreachMessage);
                toast.success('Message copied to clipboard');
              }}
            >
              <Copy size={14} /> Copy Message
            </Button>
            <Button
              className="gap-1.5"
              onClick={() => {
                const subject = encodeURIComponent(`Regarding your property at ${outreachProperty?.address || ''}`);
                const body = encodeURIComponent(outreachMessage);
                window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
              }}
            >
              <Mail size={14} /> Send via Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerScoringPage;

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Languages, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { Halo } from '@/types/halo';
import { TIMEFRAME_LABELS, FINANCE_LABELS } from '@/types/halo';

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-AU');

export default function HaloDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [halo, setHalo] = useState<Halo | null>(null);
  const [seekerEmail, setSeekerEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        // Verify unlock locally first
        const { data: resp } = await supabase
          .from('halo_responses')
          .select('id')
          .eq('halo_id', id)
          .eq('agent_id', user.id)
          .maybeSingle();
        if (!resp) {
          if (active) navigate('/dashboard/halo-board', { replace: true });
          return;
        }

        const [haloRes, contactRes] = await Promise.all([
          supabase.from('halos').select('*').eq('id', id).maybeSingle(),
          supabase.functions.invoke('get-halo-contact', { body: { halo_id: id } }),
        ]);

        if (!active) return;
        if (haloRes.error || !haloRes.data) {
          setError('Halo not found.');
          return;
        }
        setHalo(haloRes.data as Halo);

        if (contactRes.error) {
          console.warn('[HaloDetail] contact fetch error', contactRes.error);
        } else {
          setSeekerEmail((contactRes.data as any)?.email ?? null);
        }
      } catch (e) {
        console.error('[HaloDetail] load error', e);
        if (active) setError('Unable to load Halo details.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, user, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error || !halo) {
    return (
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/dashboard/halo-board')} className="mb-4">
          <ArrowLeft size={16} /> Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error ?? 'Halo not found.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const intentLabel = halo.intent === 'buy' ? 'Buy' : 'Rent';
  const intentClass =
    halo.intent === 'buy'
      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      : 'bg-purple-100 text-purple-800 hover:bg-purple-100';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/dashboard/halo-board')}>
        <ArrowLeft size={16} /> Back to Halo Board
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className={intentClass} variant="secondary">
          {intentLabel}
        </Badge>
        {halo.preferred_language && halo.preferred_language !== 'en' && (
          <Badge variant="outline" className="gap-1">
            <Languages size={12} /> {halo.preferred_language}
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Seeker contact</h2>
          {seekerEmail ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Contact this seeker directly via email
              </p>
              <a
                href={`mailto:${seekerEmail}`}
                className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium"
              >
                <Mail size={16} /> {seekerEmail}
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Unable to retrieve contact details.{' '}
              <button
                className="text-blue-600 underline"
                onClick={() => toast('Contact ListHQ support if this persists.')}
              >
                Get help
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">What they're looking for</h2>
          <Field label="Property types" value={halo.property_types.join(', ') || '—'} />
          <Field label="Suburbs" value={halo.suburbs.join(', ') || '—'} />
          <Field
            label="Suburb flexibility"
            value={halo.suburb_flexibility ? 'Open to similar suburbs' : 'These suburbs only'}
          />
          <Field
            label="Budget"
            value={`AUD $${fmt(halo.budget_min)} – $${fmt(halo.budget_max)}`}
          />
          <Field
            label="Bedrooms"
            value={(() => {
              const min = halo.bedrooms_min;
              const max = halo.bedrooms_max;
              if (!min && !max) return 'Any';
              if (min && max) return min === max ? `${min} bedrooms` : `${min} to ${max}`;
              if (max) return `Up to ${max}`;
              return `${min}+`;
            })()}
          />
          <Field label="Bathrooms (min)" value={halo.bathrooms_min ?? 'Any'} />
          <Field label="Car spaces (min)" value={halo.car_spaces_min ?? 'Any'} />
          <Field label="Timeframe" value={TIMEFRAME_LABELS[halo.timeframe]} />
          <Field label="Finance status" value={FINANCE_LABELS[halo.finance_status]} />
        </CardContent>
      </Card>

      {halo.must_haves.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">Must-haves</h2>
            <div className="flex flex-wrap gap-2">
              {halo.must_haves.map((m) => (
                <Badge key={m} variant="secondary">
                  {m}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {halo.deal_breakers && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-semibold">Deal breakers</h2>
            <p className="text-sm whitespace-pre-wrap">{halo.deal_breakers}</p>
          </CardContent>
        </Card>
      )}

      {halo.description && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="text-sm whitespace-pre-wrap">{halo.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 font-medium">{value}</span>
    </div>
  );
}

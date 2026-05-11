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
import { useTranslation } from '@/shared/lib/i18n';

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-AU');

export default function HaloDetailPage() {
  const { t } = useTranslation();
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
          setError(t('halo.detail.notFound'));
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
        if (active) setError(t('halo.detail.loadError'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, user, navigate, t]);

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
          <ArrowLeft size={16} /> {t('halo.detail.back')}
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error ?? t('halo.detail.notFound')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const intentLabel = halo.intent === 'buy' ? t('halo.detail.intent.buy') : t('halo.detail.intent.rent');
  const intentClass =
    halo.intent === 'buy'
      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      : 'bg-purple-100 text-purple-800 hover:bg-purple-100';

  const budgetValue = (() => {
    const hasMin = halo.budget_min != null && halo.budget_min > 0;
    const hasMax = halo.budget_max != null && halo.budget_max > 0;
    if (hasMin && hasMax) return t('halo.detail.budget.range', { min: fmt(halo.budget_min), max: fmt(halo.budget_max) });
    if (hasMax) return t('halo.detail.budget.upTo', { max: fmt(halo.budget_max) });
    if (hasMin) return t('halo.detail.budget.from', { min: fmt(halo.budget_min) });
    return t('halo.detail.budget.any');
  })();

  const bedroomsValue = (() => {
    const min = halo.bedrooms_min;
    const max = halo.bedrooms_max;
    if (!min && !max) return t('halo.detail.any');
    if (min && max) {
      if (min === max) {
        return t(min === 1 ? 'halo.detail.bedrooms.exact.one' : 'halo.detail.bedrooms.exact.other', { count: min });
      }
      return t('halo.detail.bedrooms.range', { min, max });
    }
    if (max) return t('halo.detail.bedrooms.upTo', { max });
    return t('halo.detail.bedrooms.min', { min: min ?? 0 });
  })();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate('/dashboard/halo-board')}>
        <ArrowLeft size={16} /> {t('halo.detail.backToBoard')}
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className={intentClass} variant="secondary">
          {intentLabel}
        </Badge>
        {halo.preferred_language && halo.preferred_language !== 'en' && (
          <Badge variant="outline" className="gap-1">
            <Languages size={12} /> {halo.preferred_language.charAt(0).toUpperCase() + halo.preferred_language.slice(1)}
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t('halo.detail.seekerContact')}</h2>
          {seekerEmail ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t('halo.detail.contactBlurb')}
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
              {t('halo.detail.contactUnavailable')}{' '}
              <button
                className="text-blue-600 underline"
                onClick={() => toast(t('halo.detail.supportToast'))}
              >
                {t('halo.detail.getHelp')}
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t('halo.detail.lookingFor')}</h2>
          <Field label={t('halo.detail.field.propertyTypes')} value={halo.property_types.join(', ') || '—'} />
          <Field label={t('halo.detail.field.suburbs')} value={halo.suburbs.join(', ') || '—'} />
          <Field
            label={t('halo.detail.field.suburbFlexibility')}
            value={halo.suburb_flexibility ? t('halo.detail.suburbFlex.open') : t('halo.detail.suburbFlex.strict')}
          />
          <Field label={t('halo.detail.field.budget')} value={budgetValue} />
          <Field label={t('halo.detail.field.bedrooms')} value={bedroomsValue} />
          <Field label={t('halo.detail.field.bathrooms')} value={halo.bathrooms_min ?? t('halo.detail.any')} />
          <Field label={t('halo.detail.field.carSpaces')} value={halo.car_spaces_min ?? t('halo.detail.any')} />
          <Field label={t('halo.detail.field.timeframe')} value={TIMEFRAME_LABELS[halo.timeframe]} />
          <Field label={t('halo.detail.field.finance')} value={FINANCE_LABELS[halo.finance_status]} />
        </CardContent>
      </Card>

      {halo.must_haves.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">{t('halo.detail.mustHaves')}</h2>
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
            <h2 className="text-lg font-semibold">{t('halo.detail.dealBreakers')}</h2>
            <p className="text-sm whitespace-pre-wrap">{halo.deal_breakers}</p>
          </CardContent>
        </Card>
      )}

      {halo.description && (
        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-lg font-semibold">{t('halo.detail.description')}</h2>
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

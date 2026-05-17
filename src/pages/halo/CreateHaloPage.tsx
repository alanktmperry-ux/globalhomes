import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { HaloStepIndicator } from '@/components/halo/HaloStepIndicator';
import { HaloStep1, validateStep1 } from '@/components/halo/HaloStep1';
import { HaloStep2, validateStep2 } from '@/components/halo/HaloStep2';
import { HaloStep3, validateStep3 } from '@/components/halo/HaloStep3';
import type { HaloFormData } from '@/types/halo';
import { usePageTitle } from '@/lib/usePageTitle';
import { useTranslation } from '@/shared/lib/i18n';
import { capture } from '@/shared/lib/posthog';

const DRAFT_KEY = 'halo_draft';

const initialData: HaloFormData = {
  intent: 'buy',
  property_types: [],
  bedrooms_min: null,
  bedrooms_max: null,
  bathrooms_min: null,
  car_spaces_min: null,
  suburbs: [],
  suburb_flexibility: false,
  budget_min: null,
  budget_max: 0,
  timeframe: 'ready_now',
  finance_status: 'not_started',
  description: null,
  deal_breakers: null,
  must_haves: [],
  preferred_language: 'english',
  referral_source: null,
};



const VALID_SOURCE_TYPES = new Set(['direct','listing_qr','crm_invite','rent_roll','voice_lead','settlement']);

export default function CreateHaloPage() {
  usePageTitle('Create Your Halo');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const STEP_LABELS = [
    t('halo.wizard.steps.step1'),
    t('halo.wizard.steps.step2'),
    t('halo.wizard.steps.step3'),
  ];
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<HaloFormData>(initialData);
  const [restored, setRestored] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [source, setSource] = useState<{
    source_listing_id?: string;
    source_agent_id?: string;
    source_type?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rehydrate draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setData({ ...initialData, ...parsed });
          setRestored(true);
        }
      }
    } catch {
      /* ignore */
    }
    if (user?.id) {
      supabase
        .from('halo_drafts')
        .select('draft_data')
        .eq('seeker_id', user.id)
        .maybeSingle()
        .then(({ data: row }) => {
          if (row?.draft_data && typeof row.draft_data === 'object') {
            setData((d) => ({ ...d, ...(row.draft_data as Partial<HaloFormData>) }));
            setRestored(true);
          }
        });
    }
  }, [user?.id]);

  // Smart Search telemetry: mark search_queries.halo_clicked = true on arrival
  useEffect(() => {
    const fromSearch = searchParams.get('source') === 'search';
    if (!fromSearch) return;
    const rawQuery = searchParams.get('raw_q');
    if (!rawQuery) return;
    if (!user?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const { data: rows, error: selErr } = await supabase
          .from('search_queries')
          .select('id')
          .eq('user_id', user.id)
          .eq('raw_query', rawQuery)
          .order('created_at', { ascending: false })
          .limit(1);
        if (cancelled) return;
        if (selErr) {
          console.warn('[halo telemetry] search_queries lookup failed:', selErr);
          return;
        }
        const rowId = (rows?.[0] as { id?: string } | undefined)?.id;
        if (!rowId) return;
        const { error: updErr } = await supabase
          .from('search_queries')
          .update({ halo_clicked: true })
          .eq('id', rowId);
        if (updErr) console.warn('[halo telemetry] halo_clicked update failed:', updErr);
      } catch (e) {
        console.warn('[halo telemetry] unexpected error:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Apply query-param prefill (Listing CTA, CRM invite, voice lead, rent roll, smart search)
  useEffect(() => {
    const intent = searchParams.get('intent');
    const suburb = searchParams.get('suburb');
    const budgetMax = searchParams.get('budget_max');
    const propertyType = searchParams.get('property_type');
    const sLid = searchParams.get('source_listing_id') ?? undefined;
    const sAid = searchParams.get('source_agent_id') ?? undefined;
    const sType = searchParams.get('source_type') ?? undefined;

    // Smart Search prefill params (source=search)
    const isFromSearch = searchParams.get('source') === 'search';
    const bedsMin = searchParams.get('beds_min');
    const bedsMax = searchParams.get('beds_max');
    const bathsMin = searchParams.get('baths_min');
    const parkingMin = searchParams.get('parking_min');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const typesCsv = searchParams.get('type');
    const featuresCsv = searchParams.get('features');
    const rawQuery = searchParams.get('raw_q');

    let touched = false;
    const patch: Partial<HaloFormData> = {};
    if (intent === 'buy' || intent === 'rent') { patch.intent = intent; touched = true; }
    if (suburb) { patch.suburbs = [suburb]; touched = true; }
    if (budgetMax && !Number.isNaN(Number(budgetMax))) { patch.budget_max = Number(budgetMax); touched = true; }
    if (propertyType) { patch.property_types = [propertyType]; touched = true; }

    if (isFromSearch) {
      const parsedTypes = typesCsv?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      if (parsedTypes.length) { patch.property_types = parsedTypes; touched = true; }
      if (bedsMin && !Number.isNaN(Number(bedsMin))) { patch.bedrooms_min = Number(bedsMin); touched = true; }
      if (bedsMax && !Number.isNaN(Number(bedsMax))) { patch.bedrooms_max = Number(bedsMax); touched = true; }
      if (bathsMin && !Number.isNaN(Number(bathsMin))) { patch.bathrooms_min = Number(bathsMin); touched = true; }
      if (parkingMin && !Number.isNaN(Number(parkingMin))) { patch.car_spaces_min = Number(parkingMin); touched = true; }
      if (minPrice && !Number.isNaN(Number(minPrice))) { patch.budget_min = Number(minPrice); touched = true; }
      if (maxPrice && !Number.isNaN(Number(maxPrice))) { patch.budget_max = Number(maxPrice); touched = true; }
      const parsedFeatures = featuresCsv?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
      if (parsedFeatures.length) { patch.must_haves = parsedFeatures; touched = true; }
      if (rawQuery) { patch.description = rawQuery.slice(0, 500); touched = true; }
    }

    if (touched) {
      setData((d) => ({ ...d, ...patch }));
      setPrefilled(true);
    }
    if (sLid || sAid || sType) {
      setSource({
        source_listing_id: sLid,
        source_agent_id: sAid,
        source_type: sType && VALID_SOURCE_TYPES.has(sType) ? sType : undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save (debounced)
  useEffect(() => {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      } catch { /* ignore */ }
      if (user?.id) {
        supabase
          .from('halo_drafts')
          .upsert({ seeker_id: user.id, draft_data: data as any, updated_at: new Date().toISOString() }, { onConflict: 'seeker_id' })
          .then(() => {});
      }
    }, 500);
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [data, user?.id]);

  const update = (patch: Partial<HaloFormData>) => {
    setStepError(null);
    setData((d) => ({ ...d, ...patch }));
  };

  const validators = [validateStep1, validateStep2, validateStep3];

  const scrollToError = () => {
    setTimeout(() => {
      document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const handleNext = () => {
    const err = validators[step - 1](data);
    if (err) {
      setStepError(err);
      scrollToError();
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(3, s + 1));
  };

  const handleBack = () => {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    const err = validateStep3(data);
    if (err) {
      setStepError(err);
      scrollToError();
      return;
    }
    if (!user) {
      toast.error(t('halo.toast.signinRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const insertPayload: Record<string, unknown> = { ...data, seeker_id: user.id };
      if (source.source_listing_id) insertPayload.source_listing_id = source.source_listing_id;
      if (source.source_agent_id) insertPayload.source_agent_id = source.source_agent_id;
      if (source.source_type) insertPayload.source_type = source.source_type;

      const { data: inserted, error } = await supabase
        .from('halos')
        .insert(insertPayload)
        .select('id')
        .single();
      if (error) throw error;

      capture('halo_created', {
        halo_id: (inserted as any).id,
        intent: data.intent,
        suburb: data.suburbs?.[0] ?? null,
        budget_max: data.budget_max,
        preferred_language: data.preferred_language,
        is_from_search: isFromSearch,
      });

      try {
        await supabase.functions.invoke('send-halo-confirmation', {
          body: { id: (inserted as any).id, seeker_id: user.id },
        });
      } catch { /* non-fatal */ }

      try {
        await supabase.functions.invoke('score-halo', {
          body: { halo_id: (inserted as any).id },
        });
      } catch { /* non-fatal */ }

      try {
        await supabase.functions.invoke('match-halo-to-pocket-listings', {
          body: { halo_id: (inserted as any).id },
        });
      } catch { /* non-fatal */ }

      // Smart Search funnel: mark search_queries.halo_posted = true
      try {
        const fromSearch = searchParams.get('source') === 'search';
        const rawQuery = searchParams.get('raw_q');
        if (fromSearch && rawQuery && user?.id) {
          const { data: rows } = await supabase
            .from('search_queries')
            .select('id')
            .eq('user_id', user.id)
            .eq('raw_query', rawQuery)
            .order('created_at', { ascending: false })
            .limit(1);
          const rowId = (rows?.[0] as { id?: string } | undefined)?.id;
          if (rowId) {
            await supabase
              .from('search_queries')
              .update({ halo_posted: true })
              .eq('id', rowId);
          }
        }
      } catch (telemetryErr) {
        console.warn('[halo telemetry] halo_posted update failed:', telemetryErr);
      }

      // Halo confirmation email is handled by send-halo-confirmation (fires every Halo).

      // Save buyer's preferred language to profile for auto-language on property pages
      const LANG_TO_I18N: Record<string, string> = {
        mandarin: 'zh-CN',
        cantonese: 'zh-TW',
        vietnamese: 'vi',
        korean: 'ko',
        arabic: 'ar',
        japanese: 'ja',
        hindi: 'hi',
        bengali: 'bn',
        filipino: 'tl',
        indonesian: 'id',
        english: 'en',
      };
      const i18nCode = LANG_TO_I18N[String(data.preferred_language)] || 'en';
      if (i18nCode !== 'en') {
        supabase
          .from('profiles')
          .update({ language_preference: i18nCode } as any)
          .eq('user_id', user.id)
          .then(() => {});
      }

      localStorage.removeItem(DRAFT_KEY);
      if (user?.id) {
        supabase.from('halo_drafts').delete().eq('seeker_id', user.id).then(() => {});
      }
      navigate('/halo/success');
    } catch (e) {
      console.error(e);
      toast.error(t('halo.toast.genericError'));
      scrollToError();
    } finally {
      setSubmitting(false);
    }
  };

  const isFromSearch = searchParams.get('source') === 'search';
  const rawQ = searchParams.get('raw_q');

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('halo.wizard.create.title')}</h1>
        <p className="text-muted-foreground mb-6">
          {t('halo.wizard.create.subtitle')}
        </p>

        {isFromSearch && (
          <div className="mb-6 rounded-lg border bg-primary/5 p-4 text-sm">
            <p className="font-medium mb-1">
              {t('halo.prefilled_from_search.heading')}
            </p>
            <p className="text-muted-foreground">
              {rawQ && (
                <>
                  {t('halo.prefilled_from_search.based_on')}:{' '}
                  <span className="italic">"{rawQ}"</span>.{' '}
                </>
              )}
              {t('halo.prefilled_from_search.body')}
            </p>
          </div>
        )}

        <div className="mb-6">
          <HaloStepIndicator current={step} total={3} labels={STEP_LABELS} />
        </div>

        {prefilled && (
          <Alert className="mb-4">
            <AlertDescription>
              {t('halo.wizard.create.prefilled')}
            </AlertDescription>
          </Alert>
        )}

        {restored && (
          <Alert className="mb-6">
            <AlertDescription>
              {t('halo.wizard.create.restored')}
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-card border rounded-xl p-6 mb-6">
          {step === 1 && <HaloStep1 data={data} update={update} />}
          {step === 2 && <HaloStep2 data={data} update={update} />}
          {step === 3 && <HaloStep3 data={data} update={update} />}
        </div>

        {stepError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{t(stepError)}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={step === 1 ? () => navigate(-1) : handleBack}
            disabled={submitting}
          >
            <ArrowLeft size={16} /> {step === 1 ? t('halo.wizard.nav.cancel') : t('halo.wizard.nav.back')}
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext}>
              {t('halo.wizard.nav.next')} <ArrowRight size={16} />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {t('halo.wizard.nav.post')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

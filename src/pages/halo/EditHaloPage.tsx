import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const STEP_LABELS = ['What are you looking for?', 'Where and how much?', 'Tell agents more'];

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

export default function EditHaloPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<HaloFormData>(initialData);
  const [haloId, setHaloId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?return_to=/halo/edit', { replace: true });
      return;
    }
    (async () => {
      const { data: halo, error } = await supabase
        .from('halos' as any)
        .select('*')
        .eq('seeker_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !halo) {
        navigate('/halo/create', { replace: true });
        return;
      }

      const h = halo as any;
      setHaloId(h.id);
      setData({
        ...initialData,
        intent: h.intent ?? 'buy',
        property_types: h.property_types ?? [],
        bedrooms_min: h.bedrooms_min ?? null,
        bedrooms_max: h.bedrooms_max ?? null,
        bathrooms_min: h.bathrooms_min ?? null,
        car_spaces_min: h.car_spaces_min ?? null,
        suburbs: h.suburbs ?? [],
        suburb_flexibility: h.suburb_flexibility ?? false,
        budget_min: h.budget_min ?? null,
        budget_max: h.budget_max ?? 0,
        timeframe: h.timeframe ?? 'ready_now',
        finance_status: h.finance_status ?? 'not_started',
        description: h.description ?? null,
        deal_breakers: h.deal_breakers ?? null,
        must_haves: h.must_haves ?? [],
        preferred_language: h.preferred_language ?? 'english',
        referral_source: h.referral_source ?? null,
      });
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

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
    if (!user || !haloId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('halos' as any)
        .update({
          intent: data.intent,
          property_types: data.property_types,
          bedrooms_min: data.bedrooms_min,
          bedrooms_max: data.bedrooms_max,
          bathrooms_min: data.bathrooms_min,
          car_spaces_min: data.car_spaces_min,
          suburbs: data.suburbs,
          suburb_flexibility: data.suburb_flexibility,
          budget_min: data.budget_min,
          budget_max: data.budget_max,
          timeframe: data.timeframe,
          finance_status: data.finance_status,
          description: data.description,
          deal_breakers: data.deal_breakers,
          must_haves: data.must_haves,
          preferred_language: data.preferred_language,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', haloId);
      if (error) throw error;

      const i18nCode = LANG_TO_I18N[String(data.preferred_language)] || 'en';
      if (i18nCode !== 'en') {
        await supabase
          .from('profiles')
          .update({ language_preference: i18nCode } as any)
          .eq('user_id', user.id);
      }

      try {
        await supabase.functions.invoke('match-halo-to-pocket-listings', {
          body: { halo_id: haloId },
        });
      } catch { /* non-fatal */ }

      toast.success('Your Halo has been updated.');
      navigate('/seeker/dashboard');
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong. Please try again.');
      scrollToError();
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Update your Halo</h1>
        <p className="text-muted-foreground mb-6">
          Adjust your search preferences — agents will match against the latest version.
        </p>

        <div className="mb-6">
          <HaloStepIndicator current={step} total={3} labels={STEP_LABELS} />
        </div>

        <div className="bg-card border rounded-xl p-6 mb-6">
          {step === 1 && <HaloStep1 data={data} update={update} />}
          {step === 2 && <HaloStep2 data={data} update={update} />}
          {step === 3 && <HaloStep3 data={data} update={update} />}
        </div>

        {stepError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{stepError}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={step === 1 ? () => navigate('/seeker/dashboard') : handleBack}
            disabled={submitting}
          >
            <ArrowLeft size={16} /> {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext}>
              Next <ArrowRight size={16} />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Save changes
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

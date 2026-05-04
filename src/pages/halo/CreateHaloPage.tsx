import { useEffect, useState } from 'react';
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

const STEP_LABELS = ['What are you looking for?', 'Where and how much?', 'Tell agents more'];

const VALID_SOURCE_TYPES = new Set(['direct','listing_qr','crm_invite','rent_roll','voice_lead','settlement']);

export default function CreateHaloPage() {
  const navigate = useNavigate();
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
  }, []);

  // Apply query-param prefill (Listing CTA, CRM invite, voice lead, rent roll)
  useEffect(() => {
    const intent = searchParams.get('intent');
    const suburb = searchParams.get('suburb');
    const budgetMax = searchParams.get('budget_max');
    const propertyType = searchParams.get('property_type');
    const sLid = searchParams.get('source_listing_id') ?? undefined;
    const sAid = searchParams.get('source_agent_id') ?? undefined;
    const sType = searchParams.get('source_type') ?? undefined;

    let touched = false;
    const patch: Partial<HaloFormData> = {};
    if (intent === 'buy' || intent === 'rent') { patch.intent = intent; touched = true; }
    if (suburb) { patch.suburbs = [suburb]; touched = true; }
    if (budgetMax && !Number.isNaN(Number(budgetMax))) { patch.budget_max = Number(budgetMax); touched = true; }
    if (propertyType) { patch.property_types = [propertyType]; touched = true; }

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

  // Auto-save
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data]);

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
      return;
    }
    if (!user) {
      toast.error('You must be signed in');
      return;
    }
    setSubmitting(true);
    try {
      const insertPayload: Record<string, unknown> = { ...data, seeker_id: user.id };
      if (source.source_listing_id) insertPayload.source_listing_id = source.source_listing_id;
      if (source.source_agent_id) insertPayload.source_agent_id = source.source_agent_id;
      if (source.source_type) insertPayload.source_type = source.source_type;

      const { data: inserted, error } = await supabase
        .from('halos' as any)
        .insert(insertPayload)
        .select('id')
        .single();
      if (error) throw error;

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

      localStorage.removeItem(DRAFT_KEY);
      navigate('/halo/success');
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong. Please try again.');
      scrollToError();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Create your Halo</h1>
        <p className="text-muted-foreground mb-6">
          Tell us what you're looking for and let agents find you.
        </p>

        <div className="mb-6">
          <HaloStepIndicator current={step} total={3} labels={STEP_LABELS} />
        </div>

        {prefilled && (
          <Alert className="mb-4">
            <AlertDescription>
              We've pre-filled some details from the listing you viewed. Check and adjust anything before posting.
            </AlertDescription>
          </Alert>
        )}

        {restored && (
          <Alert className="mb-6">
            <AlertDescription>
              You have an unsaved draft. Your progress has been restored.
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
            <AlertDescription>{stepError}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={step === 1 ? () => navigate(-1) : handleBack}
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
              Post my Halo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

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

export default function CreateHaloPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<HaloFormData>(initialData);
  const [restored, setRestored] = useState(false);
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

  const handleNext = () => {
    const err = validators[step - 1](data);
    if (err) {
      setStepError(err);
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
      const { data: inserted, error } = await supabase
        .from('halos' as any)
        .insert({ ...data, seeker_id: user.id })
        .select('id')
        .single();
      if (error) throw error;

      // Fire confirmation email (best-effort)
      try {
        await supabase.functions.invoke('send-halo-confirmation', {
          body: { id: (inserted as any).id, seeker_id: user.id },
        });
      } catch {
        /* non-fatal */
      }

      localStorage.removeItem(DRAFT_KEY);
      toast.success('Your Halo is live');
      navigate('/dashboard/my-halos');
    } catch (e) {
      console.error(e);
      toast.error('Something went wrong. Please try again.');
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

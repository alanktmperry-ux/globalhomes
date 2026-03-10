import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import StepAddress from './StepAddress';
import StepBasics from './StepBasics';
import StepPhotos from './StepPhotos';
import StepVoice from './StepVoice';
import StepSettings from './StepSettings';
import StepPreview from './StepPreview';

export interface ListingDraft {
  address: string;
  suburb: string;
  state: string;
  priceMin: number;
  priceMax: number;
  priceDisplay: 'exact' | 'range' | 'eoi' | 'contact';
  propertyType: string;
  beds: number;
  baths: number;
  cars: number;
  photos: string[];
  primaryPhoto: number;
  voiceTranscript: string;
  generatedTitle: string;
  generatedBullets: string[];
  features: string[];
  visibility: 'whisper' | 'coming-soon' | 'public';
  exclusiveDays: number;
  buyerRequirements: string;
  showContact: boolean;
  allowCoBroke: boolean;
  autoDeclineBelow: number;
  scheduledAt: string | null;
}

const DEFAULT_DRAFT: ListingDraft = {
  address: '',
  suburb: '',
  state: '',
  priceMin: 500000,
  priceMax: 800000,
  priceDisplay: 'range',
  propertyType: 'House',
  beds: 3,
  baths: 2,
  cars: 2,
  photos: [],
  primaryPhoto: 0,
  voiceTranscript: '',
  generatedTitle: '',
  generatedBullets: [],
  features: [],
  visibility: 'whisper',
  exclusiveDays: 14,
  buyerRequirements: 'none',
  showContact: true,
  allowCoBroke: true,
  autoDeclineBelow: 0,
  scheduledAt: null,
};

const STEPS = ['Address', 'Basics', 'Photos', 'Voice', 'Settings', 'Preview'];

interface Props {
  onPublish: (title: string) => void;
  onCancel: () => void;
}

const formatPriceForDB = (draft: ListingDraft): string => {
  const fmt = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`;
  switch (draft.priceDisplay) {
    case 'exact': return fmt(draft.priceMax);
    case 'range': return `${fmt(draft.priceMin)} – ${fmt(draft.priceMax)}`;
    case 'eoi': return 'Expressions of Interest';
    case 'contact': return 'Contact Agent';
  }
};

const PocketListingForm = ({ onPublish, onCancel }: Props) => {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ListingDraft>(DEFAULT_DRAFT);
  const [publishing, setPublishing] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();
  const { user } = useAuth();
  const { toast } = useToast();

  const update = (partial: Partial<ListingDraft>) =>
    setDraft((d) => ({ ...d, ...partial }));

  // Auto-save every 10 seconds
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      localStorage.setItem('pocket-listing-draft', JSON.stringify(draft));
    }, 10000);
    return () => clearInterval(autoSaveRef.current);
  }, [draft]);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('pocket-listing-draft');
    if (saved) {
      try { setDraft(JSON.parse(saved)); } catch {}
    }
  }, []);

  const progress = ((step + 1) / STEPS.length) * 100;

  const canNext = () => {
    if (step === 0) return draft.address.length > 0;
    return true;
  };

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);

    try {
      // Look up the agent record for the current user
      let agentId: string | null = null;
      if (user) {
        const { data: agent } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        agentId = agent?.id ?? null;
      }

      const title = draft.generatedTitle || `${draft.propertyType} in ${draft.suburb || 'Location'}`;
      const description = [
        draft.voiceTranscript,
        ...(draft.generatedBullets.length > 0 ? ['', 'Key Features:', ...draft.generatedBullets.map(b => `• ${b}`)] : []),
      ].filter(Boolean).join('\n') || null;

      const mainPhoto = draft.photos[draft.primaryPhoto] || draft.photos[0] || null;

      const { error } = await supabase.from('properties').insert({
        title,
        address: draft.address,
        suburb: draft.suburb || 'Unknown',
        state: draft.state || 'Unknown',
        country: 'Australia',
        price: draft.priceMax,
        price_formatted: formatPriceForDB(draft),
        beds: draft.beds,
        baths: draft.baths,
        parking: draft.cars,
        sqm: 0,
        property_type: draft.propertyType,
        description,
        features: draft.features,
        image_url: mainPhoto,
        images: draft.photos.length > 0 ? draft.photos : [],
        agent_id: agentId,
        is_active: draft.visibility === 'public',
      });

      if (error) throw error;

      localStorage.removeItem('pocket-listing-draft');
      toast({ title: 'Listing published!', description: 'Your property has been saved to the database.' });
      onPublish(title);
    } catch (err: any) {
      console.error('Publish error:', err);
      toast({
        title: 'Failed to publish',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  const stepContent = () => {
    switch (step) {
      case 0: return <StepAddress draft={draft} update={update} />;
      case 1: return <StepBasics draft={draft} update={update} />;
      case 2: return <StepPhotos draft={draft} update={update} />;
      case 3: return <StepVoice draft={draft} update={update} />;
      case 4: return <StepSettings draft={draft} update={update} />;
      case 5: return <StepPreview draft={draft} onPublish={handlePublish} publishing={publishing} />;
      default: return null;
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl">
      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Step {step + 1} of {STEPS.length}: <strong className="text-foreground">{STEPS[step]}</strong></span>
          <span className="flex items-center gap-1 text-success">
            <Save size={12} /> Auto-saved
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Step content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25 }}
        className="p-5"
      >
        {stepContent()}
      </motion.div>

      {/* Nav */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}
          disabled={publishing}
        >
          <ArrowLeft size={14} className="mr-1" /> {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        {step < STEPS.length - 1 && (
          <Button
            size="sm"
            disabled={!canNext()}
            onClick={() => setStep(step + 1)}
          >
            Next <ArrowRight size={14} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default PocketListingForm;
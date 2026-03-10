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
  /** When provided, the form loads this property for editing */
  editPropertyId?: string | null;
  /** When provided, the form loads this property's data but creates a new listing */
  duplicatePropertyId?: string | null;
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

const PocketListingForm = ({ onPublish, onCancel, editPropertyId, duplicatePropertyId }: Props) => {
  const loadPropertyId = editPropertyId || duplicatePropertyId;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ListingDraft>(DEFAULT_DRAFT);
  const [publishing, setPublishing] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!loadPropertyId);
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();
  const { user } = useAuth();
  const { toast } = useToast();

  const update = (partial: Partial<ListingDraft>) =>
    setDraft((d) => ({ ...d, ...partial }));

  // Load existing property for editing
  useEffect(() => {
    if (!editPropertyId) return;
    const loadProperty = async () => {
      setLoadingEdit(true);
      const { data: prop, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', editPropertyId)
        .maybeSingle();

      if (error || !prop) {
        toast({ title: 'Could not load listing', variant: 'destructive' });
        setLoadingEdit(false);
        return;
      }

      // Detect price display from formatted string
      let priceDisplay: ListingDraft['priceDisplay'] = 'exact';
      if (prop.price_formatted.includes('–')) priceDisplay = 'range';
      else if (prop.price_formatted.toLowerCase().includes('expression')) priceDisplay = 'eoi';
      else if (prop.price_formatted.toLowerCase().includes('contact')) priceDisplay = 'contact';

      // Parse description back into transcript + bullets
      const descLines = (prop.description || '').split('\n').filter(Boolean);
      const bulletLines = descLines.filter(l => l.startsWith('•')).map(l => l.replace(/^•\s*/, ''));
      const transcriptLines = descLines.filter(l => !l.startsWith('•') && l !== 'Key Features:');

      setDraft({
        address: prop.address,
        suburb: prop.suburb,
        state: prop.state,
        priceMin: Math.round(prop.price * 0.9),
        priceMax: prop.price,
        priceDisplay,
        propertyType: prop.property_type || 'House',
        beds: prop.beds,
        baths: prop.baths,
        cars: prop.parking,
        photos: prop.images || (prop.image_url ? [prop.image_url] : []),
        primaryPhoto: 0,
        voiceTranscript: transcriptLines.join('\n'),
        generatedTitle: prop.title,
        generatedBullets: bulletLines,
        features: prop.features || [],
        visibility: prop.is_active ? 'public' : 'whisper',
        exclusiveDays: 14,
        buyerRequirements: 'none',
        showContact: true,
        allowCoBroke: true,
        autoDeclineBelow: 0,
        scheduledAt: null,
      });
      setLoadingEdit(false);
    };
    loadProperty();
  }, [editPropertyId]);

  // Auto-save every 10 seconds (only for new listings)
  useEffect(() => {
    if (editPropertyId) return;
    autoSaveRef.current = setInterval(() => {
      localStorage.setItem('pocket-listing-draft', JSON.stringify(draft));
    }, 10000);
    return () => clearInterval(autoSaveRef.current);
  }, [draft, editPropertyId]);

  // Load draft on mount (only for new listings)
  useEffect(() => {
    if (editPropertyId) return;
    const saved = localStorage.getItem('pocket-listing-draft');
    if (saved) {
      try { setDraft(JSON.parse(saved)); } catch {}
    }
  }, [editPropertyId]);

  const progress = ((step + 1) / STEPS.length) * 100;

  const canNext = () => {
    if (step === 0) return draft.address.length > 0;
    return true;
  };

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);

    try {
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

      const payload = {
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
        is_active: draft.visibility === 'public',
      };

      if (editPropertyId) {
        // UPDATE existing listing
        const { error } = await supabase
          .from('properties')
          .update(payload)
          .eq('id', editPropertyId);
        if (error) throw error;
        toast({ title: 'Listing updated!', description: 'Your changes have been saved.' });
      } else {
        // INSERT new listing
        const { error } = await supabase.from('properties').insert({
          ...payload,
          agent_id: agentId,
        });
        if (error) throw error;
        localStorage.removeItem('pocket-listing-draft');
        toast({ title: 'Listing published!', description: 'Your property has been saved to the database.' });
      }

      onPublish(title);
    } catch (err: any) {
      console.error('Publish error:', err);
      toast({
        title: editPropertyId ? 'Failed to update' : 'Failed to publish',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="bg-card border border-border rounded-2xl p-12 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary mr-2" size={20} />
        <span className="text-sm text-muted-foreground">Loading listing...</span>
      </div>
    );
  }

  const stepContent = () => {
    switch (step) {
      case 0: return <StepAddress draft={draft} update={update} />;
      case 1: return <StepBasics draft={draft} update={update} />;
      case 2: return <StepPhotos draft={draft} update={update} />;
      case 3: return <StepVoice draft={draft} update={update} />;
      case 4: return <StepSettings draft={draft} update={update} />;
      case 5: return <StepPreview draft={draft} onPublish={handlePublish} publishing={publishing} isEdit={!!editPropertyId} />;
      default: return null;
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl">
      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Step {step + 1} of {STEPS.length}: <strong className="text-foreground">{STEPS[step]}</strong></span>
          {!editPropertyId && (
            <span className="flex items-center gap-1 text-success">
              <Save size={12} /> Auto-saved
            </span>
          )}
          {editPropertyId && (
            <span className="flex items-center gap-1 text-primary">
              <Save size={12} /> Editing
            </span>
          )}
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

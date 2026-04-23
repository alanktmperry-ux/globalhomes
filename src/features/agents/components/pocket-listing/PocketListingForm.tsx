import { useState, useEffect, useRef } from 'react';
import { useBuyerMatching } from '@/features/agents/hooks/useBuyerMatching';
import { ArrowLeft, ArrowRight, Save, Loader2, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { toast } from 'sonner';
import StepAddress from './StepAddress';
import StepBasics from './StepBasics';
import StepPhotos from './StepPhotos';
import StepVoice from './StepVoice';
import StepTranslate from './StepTranslate';
import StepSettings from './StepSettings';
import StepPreview from './StepPreview';

function parseSuburbFallback(address: string): string {
  const segments = address.split(',').map(s => s.trim());
  for (let i = segments.length - 1; i >= 0; i--) {
    const match = segments[i].match(/^([A-Za-z\s'-]+?)\s+(?:VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\b/i);
    if (match) return match[1].trim();
  }
  if (segments.length >= 2) {
    const candidate = segments[segments.length - 2].replace(/\d+/g, '').trim();
    if (candidate.length >= 3 && candidate.length <= 40) return candidate;
  }
  return 'Unknown';
}

function parseStateFallback(address: string): string {
  const match = address.match(/\b(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\b/i);
  return match ? match[1].toUpperCase() : 'Unknown';
}

export interface ListingDraft {
  address: string;
  suburb: string;
  state: string;
  listingType: 'sale' | 'rent';
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
  isExclusive: boolean;
  buyerRequirements: string;
  showContact: boolean;
  allowCoBroke: boolean;
  autoDeclineBelow: number;
  scheduledAt: string | null;
  sqm: number;
  landSize: number;
  lat?: number;
  lng?: number;
  estimatedRentalWeekly: number;
  rentalWeekly: number;
  rentalBondWeeks: number;
  bondAmount: number;
  // Rental-specific
  availableFrom: string;
  leaseTerm: string;
  furnished: 'unfurnished' | 'partially_furnished' | 'furnished';
  petsAllowed: boolean;
  screeningLevel: string;

  // Sale — additional details
  ensuites: number;
  studyRooms: number;
  garageType: string;
  hasPool: boolean;
  hasOutdoorEnt: boolean;
  hasAlfresco: boolean;
  hasSolar: boolean;
  airConType: string;
  heatingType: string;
  auctionDate: string;
  auctionTime: string;
  yearBuilt: string;
  councilRates: number;
  waterRates: number;
  strataFees: number;

  // Rental — additional details
  waterIncluded: boolean;
  electricityIncluded: boolean;
  internetIncluded: boolean;
  hasInternalLaundry: boolean;
  hasDishwasher: boolean;
  hasWashingMachine: boolean;
  hasAirCon: boolean;
  hasBalcony: boolean;
  hasPoolAccess: boolean;
  hasGymAccess: boolean;
  smokingAllowed: boolean;
  maxOccupants: number;
  rentalParkingType: string;
  commissionRate: number;
  lettingFeeWeeks: number;

  // Owner / Vendor
  vendorName: string;
  vendorEmail: string;
  vendorPhone: string;

  // Multilingual translations (optional)
  title_zh: string;
  description_zh: string;
  title_zh_tw: string;
  description_zh_tw: string;
  title_ja: string;
  description_ja: string;
  title_ko: string;
  description_ko: string;

  // Commercial / Land
  floorAreaSqm?: number;
  zoning?: string;
  landSizeSqm?: number;
  landSizeUnit?: 'sqm' | 'ha';
}

const DEFAULT_DRAFT: ListingDraft = {
  address: '',
  suburb: '',
  state: '',
  listingType: 'sale',
  priceMin: 500000,
  priceMax: 800000,
  priceDisplay: 'range',
  propertyType: 'House',
  beds: 0,
  baths: 0,
  cars: 0,
  sqm: 0,
  landSize: 0,
  photos: [],
  primaryPhoto: 0,
  voiceTranscript: '',
  generatedTitle: '',
  generatedBullets: [],
  features: [],
  visibility: 'whisper',
  exclusiveDays: 14,
  isExclusive: false,
  buyerRequirements: 'none',
  showContact: true,
  allowCoBroke: true,
  autoDeclineBelow: 0,
  scheduledAt: null,
  estimatedRentalWeekly: 0,
  rentalWeekly: 0,
  rentalBondWeeks: 4,
  bondAmount: 0,
  availableFrom: '',
  leaseTerm: '12 months',
  furnished: 'unfurnished',
  petsAllowed: false,
  screeningLevel: 'Basic',

  ensuites: 0,
  studyRooms: 0,
  garageType: '',
  hasPool: false,
  hasOutdoorEnt: false,
  hasAlfresco: false,
  hasSolar: false,
  airConType: '',
  heatingType: '',
  auctionDate: '',
  auctionTime: '',
  yearBuilt: '',
  councilRates: 0,
  waterRates: 0,
  strataFees: 0,
  waterIncluded: false,
  electricityIncluded: false,
  internetIncluded: false,
  hasInternalLaundry: false,
  hasDishwasher: false,
  hasWashingMachine: false,
  hasAirCon: false,
  hasBalcony: false,
  hasPoolAccess: false,
  hasGymAccess: false,
  smokingAllowed: false,
  maxOccupants: 0,
  rentalParkingType: '',
  commissionRate: 0,
  lettingFeeWeeks: 0,

  vendorName: '',
  vendorEmail: '',
  vendorPhone: '',

  title_zh: '',
  description_zh: '',
  title_zh_tw: '',
  description_zh_tw: '',
  title_ja: '',
  description_ja: '',
  title_ko: '',
  description_ko: '',
};

const STEPS = ['Address', 'Basics', 'Photos', 'Voice', 'Translate', 'Settings', 'Preview'];

interface Props {
  onPublish: (title: string) => void;
  onCancel: () => void;
  initialListingType?: ListingDraft['listingType'];
  /** When provided, the form loads this property for editing */
  editPropertyId?: string | null;
  /** When provided, the form loads this property's data but creates a new listing */
  duplicatePropertyId?: string | null;
}

const formatPriceForDB = (draft: ListingDraft): string => {
  if (draft.listingType === 'rent') {
    return draft.rentalWeekly > 0 ? `$${draft.rentalWeekly.toLocaleString('en-AU')}/wk` : 'Contact Agent';
  }
  const fmt = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`;
  switch (draft.priceDisplay) {
    case 'exact': return fmt(draft.priceMax);
    case 'range': return `${fmt(draft.priceMin)} – ${fmt(draft.priceMax)}`;
    case 'eoi': return 'Expressions of Interest';
    case 'contact': return 'Contact Agent';
  }
};

const PocketListingForm = ({ onPublish, onCancel, initialListingType, editPropertyId, duplicatePropertyId }: Props) => {
  const loadPropertyId = editPropertyId || duplicatePropertyId;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ListingDraft>(() => ({
    ...DEFAULT_DRAFT,
    listingType: initialListingType ?? DEFAULT_DRAFT.listingType,
  }));
  const [publishing, setPublishing] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!loadPropertyId);
  const autoSaveRef = useRef<ReturnType<typeof setInterval>>();
  const { user } = useAuth();
  const { matchBuyersToListing } = useBuyerMatching();

  const update = (partial: Partial<ListingDraft>) =>
    setDraft((d) => ({ ...d, ...partial }));

  // Load existing property for editing
  useEffect(() => {
    if (!loadPropertyId) return;
    const loadProperty = async () => {
      setLoadingEdit(true);
      const { data: prop, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', loadPropertyId)
        .maybeSingle();

      if (error || !prop) {
        toast.error('Could not load listing');
        setLoadingEdit(false);
        return;
      }

      let priceDisplay: ListingDraft['priceDisplay'] = 'exact';
      if (prop.price_formatted.includes('–')) priceDisplay = 'range';
      else if (prop.price_formatted.toLowerCase().includes('expression')) priceDisplay = 'eoi';
      else if (prop.price_formatted.toLowerCase().includes('contact')) priceDisplay = 'contact';

      const descLines = (prop.description || '').split('\n').filter(Boolean);
      const bulletLines = descLines.filter(l => l.startsWith('•')).map(l => l.replace(/^•\s*/, ''));
      const transcriptLines = descLines.filter(l => !l.startsWith('•') && l !== 'Key Features:');

      setDraft({
        ...DEFAULT_DRAFT,
        address: duplicatePropertyId ? '' : prop.address,
        suburb: duplicatePropertyId ? '' : prop.suburb,
        state: duplicatePropertyId ? '' : prop.state,
        listingType: prop.listing_type === 'rent' ? 'rent' : 'sale',
        priceMin: prop.listing_type === 'rent' ? (prop.rental_weekly || prop.price) : Math.round(prop.price * 0.9),
        priceMax: prop.listing_type === 'rent' ? (prop.rental_weekly || prop.price) : prop.price,
        priceDisplay,
        propertyType: prop.property_type || 'House',
        beds: prop.beds,
        baths: prop.baths,
        cars: prop.parking,
        photos: duplicatePropertyId ? [] : (prop.images || (prop.image_url ? [prop.image_url] : [])),
        primaryPhoto: 0,
        voiceTranscript: transcriptLines.join('\n'),
        generatedTitle: duplicatePropertyId ? '' : prop.title,
        generatedBullets: bulletLines,
        features: prop.features || [],
        visibility: ((prop as any).status === 'whisper' || (prop as any).status === 'coming-soon') ? (prop as any).status : (prop as any).status === 'sold' ? 'whisper' : 'public',
        exclusiveDays: 14,
        buyerRequirements: 'none',
        showContact: true,
        allowCoBroke: true,
        autoDeclineBelow: 0,
        sqm: prop.sqm || 0,
        landSize: (prop as any).land_size || 0,
        scheduledAt: null,
        estimatedRentalWeekly: prop.rental_weekly || 0,
        rentalWeekly: prop.listing_type === 'rent' ? (prop.rental_weekly || 0) : 0,
        rentalBondWeeks: 4,
        bondAmount: (prop as any).bond_amount || ((prop.listing_type === 'rent' ? (prop.rental_weekly || 0) : 0) * 4),
        availableFrom: (prop as any).available_from || '',
        leaseTerm: (prop as any).lease_term || '12 months',
        furnished: (prop as any).furnished || 'unfurnished',
        petsAllowed: (prop as any).pets_allowed || false,
        screeningLevel: (prop as any).screening_level || 'Basic',
        commissionRate: prop.commission_rate || 0,
        lettingFeeWeeks: (prop as any).letting_fee_weeks || 0,

        vendorName: (prop as any).vendor_name || '',
        vendorEmail: (prop as any).vendor_email || '',
        vendorPhone: (prop as any).vendor_phone || '',
      });
      setLoadingEdit(false);
    };
    loadProperty();
  }, [loadPropertyId]);

  // Auto-save every 10 seconds (only for new listings)
  useEffect(() => {
    if (editPropertyId) return;
    autoSaveRef.current = setInterval(() => {
      localStorage.setItem('pocket-listing-draft', JSON.stringify(draft));
    }, 10000);
    return () => clearInterval(autoSaveRef.current);
  }, [draft, editPropertyId]);

  // Offer to resume a saved draft (only for new listings)
  const [pendingDraft, setPendingDraft] = useState<Partial<ListingDraft> | null>(null);

  useEffect(() => {
    if (editPropertyId) return;
    if (initialListingType) {
      localStorage.removeItem('pocket-listing-draft');
      return;
    }
    const saved = localStorage.getItem('pocket-listing-draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<ListingDraft>;
        // Only offer to resume if there's meaningful data
        if (parsed.address && parsed.address.length > 0) {
          setPendingDraft(parsed);
        } else {
          localStorage.removeItem('pocket-listing-draft');
        }
      } catch {
        localStorage.removeItem('pocket-listing-draft');
      }
    }
  }, [editPropertyId, initialListingType]);

  const resumeDraft = () => {
    if (pendingDraft) {
      setDraft({
        ...DEFAULT_DRAFT,
        ...pendingDraft,
        listingType: initialListingType ?? pendingDraft.listingType ?? DEFAULT_DRAFT.listingType,
      });
    }
    setPendingDraft(null);
  };

  const discardDraft = () => {
    localStorage.removeItem('pocket-listing-draft');
    setPendingDraft(null);
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  const canNext = () => {
    if (step === 0) return draft.address.length > 0;
    return true;
  };

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);

    try {
      if (!user) {
        toast.error('You must be logged in to publish');
        setPublishing(false);
        return;
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const agentId = agent?.id ?? null;

      if (!agentId) {
        toast.error('Agent profile not found — Please complete your agent registration first.');
        setPublishing(false);
        return;
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
        suburb: draft.suburb && draft.suburb !== 'Unknown' ? draft.suburb : parseSuburbFallback(draft.address),
        state: draft.state && draft.state !== 'Unknown' ? draft.state : parseStateFallback(draft.address),
        country: 'Australia',
        price: draft.listingType === 'rent' ? (draft.rentalWeekly || draft.priceMax) : draft.priceMax,
        price_formatted: formatPriceForDB(draft),
        beds: draft.beds,
        baths: draft.baths,
        parking: draft.cars,
        sqm: draft.sqm || 0,
        land_size: draft.landSize || null,
        property_type: draft.propertyType,
        listing_type: draft.listingType,
        description,
        features: draft.features,
        image_url: mainPhoto,
        images: draft.photos.length > 0 ? draft.photos : [],
        cover_index: draft.primaryPhoto,
        is_active: editPropertyId ? draft.visibility === 'public' : false,
        status: editPropertyId
          ? (draft.visibility === 'public' ? 'public' : draft.visibility)
          : 'pending',
        lat: draft.lat || null,
        lng: draft.lng || null,
        rental_weekly: draft.listingType === 'rent' ? (draft.rentalWeekly || null) : (draft.estimatedRentalWeekly || null),
        available_from: draft.availableFrom || null,
        lease_term: draft.leaseTerm || null,
        furnished: draft.furnished,
        pets_allowed: draft.petsAllowed,
        ensuites: draft.ensuites || 0,
        study_rooms: draft.studyRooms || 0,
        garage_type: draft.garageType || '',
        has_pool: draft.hasPool || false,
        has_outdoor_ent: draft.hasOutdoorEnt || false,
        has_alfresco: draft.hasAlfresco || false,
        has_solar: draft.hasSolar || false,
        air_con_type: draft.airConType || '',
        heating_type: draft.heatingType || '',
        auction_date: draft.auctionDate || null,
        auction_time: draft.auctionTime || '',
        water_included: draft.waterIncluded || false,
        electricity_included: draft.electricityIncluded || false,
        internet_included: draft.internetIncluded || false,
        has_internal_laundry: draft.hasInternalLaundry || false,
        has_dishwasher: draft.hasDishwasher || false,
        has_washing_machine: draft.hasWashingMachine || false,
        has_air_con: draft.hasAirCon || false,
        has_balcony: draft.hasBalcony || false,
        has_pool_access: draft.hasPoolAccess || false,
        has_gym_access: draft.hasGymAccess || false,
        smoking_allowed: draft.smokingAllowed || false,
        max_occupants: draft.maxOccupants || 0,
        rental_parking_type: draft.rentalParkingType || '',
        commission_rate: draft.commissionRate || null,
        letting_fee_weeks: draft.lettingFeeWeeks || null,
        screening_level: draft.screeningLevel || 'standard',
        vendor_name: draft.vendorName || null,
        vendor_email: draft.vendorEmail || null,
        vendor_phone: draft.vendorPhone || null,
        listing_category: draft.listingType === 'rent' ? 'rent' : 'sale',
        bond_amount: draft.listingType === 'rent' && draft.rentalBondWeeks && draft.rentalWeekly
          ? draft.rentalBondWeeks * draft.rentalWeekly
          : null,
        utilities_included: draft.listingType === 'rent'
          ? [
              draft.waterIncluded ? 'water' : null,
              draft.electricityIncluded ? 'electricity' : null,
              draft.internetIncluded ? 'internet' : null,
            ].filter(Boolean)
          : [],
        title_zh: draft.title_zh || null,
        description_zh: draft.description_zh || null,
        title_zh_tw: draft.title_zh_tw || null,
        description_zh_tw: draft.description_zh_tw || null,
        title_ja: draft.title_ja || null,
        description_ja: draft.description_ja || null,
        title_ko: draft.title_ko || null,
        description_ko: draft.description_ko || null,
        is_exclusive: draft.isExclusive || false,
        exclusive_start_date: draft.isExclusive && !editPropertyId ? new Date().toISOString() : undefined,
        exclusive_end_date: draft.isExclusive && !editPropertyId ? new Date(Date.now() + 14 * 86_400_000).toISOString() : undefined,
      } as any;

      // Add 'Pets considered' to features if applicable
      if (draft.petsAllowed && !payload.features?.includes('Pets considered')) {
        payload.features = [...(payload.features || []), 'Pets considered'];
      }

      // Helper: fire the AI matching engine in the background (non-blocking)
      const fireAIMatch = (lid: string) => {
        toast.message('Finding matched buyers…');
        supabase.functions
          .invoke('match-buyers-to-listing', { body: { listing_id: lid } })
          .then(({ data, error }) => {
            if (error) {
              console.error('AI match error', error);
              return;
            }
            const n = data?.matches_created ?? 0;
            if (n > 0) {
              toast.success(`${n} buyer${n > 1 ? 's' : ''} matched to this listing`);
            }
          })
          .catch((e) => console.error('AI match failed', e));

      supabase.functions
        .invoke('generate-translations', { body: { listing_id: lid } })
        .catch((e) => console.error('Translation generation failed', e));
      };

      if (editPropertyId) {
        // UPDATE existing listing
        const { error } = await supabase
          .from('properties')
          .update(payload)
          .eq('id', editPropertyId);
        if (error) throw error;
        toast.success('Listing updated! — Your changes have been saved.');
        fireAIMatch(editPropertyId);
      } else {
        const { data: inserted, error } = await supabase
          .from('properties')
          .insert({
            ...payload,
            agent_id: agentId,
          })
          .select('id')
          .single();
        if (error) throw error;
        localStorage.removeItem('pocket-listing-draft');

        // Track listing creation
        try {
          const { capture } = await import('@/shared/lib/posthog');
          capture('listing_created', {
            listing_id: inserted.id,
            property_type: draft.propertyType,
            has_images: (draft.photos?.length ?? 0) > 0,
          });
        } catch {}

        const matched = await matchBuyersToListing({
          id: inserted.id,
          agent_id: agentId,
          suburb: draft.suburb || '',
          state: draft.state || '',
          price: draft.priceMax,
          beds: draft.beds,
          baths: draft.baths,
          listing_type: draft.listingType,
          title,
          address: draft.address,
        });

        if (matched.length > 0) {
          toast.success(
            `Listing saved! ${matched.length} buyer${matched.length > 1 ? 's' : ''} on your list match this suburb — check your notifications.`,
            { duration: 6000 }
          );
        } else {
          toast.success('Listing saved! — Your property is in draft. Publish it from your dashboard to make it visible to buyers.');
        }

        fireAIMatch(inserted.id);

        supabase.functions
          .invoke('generate-translations', { body: { listing_id: inserted.id } })
          .catch((e) => console.error('Translation generation failed', e));
      }

      onPublish(title);
    } catch (err: unknown) {
      console.error('Publish error:', err);
      toast.error(editPropertyId ? 'Failed to update' : 'Failed to publish');
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
      case 4: return <StepTranslate draft={draft} update={update} />;
      case 5: return <StepSettings draft={draft} update={update} />;
      case 6: return <StepPreview draft={draft} onPublish={handlePublish} publishing={publishing} isEdit={!!editPropertyId} />;
      default: return null;
    }
  };

  if (pendingDraft) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">You have an unsaved draft</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pendingDraft.address}{pendingDraft.suburb ? `, ${pendingDraft.suburb}` : ''} — {pendingDraft.listingType === 'rent' ? 'Rental' : 'Sale'} listing
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Resume it?</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={resumeDraft} className="gap-1.5">
            <FileText size={14} /> Yes, resume draft
          </Button>
          <Button size="sm" variant="outline" onClick={discardDraft} className="gap-1.5">
            <Trash2 size={14} /> No, start fresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col max-h-[calc(100vh-12rem)] min-h-0">
      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Step {step + 1} of {STEPS.length}: <strong className="text-foreground">{STEPS[step]}</strong></span>
           {!editPropertyId && !duplicatePropertyId && (
            <span className="flex items-center gap-1 text-success">
              <Save size={12} /> Auto-saved
            </span>
          )}
          {editPropertyId && (
            <span className="flex items-center gap-1 text-primary">
              <Save size={12} /> Editing
            </span>
          )}
          {duplicatePropertyId && (
            <span className="flex items-center gap-1 text-primary">
              <Save size={12} /> Duplicating
            </span>
          )}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Step content */}
      <div className="p-5 overflow-y-auto max-h-[70vh]">
        {stepContent()}
      </div>

      {/* Nav — always visible */}
      <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/30 shrink-0">
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

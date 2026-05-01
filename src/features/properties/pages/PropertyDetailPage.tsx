import { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { PropertySEOHead } from '@/features/seo/components/PropertySEOHead';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bed, Bath, Car, Ruler, Share2, Heart, MapPin, ChevronLeft, ChevronRight, Calendar, Eye, Home, BadgeCheck, Star, X, PawPrint, Sofa, Clock, FileText, Users, Phone, MessageCircle, Globe, Loader2 } from 'lucide-react';
import MultilingualListingDetail from '@/features/properties/components/MultilingualListingDetail';
import { OpenHomesCard } from '@/features/properties/components/OpenHomesCard';
import { Button } from '@/components/ui/button';
import { Property } from '@/shared/lib/types';
import { useI18n } from '@/shared/lib/i18n';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { AgentContactModal } from '@/features/agents/components/AgentContactModal';
import { InvestmentInsightsCard } from '@/features/properties/components/InvestmentInsightsCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useSavedProperties } from '@/features/properties/hooks/useSavedProperties';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RentalEnquiryForm } from '@/features/properties/components/RentalEnquiryForm';
import { InspectionBookingModal } from '@/features/properties/components/InspectionBookingModal';
import { PriceHistoryChart } from '@/features/properties/components/PriceHistoryChart';
import { RentalApplicationModal } from '@/features/properties/components/RentalApplicationModal';
import { InspectionSlot } from '@/shared/lib/types';
import { StampDutyCalculator } from '@/components/StampDutyCalculator';
import { FIRBCalculator } from '@/components/FIRBCalculator';
import { detectStateFromAddress } from '@/lib/stampDuty';
import { formatAddress } from '@/shared/lib/formatAddress';
import { SchoolsNearby } from '@/components/SchoolsNearby';
import { SuburbClearanceRate } from '@/components/auction/SuburbClearanceRate';
import { DaysOnMarketBadge } from '@/components/auction/DaysOnMarketBadge';
import { PriceGuideHistory } from '@/components/auction/PriceGuideHistory';
import { AuctionRegisterPanel } from '@/components/auction/AuctionRegisterPanel';
import { AuctionResultBadge } from '@/components/auction/AuctionResultBadge';
import { InvestorCalculatorPanel } from '@/components/investor/InvestorCalculatorPanel';
import { useInvestorMode } from '@/context/InvestorModeContext';
import { ComparableSales } from '@/components/comparable/ComparableSales';
import { TourTabStrip } from '@/components/tour/TourTabStrip';
import { WhatSoldNearby } from '@/features/market/components/WhatSoldNearby';
import { SuburbMarketSnapshot } from '@/features/market/components/SuburbMarketSnapshot';
import { OpenHomeSection } from '@/features/open-homes/components/OpenHomeSection';
import { OffMarketBadge } from '@/features/offmarket/components/OffMarketBadge';
import { EOISubmitPanel } from '@/features/offmarket/components/EOISubmitPanel';
import { useLogPropertyView } from '@/features/vendor/hooks/useLogPropertyView';
import { DocumentVault } from '@/features/documents/components/DocumentVault';
import { useAuth } from '@/features/auth/AuthProvider';
import { ShareSheet } from '@/shared/components/ShareSheet';
import { MortgageBrokerCTA } from '@/features/mortgage/components/MortgageBrokerCTA';
import { MortgageReferralModal } from '@/components/MortgageReferralModal';
import { useListingTranslation } from '@/features/properties/hooks/useListingTranslation';
import { HaloFromListingCTA } from '@/components/halo/HaloFromListingCTA';

export default function PropertyDetailPage() {
  // Support both /property/:slug and /property/:uuid for backward compat
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { t: tp } = useTranslation();
  const { formatPrice, currency, listingMode } = useCurrency();
  const { isSaved, toggleSaved } = useSavedProperties();
  const isMobile = useIsMobile();
  const { investorMode } = useInvestorMode();
  const { user } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  useLogPropertyView(property?.id);
  const [rawProperty, setRawProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [rentalEnquiryOpen, setRentalEnquiryOpen] = useState(false);
  const [inspectionBookingOpen, setInspectionBookingOpen] = useState(false);
  const [rentalApplicationOpen, setRentalApplicationOpen] = useState(false);
  const [inspectionTimes, setInspectionTimes] = useState<InspectionSlot[]>([]);
  const [isOwnerAgent, setIsOwnerAgent] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [mortgageOpen, setMortgageOpen] = useState(false);
  const { title: translatedTitle, description: translatedDescription, isTranslating, isTranslated } = useListingTranslation(rawProperty);
  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);

      if (!id) {
        setProperty(null);
        setLoading(false);
        return;
      }

      // Demo placeholders shown on homepage when DB has 0 residential listings.
      if (id.startsWith('placeholder-')) {
        const p1Images = [
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=1200&q=80&auto=format&fit=crop',
        ];
        const p2Images = [
          'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80&auto=format&fit=crop',
        ];
        const p3Images = [
          'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=1200&q=80&auto=format&fit=crop',
        ];
        const p4Images = [
          'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600573472556-e636c2acda88?w=1200&q=80&auto=format&fit=crop',
        ];
        const p5Images = [
          'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=1200&q=80&auto=format&fit=crop',
        ];
        const p6Images = [
          'https://images.unsplash.com/photo-1597047084897-51e81819a499?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=1200&q=80&auto=format&fit=crop',
        ];
        const DEMO_PROPERTIES: Record<string, any> = {
          'placeholder-1': {
            id: 'placeholder-1',
            title: 'Spacious 4-bedroom family home',
            address: '14 Maple Street, Auburn NSW 2144',
            suburb: 'Auburn', state: 'NSW', country: 'Australia',
            price: 1200000, beds: 4, baths: 2, parking: 2, sqm: 480,
            images: p1Images, image_url: p1Images[0],
            description: 'A beautifully presented family home in the heart of Auburn. Four generous bedrooms, two modern bathrooms, double garage, and a north-facing backyard perfect for entertaining. Walking distance to Auburn Station, Auburn Public School, and the bustling shopping district.',
            property_type: 'House',
            features: ['Air conditioning', 'Solar panels', 'North-facing backyard', 'Double garage', 'Modern kitchen', 'Walk-in wardrobe'],
            listing_type: 'sale',
            year_built: 2018,
            listed_date: new Date().toISOString(),
            views: 247,
          },
          'placeholder-2': {
            id: 'placeholder-2',
            title: 'Modern 2-bedroom apartment with city views',
            address: '8/22 Box Hill Road, Box Hill VIC 3128',
            suburb: 'Box Hill', state: 'VIC', country: 'Australia',
            price: 680000, beds: 2, baths: 1, parking: 1, sqm: 78,
            images: p2Images, image_url: p2Images[0],
            description: 'Stylish two-bedroom apartment in the heart of Box Hill. Open-plan living, modern kitchen with stone benchtops, secure parking, and balcony with city views. Steps from Box Hill Central, Box Hill Station, and the vibrant Asian dining precinct.',
            property_type: 'Apartment',
            features: ['City views', 'Stone benchtops', 'Secure parking', 'Balcony', 'Built-in wardrobes', 'Lift access'],
            listing_type: 'sale',
            year_built: 2020,
            listed_date: new Date().toISOString(),
            views: 312,
          },
          'placeholder-3': {
            id: 'placeholder-3',
            title: 'Contemporary 3-bedroom townhouse',
            address: '3 Oak Lane, Doncaster VIC 3108',
            suburb: 'Doncaster', state: 'VIC', country: 'Australia',
            price: 895000, beds: 3, baths: 2, parking: 1, sqm: 220,
            images: p3Images, image_url: p3Images[0],
            description: 'Architecturally designed townhouse in family-friendly Doncaster. Three spacious bedrooms, two bathrooms plus powder room, double-height living area, private courtyard. Catchment for Doncaster Primary and Doncaster Secondary College. Close to Westfield Doncaster and Eastern Freeway.',
            property_type: 'Townhouse',
            features: ['Architect designed', 'Double-height ceilings', 'Private courtyard', 'Powder room', 'European appliances', 'Floor heating'],
            listing_type: 'sale',
            year_built: 2022,
            listed_date: new Date().toISOString(),
            views: 189,
          },
          'placeholder-4': {
            id: 'placeholder-4',
            title: 'Luxury 5-bedroom harbour-view residence',
            address: '12 Harbour Crescent, Mosman NSW 2088',
            suburb: 'Mosman', state: 'NSW', country: 'Australia',
            price: 4250000, beds: 5, baths: 4, parking: 3, sqm: 720,
            images: p4Images, image_url: p4Images[0],
            description: 'Architecturally renowned five-bedroom residence with panoramic Sydney Harbour views. Soaring ceilings, four bathrooms, three-car garage, infinity pool, and landscaped gardens. Walking distance to Balmoral Beach and Mosman Junction. Once-in-a-generation address.',
            property_type: 'House',
            features: ['Harbour views', 'Infinity pool', '3-car garage', 'Wine cellar', 'Smart home automation', 'Landscaped gardens'],
            listing_type: 'sale',
            year_built: 2019,
            listed_date: new Date().toISOString(),
            views: 412,
          },
          'placeholder-5': {
            id: 'placeholder-5',
            title: 'Spacious 4-bedroom family home in elite school zone',
            address: '27 Springfield Avenue, Glen Waverley VIC 3150',
            suburb: 'Glen Waverley', state: 'VIC', country: 'Australia',
            price: 1650000, beds: 4, baths: 3, parking: 2, sqm: 560,
            images: p5Images, image_url: p5Images[0],
            description: "Generously proportioned family home in the heart of Glen Waverley's coveted Glen Waverley Secondary College catchment. Four bedrooms plus study, three bathrooms, formal and informal living, large backyard. Walking distance to Glen Waverley Station, The Glen Shopping Centre, and Brentwood Reserve.",
            property_type: 'House',
            features: ['GWSC school zone', 'Study', 'Two living areas', 'Ducted heating & cooling', 'Solar panels', 'Established gardens'],
            listing_type: 'sale',
            year_built: 2015,
            listed_date: new Date().toISOString(),
            views: 268,
          },
          'placeholder-6': {
            id: 'placeholder-6',
            title: 'Architecturally designed 3-bedroom townhouse',
            address: '14 Albert Road, Strathfield NSW 2135',
            suburb: 'Strathfield', state: 'NSW', country: 'Australia',
            price: 1395000, beds: 3, baths: 2, parking: 2, sqm: 240,
            images: p6Images, image_url: p6Images[0],
            description: 'Striking modern townhouse moments from Strathfield Station. Three bedrooms, two bathrooms, double garage, private rooftop terrace with city views. Premium European appliances, oak floors, secure intercom entry. Catchment for Strathfield Public and Homebush Boys.',
            property_type: 'Townhouse',
            features: ['Rooftop terrace', 'City views', 'Double garage', 'European appliances', 'Oak floors', 'Intercom security'],
            listing_type: 'sale',
            year_built: 2023,
            listed_date: new Date().toISOString(),
            views: 203,
          },
        };
        const demo = DEMO_PROPERTIES[id];
        if (demo) {
          setRawProperty(demo);
          setProperty({
            id: demo.id,
            title: demo.title,
            address: demo.address,
            suburb: demo.suburb,
            state: demo.state,
            country: demo.country,
            price: demo.price,
            priceFormatted: '',
            beds: demo.beds,
            baths: demo.baths,
            parking: demo.parking,
            sqm: demo.sqm,
            imageUrl: demo.image_url,
            images: demo.images,
            description: demo.description,
            estimatedValue: '',
            propertyType: demo.property_type,
            features: demo.features,
            agent: { id: '', name: 'Private Seller', agency: '', phone: '', email: '', avatarUrl: '', isSubscribed: false },
            listedDate: demo.listed_date,
            views: demo.views,
            contactClicks: 0,
            status: 'listed',
            yearBuilt: demo.year_built,
            listingType: demo.listing_type,
            inspectionTimes: [],
          } as any);
          setInspectionTimes([]);
          setLoading(false);
          return;
        }
      }

      // Support slug-based or UUID-based lookups
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      // 1. Fetch property WITHOUT joining agents (avoids agents RLS triggering)
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq(isUuid ? 'id' : 'slug', id)
        .maybeSingle();

      if (error) {
        console.warn('[PropertyDetail] Fetch failed:', error.message);
      }

      if (!data) {
        setProperty(null);
        setRawProperty(null);
        setLoading(false);
        return;
      }

      const p: any = data;

      // 2. Fetch agent in a SEPARATE query, isolated so failure doesn't block render
      let agentRow: any = null;
      if (p.agent_id) {
        try {
          const { data: agentData, error: agentErr } = await supabase
            .from('agents')
            .select('id, name, agency, phone, email, avatar_url, is_subscribed, user_id')
            .eq('id', p.agent_id)
            .maybeSingle();
          if (agentErr) {
            console.warn('[PropertyDetail] Agent fetch failed:', agentErr.message);
          } else {
            agentRow = agentData;
          }
        } catch (err) {
          console.warn('[PropertyDetail] Agent fetch threw:', err);
        }
      }

      // Stash agent on rawProperty so downstream code (isOwnerAgent check) keeps working
      setRawProperty({ ...p, agents: agentRow });
      setProperty({
        id: p.id,
        title: p.title,
        address: p.address,
        suburb: p.suburb,
        state: p.state,
        country: p.country,
        price: p.price,
        priceFormatted: p.price_formatted,
        beds: p.beds,
        baths: p.baths,
        parking: p.parking,
        sqm: p.sqm,
        imageUrl: p.image_url || p.images?.[0] || '',
        images: p.images || (p.image_url ? [p.image_url] : []),
        description: p.description || '',
        estimatedValue: p.estimated_value || '',
        propertyType: p.property_type || 'House',
        features: p.features || [],
        agent: agentRow ? {
          id: agentRow.id || p.agent_id || '',
          name: agentRow.name || 'Agent',
          agency: agentRow.agency || '',
          phone: agentRow.phone || '',
          email: agentRow.email || '',
          avatarUrl: agentRow.avatar_url || '',
          isSubscribed: agentRow.is_subscribed || false,
        } : { id: '', name: 'Private Seller', agency: '', phone: '', email: '', avatarUrl: '', isSubscribed: false },
        listedDate: p.listed_date || p.created_at,
        views: p.views ?? 0,
        contactClicks: p.contact_clicks,
        status: 'listed',
        rentalYieldPct: p.rental_yield_pct,
        strPermitted: p.str_permitted,
        yearBuilt: p.year_built,
        councilRatesAnnual: p.council_rates_annual,
        strataFeesQuarterly: p.strata_fees_quarterly,
        rentalWeekly: p.rental_weekly,
        currencyCode: p.currency_code,
        listingType: p.listing_type || null,
        inspectionTimes: Array.isArray(p.inspection_times) ? p.inspection_times : [],
      });
      setInspectionTimes(Array.isArray(p.inspection_times) ? p.inspection_times : []);

      setLoading(false);
    };
    fetchProperty();
  }, [id]);

  // ── Check if logged-in user is the listing agent ──
  useEffect(() => {
    if (!user || !rawProperty?.agents?.user_id) {
      setIsOwnerAgent(false);
      return;
    }
    setIsOwnerAgent(rawProperty.agents.user_id === user.id);
  }, [user, rawProperty]);

  const handleGenerateTranslations = async () => {
    if (!property) return;
    setTranslating(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('generate-translations', {
        body: { listing_id: property.id },
      });
      if (fnError) throw new Error(fnError.message || 'Translation failed');
      toast.success('Translations generated! Refreshing…');
      // Refresh raw property data
      const { data: refreshed } = await supabase
        .from('properties')
        .select('*')
        .eq('id', property.id)
        .maybeSingle();
      if (refreshed) setRawProperty((prev: any) => ({ ...refreshed, agents: prev?.agents ?? null }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate translations');
    } finally {
      setTranslating(false);
    }
  };


  const viewTracked = useRef(false);
  useEffect(() => {
    if (!property || viewTracked.current) return;
    if (property.id.startsWith('placeholder-')) return;
    viewTracked.current = true;

    supabase.rpc('increment_property_views', { property_id: property.id }).then(({ error }) => {
      if (error) {
        // Fallback: direct update if the RPC doesn't exist yet
        supabase
          .from('properties')
          .update({ views: (property.views || 0) + 1 })
          .eq('id', property.id)
          .then(({ error: updateError }) => {
            if (updateError) console.warn('[PropertyDetail] View increment failed:', updateError.message);
          });
      }
    });
  }, [property]);

  const prevImage = () => setImageIndex(i => (i > 0 ? i - 1 : (property?.images.length || 1) - 1));
  const nextImage = () => setImageIndex(i => (i < (property?.images.length || 1) - 1 ? i + 1 : 0));

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Home size={48} className="text-muted-foreground" />
        <h1 className="font-display text-xl font-bold text-foreground">{tp('property.notFound')}</h1>
        <button onClick={() => navigate('/')} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
          {tp('property.notFound.back')}
        </button>
      </div>
    );
  }

  const saved = isSaved(property.id);
  const images = property.images.length > 0 ? property.images : [property.imageUrl];
  const isRental = listingMode === 'rent' || property.listingType === 'rent' || property.listingType === 'rental' || property.price < 50000;

  // Rental-specific derived data
  const featuresLower = (property.features || []).map(f => f.toLowerCase());
  const isPetFriendly = featuresLower.some(f => f.includes('pet') || f.includes('dog') || f.includes('cat'));
  const isFurnished = featuresLower.some(f => f.includes('furnished'));
  const weeklyRent = property.rentalWeekly || property.price;
  const bondAmount = weeklyRent * 4;

  const statusConfig: Record<string, { label: string; className: string }> = {
    'off-market': { label: 'Off-Market', className: 'bg-amber-500/90 text-white' },
    'coming-soon': { label: 'Coming Soon', className: 'bg-blue-500/90 text-white' },
    'new': { label: 'New', className: 'bg-emerald-500/90 text-white' },
  };
  const badge = property.status && property.status !== 'listed' ? statusConfig[property.status] : null;

  const handleCtaClick = () => {
    if (isRental) {
      setRentalEnquiryOpen(true);
    } else {
      setContactOpen(true);
    }
  };

  const ctaLabel = isRental ? 'Enquire / Apply' : tp('property.contactAgent');

  return (
    <div className="bg-background overflow-y-auto overflow-x-hidden">
      <PropertySEOHead property={{
        ...property,
        images: property.images,
        image_url: property.imageUrl,
        price: property.price,
        price_formatted: property.priceFormatted,
        beds: property.beds,
        baths: property.baths,
        property_type: property.propertyType,
        suburb: property.suburb,
        state: property.state,
        description: property.description,
        listing_type: property.listingType,
        title: property.title,
        address: property.address,
        id: property.id,
      }} agent={property.agent} />
      {/* Back button */}
      <div className="max-w-6xl mx-auto w-full px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors mb-4"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <main className="max-w-6xl mx-auto w-full px-4 pb-24 md:pb-12">
        {/* Hero image gallery */}
        <div className="relative rounded-2xl overflow-hidden aspect-[16/9] md:aspect-[2.4/1] mb-4">
          <AnimatePresence mode="wait">
            <motion.img
              key={imageIndex}
              src={images[imageIndex]}
              alt={`${property.title} - Photo ${imageIndex + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setLightboxOpen(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>

          {images.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors shadow-md">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors shadow-md">
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm text-xs font-medium text-foreground">
            {imageIndex + 1}/{images.length}
          </div>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            {badge && (
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm ${badge.className}`}>
                {badge.label}
              </span>
            )}
            <span className="px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm text-xs font-bold tracking-wide uppercase text-foreground">
              {property.propertyType}
            </span>
            {isRental && property.contactClicks > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-bold tracking-wide uppercase shadow-sm flex items-center gap-1">
                <Users size={12} />
                {tp(property.contactClicks === 1 ? 'property.applications' : 'property.applicationsPlural', { count: property.contactClicks })}
              </span>
            )}
          </div>

        </div>

        {/* Action bar below hero */}
        <div className="flex flex-wrap gap-2 mt-4 mb-4">
          <button
            onClick={() => toggleSaved(property.id)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-full border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <Heart size={16} className={saved ? 'fill-destructive text-destructive' : ''} />
            {saved ? tp('property.saved') : tp('property.save')}
          </button>
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setImageIndex(i)}
                className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all snap-start ${
                  i === imageIndex ? 'border-primary shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main content - 2 cols */}
          <div className="md:col-span-2 space-y-6 min-w-0">
            {/* Price + title */}
            <div data-speakable>
              {isRental ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <p className="font-display text-3xl md:text-4xl font-bold text-foreground">
                      {formatPrice(weeklyRent, 'rent')}
                    </p>
                    <span className="text-lg text-muted-foreground font-medium">{tp('property.perWeek')}</span>
                  </div>
                  {currency.code !== 'AUD' && (
                    <p className="text-sm text-muted-foreground mt-0.5">${weeklyRent.toLocaleString()}/wk AUD</p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-display text-3xl md:text-4xl font-bold text-foreground">{formatPrice(property.price)}</p>
                  {currency.code !== 'AUD' && (
                    <p className="text-sm text-muted-foreground mt-0.5">{property.priceFormatted} AUD</p>
                  )}
                </>
              )}
              <div className="flex items-center gap-2 mt-2">
                <h1 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                  {isTranslating ? (
                    <span className="inline-block h-6 w-2/3 rounded bg-muted animate-pulse align-middle" aria-hidden />
                  ) : translatedTitle}
                </h1>
                {(property as any).listing_mode && (property as any).listing_mode !== 'public' && (
                  <OffMarketBadge mode={(property as any).listing_mode} closeDate={(property as any).eoi_close_date} />
                )}
              </div>
              <p className="flex items-center gap-1.5 text-muted-foreground mt-1.5">
                <MapPin size={16} />
                {(property as any).address_hidden
                  ? formatAddress(`${property.suburb ?? ''}, ${property.state ?? ''}`)
                  : formatAddress(`${property.address ?? ''}${property.country && property.country !== 'Australia' ? `, ${property.country}` : ''}`)}
              </p>
              {property.suburb && property.state && (
                <Link
                  to={`/suburb/${property.state.toLowerCase()}/${property.suburb.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                  className="inline-block text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                >
                  {tp('property.viewSuburb', { suburb: property.suburb })} →
                </Link>
              )}
              {((property as any).listing_mode === 'eoi' || (property as any).listing_mode === 'off_market') && (
                <div className="mt-4">
                  <EOISubmitPanel
                    propertyId={property.id}
                    listingMode={(property as any).listing_mode}
                    guidePrice={(property as any).eoi_guide_price}
                    closeDate={(property as any).eoi_close_date}
                    agentName={property.agent?.name}
                  />
                </div>
              )}

              <button
                onClick={() => setShareOpen(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full border border-teal-600 text-teal-600 font-medium text-sm hover:bg-teal-50 transition-colors"
              >
                <Share2 size={16} />
                {tp('property.share')}
              </button>
            </div>

            {/* Key stats */}
            <div className="flex border border-slate-200 rounded-2xl overflow-hidden">
              {[
                { icon: Bed, value: property.beds, label: tp('property.facts.beds') },
                { icon: Bath, value: property.baths, label: tp('property.facts.baths') },
                { icon: Car, value: property.parking, label: tp('property.facts.parking') },
                { icon: Ruler, value: property.sqm ? `${property.sqm}m²` : '—', label: tp('property.facts.size') },
              ].map((stat, i) => (
                <div key={stat.label} className={`flex-1 flex flex-col items-center py-3.5 gap-0.5 bg-white ${i < 3 ? 'border-r border-slate-200' : ''}`}>
                  <stat.icon size={15} className="text-slate-400 mb-1" strokeWidth={1.8} />
                  <span className="text-[15px] font-bold text-slate-900 leading-none">{stat.value}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Description (auto-translated based on language) */}
            {(translatedDescription || isTranslating) && (
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">
                  {t('property.description')}
                </h2>
                {isTranslating ? (
                  <div className="space-y-2" aria-label="Loading description">
                    <div className="h-3 w-full rounded bg-muted animate-pulse" />
                    <div className="h-3 w-11/12 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-10/12 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-9/12 rounded bg-muted animate-pulse" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {translatedDescription}
                    </p>
                    {isTranslated && (
                      <p className="mt-2 text-[11px] text-muted-foreground italic">
                        {tp('property.aiTranslated')}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Rental Info Section */}
            {isRental && (
              <div className="p-5 rounded-2xl bg-card border border-border shadow-card">
                <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-primary" />
                  {tp('property.section.rentalInformation')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-secondary">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{tp('property.rental.availableFrom')}</p>
                    <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-1.5">
                      <Calendar size={14} className="text-primary" />
                      {tp('property.rental.availableNow')}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{tp('property.rental.leaseTerm')}</p>
                    <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-1.5">
                      <Clock size={14} className="text-primary" />
                      {tp('property.rental.leaseTermValue')}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{tp('property.rental.bond')}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {formatPrice(bondAmount, 'sale')} <span className="text-xs text-muted-foreground font-normal">{tp('property.rental.bondWeeks')}</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{tp('property.rental.petPolicy')}</p>
                    <p className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                      <PawPrint size={14} className={isPetFriendly ? 'text-emerald-500' : 'text-muted-foreground'} />
                      <span className={isPetFriendly ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}>
                        {isPetFriendly ? tp('property.rental.petsAllowed') : tp('property.rental.petsOnApplication')}
                      </span>
                    </p>
                  </div>
                  {isFurnished && (
                    <div className="sm:col-span-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                        <Sofa size={14} />
                        {tp('property.rental.furnished')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inspection Times — for all property types */}
            <div className="p-5 rounded-2xl bg-card border border-border shadow-card">
              <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Eye size={18} className="text-primary" />
                {tp('property.section.inspectionTimes')}
              </h2>
              {(() => {
                const upcoming = inspectionTimes.filter(s => new Date(`${s.date}T${s.start}`) > new Date());
                if (upcoming.length === 0) {
                  return (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {tp('property.inspection.empty')}
                      </p>
                      <button
                        onClick={handleCtaClick}
                        className="mt-3 px-5 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm hover:bg-accent transition-colors"
                      >
                        {tp('property.requestInspection')}
                      </button>
                    </>
                  );
                }
                return (
                  <div className="space-y-2">
                    {upcoming.map((slot, i) => {
                      const dayStr = new Date(slot.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
                      return (
                        <button
                          key={`${slot.date}-${slot.start}`}
                          onClick={() => setInspectionBookingOpen(true)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary hover:border-primary/40 text-left transition-all group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Calendar size={16} className="text-primary group-hover:text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{dayStr}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock size={10} /> {slot.start} – {slot.end}
                            </p>
                          </div>
                          <span className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            {tp('property.inspection.book')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Detail chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {property.estimatedValue && !isRental && (
                <div className="sm:col-span-2 md:col-span-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-xs text-primary font-medium uppercase tracking-wider">{t('property.estimated')}</p>
                  <p className="font-display font-bold text-foreground text-lg mt-1">{property.estimatedValue}</p>
                </div>
              )}
              {property.listedDate && (
                <div className="p-3 rounded-xl bg-secondary flex items-center gap-3">
                  <Calendar size={16} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{tp('property.facts.listed')}</p>
                    <p className="text-sm font-semibold text-foreground">{new Date(property.listedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              )}
              {property.views > 0 && (
                <div className="p-3 rounded-xl bg-secondary flex items-center gap-3">
                  <Eye size={16} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{tp('property.facts.views')}</p>
                    <p className="text-sm font-semibold text-foreground">{property.views.toLocaleString()}</p>
                  </div>
                </div>
              )}
              <div className="p-3 rounded-xl bg-secondary flex items-center gap-3">
                <Home size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{tp('property.facts.type')}</p>
                  <p className="text-sm font-semibold text-foreground">{property.propertyType}</p>
                </div>
              </div>
            </div>

            {/* Virtual Tour / Video / Floor Plan */}
            {((property as any).virtual_tour_url || (property as any).video_url || (property as any).floor_plan_url) && (
              <TourTabStrip
                virtualTourUrl={(property as any).virtual_tour_url ?? null}
                videoUrl={(property as any).video_url ?? null}
                floorPlanUrl={(property as any).floor_plan_url ?? null}
                propertyAddress={property.address}
              />
            )}


            {/* Multilingual Translations */}
            {(() => {
              if (!rawProperty) return null;
              const langMap: Record<string, { title: string; desc: string }> = {
                'zh': { title: 'title_zh', desc: 'description_zh' },
                'zh-TW': { title: 'title_zh_tw', desc: 'description_zh_tw' },
                'ja': { title: 'title_ja', desc: 'description_ja' },
                'ko': { title: 'title_ko', desc: 'description_ko' },
              } as any;
              const fields = langMap[String((rawProperty as any).__lang ?? '')] || (
                (typeof window !== 'undefined' ? langMap[sessionStorage.getItem('i18n-language') || sessionStorage.getItem('listhq_language') || ''] : undefined)
              );
              const storedTitle = fields ? (rawProperty as any)[fields.title] : null;
              const storedDesc = fields ? (rawProperty as any)[fields.desc] : null;
              const hasStoredTranslation = !!(storedTitle || storedDesc);

              if (hasStoredTranslation) {
                return (
                  <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Globe size={14} /> {storedTitle || property.title}
                    </div>
                    {storedDesc && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                        {storedDesc}
                      </p>
                    )}
                  </div>
                );
              }

              if (!(rawProperty.translations || isOwnerAgent)) return null;
              return (
                <div className="space-y-3">
                  {isOwnerAgent && !rawProperty.translations && (
                    <Button
                      onClick={handleGenerateTranslations}
                      disabled={translating}
                      variant="outline"
                      className="gap-2"
                    >
                      {translating ? (
                        <><Loader2 size={14} className="animate-spin" /> Generating translations…</>
                      ) : (
                        <><Globe size={14} /> Generate Translations</>
                      )}
                    </Button>
                  )}
                  {rawProperty.translations && (
                    <MultilingualListingDetail
                      listing={rawProperty}
                      isAgent={isOwnerAgent}
                    />
                  )}
                </div>
              );
            })()}


            {!isRental && (
              <>
                <div>
                  <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">
                    {t('costs.calculatorTitle')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('costs.calculatorSubtitle')}
                  </p>
                </div>
                <StampDutyCalculator
                  propertyPrice={property.price}
                  propertyAddress={`${property.address ?? ''}, ${property.suburb ?? ''}, ${property.state ?? ''}`}
                  propertyState={detectStateFromAddress(`${property.address ?? ''}, ${property.state ?? ''}`)}
                />
                <FIRBCalculator
                  propertyPrice={property.price}
                  propertyAddress={`${property.address ?? ''}, ${property.suburb ?? ''}, ${property.state ?? ''}`}
                  propertyState={detectStateFromAddress(`${property.address ?? ''}, ${property.state ?? ''}`)}
                />
              </>
            )}

            {/* Investment Calculator (sale properties, investor mode) */}
            {!isRental && investorMode && (
              <InvestorCalculatorPanel
                propertyId={property.id}
                price={property.price}
                estimatedWeeklyRent={(property as any).estimated_weekly_rent ?? property.rentalWeekly ?? null}
                suburb={property.suburb}
                state={property.state}
                isNewBuild={(property as any).is_new_build ?? false}
                propertyAgeYears={(property as any).property_age_years ?? null}
              />
            )}

            {/* Auction Intelligence */}
            <AuctionResultBadge propertyId={property.id} agentId={property.agent?.id} />

            {(property as any).auction_date && (
              <SuburbClearanceRate suburb={property.suburb} state={property.state} />
            )}

            {((property as any).price_guide_low || (property as any).price_guide_high) && (
              <div className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-sm font-medium text-foreground">{tp('property.priceGuide')}</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {(property as any).price_guide_low && `$${Number((property as any).price_guide_low).toLocaleString()}`}
                  {(property as any).price_guide_low && (property as any).price_guide_high && (property as any).price_guide_low !== (property as any).price_guide_high
                    ? ` – $${Number((property as any).price_guide_high).toLocaleString()}` : ''}
                </p>
                <PriceGuideHistory propertyId={property.id} currentLow={(property as any).price_guide_low} currentHigh={(property as any).price_guide_high} />
              </div>
            )}

            {(property as any).auction_date && (
              <AuctionRegisterPanel
                propertyId={property.id}
                auctionDate={(property as any).auction_date ?? null}
                registrationCount={0}
              />
            )}

            {/* Open Homes */}
            <OpenHomeSection propertyId={property.id} propertyAddress={property.address} />

            {/* Document Vault */}
            <div id="documents">
              <DocumentVault
                propertyId={property.id}
                viewerRole={user ? 'buyer' : 'public'}
                canUpload={false}
              />
            </div>

            {/* Comparable Sales */}
            {!isRental && (
              <ComparableSales
                propertyId={property.id}
                lat={property.lat ?? null}
                lng={property.lng ?? null}
                bedrooms={property.beds ?? 2}
                price={property.price ?? null}
                suburb={property.suburb}
                state={property.state}
                subjectAddress={property.address}
              />
            )}

            {/* What Sold Nearby */}
            {!isRental && property.suburb && property.state && (
              <WhatSoldNearby propertyId={property.id} suburb={property.suburb} state={property.state} />
            )}

            {/* Suburb Market Snapshot */}
            {!isRental && property.suburb && property.state && (
              <SuburbMarketSnapshot
                suburb={property.suburb}
                state={property.state}
                propertyType={property.propertyType || 'house'}
              />
            )}

            {/* Schools Nearby */}
            <SchoolsNearby propertyId={property.id} />

            {/* Price History */}
            <PriceHistoryChart
              propertyId={property.id}
              currentPrice={property.price}
              listedDate={property.listedDate}
              priceFormatted={property.priceFormatted}
              suburb={property.suburb}
              state={property.state}
              propertyType={property.propertyType}
            />

            {/* Features */}
            {property.features.length > 0 && (
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 mb-3 flex items-center gap-2.5 before:content-[''] before:w-[3px] before:h-4 before:rounded-full before:bg-blue-600 before:shrink-0">{tp('property.section.features')}</h2>
                <div className="flex flex-wrap gap-2">
                  {property.features.map(f => (
                    <span key={f} className="px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-sm font-medium text-slate-600">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Investment Insights (hide for rentals) */}
            {!isRental && <InvestmentInsightsCard property={property} />}

            <div className="rounded-2xl overflow-hidden sticky top-4" style={{ background: '#020817' }}>
              {/* Agent info */}
              <Link to={property.agent.id ? `/agent/${property.agent.id}` : '#'} className="flex items-center gap-3.5 p-5 pb-4 group/agent">
                <div className="relative shrink-0">
                  <Avatar className="w-14 h-14 rounded-[14px] border-2 transition-transform group-hover/agent:scale-105" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                    <AvatarImage src={property.agent.avatarUrl} alt={property.agent.name} className="object-cover" />
                    <AvatarFallback className="text-base font-bold rounded-[14px]" style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff' }}>
                      {property.agent.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-[15px] leading-tight group-hover/agent:text-blue-400 transition-colors">{property.agent.name}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{property.agent.agency}</p>
                  {property.agent.isSubscribed && (
                    <p className="text-[11px] font-semibold text-emerald-400 mt-1.5 flex items-center gap-1">
                      <BadgeCheck size={12} /> {t('agent.subscribed')}
                    </p>
                  )}
                  {property.agent.rating ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-[12px] font-medium text-white">{property.agent.rating.toFixed(1)}</span>
                      {property.agent.reviewCount ? (
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>({property.agent.reviewCount})</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Link>

              {/* Action buttons */}
              <div className="flex gap-2 px-5 pb-5">
                {property.agent.phone ? (
                  <a
                    href={`tel:${property.agent.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors"
                    style={{ border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)' }}
                  >
                    <Phone size={13} strokeWidth={2} /> {tp('property.call')}
                  </a>
                ) : (
                  <button
                    onClick={handleCtaClick}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors"
                    style={{ border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)' }}
                  >
                    <Phone size={13} strokeWidth={2} /> {tp('property.call')}
                  </button>
                )}
                <button
                  onClick={handleCtaClick}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  {ctaLabel}
                </button>
              </div>

              {isRental && (
                <div className="px-5 pb-5 -mt-2">
                  <button
                    onClick={() => setRentalApplicationOpen(true)}
                    className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-colors"
                    style={{ border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', background: 'transparent' }}
                  >
                    {tp('property.applyNow')}
                  </button>
                </div>
              )}
            </div>

            <OpenHomesCard propertyId={property.id} />

            {!isRental && (
              <MortgageBrokerCTA
                sourcePage="property_detail"
                defaultPrice={property.price}
                propertyId={property.id}
                agentId={property.agent?.id ?? null}
              />
            )}

            <HaloFromListingCTA
              listingId={property.id}
              agentId={property.agent?.id ?? null}
              listingType={isRental ? 'lease' : 'sale'}
              suburb={property.suburb}
              price={property.price}
              weeklyRent={(rawProperty as any)?.rent_per_week ?? (rawProperty as any)?.weekly_rent ?? null}
              propertyType={(rawProperty as any)?.property_type ?? null}
            />

            {!isRental && (
              <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <p className="text-sm font-medium">{tp('property.finance.shortTitle')}</p>
                <p className="text-xs text-muted-foreground mb-2">{tp('property.finance.shortBody')}</p>
                <Button size="sm" variant="outline" onClick={() => setMortgageOpen(true)}>{tp('property.finance.shortCta')}</Button>
              </div>
            )}
            {!isRental && (
              <div className="mt-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <p className="text-sm font-medium">{tp('property.conveyancer.title')}</p>
                <p className="text-xs text-muted-foreground mb-2">{tp('property.conveyancer.body')}</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/conveyancing')}>{tp('property.conveyancer.cta')}</Button>
              </div>
            )}
            <MortgageReferralModal
              open={mortgageOpen}
              onOpenChange={setMortgageOpen}
              sourceLabel="property_detail"
              propertyId={property?.id}
              purchasePrice={property?.price}
            />
          </div>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      {isMobile && (
        <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-white/95 backdrop-blur-sm border-t border-slate-100 z-30 flex gap-2.5">
          {property.agent.phone && (
            <a
              href={`tel:${property.agent.phone}`}
              className="w-12 h-12 flex items-center justify-center rounded-xl border border-slate-200 bg-white shrink-0"
            >
              <Phone size={18} className="text-slate-600" strokeWidth={1.8} />
            </a>
          )}
          <button
            onClick={handleCtaClick}
            className="flex-1 py-3 rounded-xl font-semibold text-sm text-white"
            style={{ background: '#1e293b' }}
          >
            {ctaLabel}
          </button>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white z-10">
              <X size={20} />
            </button>
            <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
              <ChevronLeft size={24} />
            </button>
            <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
              <ChevronRight size={24} />
            </button>
            <img src={images[imageIndex]} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">
              {imageIndex + 1} / {images.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <AgentContactModal
        property={property}
        open={contactOpen}
        onClose={() => setContactOpen(false)}
      />

      {isRental && (
        <RentalEnquiryForm
          property={property}
          open={rentalEnquiryOpen}
          onClose={() => setRentalEnquiryOpen(false)}
        />
      )}

      <InspectionBookingModal
        property={property}
        inspectionTimes={inspectionTimes}
        open={inspectionBookingOpen}
        onClose={() => setInspectionBookingOpen(false)}
      />

      {isRental && (
        <RentalApplicationModal
          property={property}
          open={rentalApplicationOpen}
          onClose={() => setRentalApplicationOpen(false)}
        />
      )}

      <ShareSheet
        property={property}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

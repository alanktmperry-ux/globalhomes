import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Globe, Phone, Mail, Star, BadgeCheck, Briefcase, Languages, Award, Building2, Info, Share2, PenLine } from 'lucide-react';
import { AgentSEOHead } from '@/features/seo/components/AgentSEOHead';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { calcReputationScore, getScoreColor, REPUTATION_TOOLTIP, type ReputationResult } from '@/features/agents/utils/reputationScore';
import { AgentPublicPerformanceCard } from '@/features/agents/components/AgentPublicPerformanceCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PropertyCard } from '@/features/properties/components/PropertyCard';
import { useSavedProperties } from '@/features/properties/hooks/useSavedProperties';
import { useI18n } from '@/shared/lib/i18n';
import { Property } from '@/shared/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { StarRating } from '@/features/agents/components/StarRating';
import { ReviewsList } from '@/features/agents/components/ReviewsList';
import { WriteReviewModal } from '@/features/agents/components/WriteReviewModal';
import type { AgentReviewData } from '@/features/agents/types';

interface AgentProfile {
  id: string;
  name: string;
  agency: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  isSubscribed: boolean;
  bio: string | null;
  titlePosition: string | null;
  licenseNumber: string | null;
  yearsExperience: number | null;
  specialization: string | null;
  officeAddress: string | null;
  websiteUrl: string | null;
  socialLinks: any;
  languagesSpoken: string[];
  serviceAreas: string[];
  verificationBadgeLevel: string | null;
  agencyId: string | null;
  investmentNiche: string | null;
  handlesTrustAccounting: boolean;
  avgRating?: number;
  reviewCount?: number;
  headline?: string | null;
  profileBannerUrl?: string | null;
  slug?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const colors = getScoreColor(score);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className="stroke-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} className={colors.ring}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className={`${colors.text} text-lg font-bold`} fill="currentColor" style={{ fontSize: size * 0.22 }}>
        {score}
      </text>
    </svg>
  );
}

function ReputationScoreCard({ score }: { score: ReputationResult }) {
  const colors = getScoreColor(score.total);
  const bars = [
    { label: 'Reviews', value: score.reviews, max: 25 },
    { label: 'Response Time', value: score.responseTime, max: 25 },
    { label: 'Sales Rate', value: score.salesRate, max: 40 },
    { label: 'Profile', value: score.profile, max: 10 },
  ];
  return (
    <div className={`p-5 rounded-2xl border border-border bg-card shadow-card mb-8 ${colors.bg}`}>
      <div className="flex items-center gap-5">
        <ScoreRing score={score.total} size={88} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-display text-sm font-bold">ListHQ Verified Score</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild><Info size={14} className="text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-[240px] text-xs">{REPUTATION_TOOLTIP}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="space-y-2 mt-3">
            {bars.map(b => (
              <div key={b.label} className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-24 shrink-0">{b.label}</span>
                <Progress value={(b.value / b.max) * 100} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground w-8 text-right">{b.value}/{b.max}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentPublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { isSaved, toggleSaved } = useSavedProperties();
  const [searchParams] = useSearchParams();

  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [listings, setListings] = useState<Property[]>([]);
  const [soldListings, setSoldListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentReviews, setAgentReviews] = useState<AgentReviewData[]>([]);
  const [listingTab, setListingTab] = useState<'active' | 'sold'>('active');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    const fetchAgent = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id || '')
        .single();

      if (data) {
        setAgent({
          id: data.id,
          name: data.name,
          agency: data.agency,
          phone: data.phone,
          email: data.email,
          avatarUrl: data.avatar_url || data.profile_photo_url,
          isSubscribed: data.is_subscribed,
          bio: data.bio,
          titlePosition: data.title_position,
          licenseNumber: data.license_number,
          yearsExperience: data.years_experience,
          specialization: data.specialization,
          officeAddress: data.office_address,
          websiteUrl: data.website_url,
          socialLinks: data.social_links,
          languagesSpoken: data.languages_spoken || [],
          serviceAreas: data.service_areas || [],
          verificationBadgeLevel: data.verification_badge_level,
          agencyId: data.agency_id,
          investmentNiche: data.investment_niche,
          handlesTrustAccounting: data.handles_trust_accounting || false,
          avgRating: data.rating ?? 0,
          reviewCount: data.review_count ?? 0,
          headline: (data as any).headline,
          profileBannerUrl: (data as any).profile_banner_url,
          slug: (data as any).slug,
          linkedinUrl: (data as any).linkedin_url,
          instagramUrl: (data as any).instagram_url,
        });

        // Fetch active listings
        const { data: props } = await supabase
          .from('properties')
          .select('*')
          .eq('agent_id', data.id)
          .eq('status', 'public')
          .order('created_at', { ascending: false });

        if (props) {
          setListings(props.map((p: any) => ({
            id: p.id, title: p.title, address: p.address, suburb: p.suburb, state: p.state,
            country: p.country, price: p.price, priceFormatted: p.price_formatted,
            beds: p.beds, baths: p.baths, parking: p.parking, sqm: p.sqm,
            imageUrl: p.image_url || p.images?.[0] || '', images: p.images || [],
            description: p.description || '', estimatedValue: p.estimated_value || '',
            propertyType: p.property_type || 'House', features: p.features || [],
            agent: { id: data.id, name: data.name, agency: data.agency || '', phone: data.phone || '', email: data.email || '', avatarUrl: data.avatar_url || '', isSubscribed: data.is_subscribed },
            listedDate: p.listed_date || p.created_at, views: p.views, contactClicks: p.contact_clicks, status: 'listed' as const,
          })));
        }

        // Fetch sold listings
        const { data: soldProps } = await supabase
          .from('properties')
          .select('*')
          .eq('agent_id', data.id)
          .eq('status', 'sold')
          .order('sold_at', { ascending: false })
          .limit(12);

        if (soldProps) {
          setSoldListings(soldProps.map((p: any) => ({
            id: p.id, title: p.title, address: p.address, suburb: p.suburb, state: p.state,
            country: p.country, price: p.sold_price || p.price, priceFormatted: p.price_formatted,
            beds: p.beds, baths: p.baths, parking: p.parking, sqm: p.sqm,
            imageUrl: p.image_url || p.images?.[0] || '', images: p.images || [],
            description: p.description || '', estimatedValue: p.estimated_value || '',
            propertyType: p.property_type || 'House', features: p.features || [],
            agent: { id: data.id, name: data.name, agency: data.agency || '', phone: data.phone || '', email: data.email || '', avatarUrl: data.avatar_url || '', isSubscribed: data.is_subscribed },
            listedDate: p.listed_date || p.created_at, views: p.views, contactClicks: p.contact_clicks, status: 'listed' as const,
          })));
        }

        // Fetch reviews
        const { data: reviews } = await supabase
          .from('agent_reviews')
          .select('*')
          .eq('agent_id', data.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });
        if (reviews) setAgentReviews(reviews as AgentReviewData[]);

        // Increment profile views
        supabase.rpc('increment_agent_profile_views', { p_agent_id: data.id });

        // Auto-switch to Sold tab if no active listings but sold ones exist
        if ((!props || props.length === 0) && soldProps && soldProps.length > 0) {
          setListingTab('sold');
        }
      }
      setLoading(false);
    };
    fetchAgent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Briefcase size={48} className="text-muted-foreground" />
        <h1 className="font-display text-xl font-bold text-foreground">Agent not found</h1>
        <Link to="/agents" className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
          Find an Agent
        </Link>
      </div>
    );
  }

  const currentListings = listingTab === 'active' ? listings : soldListings;

  return (
    <div className="flex flex-col">
      <AgentSEOHead agent={agent} listingCount={listings.length} />

      {/* Banner */}
      <div
        className="relative h-48 sm:h-64 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900"
        style={agent.profileBannerUrl ? { backgroundImage: `url(${agent.profileBannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={() => setReviewModalOpen(true)}
            className="px-4 py-2 rounded-xl border border-white/40 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <PenLine size={14} /> Write a Review
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="p-2 rounded-xl border border-white/40 text-white hover:bg-white/10 transition-colors"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 -mt-16 relative z-10">
        {/* Agent info card */}
        <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-card mb-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-card shadow-lg ring-4 ring-card">
              <AvatarImage src={agent.avatarUrl || ''} alt={agent.name} className="object-cover" />
              <AvatarFallback className="text-3xl font-bold">{agent.name[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{agent.name}</h1>
                {agent.isSubscribed && (
                  <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                    <BadgeCheck size={14} /> Verified
                  </span>
                )}
              </div>

              {agent.headline && (
                <p className="text-muted-foreground mt-1">{agent.headline}</p>
              )}
              {!agent.headline && (
                <p className="text-muted-foreground mt-1">
                  {agent.titlePosition || 'Agent'}
                  {agent.agency && <> · {agent.agency}</>}
                </p>
              )}

              {(agent.avgRating ?? 0) > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <StarRating rating={agent.avgRating!} size="md" />
                  <span className="font-semibold text-foreground">{agent.avgRating!.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({agent.reviewCount} review{agent.reviewCount !== 1 ? 's' : ''})
                  </span>
                </div>
              )}

              {/* KPI chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                {agent.investmentNiche && agent.investmentNiche.split(',').map((s: string) => s.trim()).filter(Boolean).map((s: string) => (
                  <span key={s} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">{s}</span>
                ))}
                {agent.handlesTrustAccounting && (
                  <span className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 text-sm font-medium">🛡️ Trust Compliant</span>
                )}
                {agent.specialization && (
                  <span className="px-3 py-1.5 rounded-full bg-secondary text-sm text-secondary-foreground flex items-center gap-1"><Award size={14} /> {agent.specialization}</span>
                )}
                {agent.yearsExperience && (
                  <span className="px-3 py-1.5 rounded-full bg-secondary text-sm text-secondary-foreground flex items-center gap-1"><Briefcase size={14} /> {agent.yearsExperience} years</span>
                )}
                {agent.languagesSpoken.length > 0 && (
                  <span className="px-3 py-1.5 rounded-full bg-secondary text-sm text-secondary-foreground flex items-center gap-1"><Languages size={14} /> {agent.languagesSpoken.join(', ')}</span>
                )}
              </div>

              {agent.bio && (
                <p className="text-muted-foreground mt-4 leading-relaxed whitespace-pre-line">{agent.bio}</p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-border">
            {agent.phone && (
              <a href={`tel:${agent.phone}`} className="flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-accent transition-colors">
                <Phone size={16} className="text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{agent.phone}</span>
              </a>
            )}
            {agent.email && (
              <a href={`mailto:${agent.email}`} className="flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-accent transition-colors">
                <Mail size={16} className="text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{agent.email}</span>
              </a>
            )}
            {agent.websiteUrl && (
              <a href={agent.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-accent transition-colors">
                <Globe size={16} className="text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">Website</span>
              </a>
            )}
            {agent.officeAddress && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary sm:col-span-2 md:col-span-3">
                <MapPin size={16} className="text-primary shrink-0" />
                <span className="text-sm text-foreground">{agent.officeAddress}</span>
              </div>
            )}
          </div>

          {/* Service areas */}
          {agent.serviceAreas.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Service Areas</p>
              <div className="flex flex-wrap gap-2">
                {agent.serviceAreas.map(area => (
                  <span key={area} className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">{area}</span>
                ))}
              </div>
            </div>
          )}

          {agent.agencyId && (
            <div className="mt-4 pt-4 border-t border-border">
              <Link to={`/agency/${agent.agencyId}`} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                <Building2 size={14} /> View agency profile
              </Link>
            </div>
          )}
        </div>

        <AgentPublicPerformanceCard agentId={agent.id} />

        {(listings.length > 0 || soldListings.length > 0 || (agent.reviewCount ?? 0) > 0) && (
          <ReputationScoreCard score={calcReputationScore({
            rating: agent.avgRating || agent.reviewCount ? (agent.avgRating || 0) : null,
            reviewCount: agent.reviewCount || 0,
            totalListings: listings.length,
            soldListings: soldListings.length,
            hasAvatar: !!agent.avatarUrl,
            hasBio: !!agent.bio,
            hasPhone: !!agent.phone,
            hasSpecialization: !!agent.specialization,
            hasServiceAreas: agent.serviceAreas.length > 0,
          })} />
        )}

        {/* Listing tabs */}
        <div className="mb-8">
          <div className="flex gap-2 mb-4">
            {[
              { value: 'active', label: `Active (${listings.length})` },
              { value: 'sold', label: `Sold (${soldListings.length})` },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setListingTab(tab.value as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                  ${listingTab === tab.value
                    ? 'bg-foreground text-background'
                    : 'bg-card text-muted-foreground border border-border hover:border-foreground/30'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {currentListings.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {currentListings.map((property, i) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onSelect={() => {}}
                  isSaved={isSaved(property.id)}
                  onToggleSave={toggleSaved}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {listingTab === 'active' ? 'No active listings.' : 'No sold listings on record.'}
              </p>
            </div>
          )}
        </div>

        {/* Reviews section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-foreground">Client Reviews</h2>
            <button
              onClick={() => setReviewModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <PenLine size={14} /> Write a Review
            </button>
          </div>
          <ReviewsList
            reviews={agentReviews}
            agentName={agent.name}
            avgRating={agent.avgRating}
            reviewCount={agent.reviewCount}
          />
        </div>
      </div>

      <WriteReviewModal
        agentId={agent.id}
        agentName={agent.name}
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
      />
    </div>
  );
}

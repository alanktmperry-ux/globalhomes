import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Globe, Phone, Mail, Star, BadgeCheck, Briefcase, Languages, Award, Building2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BottomNav } from '@/components/BottomNav';
import { PropertyCard } from '@/components/PropertyCard';
import { useSavedProperties } from '@/hooks/useSavedProperties';
import { useI18n } from '@/lib/i18n';
import { Property } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

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
}

export default function AgentPublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { isSaved, toggleSaved } = useSavedProperties();

  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [listings, setListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

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
        });

        // Fetch agent's listings
        const { data: props } = await supabase
          .from('properties')
          .select('*')
          .eq('agent_id', data.id)
          .eq('status', 'public')
          .order('created_at', { ascending: false });

        if (props) {
          setListings(props.map((p: any) => ({
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
            images: p.images || [],
            description: p.description || '',
            estimatedValue: p.estimated_value || '',
            propertyType: p.property_type || 'House',
            features: p.features || [],
            agent: {
              id: data.id,
              name: data.name,
              agency: data.agency || '',
              phone: data.phone || '',
              email: data.email || '',
              avatarUrl: data.avatar_url || '',
              isSubscribed: data.is_subscribed,
            },
            listedDate: p.listed_date || p.created_at,
            views: p.views,
            contactClicks: p.contact_clicks,
            status: 'listed' as const,
          })));
        }
      }
      setLoading(false);
    };
    fetchAgent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Briefcase size={48} className="text-muted-foreground" />
          <h1 className="font-display text-xl font-bold text-foreground">Agent not found</h1>
          <button onClick={() => navigate('/')} className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
            Back to search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <div className="max-w-5xl mx-auto w-full px-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pb-24 md:pb-12">
        {/* Agent hero card */}
        <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-card mb-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-primary shadow-lg">
                <AvatarImage src={agent.avatarUrl || ''} alt={agent.name} className="object-cover" />
                <AvatarFallback className="text-3xl font-bold">{agent.name[0]}</AvatarFallback>
              </Avatar>
              {agent.isSubscribed && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <BadgeCheck size={18} className="text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{agent.name}</h1>
                {agent.isSubscribed && (
                  <span className="px-2.5 py-1 rounded-md bg-success text-success-foreground text-xs font-medium">Verified Agent</span>
                )}
              </div>

              <p className="text-muted-foreground mt-1">
                {agent.titlePosition || 'Agent'}
                {agent.agency && <> · {agent.agency}</>}
              </p>

              <div className="flex items-center gap-1 mt-2">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-foreground">4.8</span>
                <span className="text-sm text-muted-foreground ml-1">Rating</span>
              </div>

              {/* Quick info chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                {agent.specialization && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm text-secondary-foreground">
                    <Award size={14} /> {agent.specialization}
                  </span>
                )}
                {agent.yearsExperience && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm text-secondary-foreground">
                    <Briefcase size={14} /> {agent.yearsExperience} years
                  </span>
                )}
                {agent.languagesSpoken.length > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm text-secondary-foreground">
                    <Languages size={14} /> {agent.languagesSpoken.join(', ')}
                  </span>
                )}
              </div>

              {agent.bio && (
                <p className="text-muted-foreground mt-4 leading-relaxed whitespace-pre-line">{agent.bio}</p>
              )}
            </div>
          </div>

          {/* Contact details */}
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
                  <span key={area} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{area}</span>
                ))}
              </div>
            </div>
          )}

          {/* Agency link */}
          {agent.agencyId && (
            <div className="mt-4 pt-4 border-t border-border">
              <Link to={`/agency/${agent.agencyId}`} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                <Building2 size={14} />
                View agency profile
              </Link>
            </div>
          )}
        </div>

        {/* Agent's listings */}
        {listings.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-bold text-foreground mb-4">
              Listings by {agent.name} ({listings.length})
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {listings.map((property, i) => (
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
          </div>
        )}

        {listings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No active listings from this agent.</p>
          </div>
        )}
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}

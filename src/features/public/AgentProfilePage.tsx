import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, Mail, Share2, Check, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Agent = {
  id: string;
  name: string | null;
  bio: string | null;
  agency: string | null;
  service_areas: string[] | null;
  license_number: string | null;
  profile_photo_url: string | null;
  avatar_url: string | null;
  created_at: string;
};

type Listing = {
  id: string;
  title: string | null;
  address: string | null;
  suburb: string | null;
  state: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  property_type: string | null;
  images: string[] | null;
  translations: Record<string, unknown> | null;
};

function initials(name?: string | null) {
  if (!name) return 'A';
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || 'A';
}

function formatMonth(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function AgentProfilePage() {
  const { agentId } = useParams<{ agentId: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: agentData } = await supabase
        .from('agents')
        .select('id, name, bio, agency, service_areas, license_number, profile_photo_url, avatar_url, created_at')
        .eq('id', agentId)
        .eq('is_approved', true)
        .maybeSingle();

      if (cancelled) return;

      if (!agentData) {
        setAgent(null);
        setListings([]);
        setLoading(false);
        return;
      }

      setAgent(agentData as Agent);

      const { data: listingData } = await supabase
        .from('properties')
        .select('id, title, address, suburb, state, price, beds, baths, property_type, images, translations')
        .eq('agent_id', agentId)
        .in('status', ['public', 'active', 'published', 'under_offer'])
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setListings((listingData as Listing[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading agent profile…</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-3">
          <h1 className="text-2xl font-bold text-foreground">Agent not found</h1>
          <p className="text-muted-foreground">
            This agent profile is not available, or the agent has not been approved yet.
          </p>
          <Link to="/agents" className="inline-block text-primary underline text-sm">
            Browse agents →
          </Link>
        </div>
      </div>
    );
  }

  const photo = agent.profile_photo_url || agent.avatar_url;
  const mailto = `mailto:?subject=${encodeURIComponent('Enquiry via ListHQ')}&body=${encodeURIComponent(
    `Hi ${agent.name || 'there'},\n\nI found your profile on ListHQ and would like to get in touch.\n\nThanks,`
  )}`;

  return (
    <>
      <Helmet>
        <title>{`${agent.name ?? 'Agent'} · ListHQ`}</title>
        <meta
          name="description"
          content={`${agent.name ?? 'Agent'}${agent.agency ? ' at ' + agent.agency : ''} on ListHQ — ${listings.length} published listing${listings.length === 1 ? '' : 's'}.`}
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
          {/* Hero */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="flex items-start gap-4 sm:gap-6 flex-1 min-w-0">
              {photo ? (
                <img
                  src={photo}
                  alt={agent.name ?? 'Agent'}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
                  {initials(agent.name)}
                </div>
              )}
              <div className="min-w-0 space-y-1.5">
                <h1 className="text-xl font-bold text-foreground truncate">
                  {agent.name || 'Agent'}
                </h1>
                {agent.agency && (
                  <p className="text-sm text-muted-foreground">{agent.agency}</p>
                )}
                {agent.bio && (
                  <p className="text-sm text-muted-foreground max-w-md line-clamp-3">{agent.bio}</p>
                )}
                {agent.service_areas && agent.service_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {agent.service_areas.slice(0, 8).map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        <MapPin size={10} /> {s}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-1">
                  Listed on ListHQ since {formatMonth(agent.created_at)}
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleShare} className="shrink-0">
              {copied ? <Check size={14} className="mr-1.5" /> : <Share2 size={14} className="mr-1.5" />}
              {copied ? 'Copied' : 'Share profile'}
            </Button>
          </div>

          {/* Contact bar */}
          <div className="mb-10">
            <a
              href={mailto}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              <Mail size={16} /> Email agent
            </a>
          </div>

          {/* Listings */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">
              Properties by {agent.name || 'this agent'}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {listings.length}
            </span>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <Home size={28} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No published listings yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((l) => {
                const hasTranslations =
                  l.translations && typeof l.translations === 'object' && Object.keys(l.translations).length > 0;
                return (
                  <Link
                    key={l.id}
                    to={`/property/${l.id}`}
                    className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-[16/9] bg-muted overflow-hidden">
                      {l.images?.[0] ? (
                        <img
                          src={l.images[0]}
                          alt={l.address ?? l.title ?? 'Property'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home size={32} className="text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-1">
                      <p className="font-semibold text-sm text-foreground line-clamp-1">
                        {l.address || l.title || 'Property'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[l.suburb, l.state].filter(Boolean).join(', ')}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <p className="font-bold text-foreground">
                          {l.price
                            ? `$${Number(l.price).toLocaleString('en-AU')}`
                            : 'Contact agent'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.beds ?? 0}bd · {l.baths ?? 0}ba
                        </p>
                      </div>
                      {hasTranslations && (
                        <p className="text-xs text-primary font-medium pt-1">
                          🌐 Available in multiple languages
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

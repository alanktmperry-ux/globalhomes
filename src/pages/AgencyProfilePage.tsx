import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, MapPin, Phone, Mail, Globe, Users, Home, Bed, Bath, Car } from 'lucide-react';
import { useCurrency } from '@/lib/CurrencyContext';

const AgencyProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { formatPrice } = useCurrency();

  const { data: agency, isLoading: agencyLoading } = useQuery({
    queryKey: ['agency', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('slug', slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['agency-members-public', agency?.id],
    queryFn: async () => {
      const { data: memberRows, error } = await supabase
        .from('agency_members')
        .select('user_id, role, joined_at')
        .eq('agency_id', agency!.id);
      if (error) throw error;

      // Fetch agent profiles for these user_ids
      const userIds = memberRows.map((m) => m.user_id);
      const { data: agents } = await supabase
        .from('agents')
        .select('user_id, name, email, phone, avatar_url, agency')
        .in('user_id', userIds);

      return memberRows.map((m) => ({
        ...m,
        agent: agents?.find((a) => a.user_id === m.user_id) || null,
      }));
    },
    enabled: !!agency?.id,
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['agency-listings-public', agency?.id],
    queryFn: async () => {
      // Get all agent ids for this agency
      const { data: agentRows } = await supabase
        .from('agents')
        .select('id')
        .eq('agency_id', agency!.id);

      if (!agentRows?.length) return [];

      const agentIds = agentRows.map((a) => a.id);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .in('agent_id', agentIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    enabled: !!agency?.id,
  });

  if (agencyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="max-w-6xl mx-auto px-4 py-16 space-y-8">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <Building2 className="mx-auto mb-4 text-muted-foreground" size={48} />
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Agency not found</h1>
          <p className="text-muted-foreground">The agency you're looking for doesn't exist.</p>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const roleOrder: Record<string, number> = { owner: 0, admin: 1, agent: 2 };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero / Branding */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {agency.logo_url ? (
              <img src={agency.logo_url} alt={agency.name} className="w-20 h-20 rounded-2xl object-cover border border-border shadow-sm" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 size={32} className="text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">{agency.name}</h1>
              {agency.description && (
                <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">{agency.description}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                {agency.address && (
                  <span className="flex items-center gap-1.5"><MapPin size={14} /> {agency.address}</span>
                )}
                {agency.phone && (
                  <a href={`tel:${agency.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors"><Phone size={14} /> {agency.phone}</a>
                )}
                {agency.email && (
                  <a href={`mailto:${agency.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors"><Mail size={14} /> {agency.email}</a>
                )}
                {agency.website && (
                  <a href={agency.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground transition-colors"><Globe size={14} /> Website</a>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <Users size={20} className="mx-auto text-primary mb-1" />
              <p className="text-2xl font-display font-bold text-foreground">{members?.length ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Team Members</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <Home size={20} className="mx-auto text-primary mb-1" />
              <p className="text-2xl font-display font-bold text-foreground">{listings?.length ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Active Listings</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center col-span-2 sm:col-span-1">
              <Building2 size={20} className="mx-auto text-primary mb-1" />
              <p className="text-2xl font-display font-bold text-foreground">
                {agency.created_at ? new Date(agency.created_at).getFullYear() : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Established</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">Meet the Team</h2>
        {membersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : members?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...members]
              .sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9))
              .map((m) => (
                <Card key={m.user_id} className="border-border/50">
                  <CardContent className="p-5 flex items-center gap-4">
                    <Avatar className="w-14 h-14 border-2 border-primary/20">
                      <AvatarImage src={m.agent?.avatar_url || ''} className="object-cover" />
                      <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                        {m.agent?.name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-foreground truncate">{m.agent?.name || 'Team Member'}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1 capitalize">{m.role}</Badge>
                      {m.agent?.email && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{m.agent.email}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No team members yet.</p>
        )}
      </section>

      {/* Active Listings */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-display font-bold text-foreground mb-6">Active Listings</h2>
        {listingsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : listings?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((p) => (
              <Card key={p.id} className="overflow-hidden border-border/50 group hover:shadow-md transition-shadow">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={p.image_url || '/placeholder.svg'}
                    alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-4">
                  <p className="font-display font-bold text-lg text-primary">{p.price_formatted}</p>
                  <h3 className="font-display font-semibold text-foreground text-sm mt-1 line-clamp-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.address}, {p.suburb}, {p.state}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Bed size={13} /> {p.beds}</span>
                    <span className="flex items-center gap-1"><Bath size={13} /> {p.baths}</span>
                    <span className="flex items-center gap-1"><Car size={13} /> {p.parking}</span>
                    <span className="ml-auto bg-secondary px-2 py-0.5 rounded text-[10px] font-medium">{p.property_type}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No active listings at the moment.</p>
        )}
      </section>

      <SiteFooter />
    </div>
  );
};

export default AgencyProfilePage;

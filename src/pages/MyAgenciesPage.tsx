import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Plus, ChevronRight, MapPin, Loader2, Mail, Phone, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AgencyWithStats {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  myRole: string;
  memberCount: number;
}

const MyAgenciesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState<AgencyWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        // Get all agency memberships for this user
        const { data: memberships } = await supabase
          .from('agency_members')
          .select('agency_id, role')
          .eq('user_id', user.id);

        if (!memberships?.length) {
          setLoading(false);
          return;
        }

        const agencyIds = memberships.map(m => m.agency_id);

        // Get agency details
        const { data: agenciesData } = await supabase
          .from('agencies')
          .select('*')
          .in('id', agencyIds);

        // Get member counts
        const enriched: AgencyWithStats[] = await Promise.all(
          (agenciesData || []).map(async (a) => {
            const { count } = await supabase
              .from('agency_members')
              .select('id', { count: 'exact', head: true })
              .eq('agency_id', a.id);

            const membership = memberships.find(m => m.agency_id === a.id);
            return {
              ...a,
              myRole: membership?.role || 'agent',
              memberCount: count || 0,
            };
          })
        );

        setAgencies(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const roleBadgeClass: Record<string, string> = {
    principal: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    owner: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    admin: 'bg-primary/10 text-primary border-primary/20',
    agent: 'bg-secondary text-foreground border-border',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Agencies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all your agencies and teams from one place.
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/team')} size="sm">
          <Plus size={14} className="mr-1.5" /> New Agency
        </Button>
      </div>

      {agencies.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Building2 size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No agencies yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first agency to get started.</p>
          <Button onClick={() => navigate('/dashboard/team')}>
            <Plus size={14} className="mr-1.5" /> Create Agency
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {agencies.map((agency) => (
            <button
              key={agency.id}
              onClick={() => navigate('/dashboard/team', { state: { selectedAgencyId: agency.id } })}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all text-left group"
            >
              {agency.logo_url ? (
                <img
                  src={agency.logo_url}
                  alt={agency.name}
                  className="w-14 h-14 rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border border-border">
                  <Building2 size={22} className="text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">{agency.name}</h3>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${roleBadgeClass[agency.myRole] || ''}`}>
                    {agency.myRole === 'principal' ? 'Principal' : agency.myRole}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {agency.memberCount} member{agency.memberCount !== 1 ? 's' : ''}
                  </span>
                  {agency.address && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin size={12} /> {agency.address}
                    </span>
                  )}
                  {agency.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail size={12} /> {agency.email}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAgenciesPage;

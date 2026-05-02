import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/shared/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Search, Loader2, Home } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface Application {
  id: string;
  property_id: string;
  status: string;
  created_at: string;
  reference_number: string;
  property_address?: string;
  property_suburb?: string;
  property_image?: string;
  rental_weekly?: number;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Under Review', variant: 'outline' },
  shortlisted: { label: 'Shortlisted', variant: 'default' },
  approved: { label: 'Approved', variant: 'default' },
  declined: { label: 'Not Successful', variant: 'secondary' },
  withdrawn: { label: 'Withdrawn', variant: 'secondary' },
};

const DATE_FMT = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

const MyApplicationsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/seeker-auth', { replace: true });
      return;
    }

    const fetchApplications = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('rental_applications')
        .select('id, property_id, status, created_at, reference_number')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      if (error || !data) {
        if (import.meta.env.DEV) console.error('Failed to fetch applications:', error);
        setLoading(false);
        return;
      }

      // Fetch property details for each application
      const propertyIds = [...new Set(data.map(a => a.property_id))];
      const { data: properties } = await supabase
        .from('properties')
        .select('id, address, suburb, images, rental_weekly')
        .in('id', propertyIds);

      const propertyMap = new Map(
        (properties || []).map(p => [p.id, p])
      );

      const enriched: Application[] = data.map(app => {
        const prop = propertyMap.get(app.property_id);
        return {
          ...app,
          property_address: prop?.address || 'Address not available',
          property_suburb: prop?.suburb || '',
          property_image: prop?.images?.[0] || undefined,
          rental_weekly: prop?.rental_weekly || undefined,
        };
      });

      setApplications(enriched);
      setLoading(false);
    };

    fetchApplications();
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Helmet>
        <title>My Applications | ListHQ</title>
      </Helmet>

      <div className="flex items-center gap-3 mb-6">
        <FileText size={22} className="text-primary" />
        <h1 className="text-xl font-bold">My Applications</h1>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-4">
            <Home size={36} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              You haven't applied for any properties yet.
            </p>
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <Search size={14} /> Start your search →
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map(app => {
            const statusInfo = STATUS_MAP[app.status] || { label: app.status, variant: 'outline' as const };
            const statusColorClass =
              app.status === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
              app.status === 'shortlisted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
              app.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
              'bg-muted text-muted-foreground';

            return (
              <Card key={app.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-0">
                    {/* Thumbnail */}
                    <div className="w-24 h-24 sm:w-32 sm:h-28 shrink-0 bg-muted">
                      {app.property_image ? (
                        <img
                          src={app.property_image}
                          alt={app.property_address}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home size={20} className="text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                      <div>
                        <p className="text-sm font-semibold truncate">{app.property_address}</p>
                        {app.property_suburb && (
                          <p className="text-xs text-muted-foreground">{app.property_suburb}</p>
                        )}
                        {app.rental_weekly && (
                          <p className="text-xs font-medium text-primary mt-0.5">
                            ${app.rental_weekly}/week
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge className={`text-[10px] ${statusColorClass}`}>
                          {statusInfo.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          Submitted {DATE_FMT.format(new Date(app.created_at))}
                        </span>
                        <Link
                          to={`/property/${app.property_id}`}
                          className="text-[11px] text-primary hover:underline ml-auto"
                        >
                          View Property →
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyApplicationsPage;

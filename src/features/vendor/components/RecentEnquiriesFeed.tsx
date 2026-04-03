import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface Props {
  propertyId: string;
  limit?: number;
  isAgent?: boolean;
}

interface LeadRow {
  id: string;
  user_name: string;
  message: string | null;
  created_at: string;
  read: boolean | null;
}

export function RecentEnquiriesFeed({ propertyId, limit = 5, isAgent = false }: Props) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('leads')
      .select('id, user_name, message, created_at, read')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setLeads((data ?? []) as LeadRow[]);
        setLoading(false);
      });
  }, [propertyId, limit]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Recent Enquiries</h3>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">Recent Enquiries</h3>
      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enquiries yet. Share your listing to attract buyers.</p>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const initials = lead.user_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={lead.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{lead.user_name}</span>
                    {!lead.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  {isAgent && lead.message && (
                    <p className="text-xs text-muted-foreground truncate">{lead.message.slice(0, 80)}{lead.message.length > 80 ? '…' : ''}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            );
          })}
          {isAgent && (
            <Link to={`/dashboard/leads?property=${propertyId}`} className="text-xs text-primary hover:underline">
              View all enquiries →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

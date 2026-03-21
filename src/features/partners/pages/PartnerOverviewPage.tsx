import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Clock, Building2, Inbox, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PartnerProfile {
  id: string;
  company_name: string;
  is_verified: boolean;
  contact_name: string;
  contact_email: string;
}

interface PendingInvite {
  id: string;
  agency_id: string;
  access_level: string;
  invite_token: string;
  invited_at: string;
  agencies: { name: string } | null;
}

const ACCESS_LABELS: Record<string, string> = {
  trust_only: 'Trust only',
  trust_and_pm: 'Trust + PM',
  full_pm: 'Full PM',
};

const PartnerOverviewPage = () => {
  const { user } = useAuth();
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [agencyCount, setAgencyCount] = useState(0);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: p } = await supabase
      .from('partners')
      .select('id, company_name, is_verified, contact_name, contact_email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (p) {
      setPartner(p as unknown as PartnerProfile);

      const { count } = await supabase
        .from('partner_agencies')
        .select('id', { count: 'exact', head: true })
        .eq('partner_id', (p as any).id)
        .eq('status', 'active');

      setAgencyCount(count || 0);

      // Fetch pending invites
      const { data: invites } = await supabase
        .from('partner_agencies')
        .select('id, agency_id, access_level, invite_token, invited_at, agencies(name)')
        .eq('partner_id', (p as any).id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (invites) setPendingInvites(invites as unknown as PendingInvite[]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcceptInvite = async (invite: PendingInvite) => {
    setAcceptingId(invite.id);
    try {
      const { data, error } = await supabase.functions.invoke('accept-partner-invite', {
        body: { token: invite.invite_token },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`You now have access to ${invite.agencies?.name || 'the agency'}`);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setAcceptingId(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">Partner profile not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-10 max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-1">
        Welcome, {partner.company_name}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Partner dashboard overview
      </p>

      {/* Verification status */}
      {!partner.is_verified ? (
        <Card className="border-amber-500/30 bg-amber-500/5 mb-6">
          <CardContent className="flex items-start gap-4 py-5">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="text-amber-500" size={20} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">Account pending verification</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Our team will review and approve your account within 24 hours. You will receive an email at <strong className="text-foreground">{partner.contact_email}</strong> when approved.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-500/30 bg-emerald-500/5 mb-6">
          <CardContent className="flex items-start gap-4 py-5">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="text-emerald-500" size={20} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-1">Account verified</p>
              <p className="text-muted-foreground text-sm">
                You can now accept client agency invitations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Mail size={18} className="text-primary" />
            Pending invitations
          </h2>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <Card key={invite.id} className="border-primary/20">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{invite.agencies?.name || 'Unknown agency'}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {format(new Date(invite.invited_at), 'dd/MM/yyyy')} · {ACCESS_LABELS[invite.access_level] || invite.access_level}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAcceptInvite(invite)}
                    disabled={acceptingId === invite.id}
                  >
                    {acceptingId === invite.id ? (
                      <><Loader2 className="animate-spin mr-1" size={14} /> Accepting…</>
                    ) : (
                      'Accept'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Client Agencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-primary" />
              <span className="text-3xl font-display font-bold text-foreground">{agencyCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={partner.is_verified ? 'default' : 'secondary'} className="text-xs">
              {partner.is_verified ? 'Verified' : 'Pending'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {agencyCount === 0 && pendingInvites.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Inbox className="mx-auto text-muted-foreground mb-4" size={40} />
            <h3 className="font-semibold text-foreground text-sm mb-2">No client agencies yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
              Once a client agency invites you, their account will appear here. Share your partner email with agencies to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PartnerOverviewPage;

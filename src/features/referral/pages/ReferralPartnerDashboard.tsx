import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Copy, QrCode, CheckCircle2, Users, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PartnerProfile { id: string; partner_code: string; display_name: string; }
interface Lead { id: string; name: string; email: string; phone: string | null; suburb_interest: string | null; created_at: string; }

export default function ReferralPartnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase
        .from('referral_partners')
        .select('id, partner_code, display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      setPartner(p as PartnerProfile | null);
      if (p) {
        const { data: l } = await supabase
          .from('partner_buyer_leads')
          .select('id, name, email, phone, suburb_interest, created_at')
          .eq('partner_code', p.partner_code)
          .order('created_at', { ascending: false });
        setLeads((l as Lead[]) ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  if (!user) return <Navigate to="/agent-auth" replace />;

  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3 bg-card border rounded-2xl p-8">
          <QrCode className="mx-auto text-muted-foreground" size={36} />
          <h1 className="text-xl font-semibold">No partner account found</h1>
          <p className="text-sm text-muted-foreground">
            Your account hasn't been linked to a referral partner code yet. Contact ListHQ to get set up.
          </p>
        </div>
      </div>
    );
  }

  const referralUrl = `${window.location.origin}/r/${partner.partner_code}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(referralUrl)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Referral Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome, {partner.display_name}</p>
        </div>

        {/* QR + Link card */}
        <div className="bg-card border rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <img src={qrUrl} alt="Referral QR code" className="w-[180px] h-[180px] rounded-lg border bg-white" />
          <div className="flex-1 space-y-3 w-full">
            <div>
              <h2 className="font-semibold">Your referral link</h2>
              <p className="text-xs text-muted-foreground">Print the QR code or share this link. Buyers who register are shown below.</p>
            </div>
            <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 text-sm">
              <span className="truncate flex-1">{referralUrl}</span>
              <Button size="sm" variant="ghost" onClick={copyLink} className="gap-1">
                <Copy size={13} /> Copy
              </Button>
            </div>
            <div>
              <Button asChild size="sm" variant="outline" className="gap-2">
                <a href={qrUrl} download={`listhq-${partner.partner_code}-qr.png`} target="_blank" rel="noreferrer">
                  <ExternalLink size={13} /> Download QR code
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Leads */}
        <div className="bg-card border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-muted-foreground" />
              <h2 className="font-semibold">Registered buyers</h2>
              <span className="text-xs text-muted-foreground">({leads.length})</span>
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">No buyers registered yet. Share your QR code at your next open home.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {leads.map(lead => (
                <li key={lead.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span className="font-medium">{lead.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lead.email}{lead.phone ? ` · ${lead.phone}` : ''}
                    </p>
                    {lead.suburb_interest && (
                      <p className="text-xs text-muted-foreground">Looking in: {lead.suburb_interest}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

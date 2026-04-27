import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { Copy, Loader2 } from 'lucide-react';

interface PartnerRow {
  id: string;
  company_name: string;
  contact_name: string;
  is_verified: boolean;
  created_at: string;
}

interface BrokerStats {
  leads_sent: number;
  conversions: number;
  last_30d_leads: number;
}

const formatMonthYear = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const MortgageBrokerPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<PartnerRow | null>(null);
  const [stats, setStats] = useState<BrokerStats>({ leads_sent: 0, conversions: 0, last_30d_leads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/partner/login', { replace: true }); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: p } = await (supabase as any)
          .from('partners')
          .select('id, company_name, contact_name, is_verified, created_at')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (!p) { setLoading(false); return; }
        setPartner(p as PartnerRow);

        try {
          const { data: s } = await (supabase as any)
            .from('broker_referral_stats')
            .select('leads_sent, conversions, last_30d_leads')
            .eq('partner_id', (p as any).id)
            .maybeSingle();
          if (!cancelled && s) setStats(s as BrokerStats);
        } catch {
          // table may not exist — keep zeroes
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/partner/login');
  };

  const partnerId = partner?.id || '';
  const snippet = `<script src="https://listhq.com.au/widget/mortgage.js" data-partner="${partnerId}" async></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet).then(
      () => toast.success('Embed code copied'),
      () => toast.error('Could not copy — please copy manually'),
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="animate-spin text-stone-400" size={28} />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Mortgage Broker Portal — ListHQ</title></Helmet>
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-2xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <p className="text-[13px] text-stone-400">ListHQ Partner</p>
            <button
              onClick={handleSignOut}
              className="text-[13px] text-stone-500 hover:text-stone-900 transition-colors"
            >
              Sign out
            </button>
          </div>

          <h1 className="text-[28px] font-semibold text-stone-900 leading-tight">Mortgage Broker Portal</h1>
          <p className="text-[15px] text-stone-500 mt-1">{partner?.company_name || 'Your account'}</p>

          {/* Status banner */}
          <div className="mt-6">
            {!partner?.is_verified ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-900">
                Your account is pending approval. You'll receive an email once verified by the ListHQ team.
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[14px] text-emerald-900">
                Account active{partner?.created_at && ` · Partner since ${formatMonthYear(partner.created_at)}`}
              </div>
            )}
          </div>

          {/* Stats */}
          {partner?.is_verified && (
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                { label: 'Leads sent (30d)', value: stats.last_30d_leads },
                { label: 'Conversions', value: stats.conversions },
                { label: 'All-time leads', value: stats.leads_sent },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl bg-white border border-stone-200 px-4 py-3">
                  <p className="text-[11px] text-stone-500 uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-[24px] font-semibold text-stone-900 mt-1">{kpi.value ?? 0}</p>
                </div>
              ))}
            </div>
          )}

          {/* Widget embed */}
          <h2 className="text-[17px] font-semibold text-stone-900 mt-8 mb-2">Your widget embed code</h2>
          <p className="text-[14px] text-stone-500 mb-3">
            Paste this into any page on your website to show a mortgage calculator powered by ListHQ.
          </p>
          <div className="relative">
            <pre className="bg-stone-900 text-emerald-400 rounded-2xl p-5 text-[13px] font-mono overflow-x-auto whitespace-pre">
{snippet}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-[12px] text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <Copy size={12} /> Copy
            </button>
          </div>

          {/* Profile */}
          <h2 className="text-[17px] font-semibold text-stone-900 mt-8 mb-3">Your details</h2>
          <div className="rounded-2xl bg-white border border-stone-200 divide-y divide-stone-100">
            <div className="flex justify-between px-4 py-3 text-[14px]">
              <span className="text-stone-500">Company</span>
              <span className="text-stone-900 font-medium">{partner?.company_name || '—'}</span>
            </div>
            <div className="flex justify-between px-4 py-3 text-[14px]">
              <span className="text-stone-500">Contact</span>
              <span className="text-stone-900 font-medium">{partner?.contact_name || '—'}</span>
            </div>
          </div>
          <p className="text-[13px] text-stone-500 mt-3">
            Update details →{' '}
            <a href="mailto:support@listhq.com.au" className="text-stone-900 underline underline-offset-2">
              support@listhq.com.au
            </a>
          </p>

          {/* Footer */}
          <p className="text-[12px] text-stone-400 text-center mt-12">
            © ListHQ Pty Ltd · Partner portal · Need help? support@listhq.com.au
          </p>
        </div>
      </div>
    </>
  );
};

export default MortgageBrokerPortal;

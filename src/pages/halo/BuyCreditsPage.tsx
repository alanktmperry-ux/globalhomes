import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Coins } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import CreditPackageCard from '@/components/halo/CreditPackageCard';
import { useTranslation } from '@/shared/lib/i18n';
import { useHaloCreditsBalance } from '@/features/halo/hooks/useHaloCreditsBalance';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_aud: number;
  stripe_price_id: string;
  active: boolean;
}

export default function BuyCreditsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const success = params.get('success') === 'true';
  const cancelled = params.get('cancelled') === 'true';
  const { balance, loading: balanceLoading } = useHaloCreditsBalance();

  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    if (success || cancelled) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('halo_credit_packages' as any)
        .select('*')
        .eq('active', true)
        .order('credits', { ascending: true });
      if (error) {
        console.error('[BuyCredits]', error);
        toast.error(t('halo.credits.loadError'));
      } else {
        setPackages((data ?? []) as unknown as CreditPackage[]);
      }
      setLoading(false);
    })();
  }, [t]);

  const handleBuy = async (pkg: CreditPackage) => {
    setBuyingId(pkg.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-credit-checkout', {
        body: { package_id: pkg.id },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error('No checkout URL returned');
      window.location.href = url;
    } catch (e: any) {
      console.error('[BuyCredits] checkout failed', e);
      const msg = String(e?.message ?? e);
      if (msg.includes('not configured')) {
        toast.error(t('halo.credits.stripeNotConfigured'));
      } else {
        toast.error(t('halo.credits.checkoutError'));
      }
      setBuyingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins size={22} /> {t('halo.credits.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('halo.credits.subtitle')}
        </p>
        <p className="text-sm font-medium mt-2">
          {t('halo.credits.currentBalance') || 'Current balance'}: {balanceLoading ? '…' : balance}
        </p>
      </div>

      {success && (
        <Alert role="alert" className="border-green-500 bg-green-50">
          <AlertDescription className="text-green-800">
            {t('halo.credits.success')}
          </AlertDescription>
        </Alert>
      )}
      {cancelled && (
        <Alert role="alert" className="border-amber-500 bg-amber-50">
          <AlertDescription className="text-amber-800">
            {t('halo.credits.cancelled')}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : packages.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          {t('halo.credits.noPackages') || 'No credit packages available right now.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {packages.map((p) => (
            <CreditPackageCard
              key={p.id}
              name={p.name}
              credits={p.credits}
              priceAud={p.price_aud}
              loading={buyingId === p.id}
              disabled={buyingId !== null && buyingId !== p.id}
              onBuy={() => handleBuy(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

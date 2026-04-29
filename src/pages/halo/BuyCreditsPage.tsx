import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Coins } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import CreditPackageCard from '@/components/halo/CreditPackageCard';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_aud: number;
  stripe_price_id: string;
  active: boolean;
}

export default function BuyCreditsPage() {
  const [params] = useSearchParams();
  const success = params.get('success') === 'true';
  const cancelled = params.get('cancelled') === 'true';

  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('halo_credit_packages' as any)
        .select('*')
        .eq('active', true)
        .order('credits', { ascending: true });
      if (error) {
        console.error('[BuyCredits]', error);
        toast.error('Failed to load credit packages.');
      } else {
        setPackages((data ?? []) as unknown as CreditPackage[]);
      }
      setLoading(false);
    })();
  }, []);

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
        toast.error('Stripe is not configured yet. Please try again soon.');
      } else {
        toast.error('Could not start checkout. Please try again.');
      }
      setBuyingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins size={22} /> Buy Halo credits
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Each credit lets you unlock one seeker's contact details on the Halo Board.
        </p>
      </div>

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <AlertDescription className="text-green-800">
            Payment successful. Your credits have been added to your account.
          </AlertDescription>
        </Alert>
      )}
      {cancelled && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertDescription className="text-amber-800">
            Payment cancelled. No charge was made.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
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
              onBuy={() => handleBuy(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

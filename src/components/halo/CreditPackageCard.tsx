import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Props {
  name: string;
  credits: number;
  priceAud: number;
  onBuy: () => void;
  loading?: boolean;
}

export function CreditPackageCard({ name, credits, priceAud, onBuy, loading }: Props) {
  const perCredit = priceAud / credits;
  return (
    <Card className="flex flex-col">
      <CardContent className="p-6 flex flex-col flex-1 gap-4">
        <div>
          <h3 className="font-semibold text-lg">{name}</h3>
          <p className="text-sm text-muted-foreground">{credits} credits</p>
        </div>
        <div className="border-t border-b py-4">
          <p className="text-3xl font-bold">${priceAud.toLocaleString('en-AU')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ${perCredit.toLocaleString('en-AU', { maximumFractionDigits: 2 })} per credit
          </p>
        </div>
        <Button
          onClick={onBuy}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white mt-auto"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Buy now
        </Button>
      </CardContent>
    </Card>
  );
}

export default CreditPackageCard;

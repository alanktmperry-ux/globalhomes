import { useState, useMemo, useEffect } from 'react';
import { useSubscription } from '@/features/agents/hooks/useSubscription';
import UpgradeGate from '@/features/agents/components/shared/UpgradeGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Calculator, Save, DollarSign, CalendarDays } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { addDays, differenceInDays, format } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 });
const STORAGE_KEY = 'gh_commission_scenario';

interface Scenario {
  salePrice: number;
  commissionRate: number;
  agencySplit: number;
  gstIncluded: boolean;
  referralFee: number;
  settlementDays: number;
  dealsPerMonth: number;
}

const DEFAULT: Scenario = {
  salePrice: 850000,
  commissionRate: 2.5,
  agencySplit: 30,
  gstIncluded: true,
  referralFee: 0,
  settlementDays: 30,
  dealsPerMonth: 3,
};

const CommissionCalculator = () => {
  const [s, setS] = useState<Scenario>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT, ...JSON.parse(saved) } : DEFAULT;
    } catch { return DEFAULT; }
  });

  const update = <K extends keyof Scenario>(key: K, val: Scenario[K]) =>
    setS(prev => ({ ...prev, [key]: val }));

  const calc = useMemo(() => {
    const gross = s.salePrice * (s.commissionRate / 100);
    const agencyAmount = gross * (s.agencySplit / 100);
    const gstAmount = s.gstIncluded ? gross / 11 : 0; // GST-inclusive means 1/11th
    const referralAmount = gross * (s.referralFee / 100);
    const net = gross - agencyAmount - gstAmount - referralAmount;
    const settlementDate = addDays(new Date(), s.settlementDays);
    const daysLeft = differenceInDays(settlementDate, new Date());

    const monthlyGci = net * s.dealsPerMonth;
    const annualGci = monthlyGci * 12;

    const chartData = Array.from({ length: 12 }, (_, i) => ({
      month: format(addDays(new Date(new Date().getFullYear(), i, 1), 0), 'MMM'),
      gci: monthlyGci,
    }));

    return { gross, agencyAmount, gstAmount, referralAmount, net, settlementDate, daysLeft, monthlyGci, annualGci, chartData };
  }, [s]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    toast.success('💾 Scenario saved — Your commission scenario has been saved');
  };

  const formatAusDate = (d: Date) => format(d, 'dd/MM/yyyy');

  const { canAccessCommission, loading: subLoading } = useSubscription();

  if (!subLoading && !canAccessCommission) {
    return <UpgradeGate requiredPlan="Pro or above" message="The Commission Calculator is available on the Pro plan and above. Calculate take-home commission, model agency splits, and project your annual GCI." />;
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="md:hidden" />
          <Calculator size={24} className="text-primary" />
          <div>
            <h1 className="text-xl font-bold">Commission Calculator</h1>
            <p className="text-sm text-muted-foreground">Model your earnings and project annual GCI</p>
          </div>
        </div>
        <Button onClick={handleSave} variant="outline" size="sm" className="gap-1.5">
          <Save size={14} /> Save Scenario
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Section 1 — Inputs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Deal Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs text-muted-foreground">Sale Price (AUD)</Label>
              <div className="relative mt-1">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  value={s.salePrice || ''}
                  onChange={e => update('salePrice', Number(e.target.value))}
                  className="pl-8"
                  placeholder="850000"
                />
              </div>
              {s.salePrice > 0 && <p className="text-[11px] text-muted-foreground mt-1">{AUD.format(s.salePrice)}</p>}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Commission Rate: {s.commissionRate}%</Label>
              <Slider
                value={[s.commissionRate]}
                onValueChange={([v]) => update('commissionRate', Math.round(v * 10) / 10)}
                min={1} max={4} step={0.1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Agency Split: {s.agencySplit}%</Label>
              <Slider
                value={[s.agencySplit]}
                onValueChange={([v]) => update('agencySplit', Math.round(v))}
                min={0} max={70} step={5}
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">GST Included (10%)</Label>
              <Switch checked={s.gstIncluded} onCheckedChange={v => update('gstIncluded', v)} />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Referral Fee: {s.referralFee}%</Label>
              <Slider
                value={[s.referralFee]}
                onValueChange={([v]) => update('referralFee', Math.round(v))}
                min={0} max={30} step={5}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Settlement in (days)</Label>
              <Input
                type="number"
                value={s.settlementDays}
                onChange={e => update('settlementDays', Math.max(0, Number(e.target.value)))}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2 — Live Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Your Earnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ResultRow label="Gross Commission" value={calc.gross} />
            <ResultRow label="Less Agency Split" value={-calc.agencyAmount} negative />
            {s.gstIncluded && <ResultRow label="Less GST" value={-calc.gstAmount} negative />}
            {s.referralFee > 0 && <ResultRow label="Less Referral Fee" value={-calc.referralAmount} negative />}

            <div className="border-t border-border pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Your Net Commission</span>
                <span className="text-2xl font-extrabold text-green-500">{AUD.format(calc.net)}</span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 mt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays size={14} className="text-primary" />
                <span>Settlement: <strong>{formatAusDate(calc.settlementDate)}</strong></span>
              </div>
              <p className="text-sm font-medium text-primary">
                Your {AUD.format(calc.net)} lands in {calc.daysLeft} day{calc.daysLeft !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3 — Annual GCI Projector */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Annual GCI Projector</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground">
              If I close <strong className="text-foreground">{s.dealsPerMonth}</strong> deal{s.dealsPerMonth !== 1 ? 's' : ''} like this per month
            </Label>
            <Slider
              value={[s.dealsPerMonth]}
              onValueChange={([v]) => update('dealsPerMonth', v)}
              min={1} max={10} step={1}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Monthly GCI</p>
              <p className="text-xl font-bold text-foreground">{AUD.format(calc.monthlyGci)}</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Annual GCI</p>
              <p className="text-xl font-bold text-primary">{AUD.format(calc.annualGci)}</p>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calc.chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
                <Tooltip formatter={(v: number) => AUD.format(v)} />
                <Bar dataKey="gci" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function ResultRow({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={negative ? 'text-red-500 font-medium' : 'font-medium'}>
        {negative ? `−${AUD.format(Math.abs(value))}` : AUD.format(value)}
      </span>
    </div>
  );
}

export default CommissionCalculator;

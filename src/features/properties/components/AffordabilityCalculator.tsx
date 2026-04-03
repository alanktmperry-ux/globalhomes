import { useState, useMemo } from 'react';
import { Calculator, DollarSign, TrendingDown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Property } from '@/shared/lib/types';

interface AffordabilityCalculatorProps {
  property: Property;
}

/**
 * Mortgage calc: M = P[r(1+r)^n] / [(1+r)^n – 1]
 */
function calcWeeklyMortgage(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n / 4.333;
  const monthlyPayment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return monthlyPayment / 4.333;
}

export function AffordabilityCalculator({ property }: AffordabilityCalculatorProps) {
  const isRental = property.listingType === 'rent' || property.listingType === 'rental' || property.price < 50000;
  const weeklyRent = property.rentalWeekly || property.price;

  // Sale calculator state
  const [depositPct, setDepositPct] = useState(20);
  const [interestRate] = useState(6.2); // current AU average
  const [loanTerm] = useState(30);

  const saleCalc = useMemo(() => {
    const deposit = property.price * (depositPct / 100);
    const principal = property.price - deposit;
    const weeklyPayment = calcWeeklyMortgage(principal, interestRate / 100, loanTerm);
    const requiredIncome = weeklyPayment / 0.3; // 30% rule
    const stampDuty = Math.round(property.price * 0.045); // ~4.5% estimate
    const totalUpfront = deposit + stampDuty;
    return { deposit, principal, weeklyPayment, requiredIncome, stampDuty, totalUpfront };
  }, [property.price, depositPct, interestRate, loanTerm]);

  // Rental calculator
  const rentalCalc = useMemo(() => {
    const requiredWeeklyGross = Math.round(weeklyRent / 0.3);
    const requiredAnnualGross = requiredWeeklyGross * 52;
    const bondEstimate = weeklyRent * 4;
    return { requiredWeeklyGross, requiredAnnualGross, bondEstimate };
  }, [weeklyRent]);

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  if (isRental) {
    return (
      <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calculator size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground text-sm">Rental Affordability</h3>
            <p className="text-[11px] text-muted-foreground">Based on the 30% income rule</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-background border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Min. Income Required</p>
            <p className="font-display font-bold text-foreground text-lg mt-1">{fmt(rentalCalc.requiredWeeklyGross)}<span className="text-xs text-muted-foreground font-normal">/wk gross</span></p>
          </div>
          <div className="p-3 rounded-xl bg-background border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Annual Income</p>
            <p className="font-display font-bold text-foreground text-lg mt-1">{fmt(rentalCalc.requiredAnnualGross)}<span className="text-xs text-muted-foreground font-normal">/yr</span></p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Bond estimate (4 weeks)</span>
            <span className="text-sm font-semibold text-foreground">{fmt(rentalCalc.bondEstimate)}</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          💡 Most landlords require your gross weekly income to be at least 3× the rent. This property needs {fmt(rentalCalc.requiredWeeklyGross)}/wk before tax.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calculator size={16} className="text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground text-sm">Can you afford this?</h3>
          <p className="text-[11px] text-muted-foreground">Estimated weekly mortgage repayment</p>
        </div>
      </div>

      {/* Weekly payment hero number */}
      <div className="text-center p-4 rounded-xl bg-background border border-border">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Est. Weekly Repayment</p>
        <p className="font-display font-bold text-3xl text-foreground">
          {fmt(saleCalc.weeklyPayment)}
          <span className="text-sm text-muted-foreground font-normal">/wk</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          at {interestRate}% over {loanTerm} years
        </p>
      </div>

      {/* Deposit slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Deposit: {depositPct}%</span>
          <span className="text-xs font-semibold text-primary">{fmt(saleCalc.deposit)}</span>
        </div>
        <Slider
          value={[depositPct]}
          onValueChange={([v]) => setDepositPct(v)}
          min={5}
          max={50}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>5%</span>
          <span>50%</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-background">
          <span className="text-xs text-muted-foreground">Loan amount</span>
          <span className="text-xs font-semibold text-foreground">{fmt(saleCalc.principal)}</span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-background">
          <span className="text-xs text-muted-foreground">Stamp duty (est.)</span>
          <span className="text-xs font-semibold text-foreground">{fmt(saleCalc.stampDuty)}</span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <span className="text-xs font-medium text-primary">Total upfront</span>
          <span className="text-xs font-bold text-primary">{fmt(saleCalc.totalUpfront)}</span>
        </div>
      </div>

      {/* Income requirement */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-1.5 mb-1">
          <DollarSign size={12} className="text-primary" />
          <span className="text-[10px] text-primary uppercase tracking-wider font-semibold">Income needed (30% rule)</span>
        </div>
        <p className="font-display font-bold text-foreground text-lg">{fmt(saleCalc.requiredIncome)}<span className="text-xs text-muted-foreground font-normal">/wk gross</span></p>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        💡 Estimates only. Adjust the deposit slider to see how it affects your weekly cost. Actual rates and fees may vary.
      </p>
    </div>
  );
}

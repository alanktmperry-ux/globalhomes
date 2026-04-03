import { useState, useMemo } from 'react';
import {
  calculateBorrowingPower, calculateRepayments, incomeRequiredForProperty,
  formatCurrency, formatRate,
} from '../lib/mortgageCalcs';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  propertyPrice: number;
  suburb: string;
  state: string;
}

export function AffordabilityWidget({ propertyPrice, suburb, state }: Props) {
  const [deposit, setDeposit]   = useState(Math.round(propertyPrice * 0.2));
  const [income, setIncome]     = useState(120_000);
  const [rate, setRate]         = useState(6.25);
  const [expanded, setExpanded] = useState(false);

  const loanAmount = propertyPrice - deposit;
  const lvr = (loanAmount / propertyPrice) * 100;

  const repayment = useMemo(() =>
    calculateRepayments({ loanAmount, interestRate: rate, loanTermYears: 30,
      loanType: 'principal_interest', frequency: 'monthly' }),
    [loanAmount, rate]
  );

  const borrowing = useMemo(() =>
    calculateBorrowingPower({
      grossAnnualIncome: income, partnerIncome: 0, otherIncome: 0,
      existingDebts: 0, livingExpenses: 0, dependants: 0,
      deposit, interestRate: rate, loanTermYears: 30,
      loanType: 'principal_interest', purpose: 'owner_occupier',
      hasExistingMortgage: false, existingMortgageBalance: 0,
    }),
    [income, deposit, rate]
  );

  const canAfford = borrowing.maxPropertyPrice >= propertyPrice;
  const requiredIncome = useMemo(() =>
    incomeRequiredForProperty(propertyPrice, deposit, rate, 30),
    [propertyPrice, deposit, rate]
  );

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent transition">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calculator className="w-4 h-4 text-primary" />
          Affordability Calculator
        </span>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          {/* Can afford indicator */}
          <div className={`text-sm font-medium rounded-xl px-3 py-2 ${
            canAfford ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {canAfford
              ? `✅ You can afford this property (max: ${formatCurrency(borrowing.maxPropertyPrice, true)})`
              : `❌ You need ${formatCurrency(requiredIncome, true)} income to afford this`
            }
          </div>

          {/* Quick inputs */}
          {[
            { label: 'Your Income', min: 50_000, max: 500_000, step: 5_000,
              value: income, setter: setIncome, fmt: (v: number) => formatCurrency(v, true) },
            { label: 'Deposit', min: 20_000, max: propertyPrice * 0.5, step: 5_000,
              value: deposit, setter: setDeposit, fmt: (v: number) => formatCurrency(v, true) },
            { label: 'Interest Rate', min: 4, max: 10, step: 0.05,
              value: rate, setter: setRate, fmt: (v: number) => `${v.toFixed(2)}%` },
          ].map(({ label, min, max, step, value, setter, fmt }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground tabular-nums">{fmt(value)}</span>
              </div>
              <input type="range" min={min} max={max} step={step}
                value={value} onChange={e => setter(Number(e.target.value))}
                className="w-full accent-primary h-1.5" />
            </div>
          ))}

          {/* Key outputs */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Monthly repayment', value: formatCurrency(repayment.monthlyRepayment) },
              { label: 'LVR', value: `${lvr.toFixed(0)}%${lvr > 80 ? ' (LMI)' : ''}` },
              { label: 'Loan amount', value: formatCurrency(loanAmount, true) },
              { label: 'Total interest', value: formatCurrency(repayment.totalInterest, true) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-accent rounded-xl p-2.5 text-center">
                <p className="text-sm font-bold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <Link to={`/mortgage-calculator?amount=${loanAmount}`}
            className="block text-center text-sm text-primary font-semibold hover:underline pt-1">
            Full mortgage calculator →
          </Link>
        </div>
      )}
    </div>
  );
}

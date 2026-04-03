import { useState, useMemo } from 'react';
import {
  calculateBorrowingPower, formatCurrency, formatRate,
  type BorrowingInputs, type LoanType
} from '../lib/mortgageCalcs';
import { Info, AlertCircle, CheckCircle } from 'lucide-react';

const DEFAULT_INPUTS: BorrowingInputs = {
  grossAnnualIncome:       100_000,
  partnerIncome:           0,
  otherIncome:             0,
  existingDebts:           0,
  livingExpenses:          0,
  dependants:              0,
  deposit:                 100_000,
  interestRate:            6.25,
  loanTermYears:           30,
  loanType:                'principal_interest',
  purpose:                 'owner_occupier',
  hasExistingMortgage:     false,
  existingMortgageBalance: 0,
};

export function BorrowingPowerCalculator() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const result = useMemo(() => calculateBorrowingPower(inputs), [inputs]);

  const set = (key: keyof BorrowingInputs, value: number | boolean | string) =>
    setInputs(prev => ({ ...prev, [key]: value }));

  const SliderInput = ({
    label, field, min, max, step = 1000, prefix = '$', suffix = '',
    format,
  }: {
    label: string; field: keyof BorrowingInputs;
    min: number; max: number; step?: number;
    prefix?: string; suffix?: string;
    format?: (v: number) => string;
  }) => {
    const val = inputs[field] as number;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {format ? format(val) : `${prefix}${val.toLocaleString()}${suffix}`}
          </span>
        </div>
        <input type="range" min={min} max={max} step={step}
          value={val} onChange={e => set(field, Number(e.target.value))}
          className="w-full accent-primary" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{format ? format(min) : `${prefix}${min.toLocaleString()}${suffix}`}</span>
          <span>{format ? format(max) : `${prefix}${max.toLocaleString()}${suffix}`}</span>
        </div>
      </div>
    );
  };

  const lvrColor = result.lvr > 95 ? 'text-destructive'
    : result.lvr > 90 ? 'text-amber-500'
    : result.lvr > 80 ? 'text-yellow-500'
    : 'text-success';

  const limitMessages = {
    income:   'Your borrowing is limited by your income. Increasing income or extending the loan term will help.',
    expenses: 'The HEM (Household Expenditure Measure) is higher than your stated expenses. Lenders use the higher figure.',
    debt:     'Existing debt repayments are reducing your borrowing power. Paying off debts first will increase your capacity.',
    deposit:  'Your deposit is relatively low (LVR > 95%). Saving more deposit will increase your borrowing power and avoid LMI.',
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Input panel */}
      <div className="space-y-6 bg-card rounded-2xl border border-border p-6">
        <div className="space-y-5">
          <SliderInput label="Gross Annual Income" field="grossAnnualIncome"
            min={30_000} max={500_000} step={5_000} />
          <SliderInput label="Partner Income" field="partnerIncome"
            min={0} max={500_000} step={5_000} />
          <SliderInput label="Deposit" field="deposit"
            min={10_000} max={2_000_000} step={5_000} />
          <SliderInput label="Interest Rate" field="interestRate"
            min={4} max={10} step={0.05} prefix="" suffix=""
            format={v => `${v.toFixed(2)}%`} />

          {/* Dependants */}
          <div>
            <span className="text-sm font-medium text-foreground">Dependants</span>
            <div className="flex gap-2 mt-2">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => set('dependants', n)}
                  className={`w-10 h-10 rounded-xl border text-sm font-semibold transition
                    ${inputs.dependants === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-muted-foreground'
                    }`}>
                  {n === 5 ? '5+' : n}
                </button>
              ))}
            </div>
          </div>

          {/* Loan type */}
          <div>
            <span className="text-sm font-medium text-foreground">Loan Type</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { value: 'principal_interest' as LoanType, label: 'Principal & Interest' },
                { value: 'interest_only' as LoanType, label: 'Interest Only' },
              ].map(opt => (
                <button key={opt.value} onClick={() => set('loanType', opt.value)}
                  className={`py-2.5 rounded-xl border text-sm font-medium transition
                    ${inputs.loanType === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-muted-foreground'
                    }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced toggle */}
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-primary hover:underline flex items-center gap-1">
          {showAdvanced ? '▲ Hide' : '▼ Show'} advanced options
        </button>

        {showAdvanced && (
          <div className="space-y-5 pt-2 border-t border-border">
            <SliderInput label="Other Income (annual)" field="otherIncome"
              min={0} max={200_000} step={2_000} />
            <SliderInput label="Monthly Living Expenses" field="livingExpenses"
              min={0} max={10_000} step={100} />
            <SliderInput label="Monthly Existing Debts" field="existingDebts"
              min={0} max={10_000} step={100} />

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={inputs.hasExistingMortgage}
                onChange={e => set('hasExistingMortgage', e.target.checked)}
                className="w-4 h-4 accent-primary" />
              <span className="text-sm text-foreground">I have an existing mortgage</span>
            </label>
            {inputs.hasExistingMortgage && (
              <SliderInput label="Existing Mortgage Balance" field="existingMortgageBalance"
                min={0} max={2_000_000} step={10_000} />
            )}
          </div>
        )}
      </div>

      {/* Results panel */}
      <div className="space-y-6">
        {/* Main result */}
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">Estimated Borrowing Power</p>
          <p className="text-5xl font-display font-extrabold text-foreground tracking-tight">
            {formatCurrency(result.maxBorrow, true)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Max property price: {formatCurrency(result.maxPropertyPrice, true)}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <p className="text-xs text-muted-foreground">Monthly repayment*</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(result.monthlyRepaymentActual)}</p>
              <p className="text-xs text-muted-foreground">at {formatRate(inputs.interestRate)} p.a.</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">LVR</p>
              <p className={`text-lg font-bold ${lvrColor}`}>
                {result.lvr.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {result.lvr <= 80 ? 'No LMI' : `LMI ~${formatCurrency(result.lmiEstimate, true)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Income breakdown */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <p className="text-sm font-semibold text-foreground mb-4">Monthly Budget Breakdown</p>
          <div className="space-y-2">
            {[
              { label: 'Net income (after tax)', value: result.netIncome, color: 'text-success' },
              { label: 'Living expenses (HEM used)', value: -result.hemUsed, color: 'text-destructive' },
              { label: 'Existing debt repayments', value: -inputs.existingDebts, color: 'text-destructive' },
              { label: 'New mortgage repayment', value: -result.monthlyRepaymentActual, color: 'text-destructive' },
              { label: 'Monthly surplus', value: result.surplusAfterRepayments, color: result.surplusAfterRepayments > 0 ? 'text-success' : 'text-destructive' },
            ].map(({ label, value, color }) => value !== 0 && (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-semibold tabular-nums ${color}`}>
                  {value > 0 ? '+' : ''}{formatCurrency(value)}
                </span>
              </div>
            ))}
          </div>
          {/* Visual bar */}
          <div className="h-2 bg-muted rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, result.netIncome > 0
                  ? ((result.netIncome - result.surplusAfterRepayments) / result.netIncome * 100)
                  : 100
                )}%`
              }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {result.netIncome > 0
              ? `${Math.round((1 - result.surplusAfterRepayments / result.netIncome) * 100)}% of net income committed`
              : ''}
          </p>
        </div>

        {/* APRA note */}
        <div className="flex gap-3 p-4 bg-accent rounded-xl">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">APRA Serviceability Buffer</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lenders assess your ability to repay at{' '}
              {formatRate(result.assessmentRate)} — your rate ({formatRate(inputs.interestRate)}) + 3% buffer.
            </p>
          </div>
        </div>

        {/* Limiting factor */}
        {result.maxBorrow > 0 && (
          <div className="flex gap-3 p-4 bg-accent rounded-xl">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">How to increase your borrowing power: </span>
              {limitMessages[result.limitingFactor]}
            </p>
          </div>
        )}

        {/* LMI warning */}
        {result.lmiEstimate > 0 && (
          <div className="flex gap-3 p-4 bg-destructive/5 rounded-xl">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">LMI applies</span> — with a {result.lvr.toFixed(0)}% LVR,
              Lender's Mortgage Insurance of approximately {formatCurrency(result.lmiEstimate)} will apply.
            </p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          * Estimate only. Based on 2024–25 tax rates and APRA guidelines. Individual lender policies vary.
        </p>
      </div>
    </div>
  );
}

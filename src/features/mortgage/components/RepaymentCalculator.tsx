import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import {
  calculateRepayments, formatCurrency, formatRate,
  type RepaymentInputs, type RepaymentFrequency,
} from '../lib/mortgageCalcs';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

const DEFAULT: RepaymentInputs = {
  loanAmount:     600_000,
  interestRate:   6.25,
  loanTermYears:  30,
  loanType:       'principal_interest',
  frequency:      'monthly',
  offsetBalance:  0,
  extraRepayment: 0,
};

export function RepaymentCalculator({ initialAmount }: { initialAmount?: number }) {
  const { t } = useTranslation();
  const [inputs, setInputs] = useState<RepaymentInputs>({
    ...DEFAULT,
    ...(initialAmount ? { loanAmount: initialAmount } : {}),
  });
  const [chartType, setChartType] = useState<'balance' | 'breakdown'>('balance');

  const FREQ_LABELS: Record<RepaymentFrequency, string> = {
    monthly:     t('mortgage.result.monthly'),
    fortnightly: t('mortgage.result.fortnightly'),
    weekly:      t('mortgage.result.weekly'),
  };

  const safeNum = (n: number) => (Number.isFinite(n) ? n : 0);

  const sanitizedInputs = useMemo<RepaymentInputs>(() => {
    const clamp = (n: number, min: number, max: number, fallback: number) =>
      Number.isFinite(n) && n >= min && n <= max ? n : fallback;
    return {
      ...inputs,
      loanAmount:     clamp(inputs.loanAmount, 1_000, 100_000_000, DEFAULT.loanAmount),
      interestRate:   clamp(inputs.interestRate, 0.01, 30, DEFAULT.interestRate),
      loanTermYears:  clamp(inputs.loanTermYears, 1, 50, DEFAULT.loanTermYears),
      offsetBalance:  Number.isFinite(inputs.offsetBalance ?? 0) && (inputs.offsetBalance ?? 0) >= 0 ? inputs.offsetBalance : 0,
      extraRepayment: Number.isFinite(inputs.extraRepayment ?? 0) && (inputs.extraRepayment ?? 0) >= 0 ? inputs.extraRepayment : 0,
    };
  }, [inputs]);

  const rawResult = useMemo(() => calculateRepayments(sanitizedInputs), [sanitizedInputs]);
  const result = useMemo(() => ({
    ...rawResult,
    periodicRepayment: safeNum(rawResult.periodicRepayment),
    totalInterest:     safeNum(rawResult.totalInterest),
    totalRepayments:   safeNum(rawResult.totalRepayments),
    interestSaving:    safeNum(rawResult.interestSaving),
    yearsEarlier:      safeNum(rawResult.yearsEarlier),
    schedule:          (rawResult.schedule || []).map(r => ({
      ...r,
      balance:   safeNum(r.balance),
      interest:  safeNum(r.interest),
      principal: safeNum(r.principal),
    })),
  }), [rawResult]);

  const set = (key: keyof RepaymentInputs, value: number | string) =>
    setInputs(prev => ({ ...prev, [key]: value }));

  const chartData = result.schedule
    .filter(r => r.period % 12 === 0 || r.period === 1)
    .map(r => ({
      year:      `Yr ${r.year}`,
      balance:   Math.round(r.balance),
      interest:  Math.round(r.interest * 12),
      principal: Math.round(r.principal * 12),
    }));

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Inputs */}
      <div className="space-y-6 bg-card rounded-2xl border border-border p-6">
        {/* Loan amount */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground">{t('mortgage.label.loanAmount')}</span>
            <span className="font-semibold text-foreground tabular-nums">{formatCurrency(inputs.loanAmount)}</span>
          </div>
          <input type="range" min={50_000} max={3_000_000} step={10_000}
            value={inputs.loanAmount} onChange={e => set('loanAmount', Number(e.target.value))}
            className="w-full accent-primary" />
        </div>

        {/* Interest rate */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground">{t('mortgage.label.interestRate')}</span>
            <span className="font-semibold text-foreground tabular-nums">{formatRate(inputs.interestRate)}</span>
          </div>
          <input type="range" min={2} max={12} step={0.05}
            value={inputs.interestRate} onChange={e => set('interestRate', Number(e.target.value))}
            className="w-full accent-primary" />
        </div>

        {/* Loan term */}
        <div>
          <span className="text-sm font-medium text-foreground">{t('mortgage.label.loanTerm')}</span>
          <div className="flex gap-2 mt-2">
            {[10, 15, 20, 25, 30].map(y => (
              <button key={y} onClick={() => set('loanTermYears', y)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition
                  ${inputs.loanTermYears === y
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:border-muted-foreground'
                  }`}>
                {y}yr
              </button>
            ))}
          </div>
        </div>

        {/* Repayment frequency */}
        <div>
          <span className="text-sm font-medium text-foreground">Repayment Frequency</span>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(Object.keys(FREQ_LABELS) as RepaymentFrequency[]).map(f => (
              <button key={f} onClick={() => set('frequency', f)}
                className={`py-2.5 rounded-xl border text-sm font-medium transition
                  ${inputs.frequency === f
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:border-muted-foreground'
                  }`}>
                {FREQ_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Offset balance */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground">Offset Account Balance</span>
            <span className="font-semibold text-foreground tabular-nums">{formatCurrency(inputs.offsetBalance ?? 0)}</span>
          </div>
          <input type="range" min={0} max={500_000} step={5_000}
            value={inputs.offsetBalance ?? 0} onChange={e => set('offsetBalance', Number(e.target.value))}
            className="w-full accent-primary" />
        </div>

        {/* Extra repayments */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-foreground">Extra Monthly Repayment</span>
            <span className="font-semibold text-foreground tabular-nums">{formatCurrency(inputs.extraRepayment ?? 0)}</span>
          </div>
          <input type="range" min={0} max={5_000} step={50}
            value={inputs.extraRepayment ?? 0} onChange={e => set('extraRepayment', Number(e.target.value))}
            className="w-full accent-primary" />
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {/* Key numbers */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{FREQ_LABELS[inputs.frequency]} Repayment</p>
              <p className="text-3xl font-display font-extrabold text-foreground mt-1">
                {formatCurrency(result.periodicRepayment)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t('mortgage.result.totalInterest')}</p>
              <p className="text-3xl font-display font-extrabold text-muted-foreground mt-1">
                {formatCurrency(result.totalInterest, true)}
              </p>
            </div>
          </div>
          {(result.interestSaving > 0 || result.yearsEarlier > 0) && (
            <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Interest Saving</p>
                <p className="text-xl font-bold text-success mt-1">
                  {formatCurrency(result.interestSaving, true)}
                </p>
                <p className="text-[10px] text-muted-foreground">vs no offset/extras</p>
              </div>
              {result.yearsEarlier > 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Loan Paid Off</p>
                  <p className="text-xl font-bold text-success mt-1">
                    {result.yearsEarlier}yr{result.yearsEarlier !== 1 ? 's' : ''} early
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Loan Balance Over Time</p>
            <div className="flex gap-1">
              {(['balance', 'breakdown'] as const).map(t => (
                <button key={t} onClick={() => setChartType(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition
                    ${chartType === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border'
                    }`}>
                  {t === 'balance' ? 'Balance' : 'P vs I'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'balance' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false} axisLine={false} width={56} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Balance']}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))"
                    fill="url(#balanceGrad)" strokeWidth={2} />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false} axisLine={false} width={56} />
                  <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name]}
                    contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="principal" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="interest" stackId="a" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total cost pill */}
        <div className="flex items-center justify-between bg-accent rounded-xl px-5 py-3">
          <span className="text-sm text-muted-foreground">{t('mortgage.result.totalRepayable')}</span>
          <span className="text-lg font-bold text-foreground">
            {formatCurrency(result.totalRepayments, true)}
          </span>
        </div>
      </div>
    </div>
  );
}

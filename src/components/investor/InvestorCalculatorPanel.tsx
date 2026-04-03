import { useState } from 'react';
import { TrendingUp, ChevronDown, ChevronUp, Info } from 'lucide-react';
import {
  calculateInvestment,
  DEFAULT_INVESTOR_ASSUMPTIONS,
  type InvestorInputs,
} from '@/lib/investorCalcs';
import { useSuburbGrowthStats } from '@/hooks/useSuburbGrowthStats';

interface Props {
  propertyId: string;
  price: number;
  estimatedWeeklyRent: number | null;
  suburb: string;
  state: string;
  isNewBuild: boolean;
  propertyAgeYears: number | null;
}

const TAX_BRACKETS = [
  { label: '$18,201–$45,000 (19%)', value: 0.19 },
  { label: '$45,001–$120,000 (32.5%)', value: 0.325 },
  { label: '$120,001–$180,000 (37%)', value: 0.37 },
  { label: '$180,001+ (45%)', value: 0.45 },
];

function formatDollars(n: number, decimals = 0) {
  return '$' + Math.abs(n).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

type ActiveTab = 'cashflow' | 'depreciation' | 'growth';

export function InvestorCalculatorPanel({
  propertyId, price, estimatedWeeklyRent, suburb, state, isNewBuild, propertyAgeYears
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('cashflow');
  const { stats: growthStats } = useSuburbGrowthStats(suburb, state);

  const [weeklyRent, setWeeklyRent] = useState(estimatedWeeklyRent ?? (growthStats?.median_rent_pw ?? 0));
  const [deposit, setDeposit] = useState(DEFAULT_INVESTOR_ASSUMPTIONS.deposit * 100);
  const [interestRate, setInterestRate] = useState(DEFAULT_INVESTOR_ASSUMPTIONS.interestRate);
  const [taxBracket, setTaxBracket] = useState(DEFAULT_INVESTOR_ASSUMPTIONS.taxBracket);
  const [bodyCorpPw, setBodyCorpPw] = useState(DEFAULT_INVESTOR_ASSUMPTIONS.weeklyBodyCorp);

  const buildValue = Math.max(0, price * 0.6);

  const inputs: InvestorInputs = {
    purchasePrice: price, weeklyRent, deposit: deposit / 100, interestRate,
    loanTermYears: 30, taxBracket, isNewBuild,
    propertyAgeYears: propertyAgeYears ?? 20, buildValue, weeklyBodyCorp: bodyCorpPw,
    weeklyInsurance: DEFAULT_INVESTOR_ASSUMPTIONS.weeklyInsurance,
    propertyManagerRate: DEFAULT_INVESTOR_ASSUMPTIONS.propertyManagerRate,
    councilRatesAnnual: DEFAULT_INVESTOR_ASSUMPTIONS.councilRatesAnnual,
    waterRatesAnnual: DEFAULT_INVESTOR_ASSUMPTIONS.waterRatesAnnual,
    maintenanceAnnual: DEFAULT_INVESTOR_ASSUMPTIONS.maintenanceAnnual,
  };

  const result = calculateInvestment(inputs);

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <TrendingUp size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-left">
            <p className="font-display font-semibold text-foreground text-sm">Investment Analysis</p>
            {!open && weeklyRent > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Gross yield: {result.grossYield.toFixed(2)}% · Weekly:{' '}
                <span className={result.weeklyCashflow >= 0 ? 'text-green-600' : 'text-destructive'}>
                  {result.weeklyCashflow >= 0 ? '+' : '-'}{formatDollars(result.weeklyCashflow)}/wk
                </span>
              </p>
            )}
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5">
          {/* Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Weekly rent ($)</label>
              <input type="number" value={weeklyRent} onChange={e => setWeeklyRent(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Deposit (%)</label>
              <input type="number" value={deposit} onChange={e => setDeposit(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Interest (%)</label>
              <input type="number" step="0.1" value={interestRate} onChange={e => setInterestRate(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tax bracket</label>
              <select value={taxBracket} onChange={e => setTaxBracket(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-amber-400">
                {TAX_BRACKETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {(['cashflow', 'depreciation', 'growth'] as ActiveTab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab ? 'border-amber-500 text-amber-700 dark:text-amber-400' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {tab === 'cashflow' ? 'Cash Flow' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Cash Flow */}
          {activeTab === 'cashflow' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-secondary text-center">
                  <p className="text-xs text-muted-foreground">Gross yield</p>
                  <p className="text-xl font-bold text-foreground">{result.grossYield.toFixed(2)}%</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary text-center">
                  <p className="text-xs text-muted-foreground">Net yield</p>
                  <p className={`text-xl font-bold ${result.netYield >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                    {result.netYield.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Weekly rent</span><span className="font-medium text-foreground">+{formatDollars(weeklyRent)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Loan repayment (P&I)</span><span className="font-medium text-foreground">-{formatDollars(result.annualLoanRepayment / 52)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Running costs (est.)</span><span className="font-medium text-foreground">-{formatDollars(result.annualCosts / 52)}</span></div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-semibold text-foreground">Weekly cash flow</span>
                  <span className={`font-bold ${result.weeklyCashflow >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {result.weeklyCashflow >= 0 ? '+' : '-'}{formatDollars(result.weeklyCashflow)}/wk
                  </span>
                </div>
              </div>

              {!result.isPositivelyGeared && result.taxSaving > 0 && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-sm font-semibold text-foreground mb-2">Negative gearing benefit</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-muted-foreground">Annual tax saving</p><p className="text-lg font-bold text-primary">{formatDollars(result.taxSaving)}/yr</p></div>
                    <div><p className="text-xs text-muted-foreground">After-tax weekly cost</p><p className="text-lg font-bold text-foreground">{formatDollars(result.netWeeklyCost)}/wk</p></div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-secondary">
                <p className="text-sm font-semibold text-foreground mb-2">Estimated upfront costs</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Deposit ({deposit}%)</span><span className="font-medium">{formatDollars(price * (deposit / 100))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Stamp duty (est.)</span><span className="font-medium">{formatDollars(result.stampDuty)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Conveyancing + fees</span><span className="font-medium">~$3,000</span></div>
                  <div className="flex justify-between border-t border-border pt-1.5"><span className="font-semibold">Total cash required</span><span className="font-bold">{formatDollars(result.totalUpfrontCost)}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Depreciation */}
          {activeTab === 'depreciation' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-secondary text-center">
                <p className="text-xs text-muted-foreground">Estimated annual depreciation</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatDollars(result.totalDepreciation)}/yr</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Saves ~{formatDollars(result.totalDepreciation * taxBracket)}/yr at your {(taxBracket * 100).toFixed(0)}% bracket
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-start p-3 rounded-xl bg-secondary">
                  <div><p className="text-sm font-medium text-foreground">Division 43 — Capital works</p><p className="text-xs text-muted-foreground">Building at 2.5%/yr</p></div>
                  <span className="font-semibold text-foreground">{formatDollars(result.depreciationDivision43)}</span>
                </div>
                <div className="flex justify-between items-start p-3 rounded-xl bg-secondary">
                  <div><p className="text-sm font-medium text-foreground">Division 40 — Plant & equipment</p><p className="text-xs text-muted-foreground">{isNewBuild ? 'New build' : 'Established'}</p></div>
                  <span className="font-semibold text-foreground">{formatDollars(result.depreciationDivision40)}</span>
                </div>
              </div>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info size={12} className="shrink-0 mt-0.5" />
                Estimates only. A quantity surveyor can prepare a full tax depreciation schedule for ~$700–$900.
              </p>
            </div>
          )}

          {/* Growth */}
          {activeTab === 'growth' && (
            <div className="space-y-4">
              {growthStats ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: '1 year', value: growthStats.growth_1yr },
                      { label: '5yr CAGR', value: growthStats.growth_5yr },
                      { label: '10yr CAGR', value: growthStats.growth_10yr },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-xl bg-secondary text-center">
                        <p className="text-[11px] text-muted-foreground">{label}</p>
                        {value != null ? (
                          <p className={`text-lg font-bold ${value >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {value > 0 ? '+' : ''}{value.toFixed(1)}%
                          </p>
                        ) : <p className="text-lg font-bold text-muted-foreground">N/A</p>}
                      </div>
                    ))}
                  </div>

                  {growthStats.growth_5yr != null && (
                    <div className="p-4 rounded-xl bg-secondary">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Projected at {growthStats.growth_5yr.toFixed(1)}% CAGR</p>
                      <div className="space-y-1.5 text-sm">
                        {[1, 5, 10].map(years => {
                          const projected = price * Math.pow(1 + (growthStats.growth_5yr ?? 5) / 100, years);
                          return (
                            <div key={years} className="flex justify-between">
                              <span className="text-muted-foreground">In {years} year{years !== 1 ? 's' : ''}</span>
                              <span className="font-medium text-foreground">{formatDollars(projected)} <span className="text-xs text-green-600">+{formatDollars(projected - price)}</span></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-secondary text-center">
                      <p className="text-xs text-muted-foreground">Suburb median rent</p>
                      <p className="text-sm font-bold text-foreground">{growthStats.median_rent_pw ? `$${growthStats.median_rent_pw}/wk` : 'N/A'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary text-center">
                      <p className="text-xs text-muted-foreground">Vacancy rate</p>
                      <p className="text-sm font-bold text-foreground">{growthStats.vacancy_rate != null ? `${growthStats.vacancy_rate.toFixed(1)}%` : 'N/A'}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <TrendingUp size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">No suburb growth data available yet</p>
                  <p className="text-xs text-muted-foreground">We're building our database of suburb stats</p>
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            All figures are estimates for illustrative purposes only. Not financial advice.
            Consult a qualified financial adviser before making investment decisions.
          </p>
        </div>
      )}
    </div>
  );
}

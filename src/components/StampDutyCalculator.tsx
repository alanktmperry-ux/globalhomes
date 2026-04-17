import { useState, useEffect } from 'react';
import { Calculator, Info, ChevronDown, ChevronUp } from 'lucide-react';
import {
  calculateStampDuty,
  detectStateFromAddress,
  STATE_LABELS,
  type AustralianState,
  type BuyerType,
} from '@/lib/stampDuty';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface Props {
  propertyPrice: number | null;
  propertyAddress: string;
  propertyState?: AustralianState | null;
}

const STATES: AustralianState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

function formatDollars(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-AU');
}

function getFIRBFee(price: number): number {
  if (price < 75000) return 4200;
  if (price < 1000000) return 13200;
  if (price < 2000000) return 26400;
  if (price < 3000000) return 52800;
  return 79200;
}

const FOREIGN_SURCHARGE: Record<AustralianState, number> = {
  NSW: 0.08, VIC: 0.08, QLD: 0.07, SA: 0.07,
  WA: 0.07, TAS: 0.08, ACT: 0.07, NT: 0,
};

export function StampDutyCalculator({ propertyPrice, propertyAddress, propertyState }: Props) {
  const [price, setPrice] = useState(propertyPrice ? String(propertyPrice) : '');
  const [state, setState] = useState<AustralianState>(() => {
    if (propertyState) return propertyState;
    return detectStateFromAddress(propertyAddress) ?? 'NSW';
  });
  const [buyerType, setBuyerType] = useState<BuyerType>('owner_occupier');
  const [isFirstHome, setIsFirstHome] = useState(false);
  const [isForeignBuyer, setIsForeignBuyer] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (propertyPrice && !price) setPrice(String(propertyPrice));
  }, [propertyPrice]);

  const numericPrice = parseFloat(price.replace(/,/g, '')) || 0;
  const result = numericPrice > 0 ? calculateStampDuty(numericPrice, state, buyerType, isFirstHome) : null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <Accordion type="single" collapsible>
        <AccordionItem value="stamp-duty" className="border-none">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Calculator size={18} className="text-primary" />
              </div>
              <div className="text-left">
                <p className="font-display text-sm font-semibold text-foreground">Stamp Duty Calculator</p>
                {result ? (
                  <p className="text-xs text-muted-foreground">Estimated duty: {formatDollars(result.duty)}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Calculate your upfront costs</p>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-4 pt-1">
              {/* Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Purchase price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => setPrice(e.target.value.replace(/[^0-9,]/g, ''))}
                      placeholder="1,200,000"
                      className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">State / Territory</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value as AustralianState)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {STATES.map((s) => (
                      <option key={s} value={s}>{STATE_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Buyer type toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">I am buying as…</label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setBuyerType('owner_occupier')}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      buyerType === 'owner_occupier'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    Owner-occupier
                  </button>
                  <button
                    onClick={() => { setBuyerType('investor'); setIsFirstHome(false); }}
                    className={`flex-1 py-2 text-xs font-medium transition-colors border-l border-border ${
                      buyerType === 'investor'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    Investor
                  </button>
                </div>
              </div>

              {/* First home buyer toggle */}
              {buyerType === 'owner_occupier' && (
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isFirstHome}
                    onClick={() => setIsFirstHome(!isFirstHome)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      isFirstHome ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${
                      isFirstHome ? 'translate-x-5' : ''
                    }`} />
                  </button>
                  <span className="text-sm text-foreground">I'm a first home buyer</span>
                </label>
              )}

              {/* Results */}
              {result && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-secondary">
                    <span className="text-sm font-medium text-foreground">Estimated stamp duty</span>
                    <span className="font-display text-xl font-bold text-foreground">{formatDollars(result.duty)}</span>
                  </div>

                  {result.fhbExemption > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-accent">
                      <span className="text-sm text-accent-foreground">🎉 FHB concession saves you</span>
                      <span className="font-semibold text-accent-foreground">{formatDollars(result.fhbExemption)}</span>
                    </div>
                  )}

                  {result.fhbGrant > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="text-sm text-primary">🏠 First Home Owner Grant</span>
                      <span className="font-semibold text-primary">+{formatDollars(result.fhbGrant)}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-secondary text-center">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Effective rate</p>
                      <p className="font-display font-bold text-foreground mt-1">{result.effectiveRate.toFixed(2)}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary text-center">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Duty payable</p>
                      <p className="font-display font-bold text-foreground mt-1">{formatDollars(result.totalCashNeeded)}</p>
                    </div>
                  </div>

                  {numericPrice > 0 && (
                    <div className="p-4 rounded-xl bg-secondary/60 border border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Estimated total upfront costs (excl. deposit)</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Stamp duty</span><span className="font-medium text-foreground">{formatDollars(result.totalCashNeeded)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Legal / conveyancing (est.)</span><span className="text-foreground">~$1,500–$3,000</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Building & pest inspection (est.)</span><span className="text-foreground">~$500–$800</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Lender fees (est.)</span><span className="text-foreground">~$500–$1,000</span></div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {showBreakdown ? 'Hide' : 'Show'} bracket breakdown
                  </button>
                  {showBreakdown && result.breakdown && (
                    <pre className="text-xs text-muted-foreground bg-secondary p-3 rounded-lg whitespace-pre-wrap font-mono">
                      {result.breakdown}
                    </pre>
                  )}

                  {result.notes.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {result.notes.map((note, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Info size={12} className="shrink-0 mt-0.5 text-primary" />
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    This estimate is for general guidance only and does not constitute financial or legal advice.
                    Rates current as of 2024. Always confirm with your solicitor or state revenue office.
                  </p>
                </div>
              )}

              {!result && numericPrice === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Enter a purchase price above to calculate
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

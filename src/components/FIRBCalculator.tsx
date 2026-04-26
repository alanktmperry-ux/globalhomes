import { useState } from 'react';
import { Globe2, ExternalLink, Info } from 'lucide-react';
import {
  calculateStampDuty,
  detectStateFromAddress,
  STATE_LABELS,
  type AustralianState,
} from '@/lib/stampDuty';
import { calculateFirbCosts, FOREIGN_SURCHARGE_RATES } from '@/lib/firb';
import { useCurrency } from '@/shared/lib/CurrencyContext';
import { useI18n } from '@/shared/lib/i18n';
import { useTranslation } from '@/shared/lib/i18n/useTranslation';

interface Props {
  propertyPrice: number | null;
  propertyAddress: string;
  propertyState?: AustralianState | null;
}

const STATES: AustralianState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

function formatAUD(n: number): string {
  return 'A$' + Math.round(n).toLocaleString('en-AU');
}

export function FIRBCalculator({ propertyPrice, propertyAddress, propertyState }: Props) {
  const { t } = useI18n();
  const { t: tp } = useTranslation();
  const { formatPrice, currency } = useCurrency();
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<AustralianState>(() => {
    if (propertyState) return propertyState;
    return detectStateFromAddress(propertyAddress) ?? 'NSW';
  });

  const price = propertyPrice ?? 0;
  const stampDuty = price > 0 ? calculateStampDuty(price, state, 'investor', false).duty : 0;
  const breakdown = price > 0 ? calculateFirbCosts(price, state, stampDuty) : null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      {/* Header with toggle */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Globe2 size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-foreground">
              {tp('property.foreignBuyer.toggle')}
            </p>
            <p className="text-xs text-muted-foreground">
              {enabled && breakdown
                ? `${t('firb.total')}: ${formatAUD(breakdown.totalLow)}+`
                : t('firb.toggle')}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            enabled ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${
              enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="p-5 space-y-4">
          {/* State selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">State / Territory</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value as AustralianState)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {STATE_LABELS[s]} — {(FOREIGN_SURCHARGE_RATES[s] * 100).toFixed(0)}%
                </option>
              ))}
            </select>
          </div>

          {breakdown ? (
            <>
              {/* Line items */}
              <div className="rounded-xl bg-secondary/60 border border-border divide-y divide-border">
                <Row label={t('firb.purchasePrice')} value={formatAUD(breakdown.purchasePrice)} />
                <Row
                  label={`${t('firb.stampDuty')} (${state})`}
                  value={formatAUD(breakdown.standardDuty)}
                />
                <Row
                  label={`${t('firb.surcharge')} ${(breakdown.surchargeRate * 100).toFixed(0)}%`}
                  value={formatAUD(breakdown.surchargeAmount)}
                  muted={breakdown.surchargeAmount === 0}
                />
                <Row label={t('firb.firbFee')} value={formatAUD(breakdown.firbFee)} />
                <Row
                  label={t('firb.legalFees')}
                  value={`${formatAUD(breakdown.legalLow)} – ${formatAUD(breakdown.legalHigh)}`}
                />
              </div>

              {/* Total */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  {t('firb.total')}
                </p>
                <p className="font-display text-xl font-bold text-foreground leading-tight">
                  {formatAUD(breakdown.totalLow)} – {formatAUD(breakdown.totalHigh)}
                </p>
                {currency.code !== 'AUD' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ≈ {formatPrice(breakdown.totalLow, 'sale')} {currency.code}
                  </p>
                )}
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
                <Info size={12} className="shrink-0 mt-0.5 text-primary" />
                <span>{t('firb.disclaimer')}</span>
              </div>

              {/* External link */}
              <a
                href="https://firb.gov.au"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                {t('firb.checkEligibility')}
                <ExternalLink size={13} />
              </a>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">
              Enter a purchase price to calculate
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className={muted ? 'text-muted-foreground' : 'text-foreground'}>{label}</span>
      <span className={`font-medium ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

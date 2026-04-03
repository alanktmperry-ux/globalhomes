export type BuyerType = 'owner_occupier' | 'investor';
export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

export interface StampDutyResult {
  duty: number;
  effectiveRate: number;
  breakdown: string;
  fhbExemption: number;
  fhbGrant: number;
  totalCashNeeded: number;
  notes: string[];
}

interface Bracket {
  min: number;
  max: number | null;
  base: number;
  rate: number;
}

function applyBrackets(price: number, brackets: Bracket[]): number {
  for (const b of brackets) {
    if (price >= b.min && (b.max === null || price <= b.max)) {
      return b.base + (price - b.min) * b.rate;
    }
  }
  return 0;
}

function formatBrackets(price: number, brackets: Bracket[]): string {
  const parts: string[] = [];
  for (const b of brackets) {
    if (price < b.min) break;
    const applicable = Math.min(price, b.max ?? price) - b.min;
    if (applicable <= 0) continue;
    const amount = applicable * b.rate + (parts.length === 0 && b.base > 0 ? b.base : 0);
    if (b.rate === 0 && b.base === 0) {
      parts.push(`$${b.min.toLocaleString()}–$${(b.max ?? price).toLocaleString()}: $0`);
    } else {
      parts.push(
        `$${b.min.toLocaleString()}–$${Math.min(price, b.max ?? price).toLocaleString()}: ${(b.rate * 100).toFixed(2)}% = $${Math.round(amount).toLocaleString()}`
      );
    }
    if (b.max === null || price <= b.max) break;
  }
  return parts.join('\n');
}

// ─── NSW ────────────────────────────────────────────────────────────────────
const NSW_BRACKETS: Bracket[] = [
  { min: 0, max: 16000, base: 0, rate: 0.0125 },
  { min: 16000, max: 35000, base: 200, rate: 0.015 },
  { min: 35000, max: 93000, base: 485, rate: 0.0175 },
  { min: 93000, max: 351000, base: 1500, rate: 0.035 },
  { min: 351000, max: 1168000, base: 10530, rate: 0.045 },
  { min: 1168000, max: null, base: 47295, rate: 0.055 },
];

function nswDuty(price: number, isFirstHome: boolean): StampDutyResult {
  const standard = applyBrackets(price, NSW_BRACKETS);
  const notes: string[] = ['NSW also offers a land tax (property tax) option for first home buyers as an alternative to stamp duty'];
  let duty = standard;
  let fhbExemption = 0;
  if (isFirstHome) {
    if (price <= 800000) { fhbExemption = standard; duty = 0; }
    else if (price <= 1000000) {
      const factor = (1000000 - price) / 200000;
      fhbExemption = Math.round(standard * factor);
      duty = standard - fhbExemption;
    }
  }
  const fhbGrant = isFirstHome && price <= 750000 ? 10000 : 0;
  return { duty, effectiveRate: price > 0 ? (duty / price) * 100 : 0, breakdown: formatBrackets(price, NSW_BRACKETS), fhbExemption, fhbGrant, totalCashNeeded: Math.max(0, duty), notes };
}

// ─── VIC ────────────────────────────────────────────────────────────────────
const VIC_BRACKETS: Bracket[] = [
  { min: 0, max: 25000, base: 0, rate: 0.014 },
  { min: 25000, max: 130000, base: 350, rate: 0.024 },
  { min: 130000, max: 960000, base: 2870, rate: 0.06 },
  { min: 960000, max: null, base: 52670, rate: 0.055 },
];

function vicDuty(price: number, isFirstHome: boolean): StampDutyResult {
  const standard = applyBrackets(price, VIC_BRACKETS);
  const notes: string[] = [];
  let duty = standard;
  let fhbExemption = 0;
  if (isFirstHome) {
    if (price <= 600000) { fhbExemption = standard; duty = 0; }
    else if (price <= 750000) {
      const factor = (750000 - price) / 150000;
      fhbExemption = Math.round(standard * factor);
      duty = standard - fhbExemption;
    }
    notes.push('Regional first home buyers may be eligible for additional VIC concessions');
  }
  const fhbGrant = isFirstHome && price <= 750000 ? 10000 : 0;
  return { duty, effectiveRate: price > 0 ? (duty / price) * 100 : 0, breakdown: formatBrackets(price, VIC_BRACKETS), fhbExemption, fhbGrant, totalCashNeeded: Math.max(0, duty), notes };
}

// ─── QLD ────────────────────────────────────────────────────────────────────
const QLD_BRACKETS: Bracket[] = [
  { min: 0, max: 5000, base: 0, rate: 0 },
  { min: 5000, max: 75000, base: 0, rate: 0.015 },
  { min: 75000, max: 540000, base: 1050, rate: 0.035 },
  { min: 540000, max: 1000000, base: 17325, rate: 0.045 },
  { min: 1000000, max: null, base: 38025, rate: 0.0575 },
];

function qldDuty(price: number, isFirstHome: boolean, buyerType: BuyerType): StampDutyResult {
  const standard = applyBrackets(price, QLD_BRACKETS);
  const notes: string[] = [];
  let duty = standard;
  let fhbExemption = 0;
  if (isFirstHome && buyerType === 'owner_occupier') {
    if (price <= 550000) {
      const dutyOnFirst350k = applyBrackets(Math.min(price, 350000), QLD_BRACKETS);
      fhbExemption = dutyOnFirst350k;
      duty = standard - fhbExemption;
    }
    notes.push('New home concessions may further reduce duty — confirm at qro.qld.gov.au');
  }
  const fhbGrant = isFirstHome && price <= 750000 ? 30000 : 0;
  return { duty: Math.max(0, duty), effectiveRate: price > 0 ? (Math.max(0, duty) / price) * 100 : 0, breakdown: formatBrackets(price, QLD_BRACKETS), fhbExemption, fhbGrant, totalCashNeeded: Math.max(0, duty), notes };
}

// ─── WA ─────────────────────────────────────────────────────────────────────
const WA_BRACKETS: Bracket[] = [
  { min: 0, max: 120000, base: 0, rate: 0.019 },
  { min: 120000, max: 150000, base: 2280, rate: 0.0285 },
  { min: 150000, max: 360000, base: 3135, rate: 0.03 },
  { min: 360000, max: 725000, base: 9435, rate: 0.0515 },
  { min: 725000, max: null, base: 28259, rate: 0.0515 },
];

function waDuty(price: number, isFirstHome: boolean): StampDutyResult {
  const standard = applyBrackets(price, WA_BRACKETS);
  const notes: string[] = [];
  let duty = standard;
  let fhbExemption = 0;
  if (isFirstHome) {
    if (price <= 430000) { fhbExemption = standard; duty = 0; }
    else if (price <= 530000) {
      const factor = (530000 - price) / 100000;
      fhbExemption = Math.round(standard * factor);
      duty = standard - fhbExemption;
    }
    notes.push('Thresholds differ for established vs new homes — confirm at wa.gov.au');
  }
  const fhbGrant = isFirstHome && price <= 750000 ? 10000 : 0;
  return { duty: Math.max(0, duty), effectiveRate: price > 0 ? (Math.max(0, duty) / price) * 100 : 0, breakdown: formatBrackets(price, WA_BRACKETS), fhbExemption, fhbGrant, totalCashNeeded: Math.max(0, duty), notes };
}

// ─── SA ─────────────────────────────────────────────────────────────────────
const SA_BRACKETS: Bracket[] = [
  { min: 0, max: 12000, base: 0, rate: 0.01 },
  { min: 12000, max: 30000, base: 120, rate: 0.02 },
  { min: 30000, max: 50000, base: 480, rate: 0.03 },
  { min: 50000, max: 100000, base: 1080, rate: 0.035 },
  { min: 100000, max: 200000, base: 2830, rate: 0.04 },
  { min: 200000, max: 250000, base: 6830, rate: 0.0425 },
  { min: 250000, max: 300000, base: 8955, rate: 0.0475 },
  { min: 300000, max: 500000, base: 11330, rate: 0.05 },
  { min: 500000, max: null, base: 21330, rate: 0.055 },
];

function saDuty(price: number, isFirstHome: boolean): StampDutyResult {
  const standard = applyBrackets(price, SA_BRACKETS);
  const notes: string[] = ['South Australia does not offer a stamp duty exemption for first home buyers'];
  const fhbGrant = isFirstHome && price <= 650000 ? 15000 : 0;
  return { duty: standard, effectiveRate: price > 0 ? (standard / price) * 100 : 0, breakdown: formatBrackets(price, SA_BRACKETS), fhbExemption: 0, fhbGrant, totalCashNeeded: standard, notes };
}

// ─── TAS ────────────────────────────────────────────────────────────────────
const TAS_BRACKETS: Bracket[] = [
  { min: 0, max: 3000, base: 50, rate: 0 },
  { min: 3000, max: 25000, base: 50, rate: 0.0175 },
  { min: 25000, max: 75000, base: 435, rate: 0.0225 },
  { min: 75000, max: 200000, base: 1560, rate: 0.035 },
  { min: 200000, max: 375000, base: 5935, rate: 0.04 },
  { min: 375000, max: 725000, base: 12935, rate: 0.0425 },
  { min: 725000, max: null, base: 27810, rate: 0.045 },
];

function tasDuty(price: number, isFirstHome: boolean): StampDutyResult {
  const standard = applyBrackets(price, TAS_BRACKETS);
  const notes: string[] = [];
  let duty = standard;
  let fhbExemption = 0;
  if (isFirstHome && price <= 400000) {
    fhbExemption = Math.round(standard * 0.5);
    duty = standard - fhbExemption;
    notes.push('50% duty concession applies to established homes ≤ $400k');
  }
  const fhbGrant = isFirstHome ? 30000 : 0;
  return { duty: Math.max(0, duty), effectiveRate: price > 0 ? (Math.max(0, duty) / price) * 100 : 0, breakdown: formatBrackets(price, TAS_BRACKETS), fhbExemption, fhbGrant, totalCashNeeded: Math.max(0, duty), notes };
}

// ─── ACT ────────────────────────────────────────────────────────────────────
const ACT_BRACKETS: Bracket[] = [
  { min: 0, max: 260000, base: 0, rate: 0.0134 },
  { min: 260000, max: 300000, base: 3484, rate: 0.02232 },
  { min: 300000, max: 500000, base: 4375, rate: 0.03680 },
  { min: 500000, max: 750000, base: 11735, rate: 0.02775 },
  { min: 750000, max: 1000000, base: 18672, rate: 0.03718 },
  { min: 1000000, max: 1455000, base: 27967, rate: 0.04398 },
  { min: 1455000, max: null, base: 47983, rate: 0.04950 },
];

function actDuty(price: number, _isFirstHome: boolean): StampDutyResult {
  const standard = applyBrackets(price, ACT_BRACKETS);
  const notes: string[] = ['ACT is progressively abolishing stamp duty. FHB concessions are means-tested — check revenue.act.gov.au'];
  return { duty: standard, effectiveRate: price > 0 ? (standard / price) * 100 : 0, breakdown: formatBrackets(price, ACT_BRACKETS), fhbExemption: 0, fhbGrant: 0, totalCashNeeded: standard, notes };
}

// ─── NT ─────────────────────────────────────────────────────────────────────
function ntDuty(price: number, isFirstHome: boolean): StampDutyResult {
  let standard: number;
  const V = price / 1000;
  if (price <= 525000) {
    standard = Math.round(0.06571441 * V * V + 15 * V);
  } else {
    standard = Math.round(price * 0.0495);
  }
  const notes: string[] = ['NT uses a non-linear formula — this is an estimate. Confirm at treasury.nt.gov.au'];
  const fhbGrant = isFirstHome && price <= 650000 ? 10000 : 0;
  return { duty: standard, effectiveRate: price > 0 ? (standard / price) * 100 : 0, breakdown: `Calculated using NT formula: (0.06571441 × V² + 15 × V) where V = price ÷ 1000`, fhbExemption: 0, fhbGrant, totalCashNeeded: standard, notes };
}

// ─── PUBLIC API ─────────────────────────────────────────────────────────────

export function calculateStampDuty(price: number, state: AustralianState, buyerType: BuyerType, isFirstHome: boolean): StampDutyResult {
  if (!price || price <= 0) {
    return { duty: 0, effectiveRate: 0, breakdown: '', fhbExemption: 0, fhbGrant: 0, totalCashNeeded: 0, notes: [] };
  }
  switch (state) {
    case 'NSW': return nswDuty(price, isFirstHome);
    case 'VIC': return vicDuty(price, isFirstHome);
    case 'QLD': return qldDuty(price, isFirstHome, buyerType);
    case 'WA': return waDuty(price, isFirstHome);
    case 'SA': return saDuty(price, isFirstHome);
    case 'TAS': return tasDuty(price, isFirstHome);
    case 'ACT': return actDuty(price, isFirstHome);
    case 'NT': return ntDuty(price, isFirstHome);
  }
}

export const STATE_LABELS: Record<AustralianState, string> = {
  NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland', WA: 'Western Australia',
  SA: 'South Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory',
};

export function detectStateFromAddress(address: string): AustralianState | null {
  const upper = address.toUpperCase();
  if (upper.includes(' NSW') || upper.includes(', NSW')) return 'NSW';
  if (upper.includes(' VIC') || upper.includes(', VIC')) return 'VIC';
  if (upper.includes(' QLD') || upper.includes(', QLD')) return 'QLD';
  if (upper.includes(' WA') || upper.includes(', WA')) return 'WA';
  if (upper.includes(' SA') || upper.includes(', SA')) return 'SA';
  if (upper.includes(' TAS') || upper.includes(', TAS')) return 'TAS';
  if (upper.includes(' ACT') || upper.includes(', ACT')) return 'ACT';
  if (upper.includes(' NT') || upper.includes(', NT')) return 'NT';
  return null;
}

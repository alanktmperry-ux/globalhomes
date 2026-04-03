// ── Types ────────────────────────────────────────────────────────────────────

export interface InvestorInputs {
  purchasePrice: number;
  weeklyRent: number;
  deposit: number;
  interestRate: number;
  loanTermYears: number;
  taxBracket: number;
  isNewBuild: boolean;
  propertyAgeYears: number;
  buildValue: number;
  weeklyBodyCorp: number;
  weeklyInsurance: number;
  propertyManagerRate: number;
  councilRatesAnnual: number;
  waterRatesAnnual: number;
  maintenanceAnnual: number;
}

export interface InvestorResult {
  grossYield: number;
  netYield: number;
  annualRent: number;
  annualCosts: number;
  annualInterest: number;
  annualLoanRepayment: number;
  annualCashflow: number;
  weeklyCashflow: number;
  isPositivelyGeared: boolean;
  taxableIncome: number;
  taxSaving: number;
  netWeeklyCost: number;
  depreciationDivision43: number;
  depreciationDivision40: number;
  totalDepreciation: number;
  loanAmount: number;
  stampDuty: number;
  totalUpfrontCost: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function monthlyRate(annualPct: number): number {
  return annualPct / 100 / 12;
}

function pAndIMonthly(principal: number, annualPct: number, years: number): number {
  const r = monthlyRate(annualPct);
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function roughStampDuty(price: number): number {
  if (price <= 351000) return price * 0.035;
  if (price <= 1168000) return 10530 + (price - 351000) * 0.045;
  return 47295 + (price - 1168000) * 0.055;
}

// ── Main Calculator ───────────────────────────────────────────────────────────

export function calculateInvestment(inputs: InvestorInputs): InvestorResult {
  const {
    purchasePrice, weeklyRent, deposit, interestRate, loanTermYears,
    taxBracket, isNewBuild, propertyAgeYears, buildValue,
    weeklyBodyCorp, weeklyInsurance, propertyManagerRate,
    councilRatesAnnual, waterRatesAnnual, maintenanceAnnual,
  } = inputs;

  const annualRent = weeklyRent * 52;
  const loanAmount = purchasePrice * (1 - deposit);
  const stampDuty = roughStampDuty(purchasePrice);
  const totalUpfrontCost = purchasePrice * deposit + stampDuty + 3000;

  const managementFee = annualRent * propertyManagerRate;
  const insurance = weeklyInsurance * 52;
  const bodyCorpAnnual = weeklyBodyCorp * 52;
  const annualCosts = managementFee + insurance + bodyCorpAnnual
    + councilRatesAnnual + waterRatesAnnual + maintenanceAnnual;

  const monthlyRepayment = pAndIMonthly(loanAmount, interestRate, loanTermYears);
  const annualLoanRepayment = monthlyRepayment * 12;
  const annualInterest = loanAmount * (interestRate / 100);

  const div43PerYear = propertyAgeYears < 40 ? buildValue * 0.025 : 0;
  const div40PerYear = isNewBuild ? 12000 : (propertyAgeYears < 10 ? 8000 : 5000);
  const totalDepreciation = div43PerYear + div40PerYear;

  const grossYield = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0;
  const netAnnualIncome = annualRent - annualCosts - annualInterest;
  const netYield = purchasePrice > 0 ? (netAnnualIncome / purchasePrice) * 100 : 0;

  const annualCashflow = annualRent - annualCosts - annualLoanRepayment;
  const weeklyCashflow = annualCashflow / 52;
  const isPositivelyGeared = annualCashflow > 0;

  const taxableIncome = annualRent - annualInterest - annualCosts - totalDepreciation;
  const taxSaving = taxableIncome < 0 ? Math.abs(taxableIncome) * taxBracket : 0;
  const netWeeklyCost = Math.abs(annualCashflow - taxSaving) / 52 * (isPositivelyGeared ? -1 : 1);

  return {
    grossYield, netYield, annualRent, annualCosts, annualInterest,
    annualLoanRepayment, annualCashflow, weeklyCashflow, isPositivelyGeared,
    taxableIncome, taxSaving, netWeeklyCost,
    depreciationDivision43: div43PerYear, depreciationDivision40: div40PerYear,
    totalDepreciation, loanAmount, stampDuty, totalUpfrontCost,
  };
}

// ── Investment Score (0–100) ─────────────────────────────────────────────────

export interface InvestmentScoreInputs {
  grossYield: number;
  suburbGrowth5yr: number | null;
  vacancyRate: number | null;
  daysOnMarket: number | null;
  isNewBuild: boolean;
}

export function investmentScore(inputs: InvestmentScoreInputs): number {
  let score = 0;
  score += Math.min(40, Math.max(0, (inputs.grossYield - 1) * 10));
  if (inputs.suburbGrowth5yr != null) {
    score += Math.min(35, Math.max(0, inputs.suburbGrowth5yr * 4));
  } else {
    score += 17;
  }
  if (inputs.vacancyRate != null) {
    score += Math.max(0, 15 - inputs.vacancyRate * 5);
  } else {
    score += 7;
  }
  if (inputs.daysOnMarket != null) {
    score += Math.max(0, 10 - inputs.daysOnMarket / 7);
  } else {
    score += 5;
  }
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'Strong investment', color: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30' };
  if (score >= 55) return { label: 'Good investment', color: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' };
  if (score >= 35) return { label: 'Average', color: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30' };
  return { label: 'Weak investment', color: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30' };
}

export const DEFAULT_INVESTOR_ASSUMPTIONS = {
  deposit: 0.20,
  interestRate: 6.5,
  loanTermYears: 30,
  taxBracket: 0.37,
  weeklyBodyCorp: 0,
  weeklyInsurance: 28,
  propertyManagerRate: 0.085,
  councilRatesAnnual: 2200,
  waterRatesAnnual: 900,
  maintenanceAnnual: 2500,
  propertyAgeYears: 20,
  isNewBuild: false,
};

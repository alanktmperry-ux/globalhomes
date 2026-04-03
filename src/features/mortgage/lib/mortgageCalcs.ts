// ─── Australian mortgage calculation constants ───────────────────────
export const ASSESSMENT_RATE_BUFFER = 0.03;   // APRA serviceability buffer (+3%)
export const HEM_MONTHLY: Record<string, number> = {
  single_0:    1_800,
  single_1:    2_400,
  single_2:    2_900,
  single_3:    3_300,
  couple_0:    2_600,
  couple_1:    3_200,
  couple_2:    3_700,
  couple_3:    4_100,
};

export type RepaymentFrequency = 'monthly' | 'fortnightly' | 'weekly';
export type LoanType = 'principal_interest' | 'interest_only';
export type PropertyPurpose = 'owner_occupier' | 'investor';

export interface BorrowingInputs {
  grossAnnualIncome: number;
  partnerIncome: number;
  otherIncome: number;
  existingDebts: number;
  livingExpenses: number;
  dependants: number;
  deposit: number;
  interestRate: number;
  loanTermYears: number;
  loanType: LoanType;
  purpose: PropertyPurpose;
  hasExistingMortgage: boolean;
  existingMortgageBalance: number;
}

export interface BorrowingResult {
  maxBorrow: number;
  maxPropertyPrice: number;
  assessmentRate: number;
  monthlyRepayment: number;
  monthlyRepaymentActual: number;
  lvr: number;
  lmiEstimate: number;
  netIncome: number;
  monthlyCommitments: number;
  surplusAfterRepayments: number;
  hemUsed: number;
  limitingFactor: 'income' | 'expenses' | 'deposit' | 'debt';
}

export interface RepaymentInputs {
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  loanType: LoanType;
  frequency: RepaymentFrequency;
  offsetBalance?: number;
  extraRepayment?: number;
}

export interface RepaymentResult {
  periodicRepayment: number;
  totalRepayments: number;
  totalInterest: number;
  monthlyRepayment: number;
  interestSaving: number;
  yearsEarlier: number;
  schedule: AmortisationRow[];
}

export interface AmortisationRow {
  period: number;
  year: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

// ─── Tax tables (2024-25 Australian resident) ────────────────────────
function incomeTax(gross: number): number {
  if (gross <= 18_200)  return 0;
  if (gross <= 45_000)  return (gross - 18_200) * 0.19;
  if (gross <= 120_000) return 5_092 + (gross - 45_000) * 0.325;
  if (gross <= 180_000) return 29_467 + (gross - 120_000) * 0.37;
  return 51_667 + (gross - 180_000) * 0.45;
}

function medicareLevy(gross: number): number {
  if (gross <= 26_000) return 0;
  return gross * 0.02;
}

export function netMonthlyIncome(grossAnnual: number): number {
  const tax = incomeTax(grossAnnual);
  const medicare = medicareLevy(grossAnnual);
  return (grossAnnual - tax - medicare) / 12;
}

// ─── LMI estimator ───────────────────────────────────────────────────
export function estimateLMI(loanAmount: number, propertyValue: number): number {
  const lvr = loanAmount / propertyValue;
  if (lvr <= 0.80) return 0;
  if (lvr <= 0.85) return loanAmount * 0.0050;
  if (lvr <= 0.90) return loanAmount * 0.0120;
  if (lvr <= 0.95) return loanAmount * 0.0230;
  return loanAmount * 0.0350;
}

// ─── Monthly P&I repayment ────────────────────────────────────────────
export function monthlyPIRepayment(
  principal: number, annualRate: number, termYears: number
): number {
  if (principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ─── Monthly interest-only repayment ─────────────────────────────────
export function monthlyIORepayment(principal: number, annualRate: number): number {
  return principal * (annualRate / 100 / 12);
}

// ─── Borrowing power ─────────────────────────────────────────────────
export function calculateBorrowingPower(inputs: BorrowingInputs): BorrowingResult {
  const {
    grossAnnualIncome, partnerIncome, otherIncome,
    existingDebts, livingExpenses, dependants,
    deposit, interestRate, loanTermYears,
    loanType, hasExistingMortgage, existingMortgageBalance,
  } = inputs;

  const assessmentRate = interestRate + ASSESSMENT_RATE_BUFFER * 100;
  const isCouple = partnerIncome > 0;

  const netPrimary = netMonthlyIncome(grossAnnualIncome);
  const netPartner = netMonthlyIncome(partnerIncome);
  const netOther   = otherIncome / 12 * 0.80;
  const totalNetMonthly = netPrimary + netPartner + netOther;

  const hemKey = `${isCouple ? 'couple' : 'single'}_${Math.min(dependants, 3)}` as keyof typeof HEM_MONTHLY;
  const hemMonthly = HEM_MONTHLY[hemKey];
  const hemUsed    = Math.max(livingExpenses || 0, hemMonthly);

  const totalCommitments = existingDebts + hemUsed +
    (hasExistingMortgage && existingMortgageBalance > 0
      ? monthlyPIRepayment(existingMortgageBalance, assessmentRate, loanTermYears)
      : 0);

  const surplus = totalNetMonthly - totalCommitments;
  if (surplus <= 0) return zeroResult(deposit, totalNetMonthly, totalCommitments, hemUsed);

  const r = assessmentRate / 100 / 12;
  const n = loanTermYears * 12;
  let maxLoanFromIncome: number;

  if (loanType === 'interest_only') {
    maxLoanFromIncome = surplus / (assessmentRate / 100 / 12);
  } else {
    maxLoanFromIncome = surplus * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
  }

  const maxBorrow = Math.floor(Math.max(0, maxLoanFromIncome) / 1000) * 1000;
  const maxPropertyPrice = maxBorrow + deposit;
  const lvr = maxPropertyPrice > 0 ? (maxBorrow / maxPropertyPrice) * 100 : 0;
  const lmiEstimate = estimateLMI(maxBorrow, maxPropertyPrice);

  const monthlyActual = loanType === 'interest_only'
    ? monthlyIORepayment(maxBorrow, interestRate)
    : monthlyPIRepayment(maxBorrow, interestRate, loanTermYears);

  const monthlyAssessment = loanType === 'interest_only'
    ? monthlyIORepayment(maxBorrow, assessmentRate)
    : monthlyPIRepayment(maxBorrow, assessmentRate, loanTermYears);

  let limitingFactor: BorrowingResult['limitingFactor'] = 'income';
  if (existingDebts > totalNetMonthly * 0.3) limitingFactor = 'debt';
  else if (hemUsed > livingExpenses && hemMonthly > livingExpenses) limitingFactor = 'expenses';
  else if (lvr > 95) limitingFactor = 'deposit';

  return {
    maxBorrow,
    maxPropertyPrice,
    assessmentRate,
    monthlyRepayment: monthlyAssessment,
    monthlyRepaymentActual: monthlyActual,
    lvr,
    lmiEstimate,
    netIncome: totalNetMonthly,
    monthlyCommitments: totalCommitments,
    surplusAfterRepayments: surplus - monthlyActual,
    hemUsed,
    limitingFactor,
  };
}

function zeroResult(
  deposit: number, netIncome: number, commitments: number, hemUsed: number
): BorrowingResult {
  return {
    maxBorrow: 0, maxPropertyPrice: deposit,
    assessmentRate: 0, monthlyRepayment: 0,
    monthlyRepaymentActual: 0, lvr: 0, lmiEstimate: 0,
    netIncome, monthlyCommitments: commitments,
    surplusAfterRepayments: 0, hemUsed,
    limitingFactor: 'expenses',
  };
}

// ─── Repayment calculator ─────────────────────────────────────────────
export function calculateRepayments(inputs: RepaymentInputs): RepaymentResult {
  const {
    loanAmount, interestRate, loanTermYears,
    loanType, frequency, offsetBalance = 0, extraRepayment = 0,
  } = inputs;

  const effectivePrincipal = Math.max(0, loanAmount - offsetBalance);
  const r   = interestRate / 100 / 12;
  const n   = loanTermYears * 12;

  const baseMonthly = loanType === 'interest_only'
    ? monthlyIORepayment(effectivePrincipal, interestRate)
    : monthlyPIRepayment(effectivePrincipal, interestRate, loanTermYears);

  const totalMonthly = baseMonthly + extraRepayment;

  const freqMultiplier = frequency === 'weekly' ? 52 / 12 / 4
    : frequency === 'fortnightly' ? 26 / 12 / 2 : 1;
  const periodicRepayment = loanType === 'interest_only'
    ? baseMonthly * freqMultiplier
    : totalMonthly * freqMultiplier;

  let balance = effectivePrincipal;
  let totalInterestPaid = 0;
  const schedule: AmortisationRow[] = [];

  for (let m = 1; m <= n && balance > 0; m++) {
    const interestPayment = balance * r;
    const principalPayment = loanType === 'interest_only'
      ? 0
      : Math.min(totalMonthly - interestPayment, balance);
    balance = Math.max(0, balance - principalPayment);
    totalInterestPaid += interestPayment;

    if (m <= 12 || m % 12 === 0) {
      schedule.push({
        period: m,
        year: Math.ceil(m / 12),
        payment: interestPayment + principalPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance,
      });
    }
    if (balance <= 0) break;
  }

  const stdMonthly  = monthlyPIRepayment(effectivePrincipal, interestRate, loanTermYears);
  const stdTotal    = stdMonthly * n;
  const stdInterest = stdTotal - effectivePrincipal;
  const interestSaving = stdInterest - totalInterestPaid;

  const actualMonths = schedule.length > 0 ? schedule[schedule.length - 1].period : n;
  const yearsEarlier = Math.max(0, Math.round((n - actualMonths) / 12 * 10) / 10);

  return {
    periodicRepayment,
    totalRepayments: totalMonthly * n,
    totalInterest: totalInterestPaid,
    monthlyRepayment: totalMonthly,
    interestSaving,
    yearsEarlier,
    schedule,
  };
}

// ─── Reverse: "how much do I need to earn?" ──────────────────────────
export function incomeRequiredForProperty(
  propertyPrice: number,
  deposit: number,
  interestRate: number,
  loanTermYears: number,
  dependants: number = 0
): number {
  const loanAmount = propertyPrice - deposit;
  const assessmentRate = interestRate + ASSESSMENT_RATE_BUFFER * 100;
  const monthlyRepayment = monthlyPIRepayment(loanAmount, assessmentRate, loanTermYears);
  const hem = HEM_MONTHLY[`single_${Math.min(dependants, 3)}` as keyof typeof HEM_MONTHLY];
  let gross = monthlyRepayment * 12 / 0.35;
  for (let i = 0; i < 20; i++) {
    const net = netMonthlyIncome(gross);
    const required = (monthlyRepayment + hem) / net;
    if (Math.abs(required - 1) < 0.001) break;
    gross = gross * (1 + (required - 1) * 0.5);
  }
  return Math.ceil(gross / 1000) * 1000;
}

// ─── Format helpers ──────────────────────────────────────────────────
export function formatCurrency(n: number, compact = false): string {
  if (compact) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}m`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  }
  return `$${Math.round(n).toLocaleString()}`;
}

export function formatRate(r: number): string {
  return `${r.toFixed(2)}%`;
}

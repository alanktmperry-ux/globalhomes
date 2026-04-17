import type { AustralianState } from './stampDuty';

// FIRB application fee schedule (residential, individual buyer, 2024-25)
// Source: firb.gov.au fee schedule
export function firbApplicationFee(price: number): number {
  if (price <= 75_000) return 2_000;
  if (price <= 1_000_000) return 13_200;
  if (price <= 2_000_000) return 26_400;
  if (price <= 3_000_000) return 52_800;
  if (price <= 4_000_000) return 79_300;
  return 106_100;
}

// Foreign Investor Duty Surcharge (additional duty on top of standard stamp duty)
export const FOREIGN_SURCHARGE_RATES: Record<AustralianState, number> = {
  NSW: 0.08,
  VIC: 0.08,
  QLD: 0.07,
  WA: 0.07,
  SA: 0.07,
  ACT: 0.06,
  NT: 0,
  TAS: 0,
};

export function foreignSurcharge(price: number, state: AustralianState): number {
  return Math.round(price * (FOREIGN_SURCHARGE_RATES[state] ?? 0));
}

// Indicative legal/conveyancing range for a foreign buyer
export const LEGAL_FEES_LOW = 2_000;
export const LEGAL_FEES_HIGH = 3_500;

export interface FirbCostBreakdown {
  purchasePrice: number;
  state: AustralianState;
  standardDuty: number;
  surchargeRate: number;
  surchargeAmount: number;
  firbFee: number;
  legalLow: number;
  legalHigh: number;
  totalLow: number;
  totalHigh: number;
}

export function calculateFirbCosts(
  price: number,
  state: AustralianState,
  standardDuty: number,
): FirbCostBreakdown {
  const surchargeAmount = foreignSurcharge(price, state);
  const firbFee = firbApplicationFee(price);
  const totalLow = price + standardDuty + surchargeAmount + firbFee + LEGAL_FEES_LOW;
  const totalHigh = price + standardDuty + surchargeAmount + firbFee + LEGAL_FEES_HIGH;
  return {
    purchasePrice: price,
    state,
    standardDuty,
    surchargeRate: FOREIGN_SURCHARGE_RATES[state] ?? 0,
    surchargeAmount,
    firbFee,
    legalLow: LEGAL_FEES_LOW,
    legalHigh: LEGAL_FEES_HIGH,
    totalLow,
    totalHigh,
  };
}

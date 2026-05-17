import { describe, it, expect } from 'vitest';
import {
  firbApplicationFee,
  foreignSurcharge,
  calculateFirbCosts,
  FOREIGN_SURCHARGE_RATES,
} from '@/lib/firb';
import { calculateStampDuty } from '@/lib/stampDuty';

describe('firbApplicationFee', () => {
  it('returns $4,200 for price below $75,000', () => {
    expect(firbApplicationFee(50_000)).toBe(4_200);
  });
  it('returns $13,200 for price between $75,000 and $1,000,000', () => {
    expect(firbApplicationFee(75_000)).toBe(13_200);
    expect(firbApplicationFee(500_000)).toBe(13_200);
    expect(firbApplicationFee(1_000_000)).toBe(13_200);
  });
  it('returns $26,400 for price between $1M and $2M', () => {
    expect(firbApplicationFee(1_500_000)).toBe(26_400);
  });
  it('returns $52,800 for price between $2M and $3M', () => {
    expect(firbApplicationFee(2_500_000)).toBe(52_800);
  });
  it('returns $79,200 for price above $3M', () => {
    expect(firbApplicationFee(5_000_000)).toBe(79_200);
  });
});

describe('foreignSurcharge', () => {
  it('calculates NSW surcharge at 8%', () => {
    expect(foreignSurcharge(1_000_000, 'NSW')).toBe(80_000);
  });
  it('calculates VIC surcharge at 8%', () => {
    expect(foreignSurcharge(500_000, 'VIC')).toBe(40_000);
  });
  it('calculates QLD surcharge at 7%', () => {
    expect(foreignSurcharge(1_000_000, 'QLD')).toBe(70_000);
  });
  it('NT has 0% surcharge', () => {
    expect(foreignSurcharge(1_000_000, 'NT')).toBe(0);
  });
});

describe('calculateFirbCosts', () => {
  it('produces correct totals for a $1M NSW purchase', () => {
    const duty = calculateStampDuty(1_000_000, 'NSW');
    const result = calculateFirbCosts(1_000_000, 'NSW', duty);
    expect(result.purchasePrice).toBe(1_000_000);
    expect(result.firbFee).toBe(13_200);
    expect(result.surchargeRate).toBe(FOREIGN_SURCHARGE_RATES['NSW']);
    expect(result.surchargeAmount).toBe(80_000);
    expect(result.totalLow).toBe(1_000_000 + duty + 80_000 + 13_200 + 2_000);
    expect(result.totalHigh).toBe(1_000_000 + duty + 80_000 + 13_200 + 3_500);
    expect(result.totalLow).toBeLessThan(result.totalHigh);
  });
});

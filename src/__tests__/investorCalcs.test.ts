import { describe, it, expect } from 'vitest';
import { calculateInvestment, investmentScore, scoreLabel, DEFAULT_INVESTOR_ASSUMPTIONS } from '@/lib/investorCalcs';

const BASE_INPUTS = {
  ...DEFAULT_INVESTOR_ASSUMPTIONS,
  purchasePrice: 800_000,
  weeklyRent: 600,
  buildValue: 400_000,
};

describe('calculateInvestment', () => {
  it('gross yield is annualRent / purchasePrice * 100', () => {
    const r = calculateInvestment(BASE_INPUTS);
    expect(r.grossYield).toBeCloseTo((600 * 52 / 800_000) * 100, 2);
  });
  it('positive cashflow when rent exceeds repayments + costs', () => {
    const r = calculateInvestment({ ...BASE_INPUTS, weeklyRent: 2_000 });
    expect(r.isPositivelyGeared).toBe(true);
  });
  it('negative cashflow on low yield property', () => {
    const r = calculateInvestment({ ...BASE_INPUTS, weeklyRent: 200 });
    expect(r.isPositivelyGeared).toBe(false);
  });
  it('loanAmount equals purchasePrice * (1 - deposit)', () => {
    const r = calculateInvestment(BASE_INPUTS);
    expect(r.loanAmount).toBeCloseTo(800_000 * (1 - DEFAULT_INVESTOR_ASSUMPTIONS.deposit), 0);
  });
  it('NT surcharge is 0 when no depreciation applies', () => {
    const r = calculateInvestment({ ...BASE_INPUTS, propertyAgeYears: 50, isNewBuild: false });
    expect(r.depreciationDivision43).toBe(0);
  });
  it('new build gets higher div40 depreciation', () => {
    const newBuild = calculateInvestment({ ...BASE_INPUTS, isNewBuild: true });
    const oldBuild = calculateInvestment({ ...BASE_INPUTS, isNewBuild: false, propertyAgeYears: 20 });
    expect(newBuild.depreciationDivision40).toBeGreaterThan(oldBuild.depreciationDivision40);
  });
});

describe('investmentScore', () => {
  it('scores 0 for very poor investment', () => {
    const s = investmentScore({ grossYield: 0, suburbGrowth5yr: 0, vacancyRate: 20, daysOnMarket: 200, isNewBuild: false });
    expect(s).toBe(0);
  });
  it('scores 100 for exceptional investment', () => {
    const s = investmentScore({ grossYield: 10, suburbGrowth5yr: 15, vacancyRate: 0, daysOnMarket: 0, isNewBuild: true });
    expect(s).toBe(100);
  });
  it('uses midpoint defaults when data is null', () => {
    const withData = investmentScore({ grossYield: 5, suburbGrowth5yr: 5, vacancyRate: 2, daysOnMarket: 30, isNewBuild: false });
    const withNulls = investmentScore({ grossYield: 5, suburbGrowth5yr: null, vacancyRate: null, daysOnMarket: null, isNewBuild: false });
    expect(withNulls).toBeGreaterThan(0);
    expect(withNulls).toBeLessThan(100);
  });
  it('result is always between 0 and 100', () => {
    const s = investmentScore({ grossYield: 50, suburbGrowth5yr: 100, vacancyRate: -5, daysOnMarket: -10, isNewBuild: true });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe('scoreLabel', () => {
  it('returns Strong investment for score >= 75', () => {
    expect(scoreLabel(75).label).toBe('Strong investment');
    expect(scoreLabel(100).label).toBe('Strong investment');
  });
  it('returns Weak investment for score < 35', () => {
    expect(scoreLabel(34).label).toBe('Weak investment');
    expect(scoreLabel(0).label).toBe('Weak investment');
  });
});

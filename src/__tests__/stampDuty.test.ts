import { describe, it, expect } from 'vitest';
import { calculateStampDuty } from '@/lib/stampDuty';

/**
 * NSW progressive stamp duty brackets (from src/lib/stampDuty.ts):
 *   $351,000–$1,168,000  →  $10,530 + 4.5% on excess over $351,000
 *   $1,168,000+          →  $47,295 + 5.5% on excess over $1,168,000
 *
 * Tests use buyerType='investor' and isFirstHome=false to isolate the
 * standard duty calculation (no FHB concessions / grants applied).
 */
describe('Stamp duty calculator — NSW baseline', () => {
  it('$500,000 property → falls in the $351k–$1.168M bracket', () => {
    // 10530 + (500000 - 351000) * 0.045 = 17,235
    const r = calculateStampDuty(500_000, 'NSW', 'investor', false);
    expect(r.duty).toBeCloseTo(17_235, 2);
    expect(r.fhbExemption).toBe(0);
    expect(r.fhbGrant).toBe(0);
    expect(r.effectiveRate).toBeCloseTo((17_235 / 500_000) * 100, 4);
  });

  it('$850,000 property → mid-bracket calculation', () => {
    // 10530 + (850000 - 351000) * 0.045 = 32,985
    const r = calculateStampDuty(850_000, 'NSW', 'investor', false);
    expect(r.duty).toBeCloseTo(32_985, 2);
  });

  it('$1,500,000 property → top bracket above $1.168M', () => {
    // 47295 + (1500000 - 1168000) * 0.055 = 65,555
    const r = calculateStampDuty(1_500_000, 'NSW', 'investor', false);
    expect(r.duty).toBeCloseTo(65_555, 2);
  });

  it('returns zero duty for non-positive prices', () => {
    expect(calculateStampDuty(0, 'NSW', 'investor', false).duty).toBe(0);
  });
});

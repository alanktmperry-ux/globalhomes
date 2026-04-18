import { describe, it, expect } from 'vitest';

/**
 * Mirrors the commission calculation used in
 * src/features/agents/components/dashboard/listing-tabs/ListingAccountingTab.tsx
 *
 * Formula:
 *   totalCommission = salePrice * (commissionRate / 100)
 *   gst             = totalCommission * 0.1            // 10% Australian GST
 *   commissionExGst = totalCommission - gst
 *   agencyShare     = commissionExGst * ((100 - agentSplit) / 100)
 *   agentShare      = commissionExGst * (agentSplit / 100)
 */
function calcCommission(salePrice: number, commissionRate: number, agentSplit: number) {
  const totalCommission = salePrice * (commissionRate / 100);
  const gst = totalCommission * 0.1;
  const commissionExGst = totalCommission - gst;
  const agencyShare = commissionExGst * ((100 - agentSplit) / 100);
  const agentShare = commissionExGst * (agentSplit / 100);
  return { totalCommission, gst, commissionExGst, agencyShare, agentShare };
}

describe('Trust accounting / settlement commission calculation', () => {
  it('Scenario 1 — $800,000 sale, 2.5% commission, 60/40 agent split', () => {
    const r = calcCommission(800_000, 2.5, 60);
    expect(r.totalCommission).toBeCloseTo(20_000, 2);
    expect(r.gst).toBeCloseTo(2_000, 2);
    expect(r.commissionExGst).toBeCloseTo(18_000, 2);
    expect(r.agentShare).toBeCloseTo(10_800, 2);
    expect(r.agencyShare).toBeCloseTo(7_200, 2);
    expect(r.agentShare + r.agencyShare).toBeCloseTo(r.commissionExGst, 2);
  });

  it('Scenario 2 — $1,200,000 sale, 2% commission, 50/50 split', () => {
    const r = calcCommission(1_200_000, 2, 50);
    expect(r.totalCommission).toBeCloseTo(24_000, 2);
    expect(r.gst).toBeCloseTo(2_400, 2);
    expect(r.commissionExGst).toBeCloseTo(21_600, 2);
    expect(r.agentShare).toBeCloseTo(10_800, 2);
    expect(r.agencyShare).toBeCloseTo(10_800, 2);
  });

  it('Scenario 3 — $600,000 sale, 3% commission, 70/30 split', () => {
    const r = calcCommission(600_000, 3, 70);
    expect(r.totalCommission).toBeCloseTo(18_000, 2);
    expect(r.gst).toBeCloseTo(1_800, 2);
    expect(r.commissionExGst).toBeCloseTo(16_200, 2);
    expect(r.agentShare).toBeCloseTo(11_340, 2);
    expect(r.agencyShare).toBeCloseTo(4_860, 2);
    expect(r.agentShare + r.agencyShare + r.gst).toBeCloseTo(r.totalCommission, 2);
  });
});

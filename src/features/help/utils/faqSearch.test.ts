import { describe, expect, it } from 'vitest';
import { getFaqMatches } from './faqSearch';

describe('getFaqMatches', () => {
  it('surfaces rental-related FAQs for short rent queries', () => {
    const matches = getFaqMatches('rent');
    const ids = matches.map((item) => item.id);

    expect(matches.length).toBeGreaterThanOrEqual(6);
    expect(ids).toContain('renter-search');
    expect(ids).toContain('renter-apply');
    expect(ids).toContain('agent-rental-pm');
    expect(matches.filter((item) => item.category === 'renters').length).toBeGreaterThanOrEqual(3);
    expect(matches[0]?.id).toBe('renter-search');
  });

  it('matches related tenancy language', () => {
    const ids = getFaqMatches('tenancy').map((item) => item.id);

    expect(ids).toContain('renter-documents');
    expect(ids).toContain('renter-apply');
  });
});

import { describe, it, expect } from 'vitest';
import { isInsidePolygon, haversineDistance } from '@/shared/lib/geoUtils';

const SQUARE: [number, number][] = [
  [0, 0], [0, 1], [1, 1], [1, 0],
];

describe('isInsidePolygon', () => {
  it('returns true for point inside square', () => {
    expect(isInsidePolygon(0.5, 0.5, SQUARE)).toBe(true);
  });
  it('returns false for point outside square', () => {
    expect(isInsidePolygon(2, 2, SQUARE)).toBe(false);
  });
  it('returns false for point outside on one axis', () => {
    expect(isInsidePolygon(0.5, 2, SQUARE)).toBe(false);
  });
});

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance(-33.8688, 151.2093, -33.8688, 151.2093)).toBe(0);
  });
  it('Sydney to Melbourne is roughly 714km', () => {
    const d = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631);
    expect(d).toBeGreaterThan(700);
    expect(d).toBeLessThan(730);
  });
  it('returns a positive number for any two distinct points', () => {
    expect(haversineDistance(-27.4698, 153.0251, -31.9505, 115.8605)).toBeGreaterThan(0);
  });
});

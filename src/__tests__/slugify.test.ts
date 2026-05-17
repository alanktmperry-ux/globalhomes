import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/slugify';

describe('slugify', () => {
  it('lowercases text', () => expect(slugify('Hello World')).toBe('hello-world'));
  it('replaces spaces with hyphens', () => expect(slugify('foo bar baz')).toBe('foo-bar-baz'));
  it('collapses multiple spaces', () => expect(slugify('foo  bar')).toBe('foo-bar'));
  it('strips special characters', () => expect(slugify('123 Main St, Surry Hills NSW')).toBe('123-main-st-surry-hills-nsw'));
  it('strips leading and trailing hyphens', () => expect(slugify(' hello ')).toBe('hello'));
  it('handles empty string', () => expect(slugify('')).toBe(''));
  it('collapses multiple hyphens', () => expect(slugify('a--b')).toBe('a-b'));
});

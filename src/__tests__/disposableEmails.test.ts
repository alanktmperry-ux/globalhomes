import { describe, it, expect } from 'vitest';
import { isDisposableEmail } from '@/shared/lib/disposableEmails';

describe('isDisposableEmail', () => {
  it('returns true for known disposable domains', () => {
    expect(isDisposableEmail('user@mailinator.com')).toBe(true);
    expect(isDisposableEmail('user@guerrillamail.com')).toBe(true);
  });
  it('returns false for legitimate email providers', () => {
    expect(isDisposableEmail('user@gmail.com')).toBe(false);
    expect(isDisposableEmail('user@outlook.com')).toBe(false);
    expect(isDisposableEmail('agent@raywhite.com.au')).toBe(false);
  });
  it('is case-insensitive', () => {
    expect(isDisposableEmail('user@Mailinator.COM')).toBe(true);
  });
  it('returns false for empty string', () => {
    expect(isDisposableEmail('')).toBe(false);
  });
  it('returns false for string without @', () => {
    expect(isDisposableEmail('notanemail')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, safeEqual } from './crypto.js';

const KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('encryptSecret / decryptSecret', () => {
  it('round-trips plaintext', () => {
    const encrypted = encryptSecret('super-secret', KEY);
    expect(encrypted).not.toContain('super-secret');
    expect(decryptSecret(encrypted, KEY)).toBe('super-secret');
  });

  it('produces different ciphertexts for same input', () => {
    const a = encryptSecret('same', KEY);
    const b = encryptSecret('same', KEY);
    expect(a).not.toBe(b);
  });

  it('rejects invalid key length', () => {
    expect(() => encryptSecret('x', 'short')).toThrow(/64-character/);
  });
});

describe('safeEqual', () => {
  it('compares equal strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
  });
});

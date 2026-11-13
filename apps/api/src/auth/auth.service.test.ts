import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema, passwordSchema } from '@autobi/contracts';

describe('auth DTO validation', () => {
  it('accepts strong registration passwords', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Password123',
      name: 'User',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short or weak passwords', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('alllowercase1').success).toBe(false);
    expect(passwordSchema.safeParse('ALLUPPERCASE1').success).toBe(false);
    expect(passwordSchema.safeParse('NoDigitsHere').success).toBe(false);
  });

  it('requires email for login', () => {
    const result = loginSchema.safeParse({ email: 'bad', password: 'x' });
    expect(result.success).toBe(false);
  });
});

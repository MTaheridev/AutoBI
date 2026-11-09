import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema } from '@autobi/contracts';

describe('auth DTO validation', () => {
  it('accepts valid registration', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: 'User',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short passwords', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('requires email for login', () => {
    const result = loginSchema.safeParse({ email: 'bad', password: 'x' });
    expect(result.success).toBe(false);
  });
});

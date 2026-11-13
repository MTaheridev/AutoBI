import { describe, expect, it } from 'vitest';
import { hasSessionCookie, isPublicPath } from './auth-gate.js';

describe('auth-gate', () => {
  it('requires signed cookie shape', () => {
    expect(hasSessionCookie([{ name: 'autobi_session', value: 's:abc.sig' }])).toBe(true);
    expect(hasSessionCookie([{ name: 'autobi_session', value: 'unsigned' }])).toBe(false);
    expect(hasSessionCookie([{ name: 'other', value: 's:x' }])).toBe(false);
  });

  it('knows public paths', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/verify-email')).toBe(true);
    expect(isPublicPath('/invite')).toBe(true);
    expect(isPublicPath('/workspace/data-sources')).toBe(false);
  });
});

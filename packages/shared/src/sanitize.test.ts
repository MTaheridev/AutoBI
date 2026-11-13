import { describe, expect, it } from 'vitest';
import { classifyClientError, sanitizeClientError } from './sanitize.js';

describe('classifyClientError', () => {
  it('detects auth failures', () => {
    expect(classifyClientError(new Error('password authentication failed for user'))).toBe(
      'auth',
    );
    expect(classifyClientError(new Error('Access denied for user'))).toBe('auth');
    expect(classifyClientError(new Error('Login failed for user'))).toBe('auth');
  });

  it('detects unreachable hosts', () => {
    expect(classifyClientError(Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }))).toBe(
      'unreachable',
    );
    expect(classifyClientError(new Error('getaddrinfo ENOTFOUND db.example'))).toBe('unreachable');
  });

  it('detects tls issues', () => {
    expect(classifyClientError(new Error('self signed certificate in certificate chain'))).toBe(
      'tls',
    );
  });

  it('detects host policy blocks', () => {
    expect(classifyClientError(new Error('Private host blocked; set DB_HOST_ALLOW_PRIVATE'))).toBe(
      'host_blocked',
    );
  });
});

describe('sanitizeClientError', () => {
  it('returns categorized human messages', () => {
    expect(sanitizeClientError(new Error('password authentication failed'), 'Connection failed')).toBe(
      'Authentication failed — check username and password',
    );
    expect(
      sanitizeClientError(Object.assign(new Error('x'), { code: 'ETIMEDOUT' }), 'Connection failed'),
    ).toBe('Host unreachable — check host, port, and firewall');
  });

  it('uses fallback for unknown errors', () => {
    expect(sanitizeClientError(new Error('weird internal stack'), 'Connection failed')).toBe(
      'Connection failed',
    );
  });

  it('preserves already-safe messages', () => {
    expect(sanitizeClientError('Connection failed', 'Connection failed')).toBe('Connection failed');
  });
});

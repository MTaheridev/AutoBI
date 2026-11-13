import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { csrfOriginMiddleware } from './csrf.middleware.js';

vi.mock('@autobi/config', () => ({
  loadEnv: () => ({
    API_CORS_ORIGIN: 'http://localhost:3100',
    NODE_ENV: 'production',
  }),
}));

function mockRes() {
  return {} as never;
}

describe('csrfOriginMiddleware', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('allows safe methods without origin', () => {
    const next = vi.fn();
    csrfOriginMiddleware(
      { method: 'GET', headers: {} } as never,
      mockRes(),
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('allows matching origin on POST', () => {
    const next = vi.fn();
    csrfOriginMiddleware(
      {
        method: 'POST',
        headers: { origin: 'http://localhost:3100' },
      } as never,
      mockRes(),
      next,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects mismatched origin on POST in production', () => {
    const next = vi.fn();
    csrfOriginMiddleware(
      {
        method: 'POST',
        headers: { origin: 'https://evil.example' },
      } as never,
      mockRes(),
      next,
    );
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });
});

import { describe, expect, it } from 'vitest';
import { assertSafeDbHost } from './host-guard.js';

describe('assertSafeDbHost', () => {
  it('allows public IP literals', async () => {
    await expect(assertSafeDbHost('8.8.8.8')).resolves.toBeUndefined();
  });

  it('allows public hostnames whose DNS is public', async () => {
    await expect(
      assertSafeDbHost('db.example.com', {
        resolve: async () => [{ address: '8.8.8.8', family: 4 }],
      }),
    ).resolves.toBeUndefined();
  });

  it('blocks metadata and private IPs by default', async () => {
    await expect(assertSafeDbHost('169.254.169.254')).rejects.toThrow(/not allowed/);
    await expect(assertSafeDbHost('127.0.0.1')).rejects.toThrow(/not allowed/);
    await expect(assertSafeDbHost('10.0.0.5')).rejects.toThrow(/not allowed/);
    await expect(assertSafeDbHost('localhost')).rejects.toThrow(/not allowed/);
  });

  it('blocks hostnames that resolve to private IPs', async () => {
    await expect(
      assertSafeDbHost('evil.example.com', {
        resolve: async () => [{ address: '10.0.0.5', family: 4 }],
      }),
    ).rejects.toThrow(/not allowed/);
  });

  it('blocks hostnames that resolve to metadata IPs even with allowPrivate', async () => {
    await expect(
      assertSafeDbHost('meta.example.com', {
        allowPrivate: true,
        resolve: async () => [{ address: '169.254.169.254', family: 4 }],
      }),
    ).rejects.toThrow(/not allowed/);
  });

  it('allows private hosts when opted in', async () => {
    await expect(
      assertSafeDbHost('10.0.0.5', { allowPrivate: true }),
    ).resolves.toBeUndefined();
    await expect(
      assertSafeDbHost('localhost', {
        allowPrivate: true,
        resolve: async () => [{ address: '127.0.0.1', family: 4 }],
      }),
    ).resolves.toBeUndefined();
  });

  it('always blocks link-local / metadata even with allowPrivate', async () => {
    await expect(
      assertSafeDbHost('169.254.169.254', { allowPrivate: true }),
    ).rejects.toThrow(/not allowed/);
    await expect(
      assertSafeDbHost('169.254.1.1', { allowPrivate: true }),
    ).rejects.toThrow(/not allowed/);
  });
});

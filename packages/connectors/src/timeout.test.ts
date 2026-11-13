import { describe, expect, it } from 'vitest';
import { withQueryTimeout } from './timeout.js';

describe('withQueryTimeout', () => {
  it('resolves when under the limit', async () => {
    await expect(
      withQueryTimeout(Promise.resolve('ok'), 1000),
    ).resolves.toBe('ok');
  });

  it('rejects when timed out', async () => {
    await expect(
      withQueryTimeout(
        new Promise((resolve) => setTimeout(() => resolve('late'), 50)),
        10,
      ),
    ).rejects.toThrow(/timed out/);
  });
});

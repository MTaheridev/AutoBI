import { describe, expect, it } from 'vitest';
import { connectionConfigSchema, createDataSourceSchema } from './data-source.js';

describe('connectionConfigSchema', () => {
  it('accepts valid config', () => {
    const result = connectionConfigSchema.safeParse({
      host: 'localhost',
      port: 5432,
      database: 'demo',
      username: 'user',
      password: 'secret',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing password', () => {
    const result = connectionConfigSchema.safeParse({
      host: 'localhost',
      port: 5432,
      database: 'demo',
      username: 'user',
    });
    expect(result.success).toBe(false);
  });
});

describe('createDataSourceSchema', () => {
  it('requires workspaceId and type', () => {
    const result = createDataSourceSchema.safeParse({
      workspaceId: 'not-a-uuid',
      name: 'DB',
      type: 'postgresql',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'demo',
        username: 'user',
        password: 'secret',
      },
    });
    expect(result.success).toBe(false);
  });
});

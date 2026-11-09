import { describe, expect, it } from 'vitest';
import { registerBuiltinConnectors } from './index.js';
import { connectorRegistry } from './registry.js';

describe('connectorRegistry', () => {
  it('registers all four connectors', () => {
    registerBuiltinConnectors();
    const types = connectorRegistry.list().sort();
    expect(types).toEqual(['mariadb', 'mysql', 'postgresql', 'sqlserver']);
  });

  it('creates connector instances', () => {
    registerBuiltinConnectors();
    const pg = connectorRegistry.create('postgresql');
    expect(pg.type).toBe('postgresql');
  });
});

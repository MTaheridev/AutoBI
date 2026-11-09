import { describe, expect, it } from 'vitest';
import { registerBuiltinConnectors, connectorRegistry } from './index.js';

const runIntegration = process.env.RUN_CONNECTOR_INTEGRATION === '1';

describe.skipIf(!runIntegration)('connector integration', () => {
  registerBuiltinConnectors();

  it('introspects PostgreSQL test instance', async () => {
    const connector = connectorRegistry.create('postgresql');
    const config = {
      host: process.env.PG_TEST_HOST ?? 'localhost',
      port: Number(process.env.PG_TEST_PORT ?? 5433),
      database: process.env.PG_TEST_DB ?? 'autobi_test',
      username: process.env.PG_TEST_USER ?? 'autobi',
      password: process.env.PG_TEST_PASSWORD ?? 'autobi',
      schema: 'public',
    };

    const test = await connector.testConnection(config);
    expect(test.ok).toBe(true);

    await connector.connect(config);
    try {
      const result = await connector.introspect();
      expect(result.schemas.some((s) => s.name === 'public')).toBe(true);
    } finally {
      await connector.close();
    }
  });

  it('introspects MySQL test instance', async () => {
    const connector = connectorRegistry.create('mysql');
    const config = {
      host: process.env.MYSQL_TEST_HOST ?? 'localhost',
      port: Number(process.env.MYSQL_TEST_PORT ?? 3307),
      database: process.env.MYSQL_TEST_DB ?? 'autobi_test',
      username: process.env.MYSQL_TEST_USER ?? 'autobi',
      password: process.env.MYSQL_TEST_PASSWORD ?? 'autobi',
    };

    const test = await connector.testConnection(config);
    expect(test.ok).toBe(true);
    await connector.connect(config);
    try {
      const result = await connector.introspect();
      expect(result.schemas.length).toBeGreaterThan(0);
    } finally {
      await connector.close();
    }
  });

  it('introspects MariaDB test instance', async () => {
    const connector = connectorRegistry.create('mariadb');
    const config = {
      host: process.env.MARIADB_TEST_HOST ?? 'localhost',
      port: Number(process.env.MARIADB_TEST_PORT ?? 3308),
      database: process.env.MARIADB_TEST_DB ?? 'autobi_test',
      username: process.env.MARIADB_TEST_USER ?? 'autobi',
      password: process.env.MARIADB_TEST_PASSWORD ?? 'autobi',
    };

    const test = await connector.testConnection(config);
    expect(test.ok).toBe(true);
    expect(test.message.toLowerCase()).toContain('mariadb');
    await connector.connect(config);
    try {
      const result = await connector.introspect();
      expect(result.schemas.length).toBeGreaterThan(0);
    } finally {
      await connector.close();
    }
  });

  it('introspects SQL Server test instance', async () => {
    const connector = connectorRegistry.create('sqlserver');
    const config = {
      host: process.env.MSSQL_TEST_HOST ?? 'localhost',
      port: Number(process.env.MSSQL_TEST_PORT ?? 1433),
      database: process.env.MSSQL_TEST_DB ?? 'master',
      username: process.env.MSSQL_TEST_USER ?? 'sa',
      password: process.env.MSSQL_TEST_PASSWORD ?? 'AutoBI_Test_123',
      schema: 'dbo',
      ssl: true,
    };

    const test = await connector.testConnection(config);
    expect(test.ok).toBe(true);
    await connector.connect(config);
    try {
      const result = await connector.introspect();
      expect(result.schemas.some((s) => s.name === 'dbo')).toBe(true);
    } finally {
      await connector.close();
    }
  });
});

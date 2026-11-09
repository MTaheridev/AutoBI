import { MySqlFamilyConnector } from './mysql-base.js';
import type {
  ConnectionConfig,
  ConnectionTestResult,
  ConnectorFactory,
  DatabaseSchema,
} from './types.js';

/**
 * MariaDB uses mysql2 with a dedicated adapter so dialect differences
 * (version strings, schema filtering) stay isolated and testable.
 */
export class MariaDBConnector extends MySqlFamilyConnector {
  constructor() {
    super('mariadb');
  }

  override async testConnection(config: ConnectionConfig): Promise<ConnectionTestResult> {
    const result = await super.testConnection(config);
    if (!result.ok) return result;
    const version = result.serverVersion ?? '';
    const isMaria = /mariadb/i.test(version);
    return {
      ...result,
      message: isMaria
        ? 'Connection successful (MariaDB detected)'
        : 'Connection successful (MySQL-compatible server; MariaDB not detected in version string)',
    };
  }

  override async getSchemas(): Promise<DatabaseSchema[]> {
    const schemas = await super.getSchemas();
    // MariaDB may expose additional system schemas in some installs
    return schemas.filter(
      (s) => !['mysql', 'information_schema', 'performance_schema', 'sys'].includes(s.name),
    );
  }
}

export const mariadbFactory: ConnectorFactory = {
  type: 'mariadb',
  create: () => new MariaDBConnector(),
};

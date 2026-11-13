import { connectorRegistry } from './registry.js';
import { postgresqlFactory } from './postgresql.js';
import { mysqlFactory } from './mysql.js';
import { mariadbFactory } from './mariadb.js';
import { sqlserverFactory } from './sqlserver.js';

let registered = false;

export function registerBuiltinConnectors(): void {
  if (registered) return;
  connectorRegistry.register(postgresqlFactory);
  connectorRegistry.register(mysqlFactory);
  connectorRegistry.register(mariadbFactory);
  connectorRegistry.register(sqlserverFactory);
  registered = true;
}

export * from './types.js';
export * from './registry.js';
export * from './normalize.js';
export * from './ssl.js';
export * from './timeout.js';
export * from './pool.js';
export * from './infer-relationships.js';
export { postgresqlFactory } from './postgresql.js';
export { mysqlFactory } from './mysql.js';
export { mariadbFactory } from './mariadb.js';
export { sqlserverFactory } from './sqlserver.js';

import type { ConnectionConfig } from './types.js';

/** Postgres/node-pg ssl option. Strict by default; insecure only if sslAllowInsecure. */
export function pgSslOption(config: ConnectionConfig): boolean | { rejectUnauthorized: boolean } | undefined {
  if (!config.ssl) return undefined;
  return { rejectUnauthorized: !config.sslAllowInsecure };
}

/** mysql2 ssl option. */
export function mysqlSslOption(
  config: ConnectionConfig,
): { rejectUnauthorized: boolean } | undefined {
  if (!config.ssl) return undefined;
  return { rejectUnauthorized: !config.sslAllowInsecure };
}

/** Tedious encrypt + trustServerCertificate. */
export function sqlServerTlsOptions(config: ConnectionConfig): {
  encrypt: boolean;
  trustServerCertificate: boolean;
} {
  const encrypt = config.ssl ?? false;
  return {
    encrypt,
    // trust only when explicitly allowing insecure TLS
    trustServerCertificate: Boolean(config.ssl && config.sslAllowInsecure),
  };
}

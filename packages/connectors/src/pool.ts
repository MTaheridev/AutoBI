import pg from 'pg';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { ConnectorError } from '@autobi/shared';
import { mysqlSslOption, pgSslOption } from './ssl.js';
import { withQueryTimeout } from './timeout.js';
import type {
  CompiledQuery,
  ConnectionConfig,
  ConnectorType,
  QueryExecutionOptions,
  QueryResult,
} from './types.js';

type PoolKey = string;

/**
 * Process-local pools for Postgres / MySQL / MariaDB (max 4 connections each).
 * SQL Server remains one-shot via DatabaseConnector.
 */
export class ConnectorPoolRegistry {
  private readonly pgPools = new Map<PoolKey, pg.Pool>();
  private readonly mysqlPools = new Map<PoolKey, mysql.Pool>();

  supports(type: ConnectorType): boolean {
    return type === 'postgresql' || type === 'mysql' || type === 'mariadb';
  }

  async execute(
    key: string,
    type: ConnectorType,
    config: ConnectionConfig,
    query: CompiledQuery,
    options: QueryExecutionOptions = {},
  ): Promise<QueryResult> {
    if (type === 'postgresql') return this.executePg(key, config, query, options);
    if (type === 'mysql' || type === 'mariadb') {
      return this.executeMysql(key, type, config, query, options);
    }
    throw new ConnectorError(`Pooling not supported for ${type}`);
  }

  private async executePg(
    key: string,
    config: ConnectionConfig,
    query: CompiledQuery,
    options: QueryExecutionOptions,
  ): Promise<QueryResult> {
    let pool = this.pgPools.get(key);
    if (!pool) {
      pool = new pg.Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: pgSslOption(config),
        max: 4,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: config.connectionTimeoutMs ?? 10_000,
      });
      this.pgPools.set(key, pool);
    }

    const maxRows = options.maxRows ?? 1000;
    const timeoutMs = options.timeoutMs ?? 30_000;
    const client = await pool.connect();
    try {
      await client.query(`SET statement_timeout = ${Math.max(1, Math.floor(timeoutMs))}`);
      const result = await withQueryTimeout(
        client.query({ text: query.sql, values: query.params, rowMode: 'array' }),
        timeoutMs,
        options.signal,
      );
      const truncated = result.rows.length > maxRows;
      const sliced = result.rows.slice(0, maxRows);
      const columns = result.fields.map((f) => f.name);
      const rows = sliced.map((row) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, i) => {
          obj[col] = (row as unknown[])[i];
        });
        return obj;
      });
      return { columns, rows, rowCount: rows.length, truncated };
    } finally {
      client.release();
    }
  }

  private async executeMysql(
    key: string,
    type: 'mysql' | 'mariadb',
    config: ConnectionConfig,
    query: CompiledQuery,
    options: QueryExecutionOptions,
  ): Promise<QueryResult> {
    let pool = this.mysqlPools.get(key);
    if (!pool) {
      pool = mysql.createPool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: mysqlSslOption(config),
        connectionLimit: 4,
        connectTimeout: config.connectionTimeoutMs ?? 10_000,
      });
      this.mysqlPools.set(key, pool);
    }

    const maxRows = options.maxRows ?? 1000;
    const timeoutMs = options.timeoutMs ?? 30_000;
    const connection = await pool.getConnection();
    try {
      if (type === 'mariadb') {
        await connection
          .query(`SET SESSION max_statement_time = ${Math.max(1, Math.ceil(timeoutMs / 1000))}`)
          .catch(() => undefined);
      } else {
        await connection
          .query(`SET SESSION max_execution_time = ${Math.max(1, Math.floor(timeoutMs))}`)
          .catch(() => undefined);
      }
      const [rows, fields] = await withQueryTimeout(
        connection.query({ sql: query.sql, values: query.params }),
        timeoutMs,
        options.signal,
      );
      const list = Array.isArray(rows) ? (rows as RowDataPacket[]) : [];
      const truncated = list.length > maxRows;
      const sliced = list.slice(0, maxRows);
      const columns =
        (fields as Array<{ name: string }> | undefined)?.map((f) => f.name) ?? [];
      return {
        columns,
        rows: sliced.map((row) => {
          const obj: Record<string, unknown> = {};
          for (const col of columns) obj[col] = row[col];
          return obj;
        }),
        rowCount: sliced.length,
        truncated,
      };
    } finally {
      connection.release();
    }
  }

  async closeAll(): Promise<void> {
    await Promise.all([
      ...[...this.pgPools.values()].map((p) => p.end().catch(() => undefined)),
      ...[...this.mysqlPools.values()].map((p) => p.end().catch(() => undefined)),
    ]);
    this.pgPools.clear();
    this.mysqlPools.clear();
  }
}

export const connectorPools = new ConnectorPoolRegistry();

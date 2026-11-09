import { ValidationError } from '@autobi/shared';
import type { ConnectorDialect } from './plan.js';

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertSafeIdent(part: string, label = 'identifier'): void {
  if (!IDENT.test(part)) {
    throw new ValidationError(`Unsafe ${label}: ${part}`);
  }
}

export function parseFieldRef(field: string): { schema?: string; table: string; column: string } {
  const parts = field.split('.');
  if (parts.length === 2) {
    assertSafeIdent(parts[0], 'table');
    assertSafeIdent(parts[1], 'column');
    return { table: parts[0], column: parts[1] };
  }
  if (parts.length === 3) {
    assertSafeIdent(parts[0], 'schema');
    assertSafeIdent(parts[1], 'table');
    assertSafeIdent(parts[2], 'column');
    return { schema: parts[0], table: parts[1], column: parts[2] };
  }
  throw new ValidationError(`Field must be table.column or schema.table.column: ${field}`);
}

export function quoteIdent(dialect: ConnectorDialect, part: string): string {
  assertSafeIdent(part);
  if (dialect === 'mysql' || dialect === 'mariadb') return `\`${part}\``;
  if (dialect === 'sqlserver') return `[${part}]`;
  return `"${part}"`;
}

export function quoteField(
  dialect: ConnectorDialect,
  ref: { schema?: string; table: string; column: string },
): string {
  const parts = [
    ...(ref.schema ? [quoteIdent(dialect, ref.schema)] : []),
    quoteIdent(dialect, ref.table),
    quoteIdent(dialect, ref.column),
  ];
  return parts.join('.');
}

export function quoteTable(
  dialect: ConnectorDialect,
  ref: { schema?: string; table: string },
): string {
  const parts = [
    ...(ref.schema ? [quoteIdent(dialect, ref.schema)] : []),
    quoteIdent(dialect, ref.table),
  ];
  return parts.join('.');
}

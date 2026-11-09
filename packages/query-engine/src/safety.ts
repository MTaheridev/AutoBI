import { ValidationError } from '@autobi/shared';

const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge|call|exec|execute|into|copy|attach|detach)\b/i;

export function assertSafeSelectSql(sql: string): void {
  const trimmed = sql.trim();
  if (!/^(with\b|select\b)/i.test(trimmed)) {
    throw new ValidationError('Only SELECT queries are allowed');
  }
  if (trimmed.includes(';')) {
    throw new ValidationError('Multiple SQL statements are not allowed');
  }
  if (FORBIDDEN.test(trimmed)) {
    throw new ValidationError('SQL contains forbidden keywords');
  }
}

export const MAX_LIMIT = 10_000;
export const DEFAULT_TIMEOUT_MS = 30_000;

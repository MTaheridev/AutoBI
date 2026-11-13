import type { ConnectionTestWarning } from './types.js';

export const NOT_READONLY_WARNING: ConnectionTestWarning = {
  code: 'NOT_READONLY',
  message:
    'This database user appears to have write privileges. Prefer a read-only account. It is not safe to expose a writable connection to AI-driven querying.',
};

export function writableResult(): {
  readonlyLikely: false;
  warnings: ConnectionTestWarning[];
} {
  return { readonlyLikely: false, warnings: [NOT_READONLY_WARNING] };
}

export function readonlyResult(): {
  readonlyLikely: true;
  warnings: ConnectionTestWarning[];
} {
  return { readonlyLikely: true, warnings: [] };
}

/** Detect write-capable MySQL/MariaDB grants from SHOW GRANTS output. */
export function mysqlGrantsLookWritable(grants: string[]): boolean {
  const joined = grants.join('\n').toUpperCase();
  if (/WITH\s+GRANT\s+OPTION/.test(joined) && /ALL\s+PRIVILEGES/.test(joined)) return true;
  if (/ALL\s+PRIVILEGES/.test(joined)) return true;
  return /\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|REFERENCES|INDEX|TRIGGER|EXECUTE|EVENT|CREATE\s+TEMPORARY\s+TABLES)\b/.test(
    joined,
  );
}

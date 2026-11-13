export type FormatDisplayOptions = {
  timeZone?: string;
  locale?: string;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_SQL =
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})?$/;
const ISO_HINT = /T\d{2}:\d{2}/;

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

export function looksLikeDateString(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (DATE_ONLY.test(v) || DATETIME_SQL.test(v) || ISO_HINT.test(v)) return true;
  return false;
}

export function formatDateTime(
  value: Date,
  opts: FormatDisplayOptions = {},
): string {
  const timeZone = opts.timeZone || 'UTC';
  try {
    return new Intl.DateTimeFormat(opts.locale, {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: value.getSeconds() !== 0 ? '2-digit' : undefined,
      hour12: false,
    }).format(value);
  } catch {
    return value.toISOString();
  }
}

export function formatNumber(value: number, opts: FormatDisplayOptions = {}): string {
  try {
    return new Intl.NumberFormat(opts.locale, {
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch {
    return String(value);
  }
}

/** Format widget cell / axis values: datetimes in workspace TZ, numbers localized. Never show raw epoch timestamps for date-like strings. */
export function formatCellValue(
  value: unknown,
  opts: FormatDisplayOptions = {},
): string {
  if (value == null) return '';
  if (value instanceof Date) {
    return isValidDate(value) ? formatDateTime(value, opts) : '';
  }
  if (typeof value === 'string') {
    if (looksLikeDateString(value)) {
      const parsed = new Date(value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value);
      if (isValidDate(parsed)) return formatDateTime(parsed, opts);
    }
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatNumber(value, opts);
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

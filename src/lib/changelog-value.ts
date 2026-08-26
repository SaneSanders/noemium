/** Display a changelog from/to value. Objects must not become `[object Object]`. */

export function formatChangeValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'object') {
    const rec = value as { date?: unknown; successor?: unknown };
    if (typeof rec.date === 'string' || typeof rec.successor === 'string') {
      const date = typeof rec.date === 'string' ? rec.date : '—';
      const successor = typeof rec.successor === 'string' ? rec.successor : '—';
      return `${date} → ${successor}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

/** Persist a tracked field: objects become display strings, primitives stay. */
export function serializeChangeValue(
  value: unknown,
): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object') return formatChangeValue(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
}

/** Shareable tool kit: URL query + localStorage. Not a budget. */

export const KIT_MAX = 8;
export const KIT_STORAGE_KEY = 'nm-kit';

export function parseKitSlugs(
  raw: string | readonly string[] | null | undefined,
  allowed: Iterable<string>,
  max = KIT_MAX,
): string[] {
  const allow = new Set(allowed);
  const tokens = Array.isArray(raw)
    ? raw
    : String(raw ?? '')
        .split(',')
        .map((token) => token.trim());
  const out: string[] = [];
  for (const token of tokens) {
    const slug = String(token).trim();
    if (!slug || !allow.has(slug) || out.includes(slug)) continue;
    out.push(slug);
    if (out.length >= max) break;
  }
  return out;
}

export function mergeKit(
  existing: readonly string[],
  added: readonly string[],
  allowed: Iterable<string>,
  max = KIT_MAX,
): string[] {
  return parseKitSlugs([...existing, ...added], allowed, max);
}

export function kitHref(slugs: readonly string[]): string {
  return slugs.length ? `/kit/?tools=${slugs.join(',')}` : '/kit/';
}

export function kitSharePath(slugs: readonly string[]): string {
  return kitHref(slugs);
}

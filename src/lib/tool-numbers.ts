/**
 * Stable ledger numbers for catalog entries: "№ 041" on cards and detail
 * pages. The number is the tool's position in the alphabetically sorted
 * slug list, so it never depends on page context and stays deterministic
 * across builds.
 */
import { getCollection } from 'astro:content';

let cache: Map<string, number> | null = null;

export async function toolNumbers(): Promise<Map<string, number>> {
  if (cache) return cache;
  const tools = await getCollection('tools');
  const ids = tools.map((t) => t.id).sort((a, b) => a.localeCompare(b));
  cache = new Map(ids.map((id, i) => [id, i + 1]));
  return cache;
}

export function formatEntryNo(n: number | undefined): string {
  return `№ ${String(n ?? 0).padStart(3, '0')}`;
}

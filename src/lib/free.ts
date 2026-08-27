/**
 * What is actually free — derived only from catalog fields.
 * Bait is a quote already on the card, not a vibe.
 */
export type FreeKind = 'run-it' | 'hosted-free' | 'usable-tier' | 'bait' | 'paid';

export type FreeTool = {
  slug: string;
  name: string;
  pricing: 'free' | 'freemium' | 'paid';
  free_tier: boolean;
  open_source: boolean;
  self_host: boolean;
  verdict?: 'ship' | 'situational' | 'skip';
  price_note?: string;
  limitations?: string[];
  skip_when?: string[];
};

export type FreeCall = {
  kind: FreeKind;
  evidence: string | null;
};

/** Trial walls, expiring credits, temporary promos — must appear in the card. */
export const BAIT =
  /\bfree trial\b|\btrial keys\b|\d+-day free|\bcredits expire\b|\bunused (quota|credits)\b|\btemporarily free\b|\bcredit card\b|\bcard required\b/i;

function blobs(tool: FreeTool): string[] {
  return [tool.price_note, ...(tool.limitations ?? []), ...(tool.skip_when ?? [])].filter(
    (value): value is string => Boolean(value),
  );
}

export function baitEvidence(tool: FreeTool): string | null {
  for (const blob of blobs(tool)) {
    if (BAIT.test(blob)) return blob;
  }
  return null;
}

export function classifyFree(tool: FreeTool): FreeCall {
  const bait = baitEvidence(tool);
  if (bait && (tool.free_tier || tool.pricing !== 'paid')) {
    return { kind: 'bait', evidence: bait };
  }
  if (tool.pricing === 'free' && tool.open_source && tool.self_host) {
    return { kind: 'run-it', evidence: tool.price_note ?? null };
  }
  if (tool.pricing === 'free') {
    return { kind: 'hosted-free', evidence: tool.price_note ?? null };
  }
  if (tool.free_tier && tool.pricing === 'freemium') {
    return { kind: 'usable-tier', evidence: tool.price_note ?? null };
  }
  return { kind: 'paid', evidence: tool.price_note ?? null };
}

export type FreeRow = FreeTool & FreeCall;

export function collectFree(tools: FreeTool[]): Record<FreeKind, FreeRow[]> {
  const buckets: Record<FreeKind, FreeRow[]> = {
    'run-it': [],
    'hosted-free': [],
    'usable-tier': [],
    bait: [],
    paid: [],
  };
  const rank: Record<string, number> = { ship: 0, situational: 1, skip: 2 };
  for (const tool of tools) {
    const call = classifyFree(tool);
    buckets[call.kind].push({ ...tool, ...call });
  }
  for (const kind of Object.keys(buckets) as FreeKind[]) {
    buckets[kind].sort(
      (a, b) =>
        (rank[a.verdict ?? ''] ?? 9) - (rank[b.verdict ?? ''] ?? 9) || a.name.localeCompare(b.name),
    );
  }
  return buckets;
}

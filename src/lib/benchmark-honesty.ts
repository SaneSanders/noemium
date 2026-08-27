/**
 * Honesty layer over model benchmark rows already on the cards.
 * Classifies the source string. Does not invent scores.
 */

export type BenchKind = 'independent' | 'vendor' | 'unclear';

export type BenchRow = {
  model: string;
  slug: string;
  name: string;
  score: string;
  source: string;
  date: string;
  kind: BenchKind;
};

export type ModelBenchInput = {
  slug: string;
  name: string;
  benchmarks?: { name: string; score: number | string; source: string; date: string }[];
};

const INDEPENDENT =
  /livebench|lmarena|lmsys|crfm\.stanford|helm|swe-bench|swebench|aider\.chat|epoch\.ai|artificialanalysis|vals\.ai|opencompass/i;

const VENDOR =
  /vendor|official|model card|docs\.|changelog|no independent|un-?audited|internal eval|our (eval|benchmark)/i;

export function classifyBenchSource(source: string): BenchKind {
  if (INDEPENDENT.test(source)) return 'independent';
  if (VENDOR.test(source)) return 'vendor';
  return 'unclear';
}

export function collectBenches(models: ModelBenchInput[]): BenchRow[] {
  const rows: BenchRow[] = [];
  for (const model of models) {
    for (const bench of model.benchmarks ?? []) {
      rows.push({
        model: model.name,
        slug: model.slug,
        name: bench.name,
        score: String(bench.score),
        source: bench.source,
        date: bench.date,
        kind: classifyBenchSource(bench.source),
      });
    }
  }
  return rows.sort((a, b) => a.model.localeCompare(b.model) || a.name.localeCompare(b.name));
}

export function benchCounts(rows: BenchRow[]) {
  return {
    total: rows.length,
    independent: rows.filter((r) => r.kind === 'independent').length,
    vendor: rows.filter((r) => r.kind === 'vendor').length,
    unclear: rows.filter((r) => r.kind === 'unclear').length,
  };
}

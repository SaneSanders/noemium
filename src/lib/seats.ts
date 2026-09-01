/**
 * Seat versus API — dollars already on the card, rates already on the
 * model. Mixes are arithmetic, not a usage claim.
 */

export type SeatDef = {
  tool: string;
  plan: string;
  usd_month: number;
  model: string;
  group: string;
  receipt: string;
};

export type SeatTool = {
  slug: string;
  name: string;
  price_note?: string;
};

export type SeatModel = {
  slug: string;
  name: string;
  price_input_per_mtok: number;
  price_output_per_mtok: number;
  price_unit?: string;
};

export type SeatRow = SeatDef & {
  tool_name: string;
  model_name: string;
  quote: string;
  input_mtok: number;
  mid_mtok: number;
  output_mtok: number;
};

/** Coding seats with a public monthly dollar figure. Receipt is the vendor page. */
export const SEATS: SeatDef[] = [
  {
    tool: 'claude-code',
    plan: 'Pro',
    usd_month: 20,
    model: 'claude-sonnet-5',
    group: 'Claude',
    receipt: 'https://support.claude.com/en/articles/11049762-choose-a-claude-plan',
  },
  {
    tool: 'claude-code',
    plan: 'Max 5x',
    usd_month: 100,
    model: 'claude-opus-5',
    group: 'Claude',
    receipt: 'https://support.claude.com/en/articles/11049741-what-is-the-max-plan',
  },
  {
    tool: 'claude-code',
    plan: 'Max 20x',
    usd_month: 200,
    model: 'claude-opus-5',
    group: 'Claude',
    receipt: 'https://support.claude.com/en/articles/11049741-what-is-the-max-plan',
  },
  {
    tool: 'openai-codex',
    plan: 'Plus',
    usd_month: 20,
    model: 'gpt-5-6-sol',
    group: 'ChatGPT',
    receipt: 'https://learn.chatgpt.com/docs/pricing',
  },
  {
    tool: 'openai-codex',
    plan: 'Pro 5x',
    usd_month: 100,
    model: 'gpt-5-6-sol',
    group: 'ChatGPT',
    receipt: 'https://learn.chatgpt.com/docs/pricing',
  },
  {
    tool: 'openai-codex',
    plan: 'Pro 20x',
    usd_month: 200,
    model: 'gpt-5-6-sol',
    group: 'ChatGPT',
    receipt: 'https://learn.chatgpt.com/docs/pricing',
  },
  {
    tool: 'cursor',
    plan: 'Pro',
    usd_month: 20,
    model: 'claude-sonnet-5',
    group: 'Cursor',
    receipt: 'https://cursor.com/pricing',
  },
  {
    tool: 'cursor',
    plan: 'Pro+',
    usd_month: 60,
    model: 'claude-sonnet-5',
    group: 'Cursor',
    receipt: 'https://cursor.com/pricing',
  },
  {
    tool: 'cursor',
    plan: 'Ultra',
    usd_month: 200,
    model: 'claude-sonnet-5',
    group: 'Cursor',
    receipt: 'https://cursor.com/pricing',
  },
];

export function dollarOnCard(priceNote: string | undefined, usd: number): boolean {
  if (!priceNote || !Number.isFinite(usd) || usd <= 0) return false;
  const body = Number.isInteger(usd) ? String(usd) : usd.toFixed(2);
  const re = new RegExp(`\\$${body.replace('.', '\\.')}(?:\\.00)?(?!\\d)`);
  return re.test(priceNote);
}

export function mtokForUsd(usd: number, usdPerMtok: number): number {
  if (!Number.isFinite(usd) || !Number.isFinite(usdPerMtok) || usdPerMtok <= 0) return 0;
  return usd / usdPerMtok;
}

export function blendedUsdPerMtok(input: number, output: number, outputShare: number): number {
  return input * (1 - outputShare) + output * outputShare;
}

export function formatMtok(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 10) return `${n.toFixed(1).replace(/\.0$/, '')} MTok`;
  if (n >= 1) return `${n.toFixed(1)} MTok`;
  return `${n.toFixed(2)} MTok`;
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '$0';
  if (Number.isInteger(n)) return `$${n}`;
  return `$${n.toFixed(2)}`;
}

export type CalcApiLine = {
  model: string;
  inputMtok: number;
  outputMtok: number;
};

export function seatKey(seat: { tool: string; plan: string }): string {
  return `${seat.tool}::${seat.plan}`;
}

export function seatSubtotal(seats: SeatRow[], counts: Record<string, number>): number {
  return seats.reduce((sum, seat) => {
    const key = seatKey(seat);
    const raw = counts[key];
    const count = Number.isFinite(raw) ? Math.max(0, Math.min(25, Math.round(raw))) : 0;
    return sum + seat.usd_month * count;
  }, 0);
}

export function apiLineUsd(model: SeatModel | undefined, inputMtok: number, outputMtok: number): number {
  if (!model) return 0;
  if ((model.price_unit ?? 'mtok') !== 'mtok') return 0;
  if (!Number.isFinite(model.price_input_per_mtok) || !Number.isFinite(model.price_output_per_mtok)) return 0;
  if (model.price_input_per_mtok <= 0 || model.price_output_per_mtok <= 0) return 0;
  const input = Number.isFinite(inputMtok) && inputMtok > 0 ? inputMtok : 0;
  const output = Number.isFinite(outputMtok) && outputMtok > 0 ? outputMtok : 0;
  return input * model.price_input_per_mtok + output * model.price_output_per_mtok;
}

export function apiSubtotal(lines: CalcApiLine[], models: Map<string, SeatModel>): number {
  return lines.reduce((sum, line) => sum + apiLineUsd(models.get(line.model), line.inputMtok, line.outputMtok), 0);
}

export function calcTotal(
  seats: SeatRow[],
  counts: Record<string, number>,
  lines: CalcApiLine[],
  models: Map<string, SeatModel>,
): number {
  return seatSubtotal(seats, counts) + apiSubtotal(lines, models);
}

export function encodeCalcState(counts: Record<string, number>, lines: CalcApiLine[]): string {
  const params = new URLSearchParams();
  const seatTokens = Object.entries(counts)
    .filter(([, raw]) => {
      const count = Number.isFinite(raw) ? Math.max(0, Math.min(25, Math.round(raw))) : 0;
      return count > 0;
    })
    .map(([key, raw]) => `${key}:${Math.max(0, Math.min(25, Math.round(raw ?? 0)))}`);
  if (seatTokens.length > 0) params.set('seats', seatTokens.join(','));

  const apiTokens = lines
    .filter((line) => line.model && (line.inputMtok > 0 || line.outputMtok > 0))
    .map((line) => `${line.model}:${Number(line.inputMtok) || 0}:${Number(line.outputMtok) || 0}`);
  if (apiTokens.length > 0) params.set('api', apiTokens.join(','));

  return params.toString();
}

export function decodeCalcState(
  search: string,
  allowedSeats: SeatRow[],
  allowedModels: SeatModel[],
): { counts: Record<string, number>; lines: CalcApiLine[] } {
  const allowedSeatKeys = new Set(allowedSeats.map(seatKey));
  const allowedModelSlugs = new Set(allowedModels.map((m) => m.slug));
  const params = new URLSearchParams(search);
  const counts: Record<string, number> = {};
  const lines: CalcApiLine[] = [];

  const seatsParam = params.get('seats') ?? '';
  if (seatsParam) {
    for (const token of seatsParam.split(',')) {
      if (!token.includes('::')) continue;
      const colonIndex = token.lastIndexOf(':');
      if (colonIndex <= 0) continue;
      const key = token.slice(0, colonIndex);
      const count = Number(token.slice(colonIndex + 1));
      if (!allowedSeatKeys.has(key) || !Number.isFinite(count) || count < 0 || count > 25) continue;
      counts[key] = Math.round(count);
    }
  }

  const apiParam = params.get('api') ?? '';
  if (apiParam) {
    for (const token of apiParam.split(',')) {
      const parts = token.split(':');
      if (parts.length !== 3) continue;
      const [model, inputRaw, outputRaw] = parts;
      const inputMtok = Number(inputRaw);
      const outputMtok = Number(outputRaw);
      if (!allowedModelSlugs.has(model) || !Number.isFinite(inputMtok) || !Number.isFinite(outputMtok)) continue;
      if (inputMtok < 0 || outputMtok < 0) continue;
      lines.push({ model, inputMtok, outputMtok });
    }
  }

  return { counts, lines };
}

export function calcHref(counts: Record<string, number>, lines: CalcApiLine[]): string {
  const qs = encodeCalcState(counts, lines);
  return qs ? `/calculator/?${qs}` : '/calculator/';
}

export function collectSeats(input: {
  seats: SeatDef[];
  tools: SeatTool[];
  models: SeatModel[];
}): SeatRow[] {
  const tools = new Map(input.tools.map((t) => [t.slug, t]));
  const models = new Map(input.models.map((m) => [m.slug, m]));
  const rows: SeatRow[] = [];
  for (const seat of input.seats) {
    const tool = tools.get(seat.tool);
    const model = models.get(seat.model);
    if (!tool || !model) continue;
    if ((model.price_unit ?? 'mtok') !== 'mtok') continue;
    if (model.price_input_per_mtok <= 0 || model.price_output_per_mtok <= 0) continue;
    if (!dollarOnCard(tool.price_note, seat.usd_month)) continue;
    rows.push({
      ...seat,
      tool_name: tool.name,
      model_name: model.name,
      quote: tool.price_note!,
      input_mtok: mtokForUsd(seat.usd_month, model.price_input_per_mtok),
      mid_mtok: mtokForUsd(
        seat.usd_month,
        blendedUsdPerMtok(model.price_input_per_mtok, model.price_output_per_mtok, 0.5),
      ),
      output_mtok: mtokForUsd(seat.usd_month, model.price_output_per_mtok),
    });
  }
  return rows;
}

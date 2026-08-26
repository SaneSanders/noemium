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

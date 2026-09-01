import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  type CalcApiLine,
  type SeatModel,
  type SeatRow,
  apiLineUsd,
  apiSubtotal,
  calcHref,
  calcTotal,
  decodeCalcState,
  formatUsd,
  seatKey,
  seatSubtotal,
} from '../lib/seats';
import { hostname } from '../lib/shelf';

export type CalcSeat = SeatRow;
export type CalcModel = SeatModel;

function clampSeatCount(raw: number | undefined): number {
  const n = raw ?? 0;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(25, Math.round(n)));
}

function clampMtok(raw: number | undefined): number {
  const n = raw ?? 0;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export default function SeatCalc({ seats, models }: { seats: CalcSeat[]; models: CalcModel[] }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [lines, setLines] = useState<CalcApiLine[]>([]);

  const modelBySlug = useMemo(() => new Map(models.map((m) => [m.slug, m])), [models]);

  const groups = useMemo(() => {
    const map = new Map<string, CalcSeat[]>();
    for (const seat of seats) {
      if (!map.has(seat.group)) map.set(seat.group, []);
      map.get(seat.group)!.push(seat);
    }
    return [...map.entries()].map(([group, rows]) => ({ group, rows }));
  }, [seats]);

  const persist = (nextCounts: Record<string, number>, nextLines: CalcApiLine[]) => {
    setCounts(nextCounts);
    setLines(nextLines);
    const href = calcHref(nextCounts, nextLines);
    window.history.replaceState(null, '', href);
  };

  useEffect(() => {
    const { counts: urlCounts, lines: urlLines } = decodeCalcState(window.location.search, seats, models);
    setCounts(urlCounts);
    setLines(urlLines);
    const href = calcHref(urlCounts, urlLines);
    window.history.replaceState(null, '', href);
  }, [seats, models]);

  const updateCount = (key: string, raw: number) => {
    const next = { ...counts, [key]: clampSeatCount(raw) };
    persist(next, lines);
  };

  const addApiLine = () => {
    persist(counts, [...lines, { model: '', inputMtok: 0, outputMtok: 0 }]);
  };

  const updateApiLine = (index: number, patch: Partial<CalcApiLine>) => {
    const next = lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    persist(counts, next);
  };

  const removeApiLine = (index: number) => {
    const next = lines.filter((_, i) => i !== index);
    persist(counts, next);
  };

  const seatTotal = seatSubtotal(seats, counts);
  const apiTotal = apiSubtotal(lines, modelBySlug);
  const knownTotal = calcTotal(seats, counts, lines, modelBySlug);

  return (
    <div class="space-y-8">
      <section class="nm-card p-6 md:p-8">
        <h2 class="font-display text-2xl font-medium tracking-tight md:text-3xl">Seats</h2>
        <p class="mt-2 max-w-2xl text-ink-dim">
          Count the seats whose price is printed on the card. Vendor receipts are linked; totals are arithmetic.
        </p>

        {seats.length === 0 ? (
          <p class="mt-6 font-mono text-[14px] text-ink-dim">No priced seats are available.</p>
        ) : (
          <div class="mt-6 space-y-6">
            {groups.map(({ group, rows }) => (
              <div key={group}>
                <p class="font-mono text-[13px] font-medium tracking-[0.14em] text-ink-dim uppercase">{group}</p>
                <div class="mt-3 divide-y divide-line-soft border border-line-soft">
                  {rows.map((seat) => {
                    const key = seatKey(seat);
                    const count = clampSeatCount(counts[key]);
                    return (
                      <div key={key} class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div class="min-w-0">
                          <a
                            href={`/tools/${seat.tool}/`}
                            class="block font-display text-[17px] font-medium tracking-tight hover:text-accent"
                          >
                            {seat.tool_name}
                          </a>
                          <p class="mt-0.5 font-mono text-[14px] text-ink-dim">
                            {seat.plan} · {formatUsd(seat.usd_month)}/mo
                          </p>
                        </div>
                        <div class="flex items-center gap-4">
                          <a
                            href={seat.receipt}
                            rel="noopener"
                            class="hidden font-mono text-[13px] text-ink-dim hover:text-ink sm:inline"
                          >
                            {hostname(seat.receipt)}
                          </a>
                          <div class="flex items-center gap-2">
                            <button
                              type="button"
                              class="nm-btn nm-btn-outline px-3 py-2"
                              aria-label={`Decrease ${seat.tool_name} ${seat.plan}`}
                              disabled={count <= 0}
                              onClick={() => updateCount(key, count - 1)}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={25}
                              step={1}
                              value={count}
                              aria-label={`${seat.tool_name} ${seat.plan} seat count`}
                              class="nm-field w-16 text-center px-2 py-2"
                              onInput={(e) => updateCount(key, Number((e.currentTarget as HTMLInputElement).value))}
                            />
                            <button
                              type="button"
                              class="nm-btn nm-btn-outline px-3 py-2"
                              aria-label={`Increase ${seat.tool_name} ${seat.plan}`}
                              disabled={count >= 25}
                              onClick={() => updateCount(key, count + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section class="nm-card p-6 md:p-8">
        <h2 class="font-display text-2xl font-medium tracking-tight md:text-3xl">API at list</h2>
        <p class="mt-2 max-w-2xl text-ink-dim">
          Add model lines at public list rates. Dollars are input MTok × input $/MTok plus output MTok × output $/MTok.
        </p>

        {lines.length === 0 ? (
          <p class="mt-6 font-mono text-[14px] text-ink-dim">No API lines. Add one to price list-rate volume.</p>
        ) : (
          <div class="mt-6 space-y-3">
            {lines.map((line, index) => {
              const model = modelBySlug.get(line.model);
              const dollars = apiLineUsd(model, line.inputMtok, line.outputMtok);
              return (
                <div key={index} class="flex flex-col gap-3 border border-line-soft p-3 sm:flex-row sm:items-end">
                  <div class="flex-1">
                    <label class="block font-mono text-[13px] text-ink-dim" htmlFor={`calc-model-${index}`}>
                      Model
                    </label>
                    <select
                      id={`calc-model-${index}`}
                      class="nm-field mt-1.5"
                      value={line.model}
                      onInput={(e) => updateApiLine(index, { model: (e.currentTarget as HTMLSelectElement).value })}
                    >
                      <option value="">Select a model</option>
                      {models.map((m) => (
                        <option key={m.slug} value={m.slug}>
                          {m.name} · ${m.price_input_per_mtok} in / ${m.price_output_per_mtok} out
                        </option>
                      ))}
                    </select>
                  </div>
                  <div class="flex-1">
                    <label class="block font-mono text-[13px] text-ink-dim" htmlFor={`calc-input-${index}`}>
                      Input MTok/mo
                    </label>
                    <input
                      id={`calc-input-${index}`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.inputMtok || ''}
                      placeholder="0"
                      class="nm-field mt-1.5"
                      onInput={(e) =>
                        updateApiLine(index, { inputMtok: clampMtok(Number((e.currentTarget as HTMLInputElement).value)) })
                      }
                    />
                  </div>
                  <div class="flex-1">
                    <label class="block font-mono text-[13px] text-ink-dim" htmlFor={`calc-output-${index}`}>
                      Output MTok/mo
                    </label>
                    <input
                      id={`calc-output-${index}`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.outputMtok || ''}
                      placeholder="0"
                      class="nm-field mt-1.5"
                      onInput={(e) =>
                        updateApiLine(index, {
                          outputMtok: clampMtok(Number((e.currentTarget as HTMLInputElement).value)),
                        })
                      }
                    />
                  </div>
                  <div class="min-w-[5rem] text-right">
                    <p class="font-mono text-[13px] text-ink-dim">line</p>
                    <p class="nm-num text-[17px] font-medium">{formatUsd(dollars)}</p>
                  </div>
                  <button
                    type="button"
                    class="nm-btn nm-btn-outline px-3 py-2 text-ink-dim hover:text-verdict-skip"
                    aria-label={`Remove API line ${index + 1}`}
                    onClick={() => removeApiLine(index)}
                  >
                    remove
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button type="button" class="nm-btn nm-btn-outline mt-6" onClick={addApiLine}>
          Add API line
        </button>
      </section>

      <section class="nm-card p-6 md:p-8">
        <h2 class="font-display text-2xl font-medium tracking-tight md:text-3xl">Total</h2>
        <div class="mt-4 space-y-2 font-mono text-[15px]">
          <p class="flex justify-between">
            <span class="text-ink-dim">Seats subtotal</span>
            <span class="nm-num">{formatUsd(seatTotal)}</span>
          </p>
          <p class="flex justify-between">
            <span class="text-ink-dim">API subtotal</span>
            <span class="nm-num">{formatUsd(apiTotal)}</span>
          </p>
          <p class="flex justify-between border-t border-line-soft pt-2 text-[17px] font-medium">
            <span>Known monthly dollars</span>
            <span class="nm-num">{formatUsd(knownTotal)}</span>
          </p>
        </div>
        <p class="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-dim">
          Seats carry vendor receipts; API is list-rate arithmetic on your volume, not a usage measurement.
        </p>
      </section>
    </div>
  );
}

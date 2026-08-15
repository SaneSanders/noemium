#!/usr/bin/env node
/**
 * Noemium model-data snapshot fetcher.
 *
 * Pulls real pricing / context-window data from legal open sources:
 *   - Helicone LLM Cost API (https://www.helicone.ai/api/llm-costs, Apache-2.0)
 *   - LiteLLM model_prices_and_context_window.json (MIT)
 *
 * For every model in MODELS it resolves price_input_per_mtok /
 * price_output_per_mtok / context_window and writes (or merges into)
 * src/content/models/<slug>.yaml. On merge ONLY these fields are touched:
 *   context_window, price_input_per_mtok, price_output_per_mtok,
 *   source_attribution, last_verified
 * Curated fields (open_weights, best_for, avoid_for, benchmarks) are taken
 * from the seed config below only when the file does not exist yet — existing
 * human curation is never overwritten.
 *
 * Non-token models (image/video/audio) have no per-token price: the script
 * sets the per-mtok fields to 0 and explains the real unit price inside
 * source_attribution.
 *
 * Usage: npm run fetch-models
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODELS_DIR = path.join(ROOT, 'src', 'content', 'models');
const TODAY = new Date().toISOString().slice(0, 10);

const HELICONE_URL = 'https://www.helicone.ai/api/llm-costs';
const LITELLM_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

/**
 * Per-model match config.
 *  litellm:  candidate keys in model_prices_and_context_window.json, first hit wins.
 *  helicone: { provider, model } exact pair in the Helicone cost API (fallback).
 *  fallback: { input, output } per-1M-token prices verified by hand on the
 *            vendor pricing page — used only when neither source resolves.
 *  context_fallback: used when no source reports a context window (token
 *            models only). Media models have no token context at all — the
 *            field is simply omitted for them (the schema marks it optional).
 *  context_override: manual context window that wins over source data.
 *  note:   extra pricing caveat appended to source_attribution.
 *  seed:     curated fields, written only when creating a new file.
 */
const MODELS = [
  // --- OpenAI (5.6 line: 1.05M ctx; >272K input bills 2x in / 1.5x out) ---
  {
    slug: 'gpt-5-6-sol',
    litellm: ['gpt-5.6-sol'],
    helicone: null,
    note: '>272K input bills 2x input / 1.5x output',
    seed: {
      name: 'GPT-5.6 Sol',
      provider: 'OpenAI',
      open_weights: false,
      best_for: ['complex reasoning, coding and agents (flagship)', 'long-horizon autonomous tasks'],
      avoid_for: ['high-volume cheap workloads (use gpt-5.6-luna)', 'open-weights or on-prem requirements'],
    },
  },
  {
    slug: 'gpt-5-6-terra',
    litellm: ['gpt-5.6-terra'],
    helicone: null,
    note: '>272K input bills 2x input / 1.5x output',
    seed: {
      name: 'GPT-5.6 Terra',
      provider: 'OpenAI',
      open_weights: false,
      best_for: ['default for most workloads: intelligence/price balance', 'production agentic coding'],
      avoid_for: ['cheapest high-volume tasks (use gpt-5.6-luna)', 'hardest reasoning (use gpt-5.6-sol)'],
    },
  },
  {
    slug: 'gpt-5-6-luna',
    litellm: ['gpt-5.6-luna'],
    helicone: null,
    note: '>272K input bills 2x input / 1.5x output',
    seed: {
      name: 'GPT-5.6 Luna',
      provider: 'OpenAI',
      open_weights: false,
      best_for: ['high-volume batch workloads', 'cheap classification and extraction at scale'],
      avoid_for: ['frontier reasoning (use gpt-5.6-sol/terra)', 'open-weights requirements'],
    },
  },
  {
    slug: 'gpt-5-4-mini',
    litellm: ['gpt-5.4-mini'],
    helicone: null,
    context_override: 400000, // vendor docs list 400K; LiteLLM still shows 272K
    note: 'context window 400K per vendor docs',
    seed: {
      name: 'GPT-5.4 mini',
      provider: 'OpenAI',
      open_weights: false,
      best_for: ['strongest mini tier: coding and subagents', 'budget reasoning at scale'],
      avoid_for: ['flagship-level reasoning (use gpt-5.6-sol)', 'open-weights requirements'],
    },
  },
  // --- Anthropic (1M ctx except haiku 200K; batch -50%, cache read 0.1x) ---
  {
    slug: 'claude-fable-5',
    litellm: ['claude-fable-5'],
    helicone: null,
    note: 'batch API -50%, cache read 0.1x',
    seed: {
      name: 'Claude Fable 5',
      provider: 'Anthropic',
      open_weights: false,
      best_for: ['long-horizon autonomous agents', 'strongest public Anthropic model (Mythos class)'],
      avoid_for: ['cost-sensitive bulk workloads', 'open-weights requirements'],
    },
  },
  {
    slug: 'claude-opus-5',
    litellm: ['claude-opus-5'],
    helicone: null,
    note: 'batch API -50%, cache read 0.1x',
    seed: {
      name: 'Claude Opus 5',
      provider: 'Anthropic',
      open_weights: false,
      best_for: ['complex agentic coding', 'near-Fable quality at half the price'],
      avoid_for: ['cost-sensitive bulk workloads', 'sub-second latency requirements'],
    },
  },
  {
    slug: 'claude-sonnet-5',
    litellm: ['claude-sonnet-5'],
    helicone: null,
    note: 'intro price $2/$10 until 2026-08-31, then $3/$15 (secondary sources, unconfirmed); batch API -50%, cache read 0.1x',
    seed: {
      name: 'Claude Sonnet 5',
      provider: 'Anthropic',
      open_weights: false,
      best_for: ['production workhorse: agentic coding and tool use', 'long-document analysis'],
      avoid_for: ['latency-critical autocomplete at scale (cost per call)', 'on-prem or air-gapped deployments'],
    },
  },
  {
    slug: 'claude-haiku-4-5',
    litellm: ['claude-haiku-4-5'],
    helicone: null,
    note: 'batch API -50%, cache read 0.1x',
    seed: {
      name: 'Claude Haiku 4.5',
      provider: 'Anthropic',
      open_weights: false,
      best_for: ['speed: classification and routing', 'low-latency high-volume tasks'],
      avoid_for: ['frontier reasoning or agentic coding', 'open-weights requirements'],
    },
  },
  // --- Google (1M ctx) ---
  {
    slug: 'gemini-3-1-pro-preview',
    litellm: ['gemini-3.1-pro-preview'],
    helicone: null,
    note: '>200K input tier: $4/$18 per 1M',
    seed: {
      name: 'Gemini 3.1 Pro Preview',
      provider: 'Google',
      open_weights: false,
      best_for: ['flagship reasoning and coding', 'long-document and multimodal analysis (1M ctx)'],
      avoid_for: ['on-prem or air-gapped deployments', 'strict data-residency outside Google Cloud'],
      benchmarks: [
        { name: 'SWE-bench Verified', score: '80.6%', source: 'Google model card', date: '2026-02-19' },
      ],
    },
  },
  {
    slug: 'gemini-3-7-flash',
    litellm: ['gemini-3.7-flash'],
    helicone: null,
    note: 'promo price until 2026-12-31, then $1.50/$7.50',
    seed: {
      name: 'Gemini 3.7 Flash',
      provider: 'Google',
      open_weights: false,
      best_for: ['agentic workflows', 'multimodal tasks on a budget'],
      avoid_for: ['hardest reasoning tasks (use 3.1 Pro)', 'open-weights requirements'],
    },
  },
  {
    slug: 'gemini-3-5-flash-lite',
    litellm: ['gemini-3.5-flash-lite'],
    helicone: null,
    seed: {
      name: 'Gemini 3.5 Flash-Lite',
      provider: 'Google',
      open_weights: false,
      best_for: ['cheapest GA Gemini: high-volume workloads', 'bulk classification and extraction'],
      avoid_for: ['frontier reasoning (use 3.1 Pro)', 'open-weights requirements'],
    },
  },
  // --- DeepSeek (open weights, MIT; 1M ctx) ---
  {
    slug: 'deepseek-v4-pro',
    litellm: [], // LiteLLM lists reseller (DashScope/Azure) prices, not the official ones
    helicone: null,
    fallback: { input: 1.32, output: 3.96 },
    context_fallback: 1000000,
    note: 'official peak price (off-peak $0.66/$1.98); new peak/off-peak price list effective 2026-08-16',
    seed: {
      name: 'DeepSeek V4 Pro',
      provider: 'DeepSeek',
      open_weights: true,
      best_for: ['flagship agentic coding (open weights)', 'self-hosted frontier-class workloads'],
      avoid_for: ['strict compliance/data-residency requirements (China-hosted API)', 'sub-second latency requirements'],
      benchmarks: [
        { name: 'Terminal-Bench 2.1', score: '87.9', source: 'DeepSeek official changelog', date: '2026-08-13' },
      ],
    },
  },
  {
    slug: 'deepseek-v4-flash',
    litellm: [],
    helicone: null,
    fallback: { input: 0.44, output: 1.32 },
    context_fallback: 1000000,
    note: 'official peak price (off-peak $0.22/$0.66); new peak/off-peak price list effective 2026-08-16',
    seed: {
      name: 'DeepSeek V4 Flash',
      provider: 'DeepSeek',
      open_weights: true,
      best_for: ['fast cheap line: high-volume chat and batch', 'self-hosted MoE deployments'],
      avoid_for: ['strict compliance/data-residency requirements (China-hosted API)', 'top-tier agentic coding (use V4 Pro)'],
    },
  },
  // --- Kimi (Moonshot) ---
  {
    slug: 'kimi-k3',
    litellm: [], // not in LiteLLM/Helicone yet
    helicone: null,
    fallback: { input: 3, output: 15 },
    context_fallback: 1000000,
    note: 'cached input $0.30/1M; open weights (modified MIT) released 2026-07-27',
    seed: {
      name: 'Kimi K3',
      provider: 'Moonshot AI (Kimi)',
      open_weights: true,
      best_for: ['long-horizon coding', 'deep reasoning (2.8T flagship with open weights)'],
      avoid_for: ['budget high-volume workloads', 'strict license-cleanliness requirements (modified MIT)'],
    },
  },
  // --- xAI ---
  {
    slug: 'grok-4-6',
    litellm: [], // not in LiteLLM/Helicone yet
    helicone: null,
    fallback: { input: 2, output: 6 },
    context_fallback: 500000,
    note: '≥200K input bills at 2x',
    seed: {
      name: 'Grok 4.6',
      provider: 'xAI',
      open_weights: false,
      best_for: ['flagship coding and tool-calling', 'reasoning with real-time X context'],
      avoid_for: ['on-prem or open-weights requirements', 'budget high-volume workloads'],
    },
  },
  {
    slug: 'grok-build-0-1',
    litellm: ['xai/grok-build-0.1'],
    helicone: null,
    seed: {
      name: 'Grok Build 0.1',
      provider: 'xAI',
      open_weights: false,
      best_for: ['agentic coding engine', 'autonomous build loops'],
      avoid_for: ['general-purpose chat', 'open-weights requirements'],
    },
  },
  // --- Meta ---
  {
    slug: 'muse-spark-1-2',
    litellm: [], // LiteLLM only knows muse-spark-1.1
    helicone: null,
    fallback: { input: 1.25, output: 4.25 },
    context_fallback: 1000000,
    note: 'cached input $0.15/1M; first paid Meta API',
    seed: {
      name: 'Muse Spark 1.2',
      provider: 'Meta',
      open_weights: false,
      best_for: ['agentic coding at ~4x below frontier price', 'high-volume production workloads'],
      avoid_for: ['open-weights or on-prem requirements', 'teams needing a long pricing track record'],
    },
  },
  // --- Open-weights flagships ---
  {
    slug: 'qwen3-8-max',
    litellm: ['dashscope/qwen3.8-max'],
    helicone: null,
    context_override: 1000000, // vendor lists 1M; DashScope entry caps at 991808
    note: 'GA 2026-08-03; open-weights 2.4T-A95B MoE',
    seed: {
      name: 'Qwen3.8 Max',
      provider: 'Alibaba (Qwen)',
      open_weights: true,
      best_for: ['autonomous coding (open-weights flagship)', 'self-hosted frontier-class deployments'],
      avoid_for: ['teams needing a first-party managed SLA', 'small-GPU self-hosting (2.4T MoE)'],
    },
  },
  {
    slug: 'glm-5-2',
    litellm: ['dashscope/glm-5.2'],
    helicone: null,
    note: 'open weights (MIT)',
    seed: {
      name: 'GLM 5.2',
      provider: 'Z.ai (GLM)',
      open_weights: true,
      best_for: ['long-horizon agentic coding', 'self-hosted deployments (MIT)'],
      avoid_for: ['teams needing a first-party managed SLA', 'latency-critical autocomplete'],
      benchmarks: [
        { name: 'Terminal-Bench 2.1', score: '81.0', source: 'official docs.z.ai', date: '2026-06-13' },
        { name: 'SWE-bench Pro', score: '62.1', source: 'official docs.z.ai', date: '2026-06-13' },
      ],
    },
  },
  {
    slug: 'minimax-m3',
    litellm: ['minimax/MiniMax-M3'],
    helicone: null,
    note: 'price applies to ≤512K context',
    seed: {
      name: 'MiniMax M3',
      provider: 'MiniMax',
      open_weights: true,
      best_for: ['coding agents on a budget', 'long-context workloads (1M ctx)'],
      avoid_for: ['frontier-accuracy tasks', 'teams needing a first-party managed SLA'],
    },
  },
  {
    slug: 'mistral-large-2512',
    litellm: ['mistral/mistral-large-2512'],
    helicone: null,
    note: 'open weights (Apache-2.0)',
    seed: {
      name: 'Mistral Large 3',
      provider: 'Mistral AI',
      open_weights: true,
      best_for: ['flagship general + vision (Apache-2.0)', 'european data-residency deployments'],
      avoid_for: ['cheapest-possible bulk workloads', 'frontier agentic coding (use DeepSeek V4 Pro / GLM 5.2)'],
    },
  },
  {
    slug: 'llama-4-maverick',
    litellm: ['groq/meta-llama/llama-4-maverick-17b-128e-instruct'],
    helicone: null,
    context_override: 1000000, // model supports 1M; Groq host caps at 128K
    note: 'third-party hosted price (~$0.20–0.27 / $0.60–0.85 across hosts); Meta shut down its own Llama API 2026-07-06',
    seed: {
      name: 'Llama 4 Maverick',
      provider: 'Meta',
      open_weights: true,
      best_for: ['open MoE flagship (400B): self-hosted multimodal', 'fine-tuning base for custom models'],
      avoid_for: ['teams that need a managed first-party API (Meta Llama API closed 2026-07-06)', 'use cases restricted by the Llama community license'],
    },
  },
  // --- Media (unit-priced; per-mtok fields stay 0) ---
  {
    slug: 'veo-3-1-generate',
    litellm: [], // LiteLLM entries carry no price fields for Veo 3.1
    helicone: null,
    note: 'Unit pricing: $0.40/sec 720–1080p with audio, $0.60/sec 4K; fast $0.10–0.30/sec; lite $0.05–0.08/sec (vendor pricing page, 2026-08-15); per-mtok fields set to 0 (no token price exists)',
    seed: {
      name: 'Veo 3.1',
      provider: 'Google',
      open_weights: false,
      price_unit: 'video_second',
      price_amount: 0.4,
      best_for: ['top-tier video generation with synchronized audio', 'high-fidelity 720p–4K clips'],
      avoid_for: ['budget bulk generation (per-second pricing)', 'open or self-hosted video pipelines'],
    },
  },
  {
    slug: 'eleven-v3',
    litellm: [], // LiteLLM lists $0.00018/char; vendor page says $0.10 per 1K chars
    helicone: null,
    note: 'Unit pricing: $0.10 per 1K characters (vendor pricing page, 2026-08-15); 70+ languages; per-mtok fields set to 0 (no token price exists)',
    seed: {
      name: 'Eleven v3',
      provider: 'ElevenLabs',
      open_weights: false,
      price_unit: 'character',
      price_amount: 0.0001,
      best_for: ['flagship TTS: expressive speech with emotion tags', 'multilingual voiceover and audiobooks (70+ languages)'],
      avoid_for: ['speech-to-text (this is TTS, not transcription)', 'self-hosted voice pipelines'],
    },
  },
  {
    slug: 'flux-2-pro',
    litellm: [], // azure_ai/flux.2-pro lists $0.04/image; vendor page starts at $0.03
    helicone: null,
    note: 'Unit pricing: from $0.03 per image (vendor pricing page, 2026-08-15); open Apache-2.0 variant FLUX.2 Klein 4B from $0.014; per-mtok fields set to 0 (no token price exists)',
    seed: {
      name: 'FLUX 2 Pro',
      provider: 'Black Forest Labs',
      open_weights: false,
      price_unit: 'image',
      price_amount: 0.03,
      best_for: ['production text-to-image via API', 'fast high-quality product/marketing shots'],
      avoid_for: ['open-weights pipelines (use FLUX.2 Klein 4B, Apache-2.0)', 'per-token cost accounting — priced per image'],
    },
  },
  {
    slug: 'whisper-v3',
    litellm: ['groq/whisper-large-v3'],
    helicone: null,
    seed: {
      name: 'Whisper Large v3',
      provider: 'OpenAI',
      open_weights: true,
      price_unit: 'audio_second',
      best_for: ['self-hosted speech-to-text (MIT weights)', 'cheap batch transcription via Groq', 'multilingual ASR'],
      avoid_for: ['speaker diarization out of the box', 'sub-second real-time captioning'],
    },
  },
];

const KEY_ORDER = [
  'name',
  'provider',
  'context_window',
  'price_input_per_mtok',
  'price_output_per_mtok',
  'price_unit',
  'price_amount',
  'open_weights',
  'best_for',
  'avoid_for',
  'benchmarks',
  'source_attribution',
  'last_verified',
];

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'noemium-fetch-model-data' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

/** Quote strings that YAML would otherwise re-parse as another type. */
function scalar(v) {
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v);
  if (
    s === '' ||
    /^\d{4}-\d{2}-\d{2}$/.test(s) ||
    /^[\d.]+$/.test(s) ||
    /^(true|false|null|yes|no)$/i.test(s) ||
    /[:#\[\]{}",&*!|>'%@`]/.test(s) ||
    s !== s.trim()
  ) {
    return JSON.stringify(s);
  }
  return s;
}

function toYaml(data) {
  const lines = [];
  for (const key of KEY_ORDER) {
    if (!(key in data) || data[key] === undefined) continue;
    const v = data[key];
    if (Array.isArray(v)) {
      lines.push(`${key}:`);
      for (const item of v) {
        if (typeof item === 'object') {
          const entries = Object.entries(item);
          lines.push(`  - ${entries[0][0]}: ${scalar(entries[0][1])}`);
          for (const [k, val] of entries.slice(1)) lines.push(`    ${k}: ${scalar(val)}`);
        } else {
          lines.push(`  - ${scalar(item)}`);
        }
      }
    } else {
      lines.push(`${key}: ${scalar(v)}`);
    }
  }
  return lines.join('\n') + '\n';
}

/** Per-token costs -> per-1M-token dollars, or null when the entry is not token-priced. */
function litellmTokenPrices(entry) {
  if (entry?.input_cost_per_token != null && entry?.output_cost_per_token != null) {
    return {
      input: +(entry.input_cost_per_token * 1e6).toFixed(4),
      output: +(entry.output_cost_per_token * 1e6).toFixed(4),
    };
  }
  return null;
}

/** Human-readable non-token price note from a LiteLLM entry (image/second/character...). */
function litellmUnitNote(entry) {
  const units = {
    output_cost_per_image: 'per image',
    input_cost_per_image: 'per image',
    output_cost_per_video_per_second: 'per video second',
    output_cost_per_second: 'per second',
    input_cost_per_second: 'per audio second',
    input_cost_per_character: 'per character',
  };
  const parts = [];
  for (const [field, label] of Object.entries(units)) {
    const v = entry?.[field];
    if (v != null && v > 0) {
      let s = `$${+v.toPrecision(4)} ${label}`;
      // Tiny per-second rates read better with a per-hour equivalent.
      if (field.endsWith('per_second') && v < 0.01) s += ` (~$${+(v * 3600).toPrecision(3)} per hour)`;
      parts.push(s);
    }
  }
  return parts.length ? parts.join(', ') : null;
}

const [heliconeRaw, litellm] = await Promise.all([fetchJson(HELICONE_URL), fetchJson(LITELLM_URL)]);
const helicone = heliconeRaw.data ?? [];
console.log(`fetched: ${helicone.length} Helicone entries, ${Object.keys(litellm).length} LiteLLM entries\n`);

const report = [];
let created = 0;
let updated = 0;

for (const m of MODELS) {
  const filePath = path.join(MODELS_DIR, `${m.slug}.yaml`);
  let priceIn = null;
  let priceOut = null;
  let contextWindow = null;
  let unitNote = null;
  let priceSource = null;
  let litellmKey = null;

  const findHelicone = () =>
    m.helicone
      ? helicone.find((e) => e.provider === m.helicone.provider && e.model === m.helicone.model)
      : null;

  // 0) Helicone-first models (e.g. official vendor price beats reseller listings).
  if (m.prefer === 'helicone') {
    const hit = findHelicone();
    if (hit && hit.input_cost_per_1m > 0) {
      priceIn = hit.input_cost_per_1m;
      priceOut = hit.output_cost_per_1m;
      priceSource = 'helicone';
    }
  }

  // 1) LiteLLM candidates (first hit wins) — prices and context window.
  for (const key of m.litellm ?? []) {
    const entry = litellm[key];
    if (!entry) continue;
    const prices = litellmTokenPrices(entry);
    if (prices) {
      if (priceSource === null) {
        priceIn = prices.input;
        priceOut = prices.output;
        priceSource = 'litellm';
        litellmKey = key;
      }
      contextWindow = entry.max_input_tokens ?? entry.max_tokens ?? null;
      break;
    }
    const note = litellmUnitNote(entry);
    if (note) {
      // Non-token model: real unit price goes into source_attribution.
      unitNote = note;
      priceSource = 'litellm';
      litellmKey = key;
      contextWindow = entry.max_input_tokens ?? entry.max_tokens ?? null;
      break;
    }
  }

  // 2) Helicone fallback for token prices.
  if (priceSource === null) {
    const hit = findHelicone();
    if (hit && hit.input_cost_per_1m > 0) {
      priceIn = hit.input_cost_per_1m;
      priceOut = hit.output_cost_per_1m;
      priceSource = 'helicone';
    }
  }

  // 3) Vendor-seed fallback for models neither source knows (or knows only
  //    via resellers) — prices verified by hand on the vendor pricing page.
  if (priceSource === null && m.fallback) {
    priceIn = m.fallback.input;
    priceOut = m.fallback.output;
    priceSource = 'vendor';
  }

  // Cross-check when both sources have token prices (warn-only).
  const hHit = findHelicone();
  if (priceSource && hHit && priceIn != null && hHit.input_cost_per_1m > 0) {
    const ratio = priceIn / hHit.input_cost_per_1m;
    if (ratio > 2 || ratio < 0.5) {
      console.warn(
        `WARN  ${m.slug}: price mismatch resolved $${priceIn}/$${priceOut} (${priceSource}) vs Helicone $${hHit.input_cost_per_1m}/$${hHit.output_cost_per_1m} — using ${priceSource}`,
      );
    }
  }

  if (contextWindow == null && !unitNote) contextWindow = m.context_fallback ?? null;
  // Manual override wins over source data (e.g. vendor docs newer than LiteLLM).
  if (m.context_override != null) contextWindow = m.context_override;

  // Attribution naming.
  const priceAttr =
    priceSource === 'litellm'
      ? `LiteLLM model_prices_and_context_window.json (MIT, key ${litellmKey})`
      : priceSource === 'helicone'
        ? 'Helicone LLM Cost API (Apache-2.0)'
        : priceSource === 'vendor'
          ? `vendor pricing page, ${TODAY}`
          : null;

  const parts = [];
  if (unitNote) {
    parts.push(`Non-token pricing: ${unitNote} (${priceAttr}); per-mtok fields set to 0 (no token price exists)`);
  } else if (priceAttr) {
    parts.push(`Prices: ${priceAttr}`);
  }
  if (contextWindow != null && !unitNote && litellmKey && priceSource !== 'litellm') {
    parts.push('context window: LiteLLM (MIT)');
  }
  if (m.note) parts.push(m.note);
  parts.push(`snapshot ${TODAY}`);
  const attribution = parts.join('; ');

  // 4) Merge with existing file or create from seed.
  let data;
  let isNew = false;
  if (existsSync(filePath)) {
    data = yaml.load(readFileSync(filePath, 'utf8'), { schema: yaml.JSON_SCHEMA, filename: filePath });
  } else {
    isNew = true;
    data = { ...m.seed };
  }

  if (priceIn != null) {
    data.price_input_per_mtok = priceIn;
    data.price_output_per_mtok = priceOut;
  } else if (unitNote) {
    data.price_input_per_mtok = 0;
    data.price_output_per_mtok = 0;
  } else if (isNew) {
    data.price_input_per_mtok = 0;
    data.price_output_per_mtok = 0;
  }
  const isMedia = unitNote || (data.price_unit && data.price_unit !== 'mtok');
  if (isMedia) {
    // Media models have no token context window — omit the field entirely
    // (the schema marks it optional) instead of writing a placeholder.
    delete data.context_window;
  } else if (contextWindow != null) {
    data.context_window = contextWindow;
  } else if (isNew && data.context_window == null) {
    data.context_window = m.context_fallback ?? 1;
  }
  data.source_attribution = attribution;
  data.last_verified = TODAY;

  writeFileSync(filePath, toYaml(data));
  if (isNew) created++;
  else updated++;

  report.push({
    slug: m.slug,
    in: data.price_input_per_mtok,
    out: data.price_output_per_mtok,
    ctx: data.context_window,
    src: unitNote ? `unit (${unitNote})` : (priceSource ?? 'NOT FOUND'),
    status: isNew ? 'created' : 'merged',
  });
}

console.log('slug                | $in/M    | $out/M   | ctx      | source                         | status');
console.log('-'.repeat(100));
for (const r of report) {
  console.log(
    `${r.slug.padEnd(19)} | ${String(r.in).padEnd(8)} | ${String(r.out).padEnd(8)} | ${String(r.ctx).padEnd(8)} | ${r.src.padEnd(30)} | ${r.status}`,
  );
}
const matched = report.filter((r) => r.src !== 'NOT FOUND').length;
console.log(`\n${created} created, ${updated} merged, ${matched}/${report.length} with price data, snapshot ${TODAY}`);

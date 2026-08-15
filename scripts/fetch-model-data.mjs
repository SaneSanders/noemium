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
 *  context_fallback: used when no source reports a context window (token
 *            models only). Media models have no token context at all — the
 *            field is simply omitted for them (the schema marks it optional).
 *  seed:     curated fields, written only when creating a new file.
 */
const MODELS = [
  {
    slug: 'gpt-5',
    litellm: ['gpt-5'],
    helicone: { provider: 'OPENAI', model: 'gpt-5' },
    seed: {
      name: 'GPT-5',
      provider: 'OpenAI',
      open_weights: false,
      best_for: ['agentic coding and multi-step tool use', 'complex reasoning over mixed text/image input', 'general-purpose production chat'],
      avoid_for: ['high-volume cheap classification (use gpt-5-mini)', 'on-prem or air-gapped deployments'],
      benchmarks: [
        { name: 'SWE-bench Verified', score: '74.9%', source: 'OpenAI GPT-5 announcement', date: '2025-08-07' },
      ],
    },
  },
  {
    slug: 'gpt-5-mini',
    litellm: ['gpt-5-mini'],
    helicone: { provider: 'OPENAI', model: 'gpt-5-mini' },
    seed: {
      name: 'GPT-5 mini',
      provider: 'OpenAI',
      open_weights: false,
      best_for: ['cheap batch classification', 'high-throughput support chat', 'structured extraction at scale'],
      avoid_for: ['hardest reasoning tasks (use full GPT-5 or o3)', 'open-weights requirements'],
    },
  },
  {
    slug: 'o3',
    litellm: ['o3'],
    helicone: { provider: 'OPENAI', model: 'o3-2025-04-16' },
    seed: {
      name: 'o3',
      provider: 'OpenAI',
      open_weights: false,
      best_for: ['deep math/science reasoning', 'complex debugging and code analysis', 'multi-step agentic planning'],
      avoid_for: ['latency-sensitive chat (long thinking traces)', 'cost-sensitive high-volume workloads'],
    },
  },
  {
    slug: 'o4-mini',
    litellm: ['o4-mini'],
    helicone: { provider: 'OPENAI', model: 'o4-mini' },
    seed: {
      name: 'o4-mini',
      provider: 'OpenAI',
      open_weights: false,
      best_for: ['fast reasoning on a budget', 'math and coding at scale', 'batch reasoning jobs'],
      avoid_for: ['frontier-accuracy tasks (use o3)', 'deployments outside the OpenAI API'],
    },
  },
  {
    slug: 'claude-sonnet-4-5',
    litellm: ['claude-sonnet-4-5'],
    helicone: { provider: 'ANTHROPIC', model: 'claude-sonnet-4-5-20250929' },
    seed: {
      name: 'Claude Sonnet 4.5',
      provider: 'Anthropic',
      open_weights: false,
      best_for: ['agentic coding and multi-step tool use', 'long-document analysis', 'instruction following with tight constraints'],
      avoid_for: ['latency-critical autocomplete at scale (cost per call)', 'on-prem or air-gapped deployments'],
      benchmarks: [
        { name: 'SWE-bench Verified', score: '77.2%', source: 'Anthropic model card', date: '2025-09-29' },
      ],
    },
  },
  {
    slug: 'claude-opus-4-1',
    litellm: ['claude-opus-4-1'],
    helicone: { provider: 'ANTHROPIC', model: 'claude-opus-4-1-20250805' },
    seed: {
      name: 'Claude Opus 4.1',
      provider: 'Anthropic',
      open_weights: false,
      best_for: ['hardest agentic coding tasks', 'long-horizon autonomous agents', 'deep research and analysis'],
      avoid_for: ['cost-sensitive bulk workloads', 'sub-second latency requirements'],
      benchmarks: [
        { name: 'SWE-bench Verified', score: '74.5%', source: 'Anthropic announcement', date: '2025-08-05' },
      ],
    },
  },
  {
    slug: 'claude-haiku-3-5',
    litellm: ['heroku/claude-3-5-haiku', 'vertex_ai/claude-3-5-haiku'],
    helicone: { provider: 'ANTHROPIC', model: 'claude-3-5-haiku-20241022' },
    prefer: 'helicone', // official Anthropic price ($0.8/$4); LiteLLM resellers list $1/$5
    context_fallback: 200000,
    seed: {
      name: 'Claude Haiku 3.5',
      provider: 'Anthropic',
      open_weights: false,
      best_for: ['cheap high-volume classification', 'low-latency autocomplete-style tasks', 'bulk summarization'],
      avoid_for: ['frontier reasoning or agentic coding', 'tasks needing the newest Claude features'],
    },
  },
  {
    slug: 'gemini-2-5-pro',
    litellm: ['gemini/gemini-2.5-pro', 'gemini-2.5-pro'],
    helicone: { provider: 'GOOGLE', model: 'gemini-2.5-pro' },
    seed: {
      name: 'Gemini 2.5 Pro',
      provider: 'Google',
      open_weights: false,
      best_for: ['long-document analysis (1M token context)', 'multimodal video/audio understanding', 'reasoning over huge codebases'],
      avoid_for: ['on-prem or air-gapped deployments', 'strict data-residency outside Google Cloud'],
    },
  },
  {
    slug: 'gemini-2-5-flash',
    litellm: ['gemini/gemini-2.5-flash', 'gemini-2.5-flash'],
    helicone: { provider: 'GOOGLE', model: 'gemini-2.5-flash' },
    seed: {
      name: 'Gemini 2.5 Flash',
      provider: 'Google',
      open_weights: false,
      best_for: ['cheap batch classification at scale', 'low-latency production chat', 'multimodal tasks on a budget'],
      avoid_for: ['hardest reasoning tasks (use 2.5 Pro)', 'open-weights requirements'],
    },
  },
  {
    slug: 'deepseek-v3',
    litellm: ['deepseek/deepseek-chat'],
    helicone: null, // Helicone deepseek-chat price is stale/wrong by >10x; LiteLLM only
    seed: {
      name: 'DeepSeek V3',
      provider: 'DeepSeek',
      open_weights: true,
      best_for: ['cheap general-purpose chat at scale', 'self-hosted MoE deployments', 'high-volume batch workloads'],
      avoid_for: ['strict compliance/data-residency requirements (China-hosted API)', 'top-tier reasoning (use R1)'],
      benchmarks: [
        { name: 'MMLU', score: '88.5%', source: 'DeepSeek-V3 technical report (arXiv:2412.19437)', date: '2024-12-26' },
      ],
    },
  },
  {
    slug: 'deepseek-r1',
    litellm: ['deepseek/deepseek-reasoner', 'deepseek/deepseek-r1'],
    helicone: { provider: 'OPENROUTER', model: 'deepseek/deepseek-r1' },
    seed: {
      name: 'DeepSeek R1',
      provider: 'DeepSeek',
      open_weights: true,
      best_for: ['reasoning on a budget', 'self-hosted chain-of-thought workloads', 'math and code proofs'],
      avoid_for: ['latency-critical apps (long thinking traces)', 'tool-use-heavy agent loops'],
      benchmarks: [
        { name: 'AIME 2024', score: '79.8%', source: 'DeepSeek-R1 paper (arXiv:2501.12948)', date: '2025-01-20' },
      ],
    },
  },
  {
    slug: 'qwen3',
    litellm: ['openrouter/qwen/qwen3-235b-a22b-2507'],
    helicone: { provider: 'OPENROUTER', model: 'qwen/qwen3-235b-a22b-2507' },
    seed: {
      name: 'Qwen3 235B A22B',
      provider: 'Alibaba (Qwen)',
      open_weights: true,
      best_for: ['self-hosted multilingual chat (Apache-2.0)', 'commercial self-host without license friction', 'hybrid thinking/non-thinking modes'],
      avoid_for: ['teams needing a first-party managed SLA', 'small-GPU self-hosting (235B MoE)'],
    },
  },
  {
    slug: 'llama-4',
    litellm: [
      'groq/meta-llama/llama-4-maverick-17b-128e-instruct',
      'fireworks_ai/accounts/fireworks/models/llama4-maverick-instruct-basic',
    ],
    helicone: null, // Helicone LLAMA/* entries report 0/0 — unusable
    seed: {
      name: 'Llama 4 Maverick',
      provider: 'Meta',
      open_weights: true,
      best_for: ['self-hosted multimodal MoE', 'fine-tuning base for custom models', 'on-prem enterprise deployments'],
      avoid_for: ['teams that need a managed first-party API', 'use cases restricted by the Llama community license'],
    },
  },
  {
    slug: 'mistral-large',
    litellm: ['mistral/mistral-large-latest'],
    helicone: null, // Helicone reports 2000/6000 per 1M — off by 1000x
    seed: {
      name: 'Mistral Large',
      provider: 'Mistral AI',
      open_weights: false,
      best_for: ['european data-residency deployments', 'strong multilingual chat (FR/DE/ES)', 'agentic function calling'],
      avoid_for: ['open-weights requirements (Large line is proprietary)', 'cheapest-possible bulk workloads'],
    },
  },
  {
    slug: 'grok-4',
    litellm: ['xai/grok-4'],
    helicone: { provider: 'X', model: 'grok-4' },
    seed: {
      name: 'Grok 4',
      provider: 'xAI',
      open_weights: false,
      best_for: ['reasoning with real-time X/Twitter context', 'long-context analysis (256k)', 'heavy math/science benchmarks'],
      avoid_for: ['on-prem or open-weights requirements', 'budget high-volume workloads'],
    },
  },
  {
    slug: 'flux-1-1-pro',
    litellm: ['azure_ai/FLUX-1.1-pro'],
    helicone: null,
    seed: {
      name: 'FLUX 1.1 Pro',
      provider: 'Black Forest Labs',
      open_weights: false,
      best_for: ['production text-to-image via API', 'fast high-quality product/marketing shots'],
      avoid_for: ['open-weights pipelines (use FLUX.1 [dev]/[schnell])', 'per-token cost accounting — priced per image'],
    },
  },
  {
    slug: 'sora',
    litellm: ['openai/sora-2'],
    helicone: null,
    seed: {
      name: 'Sora 2',
      provider: 'OpenAI',
      open_weights: false,
      best_for: ['text-to-video generation', 'creative storyboarding and concept clips'],
      avoid_for: ['deterministic brand-safe pipelines', 'per-token budgeting — priced per video second'],
    },
  },
  {
    slug: 'veo-3',
    litellm: ['vertex_ai/veo-3.0-generate-001'],
    helicone: null,
    seed: {
      name: 'Veo 3',
      provider: 'Google',
      open_weights: false,
      best_for: ['video generation with native audio', 'high-fidelity short clips via Vertex AI'],
      avoid_for: ['budget bulk generation (per-second pricing)', 'open or self-hosted video pipelines'],
    },
  },
  {
    slug: 'eleven-v3',
    litellm: ['elevenlabs/eleven_v3'],
    helicone: null,
    seed: {
      name: 'Eleven v3',
      provider: 'ElevenLabs',
      open_weights: false,
      best_for: ['expressive text-to-speech with emotion tags', 'multilingual voiceover and audiobooks'],
      avoid_for: ['speech-to-text (this is TTS, not transcription)', 'self-hosted voice pipelines'],
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

  // Attribution naming.
  const priceAttr =
    priceSource === 'litellm'
      ? `LiteLLM model_prices_and_context_window.json (MIT, key ${litellmKey})`
      : priceSource === 'helicone'
        ? 'Helicone LLM Cost API (Apache-2.0)'
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
  parts.push(`snapshot ${TODAY}`);
  const attribution = parts.join('; ');

  // 3) Merge with existing file or create from seed.
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
  if (unitNote) {
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

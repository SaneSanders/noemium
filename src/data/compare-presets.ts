/**
 * Curated same-category tool pairs for static `/tools/compare/<a>-vs-<b>/` landing pages.
 *
 * Curation rule (deterministic):
 * 1. Same category only — a cross-category matchup is filtered out.
 * 2. Anchor first: within a category, start with tools that have `featured: true` or
 *    that act as category anchors in `src/lib/shelf.ts` (e.g. chatgpt, cursor).
 * 3. Pair each anchor with its closest same-category rivals, preferring:
 *    - the same verdict tier (`ship` with `ship`, etc.)
 *    - the freshest `last_verified`
 *    - the clearest high-intent rivalry (well-known named alternatives).
 * 4. List order inside a pair is anchor first, rival second; slug order in the URL
 *    matches this list exactly.
 *
 * Pairs that disappear from the catalog are caught by build-time validation in
 * the route's getStaticPaths.
 */
export interface ComparePair {
  a: string;
  b: string;
}

export const COMPARE_PAIRS: ComparePair[] = [
  // coding — anchors: cursor, claude-code
  { a: 'cursor', b: 'claude-code' },
  { a: 'cursor', b: 'github-copilot' },
  { a: 'claude-code', b: 'github-copilot' },
  { a: 'bolt-new', b: 'lovable' },
  { a: 'cursor', b: 'windsurf' },
  { a: 'cline', b: 'cursor' },
  { a: 'kimi-code', b: 'claude-code' },
  { a: 'openai-codex', b: 'jules' },
  { a: 'bolt-new', b: 'replit-agent' },
  { a: 'warp', b: 'clinch' },

  // productivity — anchor: chatgpt
  { a: 'chatgpt', b: 'claude' },
  { a: 'chatgpt', b: 'gemini' },
  { a: 'chatgpt', b: 'grok' },
  { a: 'claude', b: 'gemini' },
  { a: 'perplexity', b: 'exa' },

  // audio — anchor: elevenlabs
  { a: 'elevenlabs', b: 'cartesia' },
  { a: 'elevenlabs', b: 'deepgram' },
  { a: 'elevenlabs', b: 'murf' },
  { a: 'suno', b: 'udio' },
  { a: 'elevenlabs', b: 'inworld-tts' },

  // automation
  { a: 'zapier', b: 'activepieces' },
  { a: 'zapier', b: 'n8n' },
  { a: 'n8n', b: 'activepieces' },

  // dev-infra
  { a: 'ollama', b: 'vllm' },
  { a: 'ollama', b: 'open-webui' },
  { a: 'openrouter', b: 'together-ai' },
  { a: 'groq', b: 'fireworks-ai' },
  { a: 'inngest', b: 'temporal' },

  // image — anchor: midjourney
  { a: 'midjourney', b: 'flux' },
  { a: 'midjourney', b: 'adobe-firefly' },
  { a: 'midjourney', b: 'krea' },
  { a: 'gpt-image', b: 'seedream' },
  { a: 'midjourney', b: 'grok-imagine' },

  // video — anchor: runway
  { a: 'runway', b: 'veo-3' },
  { a: 'runway', b: 'kling' },
  { a: 'runway', b: 'luma-dream-machine' },
  { a: 'runway', b: 'descript' },
  { a: 'invideo', b: 'capcut' },

  // writing — anchor: jasper
  { a: 'jasper', b: 'writer' },
  { a: 'sudowrite', b: 'jenni' },
  { a: 'grammarly', b: 'languagetool' },

  // models-api
  { a: 'amazon-bedrock', b: 'google-vertex-ai' },
  { a: 'openai-api', b: 'amazon-bedrock' },

  // agents
  { a: 'crewai', b: 'singular' },

  // design
  { a: 'figma', b: 'penpot' },
];

#!/usr/bin/env node
/**
 * One-shot seeder for the two-layer catalog wave. Idempotent: skips files
 * that already exist. Not part of CI.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TODAY = '2026-08-26';

function yaml(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${pad}${k}: []`);
        continue;
      }
      if (typeof v[0] === 'object') {
        lines.push(`${pad}${k}:`);
        for (const item of v) {
          const [first, ...rest] = yaml(item, indent + 2).split('\n');
          lines.push(`${pad}  - ${first.trimStart()}`);
          for (const r of rest) lines.push(r);
        }
      } else {
        lines.push(`${pad}${k}:`);
        for (const item of v) lines.push(`${pad}  - ${quote(item)}`);
      }
    } else if (v && typeof v === 'object') {
      lines.push(`${pad}${k}:`);
      lines.push(yaml(v, indent + 1));
    } else if (typeof v === 'boolean' || typeof v === 'number') {
      lines.push(`${pad}${k}: ${v}`);
    } else {
      lines.push(`${pad}${k}: ${quote(String(v))}`);
    }
  }
  return lines.join('\n');
}

function quote(s) {
  return JSON.stringify(s);
}

function write(rel, obj) {
  const file = path.join(ROOT, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${yaml(obj)}\n`);
  console.log(`write ${rel}`);
  return true;
}

function evidence(url, extra = []) {
  const kinds = ['availability', 'install', 'requirements', 'pricing', 'security', ...extra];
  return [...new Set(kinds)].map((kind) => ({ kind, url, checked_at: TODAY }));
}

const harnesses = [
  {
    slug: 'claude-code',
    name: 'Claude Code',
    vendor: 'Anthropic',
    tagline: 'Anthropic terminal coding harness: edits, runs tests, and uses git inside the repo.',
    url: 'https://docs.anthropic.com/en/docs/claude-code',
    catalog_tool: 'claude-code',
    license_kind: 'proprietary',
    maturity: 'stable',
    summary:
      'Claude Code is Anthropic\'s local coding harness. It lives in the repository, runs tools, and shares the Claude Pro/Max usage pool. This guide is the field-guide twin of the /tools/claude-code/ card.',
    best_for: [
      'Terminal-native agents on a Claude seat you already pay for',
      'Multi-file refactors you will still review before merge',
    ],
    deployment: ['local', 'hybrid'],
    verdict: 'ship',
    verdict_text:
      'Strong agentic coding in the repo. The bill climbs on a big tree, and it rewrites with more confidence than the diff always earns.',
    install: [
      {
        method: 'command',
        platform: 'macOS, Linux, WSL',
        command: 'curl -fsSL https://claude.ai/install.sh | bash',
        url: 'https://docs.anthropic.com/en/docs/claude-code/quickstart',
      },
    ],
    requirements: [
      'A Claude Pro or Max seat, or an Anthropic API key',
      'A git repository the harness is allowed to edit',
    ],
    providers: ['Claude Pro / Max', 'Anthropic API'],
    channels: ['interactive terminal', 'headless CLI'],
    cost_scenarios: [
      {
        name: 'Claude Pro seat',
        monthly_usd_min: 17,
        monthly_usd_max: 20,
        assumptions: 'Plan list price; Code shares the same usage pool as claude.ai chat.',
      },
      {
        name: 'Claude Max 5x',
        monthly_usd_min: 100,
        monthly_usd_max: 100,
        assumptions: 'Max 5x list; extra usage bills at API rates after the pool.',
      },
    ],
    security: {
      privilege: 'high',
      data_boundary: 'Repo contents and tool results leave the machine toward Anthropic unless you use a private setup you control.',
      cautions: [
        'Do not run unsupervised on secrets-bearing repos.',
        'Review large diffs; the harness is confident.',
      ],
    },
    limitations: [
      'Usage is shared with claude.ai chat on the same seat.',
      'No first-party GUI diff viewer.',
      'API-billed overflow on large repos escalates fast.',
    ],
    evidence: evidence('https://docs.anthropic.com/en/docs/claude-code'),
  },
  {
    slug: 'openai-codex',
    name: 'OpenAI Codex',
    vendor: 'OpenAI',
    tagline: 'OpenAI coding harness spanning terminal CLI, IDE, and cloud tasks on ChatGPT plans.',
    url: 'https://github.com/openai/codex',
    catalog_tool: 'openai-codex',
    license_kind: 'osi-open-source',
    maturity: 'stable',
    summary:
      'Codex is the product you run against a repo, not a second Responses API card. Local CLI is open-source; cloud tasks and GitHub review sit on ChatGPT Plus and up.',
    best_for: [
      'Repo work on an OpenAI seat you already have',
      'Mixed local CLI and cloud tasks inside the ChatGPT plan',
    ],
    deployment: ['local', 'hybrid', 'managed'],
    verdict: 'situational',
    verdict_text:
      'Lowest-friction OpenAI coding agent if you already pay for ChatGPT. Caps sit on a five-hour window and credits replaced per-message billing.',
    install: [
      {
        method: 'command',
        platform: 'npm',
        command: 'npm i -g @openai/codex',
        url: 'https://github.com/openai/codex',
      },
    ],
    requirements: [
      'A ChatGPT account or OpenAI API key',
      'Node.js for the CLI install path',
    ],
    providers: ['ChatGPT Free/Go/Plus/Pro', 'OpenAI API'],
    channels: ['interactive terminal', 'IDE', 'cloud tasks'],
    cost_scenarios: [
      {
        name: 'ChatGPT Plus',
        monthly_usd_min: 20,
        monthly_usd_max: 20,
        assumptions: 'Plus list; cloud GitHub review is Plus-and-up. Local CLI can also burn API credits.',
      },
      {
        name: 'ChatGPT Pro 20x',
        monthly_usd_min: 200,
        monthly_usd_max: 200,
        assumptions: 'Pro 20x list; extra credits after the 5-hour window.',
      },
    ],
    security: {
      privilege: 'high',
      data_boundary: 'Conversation and repo context leave for OpenAI hosted agents. Local CLI still sends prompts to OpenAI unless you point it at a custom endpoint the docs currently allow.',
      cautions: [
        'Cloud tasks are Plus-and-up and run off your machine.',
        'Do not treat the 5-hour window as a hard sandbox.',
      ],
    },
    limitations: [
      'Local and cloud usage share a rolling 5-hour window.',
      'Token-credit metering makes a session cost hard to predict.',
      'No self-host of the hosted cloud agent.',
    ],
    evidence: evidence('https://github.com/openai/codex', ['license']),
  },
  {
    slug: 'cursor',
    name: 'Cursor',
    vendor: 'Anysphere',
    tagline: 'AI-first editor (VS Code fork) with agent mode, tab completions, and a headless CLI.',
    url: 'https://cursor.com',
    catalog_tool: 'cursor',
    license_kind: 'proprietary',
    maturity: 'stable',
    summary:
      'Cursor remains the default AI editor. Agent mode and tab completions save hours; model routing is a black box. The desktop app is the product; cursor-agent is the headless twin.',
    best_for: [
      'Daily product coding in a VS Code layout',
      'Multi-file agent runs when you can sit with the diff',
    ],
    deployment: ['local', 'managed'],
    verdict: 'ship',
    verdict_text:
      'Still the default AI editor. Pro token limits throttle heavy agent months, and you cannot audit or self-host the editor.',
    install: [
      {
        method: 'download',
        platform: 'macOS, Windows, Linux',
        url: 'https://cursor.com/download',
      },
    ],
    requirements: [
      'A Cursor account (Hobby free, Pro $20/mo and up)',
      'A project folder the editor is allowed to index',
    ],
    providers: ['Cursor bundled models', 'optional API keys where the product allows'],
    channels: ['desktop editor', 'headless CLI'],
    cost_scenarios: [
      {
        name: 'Hobby',
        monthly_usd_min: 0,
        monthly_usd_max: 0,
        assumptions: 'Free Hobby limits. Agent work hits the ceiling fast.',
      },
      {
        name: 'Pro',
        monthly_usd_min: 20,
        monthly_usd_max: 20,
        assumptions: 'Pro list. Heavy agent months still throttle.',
      },
      {
        name: 'Ultra',
        monthly_usd_min: 200,
        monthly_usd_max: 200,
        assumptions: 'Ultra 20× agent limits.',
      },
    ],
    security: {
      privilege: 'high',
      data_boundary: 'Source is indexed locally and sent to Cursor/model providers. Trains-on-inputs is yes on the catalog card.',
      cautions: [
        'Closed source; no self-host.',
        'Privacy mode is a setting, not a proof.',
      ],
    },
    limitations: [
      'Pro plan token limits throttle heavy agent sessions mid-month.',
      'Closed source; no way to self-host or audit data handling.',
      'Black-box model routing.',
    ],
    evidence: evidence('https://cursor.com/docs'),
  },
  {
    slug: 'amp',
    name: 'Amp',
    vendor: 'Sourcegraph',
    tagline: 'Sourcegraph agentic coding harness with orb-hours and optional ChatGPT/Grok attachment.',
    url: 'https://ampcode.com',
    catalog_tool: 'amp',
    license_kind: 'proprietary',
    maturity: 'beta',
    summary:
      'Amp is the product Sourcegraph actually pushes (Cody is the skip). Closed, hosted, second-IDE habit, with a $20 Megawatt on-ramp.',
    best_for: [
      'Developers who want agentic coding in a second IDE and already tolerate Sourcegraph',
      'Teams reusing a ChatGPT or SuperGrok subscription at no Amp markup',
    ],
    deployment: ['managed', 'hybrid'],
    verdict: 'situational',
    verdict_text:
      'Credible agentic coding from Sourcegraph. No public free tier. Orb hours and included agent dollars are two different meters.',
    install: [
      { method: 'download', platform: 'desktop', url: 'https://ampcode.com' },
    ],
    requirements: ['An Amp account', 'A workspace the product can index'],
    providers: ['Amp bundled', 'optional ChatGPT / SuperGrok attachment'],
    channels: ['desktop IDE', 'agent sessions'],
    cost_scenarios: [
      {
        name: 'Megawatt',
        monthly_usd_min: 20,
        monthly_usd_max: 20,
        assumptions: '750 orb-hours and $20 included agent usage at list.',
      },
      {
        name: 'Gigawatt',
        monthly_usd_min: 200,
        monthly_usd_max: 200,
        assumptions: 'Gigawatt list; unconstrained usage billing on top.',
      },
    ],
    security: {
      privilege: 'high',
      data_boundary: 'Hosted Sourcegraph product. Code leaves your machine for Amp inference.',
      cautions: ['No public free tier to evaluate privately.', 'Manual team billing — no auto-seat provisioning yet.'],
    },
    limitations: [
      'No public free tier on the Amp pricing page.',
      'Max two subscriptions per human; orbs are not a resale compute pool.',
      'Team workspace billing is manual.',
    ],
    evidence: evidence('https://ampcode.com/pricing'),
  },
  {
    slug: 'opencode',
    name: 'OpenCode',
    vendor: 'anomalyco',
    tagline: 'Open-source coding harness with TUI, headless serve, and an OpenAPI control surface.',
    url: 'https://opencode.ai',
    catalog_tool: 'opencode',
    license_kind: 'osi-open-source',
    maturity: 'beta',
    summary:
      'OpenCode spins a full agent loop in the project: edit, test, commit. Good on well-scoped tasks with tests. Less mature editor integration than Cursor.',
    best_for: [
      'Bounded coding jobs with existing test coverage',
      'A terminal agent when you do not want a full AI IDE',
    ],
    deployment: ['local'],
    verdict: 'ship',
    verdict_text:
      'Full agent loop in the repo. Still rough on large refactors and can hallucinate library APIs.',
    install: [
      {
        method: 'command',
        platform: 'npm',
        command: 'npm i -g opencode',
        url: 'https://opencode.ai',
      },
    ],
    requirements: ['Node.js', 'A repository with a working test command if you want the loop to close'],
    providers: ['BYOK / configured model'],
    channels: ['interactive TUI', 'headless serve'],
    cost_scenarios: [
      {
        name: 'Open-source harness',
        monthly_usd_min: 0,
        monthly_usd_max: 0,
        assumptions: 'Binary is free; you pay the model.',
      },
      {
        name: 'Paid OpenCode plan',
        monthly_usd_min: 20,
        monthly_usd_max: 20,
        assumptions: 'Vendor paid plan from $20/mo as listed on the site.',
      },
    ],
    security: {
      privilege: 'high',
      data_boundary: 'Local process with shell and file access. Model traffic goes to whatever provider you configure.',
      cautions: ['Treat headless serve as an open control plane.', 'Do not YOLO-approve on untrusted trees.'],
    },
    limitations: [
      'Agent loops can wander on ambiguous requirements.',
      'Less mature editor integration than Cursor or Windsurf.',
    ],
    evidence: evidence('https://github.com/anomalyco/opencode', ['license']),
  },
  {
    slug: 'aider',
    name: 'Aider',
    vendor: 'Paul Gauthier',
    tagline: 'Git-native terminal pair-programmer. BYOK, automatic commits, no IDE lock-in.',
    url: 'https://aider.chat',
    catalog_tool: 'aider',
    license_kind: 'osi-open-source',
    maturity: 'stable',
    summary:
      'The terminal purist harness. Works with almost any model, including local weights. Automatic commits are the product, not a plugin.',
    best_for: [
      'Git-native terminal work with automatic commits',
      'Cheap Chinese or local models instead of a $20 IDE seat',
    ],
    deployment: ['local'],
    verdict: 'ship',
    verdict_text:
      'Wire up a good model and this beats most paid IDEs for a fraction of the cost. You bring the key and the taste.',
    install: [
      {
        method: 'command',
        platform: 'pip',
        command: 'python -m pip install aider-chat',
        url: 'https://aider.chat/docs/install.html',
      },
    ],
    requirements: ['Python 3', 'A git repo', 'An API key or local model endpoint'],
    providers: ['BYOK — OpenAI, Anthropic, Gemini, local, others'],
    channels: ['interactive terminal'],
    cost_scenarios: [
      {
        name: 'Harness only',
        monthly_usd_min: 0,
        monthly_usd_max: 0,
        assumptions: 'Aider is free. Model spend is yours.',
      },
    ],
    security: {
      privilege: 'high',
      data_boundary: 'Code and diffs go to the model provider you configure. Commits are local git.',
      cautions: ['Automatic commits are a feature — review the log.', 'A leaked API key is your incident, not Aider\'s.'],
    },
    limitations: [
      'No first-party GUI.',
      'Quality is the model you wired, not a bundled "smart" router.',
    ],
    evidence: evidence('https://aider.chat/docs/install.html', ['license']),
  },
  {
    slug: 'cline',
    name: 'Cline',
    vendor: 'Cline',
    tagline: 'Open-source VS Code agent that plans, edits, and runs commands in the editor.',
    url: 'https://cline.bot',
    catalog_tool: 'cline',
    license_kind: 'osi-open-source',
    maturity: 'stable',
    summary:
      'Cline is the in-editor open agent: plan, edit, terminal, MCP. You bring a model. It is not a Cursor clone with a different skin — it is a VS Code extension with a visible plan.',
    best_for: [
      'VS Code users who want an open agent instead of a forked IDE',
      'BYOK setups that already live in VS Code',
    ],
    deployment: ['local'],
    verdict: 'situational',
    verdict_text:
      'Strong open VS Code agent. You operate the model bill and the permission prompts. Not the fastest path if you wanted a battery-included editor.',
    install: [
      { method: 'package', platform: 'VS Code marketplace', url: 'https://cline.bot' },
    ],
    requirements: ['VS Code or a compatible fork', 'A model provider or API key'],
    providers: ['BYOK'],
    channels: ['VS Code extension'],
    cost_scenarios: [
      {
        name: 'Extension only',
        monthly_usd_min: 0,
        monthly_usd_max: 0,
        assumptions: 'Cline is free. Inference is the bill.',
      },
    ],
    security: {
      privilege: 'high',
      data_boundary: 'The extension can edit files and run commands. Prompts go to the provider you set.',
      cautions: ['Auto-approve is a loaded gun.', 'Review MCP servers the same way you review extensions.'],
    },
    limitations: [
      'You operate permissions and spend.',
      'Editor-bound — no first-party headless control plane.',
    ],
    evidence: evidence('https://cline.bot', ['license']),
  },
  {
    slug: 'goose',
    name: 'Goose',
    vendor: 'Block / AAIF',
    tagline: 'Open local agent from Block: recipes, MCP, BYOK, desktop and CLI.',
    url: 'https://github.com/aaif-goose/goose',
    catalog_tool: 'goose',
    license_kind: 'osi-open-source',
    maturity: 'beta',
    summary:
      'A local agent you can actually read. Recipes and extensions, runs on your machine against whatever provider you wire. Quality is the model.',
    best_for: [
      'Local-first agents with MCP and recipes',
      'Teams that want to read the harness, not rent it',
    ],
    deployment: ['local'],
    verdict: 'situational',
    verdict_text:
      'Readable local agent. You pay the model. Maturity is still catching the closed IDEs on polish.',
    install: [
      {
        method: 'command',
        platform: 'macOS / Linux',
        command: 'curl -fsSL https://github.com/block/goose/releases/latest/download/download_cli.sh | bash',
        url: 'https://github.com/aaif-goose/goose',
      },
    ],
    requirements: ['A supported OS', 'A model provider or local endpoint'],
    providers: ['BYOK'],
    channels: ['CLI', 'desktop'],
    cost_scenarios: [
      {
        name: 'Harness only',
        monthly_usd_min: 0,
        monthly_usd_max: 0,
        assumptions: 'Apache-licensed. Model spend is yours.',
      },
    ],
    security: {
      privilege: 'high',
      data_boundary: 'Local process. Tool and MCP access are the threat surface.',
      cautions: ['Review recipes the way you review shell scripts.', 'Pin extension sources.'],
    },
    limitations: [
      'Polish trails Cursor/Claude Code.',
      'You own provider outages and keys.',
    ],
    evidence: evidence('https://github.com/aaif-goose/goose', ['license']),
  },
  {
    slug: 'pi',
    name: 'Pi',
    vendor: 'Mario Zechner',
    tagline: 'Minimal open coding-agent toolkit: TUI, SDK, RPC, extend instead of feature-bloat.',
    url: 'https://pi.dev',
    catalog_tool: 'pi',
    license_kind: 'osi-open-source',
    maturity: 'beta',
    summary:
      'Small prompt, tree-structured sessions, 15+ providers, bias toward building the feature as an extension.',
    best_for: [
      'People who want a small harness they can extend',
      'RPC/SDK integration rather than a full IDE',
    ],
    deployment: ['local'],
    verdict: 'situational',
    verdict_text:
      'Minimal on purpose. If you wanted batteries included, this is the wrong product. If you wanted a core, it is the point.',
    install: [
      {
        method: 'command',
        platform: 'npm',
        command: 'npm i -g @mariozechner/pi-coding-agent',
        url: 'https://pi.dev',
      },
    ],
    requirements: ['Node.js', 'A model provider'],
    providers: ['BYOK — 15+ providers documented on the site'],
    channels: ['TUI', 'SDK', 'RPC'],
    cost_scenarios: [
      {
        name: 'Harness only',
        monthly_usd_min: 0,
        monthly_usd_max: 0,
        assumptions: 'Packages are free. You pay the model.',
      },
    ],
    security: {
      privilege: 'high',
      data_boundary: 'Local. RPC widens the surface if you expose it.',
      cautions: ['Do not expose the RPC port to the network.', 'Extensions are code you run.'],
    },
    limitations: [
      'You assemble the product around the core.',
      'Not a team control plane.',
    ],
    evidence: evidence('https://pi.dev', ['license']),
  },
  {
    slug: 'kilo-code',
    name: 'Kilo Code',
    vendor: 'Kilo',
    tagline: 'Open BYOK coding harness spanning IDE, CLI, and cloud routing.',
    url: 'https://kilo.ai',
    catalog_tool: 'kilo-code',
    license_kind: 'osi-open-source',
    maturity: 'beta',
    summary:
      'Open harness that will take local, BYOK, or cloud routing. Useful when you refuse a locked vendor IDE and still want an agent in the editor.',
    best_for: [
      'BYOK/local routing in an IDE-shaped agent',
      'People comparing open harnesses against Cline/Continue',
    ],
    deployment: ['local', 'hybrid'],
    verdict: 'situational',
    verdict_text:
      'Open and flexible. You operate the model quality. Not a reason to leave Cursor if Cursor already pays for itself.',
    install: [{ method: 'web', platform: 'docs', url: 'https://kilo.ai' }],
    requirements: ['An editor Kilo supports', 'A model route'],
    providers: ['BYOK', 'local', 'optional cloud routing'],
    channels: ['IDE', 'CLI', 'cloud'],
    cost_scenarios: [
      {
        name: 'Harness only',
        monthly_usd_min: 0,
        monthly_usd_max: 0,
        assumptions: 'Software is free/open. Model spend is the bill.',
      },
    ],
    security: {
      privilege: 'high',
      data_boundary: 'Local edits plus whatever provider you route to.',
      cautions: ['Cloud routing is a different privacy story than local BYOK.', 'Treat marketplace plugins as untrusted code.'],
    },
    limitations: [
      'You operate routing and quality.',
      'Docs and polish move fast; re-verify before a team rollout.',
    ],
    evidence: evidence('https://kilo.ai', ['license']),
  },
];

const skills = [
  {
    slug: 'superpowers',
    name: 'Superpowers',
    tagline: 'obra\'s Claude Code skill pack: brainstorm, plan, subagents, TDD, and finish-the-job discipline.',
    url: 'https://github.com/obra/superpowers',
    compatible: ['claude-code'],
    install: 'Install from the repo into ~/.claude/skills (see README). Do not curl|bash a random fork.',
    summary:
      'A curated set of SKILL.md files for Claude Code. The point is process (plan, then implement, then verify), not a prompt pack you paste once.',
    limitations: [
      'Written for Claude Code paths; other harnesses may ignore SKILL.md layout.',
      'A skill is instructions, not a sandbox — it can still tell the agent to do something dumb.',
    ],
    evidence_tier: 'source-verified',
    verdict: 'situational',
    verdict_text:
      'The most cited Claude Code skill pack. Useful if you wanted the harness to stop cowboy-coding. Not a substitute for tests you actually run.',
    related_tools: ['claude-code'],
    related_agents: ['claude-code'],
    receipts: ['https://github.com/obra/superpowers'],
  },
  {
    slug: 'anthropic-skills',
    name: 'Anthropic skills',
    tagline: 'Official Anthropic SKILL.md collection — documents, mcp-builder, skill-creator, and related starters.',
    url: 'https://github.com/anthropics/skills',
    compatible: ['claude-code'],
    install: 'Clone anthropics/skills and copy the skill folder you want into the harness skills directory.',
    summary:
      'Canonical upstream for several document and meta skills. Prefer this repo over random marketplace copies.',
    limitations: [
      'A monorepo of many skills — pick one, do not dump the tree into every project.',
      'Official does not mean field-tested on your stack.',
    ],
    evidence_tier: 'source-verified',
    verdict: 'situational',
    verdict_text:
      'Start here when you want an official SKILL.md, not a scrape of skills.sh. Still instructions, still needs a receipt in the repo that uses it.',
    related_tools: ['claude-code'],
    related_agents: ['claude-code'],
    receipts: ['https://github.com/anthropics/skills'],
  },
  {
    slug: 'frontend-design',
    name: 'frontend-design',
    tagline: 'Anthropic skill that pushes the agent toward distinctive UI instead of generic AI-slop layouts.',
    url: 'https://github.com/anthropics/skills',
    compatible: ['claude-code'],
    install: 'Copy the frontend-design skill directory from anthropics/skills into the project or user skills folder.',
    summary:
      'A design-taste skill, not a component library. It changes what the agent aims at. It does not ship tokens or a design system for you.',
    limitations: [
      'Taste is subjective; this will not match a locked brand kit.',
      'Lives inside the anthropics/skills tree — pin a commit.',
    ],
    evidence_tier: 'radar',
    related_tools: ['claude-code'],
    receipts: ['https://github.com/anthropics/skills'],
  },
  {
    slug: 'skill-creator',
    name: 'skill-creator',
    tagline: 'Official meta-skill for writing new SKILL.md files that a harness will actually load.',
    url: 'https://github.com/anthropics/skills',
    compatible: ['claude-code', 'generic'],
    install: 'Copy skill-creator from anthropics/skills, then have the agent write a new skill against that template.',
    summary:
      'Use this when the job is "capture a repeatable workflow as a skill", not when the job is to ship product code.',
    limitations: [
      'Easy to generate skill spam. One skill per real loop.',
      'Does not validate that the new skill works in Cursor or OpenClaw.',
    ],
    evidence_tier: 'radar',
    receipts: ['https://github.com/anthropics/skills'],
  },
  {
    slug: 'mcp-builder',
    name: 'mcp-builder',
    tagline: 'Official skill for scaffolding an MCP server instead of hand-rolling stdio boilerplate.',
    url: 'https://github.com/anthropics/skills',
    compatible: ['claude-code'],
    install: 'Copy mcp-builder from anthropics/skills. Point it at the server you actually need, not a toy echo tool.',
    summary:
      'A generator for MCP servers. The resulting server still needs auth, scopes, and a threat model.',
    limitations: [
      'Generated MCP is not a security review.',
      'Official MCP registry remains preview — publishing is a separate job.',
    ],
    evidence_tier: 'radar',
    related_tools: ['github-mcp'],
    receipts: ['https://github.com/anthropics/skills'],
  },
  {
    slug: 'docx',
    name: 'docx',
    tagline: 'Anthropic document skill for creating and editing Word .docx from the agent.',
    url: 'https://github.com/anthropics/skills',
    compatible: ['claude-code'],
    install: 'Copy the docx skill from anthropics/skills (document-skills).',
    summary: 'Gives the agent a documented path to Office files. Not a replacement for a human legal review of the output.',
    limitations: ['Complex tracked-changes / styles will drift.', 'You still open the file in Word.'],
    evidence_tier: 'radar',
    receipts: ['https://github.com/anthropics/skills'],
  },
  {
    slug: 'pdf',
    name: 'pdf',
    tagline: 'Anthropic document skill for reading and writing PDFs from the agent.',
    url: 'https://github.com/anthropics/skills',
    compatible: ['claude-code'],
    install: 'Copy the pdf skill from anthropics/skills (document-skills).',
    summary: 'Useful for form-ish PDFs and reports. Scanned pages still need OCR you provide.',
    limitations: ['Scans and layout-heavy pages fail closed.', 'Not a PDF/A compliance tool.'],
    evidence_tier: 'radar',
    receipts: ['https://github.com/anthropics/skills'],
  },
  {
    slug: 'xlsx',
    name: 'xlsx',
    tagline: 'Anthropic document skill for spreadsheets the agent can actually write, not dump as CSV.',
    url: 'https://github.com/anthropics/skills',
    compatible: ['claude-code'],
    install: 'Copy the xlsx skill from anthropics/skills (document-skills).',
    summary: 'Better than "here is a CSV" when the job is an Excel artifact. Formulas still need a human eye.',
    limitations: ['Pivot-heavy workbooks will lie.', 'Macros are a threat, not a feature.'],
    evidence_tier: 'radar',
    receipts: ['https://github.com/anthropics/skills'],
  },
  {
    slug: 'pptx',
    name: 'pptx',
    tagline: 'Anthropic document skill for PowerPoint decks generated from a brief.',
    url: 'https://github.com/anthropics/skills',
    compatible: ['claude-code'],
    install: 'Copy the pptx skill from anthropics/skills (document-skills).',
    summary: 'Deck output for people who already accepted that the agent will design like an agent.',
    limitations: ['Brand kits will not survive.', 'Speaker notes are extra work.'],
    evidence_tier: 'radar',
    receipts: ['https://github.com/anthropics/skills'],
  },
  {
    slug: 'vercel-agent-skills',
    name: 'Vercel agent skills',
    tagline: 'Vercel Labs skills for React/Next agent workflows — not a marketplace dump.',
    url: 'https://github.com/vercel-labs/agent-skills',
    compatible: ['claude-code', 'cursor', 'generic'],
    install: 'Clone vercel-labs/agent-skills and copy the skill you need. Read the repo README for the current layout.',
    summary:
      'A small official-ish set from Vercel Labs. Use as discovery, then pin. Do not treat Labs as a stability contract.',
    limitations: [
      'Labs repos move or vanish.',
      'Next.js-shaped; not a generic frontend skill.',
    ],
    evidence_tier: 'radar',
    receipts: ['https://github.com/vercel-labs/agent-skills'],
  },
  {
    slug: 'openclaw-skills',
    name: 'OpenClaw skills',
    tagline: 'Skills/plugins as OpenClaw actually loads them — persistent personal agent, not a coding-harness SKILL.md.',
    url: 'https://docs.openclaw.ai',
    compatible: ['openclaw'],
    install: 'Follow OpenClaw docs for skills/plugins. Do not paste a Claude Code SKILL.md and expect it to boot.',
    summary:
      'OpenClaw has its own skill surface (always-on personal agent). Compatible with this catalog\'s /agents/openclaw/ guide, not with Cursor.',
    limitations: [
      'Different object than Claude Code SKILL.md.',
      'Always-on + skills is a larger security boundary than a one-shot coding agent.',
    ],
    evidence_tier: 'radar',
    related_agents: ['openclaw'],
    receipts: ['https://docs.openclaw.ai'],
  },
  {
    slug: 'hermes-skills',
    name: 'Hermes learning loop',
    tagline: 'Nous Hermes agent can write and improve its own skills — treat new skills as untrusted code.',
    url: 'https://hermes-agent.nousresearch.com/docs/getting-started/quickstart/',
    compatible: ['hermes'],
    install: 'Use Hermes setup; the learning loop is part of the agent, not a file you copy from skills.sh.',
    summary:
      'The interesting part of Hermes is that it authors skills. That is also the supply-chain part. Review what it writes.',
    limitations: [
      'Self-written skills can encode the agent\'s last mistake.',
      'Not portable to Claude Code without a rewrite.',
    ],
    evidence_tier: 'radar',
    related_agents: ['hermes-agent'],
    receipts: ['https://hermes-agent.nousresearch.com/docs/getting-started/quickstart/'],
  },
];

const radarTools = [
  {
    slug: 'continue-dev',
    name: 'Continue',
    tagline: 'Open-source IDE agent (VS Code/JetBrains) with hub configs, BYOK, and local models.',
    url: 'https://continue.dev',
    category: 'coding',
    pricing: 'freemium',
    price_note: 'OSS extension free; Continue Hub has paid team features',
    free_tier: true,
    open_source: true,
    api: true,
    self_host: true,
    limitations: [
      'Noemium has not field-run Continue in this wave — listing is from the project site and GitHub.',
      'Hub vs local config is two products; do not assume the OSS extension equals the cloud hub.',
    ],
    receipts: ['https://continue.dev', 'https://github.com/continuedev/continue'],
    momentum: 'blueshift',
  },
  {
    slug: 'tabby',
    name: 'Tabby',
    tagline: 'Self-hosted coding assistant: completions and an agent, runs on your GPU or a small box.',
    url: 'https://tabby.tabbyml.com',
    category: 'coding',
    pricing: 'free',
    price_note: 'Apache-2.0 self-host; you pay the hardware',
    free_tier: true,
    open_source: true,
    api: true,
    self_host: true,
    limitations: [
      'Radar: we have not reproduced a Tabby deploy here.',
      'Quality is the local model, not a Cursor-class bundled router.',
    ],
    receipts: ['https://tabby.tabbyml.com', 'https://github.com/TabbyML/tabby'],
    momentum: 'steady',
  },
  {
    slug: 'open-interpreter',
    name: 'Open Interpreter',
    tagline: 'Natural-language computer use: a ChatGPT-like prompt that runs code locally.',
    url: 'https://openinterpreter.com',
    category: 'coding',
    pricing: 'freemium',
    price_note: 'OSS local; optional hosted/computer-use products',
    free_tier: true,
    open_source: true,
    api: true,
    self_host: true,
    limitations: [
      'Full local computer use is a critical privilege boundary.',
      'Radar: we have not reproduced current install against this year\'s CLI.',
    ],
    receipts: ['https://openinterpreter.com', 'https://github.com/openinterpreter/open-interpreter'],
    momentum: 'steady',
  },
  {
    slug: 'rytr',
    name: 'Rytr',
    tagline: 'Cheap consumer writing assistant with templates and a small free allowance.',
    url: 'https://rytr.me',
    category: 'writing',
    pricing: 'freemium',
    free_tier: true,
    open_source: false,
    api: true,
    self_host: false,
    limitations: [
      'Radar: vendor site only. Not compared in the field against Jasper/Sudowrite.',
      'Template writers age badly when models jump.',
    ],
    receipts: ['https://rytr.me'],
    momentum: 'redshift',
  },
  {
    slug: 'wordtune',
    name: 'Wordtune',
    tagline: 'AI rewrite/compose assistant from AI21, aimed at emails and docs rather than long-form novels.',
    url: 'https://www.wordtune.com',
    category: 'writing',
    pricing: 'freemium',
    free_tier: true,
    open_source: false,
    api: false,
    self_host: false,
    limitations: [
      'Radar: no field run. Browser-extension privacy not verified here.',
      'Not a replacement for a model API you already pay for.',
    ],
    receipts: ['https://www.wordtune.com'],
    momentum: 'steady',
  },
  {
    slug: 'quillbot',
    name: 'QuillBot',
    tagline: 'Paraphrase / grammar / citation helper, still a student-tool more than an agent stack.',
    url: 'https://quillbot.com',
    category: 'writing',
    pricing: 'freemium',
    free_tier: true,
    open_source: false,
    api: false,
    self_host: false,
    limitations: [
      'Radar: paraphrasers are a crowded, low-trust category.',
      'Citation features need a primary-source check, not this card.',
    ],
    receipts: ['https://quillbot.com'],
    momentum: 'steady',
  },
  {
    slug: 'typeface',
    name: 'Typeface',
    tagline: 'Enterprise brand-safe generative content platform (not a consumer writer).',
    url: 'https://www.typeface.ai',
    category: 'writing',
    pricing: 'paid',
    free_tier: false,
    open_source: false,
    api: true,
    self_host: false,
    limitations: [
      'Radar: sales-led pricing, no public list we verified this week.',
      'Enterprise brand vaults are the product; a solo founder does not need this.',
    ],
    receipts: ['https://www.typeface.ai'],
    momentum: 'steady',
  },
  {
    slug: 'hypotenuse-ai',
    name: 'Hypotenuse AI',
    tagline: 'E-commerce and SEO copy generator with bulk article workflows.',
    url: 'https://www.hypotenuse.ai',
    category: 'writing',
    pricing: 'freemium',
    free_tier: true,
    open_source: false,
    api: true,
    self_host: false,
    limitations: [
      'Radar: SEO bulk writers are a graveyard-adjacent category.',
      'Output quality not reproduced here.',
    ],
    receipts: ['https://www.hypotenuse.ai'],
    momentum: 'steady',
  },
  {
    slug: 'langflow',
    name: 'Langflow',
    tagline: 'Open visual framework for RAG and multi-agent graphs, now under IBM/DataStax.',
    url: 'https://www.langflow.org',
    category: 'automation',
    pricing: 'freemium',
    free_tier: true,
    open_source: true,
    api: true,
    self_host: true,
    limitations: [
      'Radar: no field run. IBM/DataStax gravity may change the OSS cadence.',
      'Graphs screenshot well and fail in production the same way all visual LLM builders do.',
    ],
    receipts: ['https://www.langflow.org', 'https://github.com/langflow-ai/langflow'],
    momentum: 'blueshift',
  },
  {
    slug: 'dust',
    name: 'Dust',
    tagline: 'Team agents over company data: connectors, workflows, and a managed workspace.',
    url: 'https://dust.tt',
    category: 'automation',
    pricing: 'freemium',
    free_tier: true,
    open_source: true,
    api: true,
    self_host: false,
    limitations: [
      'Radar: connector security not reviewed here.',
      'A workspace product, not a drop-in n8n replacement.',
    ],
    receipts: ['https://dust.tt', 'https://github.com/dust-tt/dust'],
    momentum: 'blueshift',
  },
  {
    slug: 'voiceflow',
    name: 'Voiceflow',
    tagline: 'Collaborative builder for support/voice/chat agents with a design-tool UX.',
    url: 'https://www.voiceflow.com',
    category: 'automation',
    pricing: 'freemium',
    free_tier: true,
    open_source: false,
    api: true,
    self_host: false,
    limitations: [
      'Radar: no field run of current pricing or runtime.',
      'Prototype-to-prod gap is the usual failure mode of canvas builders.',
    ],
    receipts: ['https://www.voiceflow.com'],
    momentum: 'steady',
  },
  {
    slug: 'relay-app',
    name: 'Relay.app',
    tagline: 'AI-native workflow product with human-in-the-loop steps, aimed at ops not iPaaS veterans.',
    url: 'https://www.relay.app',
    category: 'automation',
    pricing: 'freemium',
    free_tier: true,
    open_source: false,
    api: true,
    self_host: false,
    limitations: [
      'Radar: vendor marketing is ahead of our reproduction.',
      'Human-in-the-loop is the feature — it will not fully replace n8n.',
    ],
    receipts: ['https://www.relay.app'],
    momentum: 'blueshift',
  },
  {
    slug: 'notion-mcp',
    name: 'Notion MCP',
    tagline: 'Official Notion MCP server — workspace pages and databases as tools for coding agents.',
    url: 'https://github.com/makenotion/notion-mcp-server',
    category: 'mcp',
    pricing: 'free',
    price_note: 'Server is free; you need a Notion workspace and integration token',
    free_tier: true,
    open_source: true,
    api: true,
    self_host: true,
    limitations: [
      'Radar: OAuth/token scopes not reproduced in this wave.',
      'A writable Notion integration is a data-exfil path. Least privilege or skip.',
    ],
    receipts: ['https://github.com/makenotion/notion-mcp-server', 'https://developers.notion.com/docs/mcp'],
    momentum: 'blueshift',
  },
  {
    slug: 'postgres-mcp',
    name: 'Postgres MCP',
    tagline: 'Reference MCP server for querying Postgres — useful and easy to point at production by mistake.',
    url: 'https://github.com/modelcontextprotocol/servers',
    category: 'mcp',
    pricing: 'free',
    free_tier: true,
    open_source: true,
    api: true,
    self_host: true,
    limitations: [
      'Radar: the official servers monorepo moves; pin a path/commit.',
      'Read-write SQL from an agent is a high-privilege boundary. Use a read replica or skip.',
    ],
    receipts: ['https://github.com/modelcontextprotocol/servers'],
    momentum: 'steady',
  },
  {
    slug: 'brave-search-mcp',
    name: 'Brave Search MCP',
    tagline: 'Official-ish MCP wrapper around Brave Search API for agents that need web results without a browser.',
    url: 'https://github.com/modelcontextprotocol/servers',
    category: 'mcp',
    pricing: 'freemium',
    price_note: 'Server free; Brave Search API has a free tier then paid',
    free_tier: true,
    open_source: true,
    api: true,
    self_host: true,
    limitations: [
      'Radar: API quota and current package name not re-verified beyond the servers repo.',
      'Search quality ≠ Tavily-style LLM-ready snippets.',
    ],
    receipts: ['https://github.com/modelcontextprotocol/servers', 'https://brave.com/search/api/'],
    momentum: 'steady',
  },
  {
    slug: 'cloudflare-mcp',
    name: 'Cloudflare MCP',
    tagline: 'Cloudflare MCP servers for Workers/docs/builds — agent access to the account, not just docs search.',
    url: 'https://developers.cloudflare.com/agents/model-context-protocol/',
    category: 'mcp',
    pricing: 'free',
    price_note: 'MCP is free; Cloudflare usage is the bill',
    free_tier: true,
    open_source: true,
    api: true,
    self_host: false,
    limitations: [
      'Radar: account-scoped MCP can mutate production Workers.',
      'Docs URL is the receipt; we have not run every Cloudflare MCP server in this wave.',
    ],
    receipts: ['https://developers.cloudflare.com/agents/model-context-protocol/'],
    momentum: 'blueshift',
  },
  {
    slug: 'atlassian-mcp',
    name: 'Atlassian MCP',
    tagline: 'Jira/Confluence MCP so the coding agent can read tickets instead of pasting them into chat.',
    url: 'https://www.atlassian.com/platform/remote-mcp-server',
    category: 'mcp',
    pricing: 'freemium',
    price_note: 'Requires an Atlassian cloud site; MCP itself is not a separate SKU we found',
    free_tier: false,
    open_source: false,
    api: true,
    self_host: false,
    limitations: [
      'Radar: remote MCP + company Jira is a data-boundary decision, not a toy.',
      'On-prem Jira is a different story — this card is cloud-shaped.',
    ],
    receipts: ['https://www.atlassian.com/platform/remote-mcp-server'],
    momentum: 'blueshift',
  },
  {
    slug: 'hume-ai',
    name: 'Hume AI',
    tagline: 'Expressive voice / EVI APIs — emotion-conditioned speech, not a generic TTS clone.',
    url: 'https://www.hume.ai',
    category: 'audio',
    pricing: 'freemium',
    free_tier: true,
    open_source: false,
    api: true,
    self_host: false,
    limitations: [
      'Radar: pricing and emotion-model claims not reproduced here.',
      'Voice cloning / affect is a consent minefield in production.',
    ],
    receipts: ['https://www.hume.ai', 'https://dev.hume.ai'],
    momentum: 'blueshift',
  },
  {
    slug: 'kokoro-tts',
    name: 'Kokoro',
    tagline: 'Small open TTS model (82M) that runs locally at usable quality for the size.',
    url: 'https://github.com/hexgrad/kokoro',
    category: 'audio',
    pricing: 'free',
    free_tier: true,
    open_source: true,
    api: false,
    self_host: true,
    limitations: [
      'Radar: we have not bench\'d Kokoro against ElevenLabs on a studio job.',
      'Local GPU/CPU story depends on the runtime you wrap it in.',
    ],
    receipts: ['https://github.com/hexgrad/kokoro'],
    momentum: 'blueshift',
  },
  {
    slug: 'wellsaid',
    name: 'WellSaid',
    tagline: 'Studio TTS for enterprise voiceovers, older than the ElevenLabs wave, still sold into learning/ops.',
    url: 'https://wellsaidlabs.com',
    category: 'audio',
    pricing: 'paid',
    free_tier: false,
    open_source: false,
    api: true,
    self_host: false,
    limitations: [
      'Radar: no current price page reproduced this week.',
      'If you wanted character/emotion, Hume/ElevenLabs are the comparison set, not this card as a verdict.',
    ],
    receipts: ['https://wellsaidlabs.com'],
    momentum: 'steady',
  },
  {
    slug: 'azure-speech',
    name: 'Azure AI Speech',
    tagline: 'Microsoft speech-to-text, TTS, and translation APIs — boring, regional, and actually contractable.',
    url: 'https://azure.microsoft.com/products/ai-services/ai-speech',
    category: 'audio',
    pricing: 'paid',
    price_note: 'Azure meter; free trial credits exist on new accounts',
    free_tier: true,
    open_source: false,
    api: true,
    self_host: false,
    limitations: [
      'Radar: we did not re-price the meter this week — open the Azure calculator.',
      'Enterprise procurement is the feature; indie UX is not.',
    ],
    receipts: ['https://azure.microsoft.com/products/ai-services/ai-speech', 'https://learn.microsoft.com/azure/ai-services/speech-service/'],
    momentum: 'steady',
  },
  {
    slug: 'void-editor',
    name: 'Void',
    tagline: 'Open-source Cursor-like editor: local-first, bring your own model, no Anysphere account.',
    url: 'https://github.com/voideditor/void',
    category: 'coding',
    pricing: 'free',
    free_tier: true,
    open_source: true,
    api: true,
    self_host: true,
    limitations: [
      'Radar: OSS editor forks churn. Pin a release.',
      'Not a drop-in Cursor extension marketplace.',
    ],
    receipts: ['https://github.com/voideditor/void', 'https://voideditor.com'],
    momentum: 'blueshift',
  },
];

let n = 0;
for (const h of harnesses) {
  const { slug, ...rest } = h;
  if (write(`src/content/agents/${slug}.yaml`, {
    ...rest,
    agent_layer: 'coding-harness',
    evidence_tier: 'source-verified',
    observed_by: 'whysanesanders',
    last_verified: TODAY,
  })) n += 1;
}

for (const s of skills) {
  const { slug, ...rest } = s;
  if (write(`src/content/skills/${slug}.yaml`, {
    ...rest,
    last_verified: TODAY,
    observed_by: rest.evidence_tier === 'radar' ? 'catalog-radar' : 'whysanesanders',
  })) n += 1;
}

for (const t of radarTools) {
  const { slug, ...rest } = t;
  if (write(`src/content/tools/${slug}.yaml`, {
    ...rest,
    affiliate: 'none',
    evidence_tier: 'radar',
    featured: false,
    last_verified: TODAY,
    observed_by: 'catalog-radar',
  })) n += 1;
}

const guides = {
  'n8n.yaml': {
    install: 'Self-host with Docker (n8n docs) or n8n Cloud. Pin the image tag.',
    requirements: ['A place to run Docker or a Cloud workspace', 'Credentials for every node you enable'],
    cost: 'Self-host software is free; Cloud starts around €20–24/mo on the public list. Execution volume is the real meter.',
    security: 'Every credential in the workflow is a secret. Do not expose the editor to the internet without auth.',
    breaks_when: [
      'A workflow has dozens of branches and no tests — debug time exceeds build time.',
      'Fair-code licensing blocks the way you wanted to resell it.',
    ],
  },
  'firecrawl.yaml': {
    install: 'Cloud at firecrawl.dev or self-host from mendableai/firecrawl. Start with the cloud free credits.',
    requirements: ['A target site you are allowed to crawl', 'A sink (markdown files or a vector store)'],
    cost: 'OSS self-host is free. Cloud: 1,000 credits/mo free, then Hobby/Standard/Growth. Page volume is the bill.',
    security: 'Crawling sends the target HTML to Firecrawl Cloud unless you self-host. Do not point it at authenticated app pages you do not own.',
    breaks_when: [
      'The site is a brittle SPA and extraction comes back empty.',
      'You crawl a huge site with no rate limit and get banned.',
    ],
  },
  'playwright-mcp.yaml': {
    install: 'npx @playwright/mcp@latest — then attach the stdio server in the harness MCP config.',
    requirements: ['A desktop/CI that can launch Chromium', 'A harness that speaks MCP'],
    cost: 'The server is Apache-2.0. You pay the model tokens and the machine that runs the browser.',
    security: 'This launches a real browser on the host. Stdio MCP is a local-privilege process. Do not attach it to an agent that talks to strangers.',
    breaks_when: [
      'You needed DevTools traces or heap snapshots — use chrome-devtools-mcp instead.',
      'The environment cannot launch a browser (some CI images).',
    ],
  },
  'tavily.yaml': {
    install: 'Create a Tavily key and call the Search API. Most agent frameworks have a first-party Tavily tool.',
    requirements: ['An API key', 'A job that needs sourced web snippets, not a full crawl'],
    cost: 'Free 1k calls/mo, then from $30/mo on the public list. Reranking sits on paid plans.',
    security: 'Queries leave for Tavily. Do not put customer secrets in the search string.',
    breaks_when: [
      'The query is obscure and the snippets come back thin.',
      'You needed site-wide markdown — that is Firecrawl, not this.',
    ],
  },
  'cursor.yaml': {
    install: 'Download from cursor.com/download. Sign in. Optional: cursor-agent CLI for headless runs.',
    requirements: ['A Cursor account', 'A project folder'],
    cost: 'Hobby $0, Pro $20/mo, Pro+ $60/mo, Ultra $200/mo, Teams from $40/user/mo — as of the catalog card.',
    security: 'Closed editor. Trains-on-inputs is yes on the card. Privacy mode is a setting, not a proof. Field guide: /agents/cursor/.',
    breaks_when: [
      'A heavy agent month hits Pro token limits mid-sprint.',
      'You need to audit or self-host the editor.',
    ],
  },
};

function insertGuide(file, guide) {
  const p = path.join(ROOT, 'src/content/tools', file);
  let t = readFileSync(p, 'utf8');
  if (t.includes('\nguide:')) {
    console.log(`skip guide ${file}`);
    return;
  }
  const block = ['guide:', yaml(guide, 1), ''].join('\n');
  if (!t.includes('\nlast_verified:')) throw new Error(`no last_verified in ${file}`);
  t = t.replace('\nlast_verified:', `\n${block}last_verified:`);
  writeFileSync(p, t);
  console.log(`guide ${file}`);
  n += 1;
}

for (const [file, guide] of Object.entries(guides)) insertGuide(file, guide);

console.log(`seeded ${n} files/edits`);

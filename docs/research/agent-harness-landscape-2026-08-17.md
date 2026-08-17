# Agent and harness landscape — 2026-08-17

## Recommendation

Do not pour these products into the existing `agents` category. That category
currently mixes SDKs, visual builders, hosted autonomous workers, and APIs. A
serious Noemium expansion needs a separate `/agents` product surface and an
orthogonal `agent_layer` taxonomy.

Recommended layers:

1. **Coding harness** — works inside a repository and runs tools/commands.
2. **Personal agent** — persistent, channel-connected, scheduled, and stateful.
3. **Work agent** — managed teammate with its own computer, authenticated work
   sessions, routines, and collaboration with other agents.
4. **Agent framework/SDK** — code used to build a new agent.
5. **Browser/computer use** — acts through websites or desktop interfaces.
6. **Runtime/sandbox** — isolated compute in which an agent acts.
7. **Memory/context** — long-lived state and retrieval.
8. **Observability/evals** — traces, cost, quality, regression testing.
9. **Control plane** — supervises many harness sessions or agents.
10. **Protocol** — interoperability rather than an end-user tool.

The best initial product is an **Agent Field Guide**, not another card grid.
Every field guide should answer: what it is, who it is for, install command,
requirements, model/provider options, channels, deployment modes, realistic
monthly cost, security boundary, maturity, limitations, and evidence.

## Named products and the critical Grok distinction

### OpenClaw

- **What it is:** an open-source, always-on personal agent with a local Gateway,
  dashboard, scheduled work, skills, plugins, and many messaging channels.
- **Install:** `curl -fsSL https://openclaw.ai/install.sh | bash`, or
  `npm i -g openclaw`; then `openclaw onboard --install-daemon`.
- **Requirements:** Node.js 22.22.3+, 24.15+, or 25.9+; Node 26 recommended;
  macOS, Linux, Windows, Docker, and Nix paths; at least one model provider or
  supported subscription login.
- **Software price:** $0, open source.
- **Real cost:** inference/subscription plus optional always-on hardware. A
  practical range is $0 incremental on an existing computer and supported
  subscription, roughly $5–20/month for a small VPS before model usage, or
  pay-per-token API spend. No single monthly number is honest.
- **Security:** it can read messages, run commands, browse, and call external
  systems. Pairing, allowlists, sandboxing, credential isolation, and supply
  chain controls are not optional. OpenClaw maintains a formal
  [MITRE ATLAS threat model](https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS).
- **Sources:** [getting started](https://docs.openclaw.ai/start/getting-started),
  [provider directory](https://docs.openclaw.ai/providers),
  [token and cost tracking](https://docs.openclaw.ai/reference/token-use),
  [official site](https://openclaw.ai/).

### Hermes Agent

- **What it is:** an MIT-licensed personal/super-agent from Nous Research with a
  terminal UI, messaging gateway, scheduled work, subagents, persistent memory,
  and a learning loop that creates and improves skills.
- **Install:** desktop installer on macOS/Windows, or
  `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash` on
  Linux/macOS/WSL2/Termux; then `hermes setup` or `hermes setup --portal`.
- **Requirements:** one supported provider; agent use requires a model with at
  least a 64K context window. Local endpoints through Ollama, vLLM, llama.cpp,
  and other OpenAI-compatible servers are supported.
- **Software price:** $0, MIT.
- **Nous route:** Portal Free is $0 with free models; Plus is $20/month with $22
  credits; Super $100/month with $110 credits; Ultra $200/month with $220
  credits. Hermes Cloud currently starts at $0.29/day running for the small
  instance, excluding inference/tools.
- **Alternative cost:** use ChatGPT/Codex, SuperGrok, Copilot, or supported OAuth;
  bring an API key; or host a local model. Therefore the honest total is a cost
  scenario, not a sticker price.
- **Sources:** [quickstart](https://hermes-agent.nousresearch.com/docs/getting-started/quickstart/),
  [providers](https://hermes-agent.nousresearch.com/docs/integrations/providers/),
  [Nous Portal pricing](https://portal.nousresearch.com/),
  [cloud pricing](https://portal.nousresearch.com/info),
  [repository](https://github.com/hermes-agent-org/hermes).

### Grok Bot

**Grok Bot is a real, separate official product.** It must not be collapsed into
Grok Build. The early-beta product from SpaceXAI and Cursor gives each Bot a
vendor-managed cloud computer, lets it sign into websites and applications,
learn routines, continue working while the user's laptop is closed, run several
Bots in parallel, and collaborate in shared threads.

- **Install/access:** the official page currently publishes a macOS download for
  Apple silicon and advertises iOS access. Access is tied to a qualifying plan.
- **Current qualifying prices:** Cursor Ultra is $200/month, SuperGrok Heavy is
  $300/month, and Cursor Premium Teams is $120/seat/month.
- **Security boundary:** critical. A Bot can retain authenticated browser
  sessions and act inside a vendor-managed computer. Use dedicated
  least-privilege accounts plus human approval for money movement, deletion,
  publishing, and outbound communication.
- **Sources:** [official Grok Bot page](https://x.ai/bot),
  [xAI security](https://x.ai/security).

### Grok Build

Grok Build is the separate terminal coding harness. Unofficial Grok Telegram
bridges should still stay out until a specific maintained project and security
boundary are named.

- **What it is:** an open-source coding harness with TUI, headless/CI mode, ACP,
  skills, plugins, hooks, MCP, subagents, worktrees, and workflows.
- **Install:** `curl -fsSL https://x.ai/cli/install.sh | bash`; then run `grok` in
  a repository. Browser sign-in is the default; `XAI_API_KEY` supports headless
  environments. It can also point to a custom OpenAI-compatible model endpoint.
- **Software price:** $0, open source.
- **Access price:** Grok is free with limits; SuperGrok is listed at $30/month.
  API usage is model-dependent. The published Grok Build 0.1 API launch price
  was $1/1M input and $2/1M output tokens; the current harness can use newer or
  custom models, so this is not a universal CLI price.
- **Sources:** [Grok Build docs](https://docs.x.ai/build/overview),
  [CLI reference](https://docs.x.ai/build/cli/reference),
  [pricing](https://x.ai/pricing),
  [repository](https://github.com/xai-org/grok-build),
  [open-source announcement](https://x.ai/news/grok-build-open-source).

## Admission wave A — full field guides

These are sufficiently differentiated and documented to justify full install,
cost, and security pages first:

The user-approved first implementation slice is now live in the repository:
**Grok Bot, Grok Build, OpenClaw, and Hermes Agent** are source-verified field
guides; ten additional niche agents are isolated in verdict-free Radar. The
remaining rows below are the next research queue, not claims of completed
field testing.

| Product | Layer | Why it belongs |
|---|---|---|
| OpenClaw | personal agent | category-defining, broad channels, largest operating surface |
| Hermes Agent | personal/super-agent | learning loop, provider breadth, cloud/local options |
| Grok Bot | work agent | managed cloud computer, persistent routines, parallel AI teammates |
| Grok Build | coding harness | official open harness, ACP/plugins/workflows |
| OpenAI Codex | coding harness | open-source local CLI plus app/cloud continuum |
| Amp | coding harness | opinionated multi-model harness and transparent pass-through usage |
| Kilo Code | coding harness | open, BYOK/local/free routing, IDE+CLI+cloud |
| Goose | coding harness | open provider-neutral harness with MCP/ACP paths |
| Pi | coding harness/toolkit | minimal extensible core, RPC/SDK/extensions |
| NanoClaw | personal agent | small container-first design; Claude-centric tradeoffs |
| PicoClaw | edge personal agent | Go, tiny footprint, old-phone/SBC deployments |
| ZeroClaw | personal runtime | Rust single-binary alternative with many channels/providers |
| DeerFlow 2.0 | super-agent harness | long-horizon tasks, skills, sandboxes, memory, subagents |
| OpenFang | agent OS | scheduled autonomous “Hands”, single-binary control plane |
| IronClaw (NEAR) | secure personal agent | WASM/security-first architecture; heavier PostgreSQL requirement |

## Admission wave B — standard catalog cards

These should receive primary-source-verified cards and link into the field
guides, but do not all need long installation tutorials on day one.

### Coding harnesses

- [Antigravity CLI](https://github.com/google-antigravity/antigravity-cli) — the
  individual successor to Gemini CLI; source/license status needs careful copy.
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) — now primarily an
  enterprise/API-key path; individual free/Pro/Ultra access ended 2026-06-18.
- [Cline](https://github.com/cline/cline) — IDE, terminal, Kanban, and SDK.
- [Roo Code](https://github.com/RooCodeInc/Roo-Code) — provider-neutral IDE/CLI
  harness with native tool calling.
- [Kiro CLI](https://kiro.dev/cli/) — AWS-backed spec-driven CLI.
- [Warp](https://www.warp.dev/) — terminal-native agent environment.
- [Continue](https://github.com/continuedev/continue) — open IDE agents and
  model/provider configuration.
- [OpenHands](https://github.com/All-Hands-AI/OpenHands) — autonomous software
  engineering platform and sandbox.
- [SWE-agent](https://github.com/SWE-agent/SWE-agent) — research-to-practice
  software-engineering agent harness.

### Personal and general agents

- [NullClaw](https://github.com/nullclaw/nullclaw) — Zig, roughly 1 MB runtime
  class; claims need independent reproduction before a performance verdict.
- [LibreFang](https://github.com/librefang/librefang) — community-governed
  OpenFang fork; compare governance before listing both as Ship.
- [Agent TARS](https://github.com/bytedance/UI-TARS-desktop) — ByteDance
  multimodal/computer-use agent surface.
- [Khoj](https://github.com/khoj-ai/khoj) — self-hostable personal knowledge
  assistant and automations.
- [OSA](https://github.com/Miosa-osa/OSA) — local “system agent” with a packaged
  installer and model flexibility.
- [TinyAGI](https://github.com/TinyAGI/tinyagi) — multi-team, multi-channel
  personal-company orchestration.
- [Letta](https://github.com/letta-ai/letta) — stateful agent platform rooted in
  MemGPT-style memory.

### Agent frameworks and SDKs

- [PydanticAI](https://github.com/pydantic/pydantic-ai)
- [Mastra](https://github.com/mastra-ai/mastra)
- [Agno](https://github.com/agno-agi/agno)
- [smolagents](https://github.com/huggingface/smolagents)
- [Deep Agents](https://github.com/langchain-ai/deepagents)
- [Google ADK](https://github.com/google/adk-python)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-python)
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-python)
- [Microsoft Agent Framework](https://github.com/microsoft/agent-framework)
- [LlamaIndex](https://github.com/run-llama/llama_index)
- [Haystack](https://github.com/deepset-ai/haystack)

### Browser and computer use

- [Browser Use](https://github.com/browser-use/browser-use)
- [Stagehand](https://github.com/browserbase/stagehand)
- [Skyvern](https://github.com/Skyvern-AI/skyvern)
- [LaVague](https://github.com/lavague-ai/LaVague)
- [Steel](https://github.com/steel-dev/steel-browser)
- [agent-browser](https://github.com/vercel-labs/agent-browser)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [BrowserGym](https://github.com/ServiceNow/BrowserGym)

### Memory and context

- [Mem0](https://github.com/mem0ai/mem0)
- [Graphiti](https://github.com/getzep/graphiti)
- [Honcho](https://github.com/plastic-labs/honcho)
- [Hindsight](https://github.com/vectorize-io/hindsight)
- [Cognee](https://github.com/topoteretes/cognee)
- [OpenViking](https://github.com/volcengine/OpenViking)

### Runtime and sandbox infrastructure

- [E2B](https://github.com/e2b-dev/E2B)
- [Daytona](https://github.com/daytonaio/daytona)
- [Blaxel](https://blaxel.ai/)
- [Fly.io Sprites](https://fly.io/docs/sprites/)
- [Cloudflare Sandbox SDK](https://github.com/cloudflare/sandbox-sdk)
- [microsandbox](https://github.com/zerocore-ai/microsandbox)

### Observability and evals

- [Langfuse](https://github.com/langfuse/langfuse)
- [Arize Phoenix](https://github.com/Arize-ai/phoenix)
- [Opik](https://github.com/comet-ml/opik)
- [Braintrust](https://www.braintrust.dev/)
- [W&B Weave](https://github.com/wandb/weave)
- [AgentOps](https://github.com/AgentOps-AI/agentops)
- [OpenLLMetry](https://github.com/traceloop/openllmetry)
- [Laminar](https://github.com/lmnr-ai/lmnr)

## Radar — deliberately niche

These are the “almost nobody knows” layer. They should be discoverable under a
Radar badge, never silently promoted to a full verdict from stars or README
claims alone.

### Harness control planes and supervisors

- Parallel Code, Agent Sessions, agent-deck, Catnip, hcom, AgentBox, amux,
  Proliferate, CliDeck, tlbx, Garcon, Agent AFK, Clave, Claudescope, fractal,
  Bernstein, ORCH, OMK, kodo, Crewplane, Galley, and ralph-harness.

### Harness infrastructure and governance

- VibePod, agenttrace, AgentTier, AgentPlane, Untether, authsome, AgentLint,
  skillreaper, Wit, AgentDiff, m1nd, GoodMemory, agent-lsp, and ActPlane.

These names were discovered through the maintained
[awesome-cli-coding-agents](https://github.com/bradAGI/awesome-cli-coding-agents)
index. Each still requires an official repository/license check, release
activity check, and at least a clean-room install before Noemium gives a
positive verdict.

## Hold / do not admit yet

- **Tiny Claw:** its own README warns that it is under heavy development and
  asks people to wait for the first official release.
- **MimiClaw:** novel $5 ESP32 direction, but hardware and security claims need
  reproduction before a main catalog verdict.
- **Unofficial Grok/Claude/ChatGPT Telegram bridges:** credential and account
  policy risk; require a named maintained project and explicit auth design.
- **Clones with a famous name but unclear lineage:** IronClaw currently has
  multiple unrelated repositories. Only `nearai/ironclaw` should be treated as
  the NEAR project; every other project needs its own identity.
- **README-only benchmark winners:** performance claims are editorially useful
  only after reproducible tests or an independent benchmark receipt.

## New niche stacks worth publishing

1. **Personal agent on an existing laptop** — OpenClaw or Hermes + existing
   subscription + Telegram; cheapest path, but not always-on when the laptop
   sleeps.
2. **Always-on $5–20 VPS agent** — Hermes/OpenClaw + small VPS + cheap router;
   explicit hardening checklist and monthly spend scenarios.
3. **Secure personal agent** — IronClaw or hardened OpenClaw + sandbox + VPN +
   separate service accounts + secret broker.
4. **Edge agent on old hardware** — PicoClaw/ZeroClaw/NullClaw + low-cost model;
   distinguish runtime RAM from remote inference requirements.
5. **Subscription-max coding setup** — one harness that can legally reuse a
   supported ChatGPT/Codex, SuperGrok, Copilot, or Claude path.
6. **Multi-harness coding control plane** — Codex + Grok Build + Claude Code in
   isolated worktrees with a supervisor and evidence/review stage.
7. **Production browser agent** — Browser Use or Stagehand + Steel/Browserbase +
   secrets isolation + replay + cost ceiling.
8. **Long-lived agent with memory** — Hermes/OpenClaw + Honcho/Hindsight/Graphiti
   + an explicit retention/deletion policy.
9. **Observable agent service** — framework + sandbox + Langfuse/Phoenix/Opik +
   regression evals and cost budgets.
10. **Local-private agent** — local harness + Ollama/vLLM + local memory; publish
    RAM/VRAM tiers instead of pretending “self-hosted” means free.
11. **China-first low-cost agent** — Qwen/Kimi/GLM routing + compatible harness;
    include region, billing, documentation, and data-boundary caveats.
12. **One-person company stack** — personal agent + coding harness + browser
    worker + observability + human approval gates; price as three scenarios.

## Required schema for `/agents`

```yaml
name: OpenClaw
agent_layer: personal-agent
maturity: stable | beta | experimental | prerelease
license_kind: osi-open-source | source-available | proprietary
evidence_tier: field-tested | source-verified | radar
install:
  methods:
    - platform: macos-linux
      command: curl -fsSL https://openclaw.ai/install.sh | bash
requirements:
  operating_systems: [macos, linux, windows]
  runtime: Node.js 26 recommended
providers: [openai, anthropic, google, xai, local]
channels: [telegram, whatsapp, discord, slack]
deployment: [local, vps, docker]
cost_scenarios:
  - name: existing-computer-and-subscription
    monthly_usd: 0
    assumptions: no incremental hardware or model charge
  - name: small-vps-plus-api
    monthly_usd_range: [5, 50]
    assumptions: light usage; model spend varies
security:
  privilege: high
  notes: [pairing, sandbox, secret isolation, prompt-injection exposure]
evidence:
  - kind: install
    url: https://docs.openclaw.ai/start/getting-started
    checked_at: 2026-08-17
```

## Editorial admission rule

Recommended two-tier catalog:

- **Strict catalog:** field-tested or fully primary-source-verified; eligible for
  Ship/Situational/Skip.
- **Radar:** source-discovered and clearly labeled; no Ship verdict, no global
  Verified badge, no hard price claim without a primary receipt.

This preserves the “we find things nobody knows” advantage without pretending
that discovery equals experience.

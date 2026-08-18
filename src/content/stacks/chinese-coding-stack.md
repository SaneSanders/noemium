---
title: Chinese Coding Stack
use_case: Frontier-class agentic coding at a fraction of US subscription prices — Kimi, GLM, Qwen and DeepSeek as the daily drivers.
monthly_cost_usd: 47
difficulty: intermediate
tools:
  - kimi-code
  - glm-coding-plan
  - deepseek-api
  - qwen-code
receipts:
  - https://www.codeagentswarm.com/en/guides/kimi-code-plans-and-pricing
  - https://www.aipricing.guru/z-ai-subscription-pricing/
  - https://api-docs.deepseek.com
  - https://github.com/QwenLM/qwen-code
last_verified: "2026-08-16"
observed_by: whysanesanders
budget:
  monthly_cost_usd: 18
  tools:
    - glm-coding-plan
    - qwen-code
    - kimi-code
  tradeoff: >-
    GLM Coding Plan Lite plus free Kimi/Qwen CLIs as backup. No Kimi hosted
    membership, no DeepSeek off-peak bulk. Daily small fixes stay cheap;
    long-horizon K3 sessions and batch test generation go away.
---

## Why this stack exists

As of mid-2026 the Chinese coding line (Kimi K3, GLM-5.x, Qwen3.x, DeepSeek
V4) trades blows with the US frontier on the vote-based coding boards while
costing 2–5x less per month. If your bottleneck is budget, not capability,
this is the sane default.

## The recipe

1. **Daily driver: Kimi Code (membership ~$19–39/mo).** The terminal agent
   for feature work and refactors. K3 is the strongest open-weights coder on
   the boards — long-horizon sessions hold up, and the CLI itself is
   free/MIT if you ever want to self-host the weights.
2. **Always-on second seat: GLM Coding Plan (Lite ~$18/mo).** Use it for
   autocomplete-class work, small fixes and "review this diff" passes where
   burning Kimi allowance is waste. Lite is cheap enough to leave running
   all day.
3. **Bulk and batch: DeepSeek API (~$10/mo pay-as-you-go).** Mass
   renames, test generation, log triage — anything scriptable goes through
   the API, scheduled into the 50%-off off-peak windows (01:00–04:00 and
   06:00–10:00 UTC). Cache-hit pricing makes repetitive prompts nearly free.
4. **Free backup: Qwen Code (free tier).** Open-source CLI, ~100
   requests/day on the free tier, BYOK when you need more. Keeps you moving
   on the days a subscription lapses or a provider wobbles.
5. **One spec file, all agents.** Keep `AGENTS.md` in the repo root — every
   one of these CLIs reads it. Write conventions once, get consistent
   behavior across all four tools.
6. **Route by stakes.** Throwaway scripts and bulk chores → DeepSeek/GLM.
   Features you'll maintain → Kimi. The 2 a.m. production incident →
   whatever is strongest that day, cost be damned.

## Working with these tools, honestly

- **Prompts port cleanly.** All four CLIs speak the same "spec + repo +
  small steps" dialect. No per-vendor prompt magic needed.
- **Context is huge, use it.** K3 and Qwen3 both take 1M tokens — paste
  whole modules instead of hunting for the perfect snippet.
- **Payments are the real friction.** Some plans need regional workarounds
  or annual billing for the good price; factor the setup hour into your
  decision.
- **Read the data terms.** If your code can't leave your jurisdiction, run
  the open weights (K3, GLM-5.2, Qwen3 are all downloadable) or skip this
  stack entirely.

## What you pay

- **Kimi Code — hosted membership, ~$19/mo.** The low end of the regional
  membership range; enough for daily feature work and refactors. The CLI is
  free if you bring your own keys.
- **GLM Coding Plan — Lite, ~$18/mo.** Flat-rate autocomplete and small fixes;
  cheaper than burning Kimi allowance on low-stakes keystrokes.
- **DeepSeek API — pay-as-you-go, ~$10/mo.** Bulk renames, test generation and
  log triage scheduled into off-peak windows; cache-hit pricing keeps
  repetitive prompts nearly free.
- **Qwen Code — free tier, $0/mo.** ~100 requests/day on the hosted free tier
  or BYOK for more; the CLI itself is open source.

## When this breaks down

Regulated codebases, strict data-residency requirements, or teams that need
US-based support contracts — that's the American stack's home turf. And if
you hit a task the Chinese line genuinely can't finish (it happens, mostly
on obscure frameworks), keep one Claude Code seat as the tiebreaker — see
the Mixed stack.

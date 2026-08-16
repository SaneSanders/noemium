---
title: Student Coding Stack
use_case: Full agentic coding setup cheaper than lunch — Chinese models, cheap API credits and a free editor.
monthly_cost_usd: 23
difficulty: intermediate
tools:
  - glm-coding-plan
  - deepseek-api
  - kimi-code
  - zed
receipts:
  - https://www.aipricing.guru/z-ai-subscription-pricing/
  - https://api-docs.deepseek.com
  - https://www.codeagentswarm.com/en/guides/kimi-code-plans-and-pricing
  - https://zed.dev
last_verified: "2026-08-16"
observed_by: whysanesanders
---

## The recipe

1. **Flat-rate agent: GLM Coding Plan (Lite ~$18/mo).** The cheapest
   flat-rate coding subscription that plugs into an Anthropic-compatible
   CLI. Use it for features, refactors and autocomplete-class work without
   watching token meters.
2. **Bulk API: DeepSeek (~$5/mo pay-as-you-go).** Schedule test generation,
   bulk renames and log triage into the 50%-off off-peak windows. Cache-hit
   pricing makes repetitive prompts nearly free.
3. **Free driver: Kimi Code CLI (free/MIT).** The open-source CLI is free;
   run it with your own DeepSeek or GLM keys for extra capacity. Use it when
   the GLM plan hits its rate cap or when you want to A/B a second model.
4. **Free editor: Zed.** Fast Rust editor with a built-in agent panel. Bring
   your own GLM or DeepSeek key and skip the hosted AI plan entirely.
5. **One spec file, all agents.** Write an `AGENTS.md` with your style and
   testing rules. Every CLI in this stack reads it, so behavior stays
   consistent even when you swap the model underneath.
6. **Route by stakes.** Homework scripts and throwaway prototypes → DeepSeek
   and GLM. Assignments you will be graded on → review with Kimi or a second
   pass from GLM.
7. **Track the API tab.** DeepSeek is cheap, not free. A $5/mo budget is
   plenty if you batch and use off-peak; it is also easy to blow if you
   generate a whole repo in one prompt.

## What you pay

- **GLM Coding Plan — Lite, ~$18/mo.** The entry flat-rate tier is cheaper
  than lunch and covers daily agentic work; Pro is overkill until you hit
  the Lite rate cap.
- **DeepSeek API — pay-as-you-go, ~$5/mo.** Off-peak batch usage at student
  volume; the peak rates are still cheap, but there is no reason to pay them.
- **Kimi Code — free CLI / BYOK, $0/mo.** The hosted membership costs money,
  but the open-source CLI plus your own GLM or DeepSeek key is free.
- **Zed — editor free / BYOK, $0/mo.** The editor is open source and free;
  skip the hosted AI plan and point the agent panel at your own keys.

## When this breaks down

Regional payment friction, English-language documentation gaps and the
occasional model that just does not understand your framework. This stack
is powerful and cheap, but it requires more troubleshooting than Cursor or
Copilot. If a deadline is tight, the extra dollars for a US subscription
buy peace of mind.

---
title: Mixed US × CN Coding Stack
use_case: Chinese models for volume, Claude for the critical ten percent — one workflow that routes tasks by stakes, not by habit.
monthly_cost_usd: 49
difficulty: advanced
tools:
  - kimi-code
  - claude-code
  - openrouter
  - aider
receipts:
  - https://www.codeagentswarm.com/en/guides/kimi-code-plans-and-pricing
  - https://docs.anthropic.com/en/docs/claude-code
  - https://openrouter.ai
  - https://aider.chat
last_verified: "2026-08-16"
observed_by: whysanesanders
---

## Why this stack exists

The honest 2026 answer to "which coding model" is "both ecosystems".
Chinese models carry everyday volume at a fraction of the price; Claude
still owns the hardest long-horizon work. Routing between them is a skill —
this stack is the setup that makes it routine.

## The recipe

1. **Volume driver: Kimi Code (~$19–39/mo).** Features, refactors, test
   writing — K3 handles the daily 90% at CN prices. This is where your
   keystrokes live.
2. **Tiebreaker seat: Claude Code (Claude Pro $20/mo).** Reserve it for
   what Kimi fails twice on: subtle concurrency bugs, huge cross-module
   refactors, the task you'll be paged about. One seat is enough.
3. **One key for everything: OpenRouter (~$10/mo).** A/B the same prompt
   across K3, GLM-5.2, Opus 5 and GPT-5.6 before you commit to an answer —
   and it's the fallback pipe when any single vendor has a bad day.
4. **Free glue: Aider (BYOK).** Point it at OpenRouter or DeepSeek keys for
   scripted, git-native edits in CI — free tool, wholesale tokens.
5. **Route by stakes, write it down.** A one-line rule in `AGENTS.md` —
   "CN models for features and chores, Claude for production-critical" —
   keeps the whole team (and the agents) consistent.
6. **Same prompt, both worlds.** Keep prompts vendor-neutral: spec, repo
   slice, acceptance test. If a prompt only works on one model, it's a
   crutch, not a prompt.
7. **Review cross-vendor.** Let Claude review Kimi's diff on anything
   critical. The ecosystems make different mistakes — the second opinion is
   nearly free and catches real bugs.

## When this breaks down

Two ecosystems means two billing dashboards, two failure modes and
occasionally two answers. If the routing overhead exceeds the savings (tiny
teams, low volume), pick the Chinese stack or the American stack and be
done. Regulated code stays on the American stack, full stop.

---
title: American Coding Stack
use_case: Maximum-capability coding on first-party US subscriptions — Claude Code, Cursor, Copilot and the OpenAI API. You pay for polish, support and compliance.
monthly_cost_usd: 70
difficulty: beginner
tools:
  - claude-code
  - cursor
  - github-copilot
  - openai-api
receipts:
  - https://docs.anthropic.com/en/docs/claude-code
  - https://cursor.com
  - https://github.com/features/copilot
  - https://platform.openai.com/docs
last_verified: "2026-08-16"
observed_by: whysanesanders
budget:
  monthly_cost_usd: 20
  tools:
    - cursor
  tradeoff: >-
    Cursor Pro, nothing else. No Claude Code terminal agent, no Copilot PR
    summaries, no OpenAI glue API. One watched editor seat. Fine for a solo
    app; a production incident will make you miss the other three.
---

## Why this stack exists

Opus-class Claude still tops the coding boards, and the US vendors sell you
the whole wrapper around the model: SSO, audit logs, US data residency,
support that answers. If the code pays salaries, the premium is the cheap
part.

## The recipe

1. **Terminal agent: Claude Code (in Claude Pro, $20/mo).** Multi-file
   refactors, test suites, "make the build green" — the strongest
   agentic-coding subscription you can buy outright.
2. **Editor: Cursor (Pro $20/mo).** Agent mode for scaffolding and feature
   work where you want to watch the diff inline. Keep a Sonnet-class model
   as the default to stretch the monthly allowance.
3. **Completions: GitHub Copilot (Pro $10/mo).** Tab completions are a
   solved problem — don't spend agent budget on them. Copilot also covers
   the PR-description and review-summary chores inside GitHub.
4. **Scripting and automation: OpenAI API (~$20/mo pay-as-you-go).** The
   GPT-5.6 tiers are the convenient default for CI bots, changelog
   generators and glue scripts; Luna is cheap enough for anything bulk.
5. **One vendor per layer.** Agent, editor, completions, API — no
   overlap, no double-paying for the same keystrokes.
6. **Turn on the enterprise knobs early.** SSO, zero-retention toggles and
   audit logs are why you're paying US prices — configure them on day one,
   not after the first security review.

## What you pay

- **Claude Code — included in Claude Pro, $20/mo.** Terminal agent and the
  strongest long-horizon model in the stack; Pro is the entry subscription
  that unlocks it.
- **Cursor — Pro, $20/mo.** Inline agent mode for watched feature work;
  stick to Sonnet-class models to stretch the monthly allowance.
- **GitHub Copilot — Pro, $10/mo.** Tab completions and GitHub-native PR
  chores; Pro+ is overkill until you need the advanced agent models or SSO.
- **OpenAI API — pay-as-you-go, ~$20/mo.** GPT-5.6 Luna covers glue scripts,
  CI bots and bulk tasks; the cheap end of the API is the right starting
  point.

## When this breaks down

You're paying 2–5x over the Chinese line for equivalent daily output on
most tasks. If that premium stops buying you compliance or support you
actually use, drop to the Mixed stack and keep only the Claude Code seat.
And no subscription fixes a missing test suite — the stack writes them,
you still have to run them.

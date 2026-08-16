---
# Example/template for a stack entry. The body below the frontmatter is the
# step-by-step recipe.
title: Solo Founder SaaS
use_case: Ship and run a small SaaS product alone — landing, app, billing, support.
monthly_cost_usd: 20
difficulty: intermediate
tools:
  - cursor
receipts:
  - https://github.com/SaneSanders
last_verified: "2026-08-16"
observed_by: whysanesanders
---

## The recipe

1. **Build in Cursor.** One editor for the whole repo: agent mode for
   scaffolding, inline edits for iteration. Keep the agent on a
   Sonnet-class model for cost control.
2. **Deploy statically where possible.** Astro/static output to an edge
   host; server endpoints only where a form or webhook truly needs one.
3. **Billing last.** Add payments only after the first manual sales — a
   payment form is not validation.
4. **Support yourself.** A public changelog and a fast personal inbox beat
   a helpdesk at this scale.

## What you pay

- **Cursor — Pro, $20/mo.** Agent mode and tab completions cover the whole
  build; the free tier throttles just when you are shipping fastest.

## When this breaks down

Past ~2 products or a team of 2+, the single-editor single-brain setup
becomes the bottleneck. Re-evaluate then, not before.

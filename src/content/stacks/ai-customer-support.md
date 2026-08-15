---
title: AI Customer Support for Small Business
use_case: A support bot for a small business that answers from your docs and escalates to humans.
monthly_cost_usd: 45
difficulty: intermediate
tools:
  - anthropic-api
  - qdrant
  - n8n
receipts:
  - https://docs.anthropic.com
  - https://qdrant.tech
  - https://n8n.io
last_verified: "2026-08-15"
observed_by: whysanesanders
---

## The recipe

1. **Collect the corpus.** Export help-center articles, past ticket answers
   and your FAQ into markdown. Garbage in, garbage deflected.
2. **Chunk and embed into Qdrant.** The managed free tier covers a small
   business corpus; use Claude or OpenAI embeddings via API. ~500-token chunks
   with title metadata.
3. **Wire n8n (cloud Starter, ~$24/mo).** One workflow: incoming
   email/chat webhook → embed question → Qdrant search → Claude answer with
   sources → send or escalate.
4. **Answer with Claude via the Anthropic API.** Haiku-class model for cost
   ($0.80/1M input); prompt caching on your system prompt and docs index.
   Expect ~$20/mo at a few thousand conversations.
5. **Set the escalation rule.** No confident answer below a similarity
   threshold → create a human ticket with the draft reply attached. Never let
   the bot guess on refunds.
6. **Add a feedback button.** Thumbs-down answers land in a review queue;
   every miss becomes a new doc or a chunk fix.
7. **Review weekly.** Read 20 random conversations. Deflection rate and
   wrong-answer rate are the only two numbers that matter.

## When this breaks down

Past ~50k conversations/mo, per-conversation API cost and n8n execution
pricing both bite — that's when a dedicated support platform or self-hosted
n8n starts paying for itself.

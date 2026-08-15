---
title: RAG Over Company Docs
use_case: Ask questions over your company's documents — specs, wikis, PDFs — with cited answers.
monthly_cost_usd: 30
difficulty: intermediate
tools:
  - openai-api
  - qdrant
  - vercel-ai-sdk
receipts:
  - https://platform.openai.com/docs
  - https://github.com/qdrant/qdrant
  - https://github.com/vercel/ai
last_verified: "2026-08-15"
observed_by: whysanesanders
---

## The recipe

1. **Inventory the docs.** Export wiki pages, specs and PDFs to plain text or
   markdown. Decide what is *not* allowed in the index before you start.
2. **Chunk with structure.** Split by headings first, then by ~500 tokens.
   Keep document title and section path in metadata — citations depend on it.
3. **Embed via the OpenAI API.** A small embedding model costs cents for a
   whole company corpus; budget a few dollars, not more.
4. **Store in Qdrant.** Self-host the free open-source build in Docker, or use
   the managed free tier. Payload filters on metadata give you per-department
   scoping.
5. **Build the chat UI with the Vercel AI SDK.** One route handler: embed the
   question, search Qdrant, stream the answer with source links. The SDK's
   streaming hooks make this an evening, not a sprint.
6. **Force citation.** Instruct the model to answer only from retrieved
   chunks and link every claim. Refusal beats hallucination.
7. **Add a reindex job.** Nightly re-embed of changed documents; stale indexes
   are how RAG systems lose trust.
8. **Measure retrieval, not vibes.** Keep a list of 30 real questions with
   known answers; re-run it after every chunking or model change.

## When this breaks down

Multi-modal docs (scanned tables, drawings) and permission-aware retrieval
(doc-level ACLs) are where the evening project ends and a real system begins.

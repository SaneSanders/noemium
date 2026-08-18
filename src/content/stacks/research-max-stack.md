---
title: Research Max Stack
use_case: Heavy research and multimodal reading — scientific search, synthesis, grounded Q&A and long-context analysis.
monthly_cost_usd: 319
difficulty: intermediate
tools:
  - google-ai-studio
  - perplexity
  - consensus
  - elicit
  - notebooklm
  - chatgpt
receipts:
  - https://aistudio.google.com
  - https://www.perplexity.ai
  - https://consensus.app
  - https://elicit.com
  - https://notebooklm.google/
  - https://chatgpt.com
last_verified: "2026-08-16"
observed_by: whysanesanders
budget:
  monthly_cost_usd: 30
  tools:
    - google-ai-studio
    - perplexity
    - consensus
    - notebooklm
    - chatgpt
  tradeoff: >-
    Perplexity Pro (not Max) plus Consensus Premium and free NotebookLM / AI
    Studio / ChatGPT. No Elicit extraction tables, no uncapped Perplexity. A
    literature sketch works; a systematic review will stall on caps.
---

## The recipe

1. **Dump papers and sources into NotebookLM.** It builds a grounded
   notebook over your uploads and answers from those sources, not the open
   web. The audio overview is useful for long review sessions.
2. **Scientific claims first in Consensus.** Ask "what does the evidence say
   about X?" and get a consensus meter plus study-quality flags. It keeps
   you from over-reading a single paper.
3. **Structured extraction in Elicit (Pro $39/mo).** Pull methods, results
   and sample sizes into tables across dozens of papers. The free tier is
   enough to test; real literature reviews need Pro.
4. **Deep search and source surf in Perplexity (Max $200/mo).** Cited web
   search for background context, market data and fast fact-checks. Max is
   the tier that removes the hard caps on research-scale querying.
5. **Long-context analysis in Google AI Studio (~$50/mo pay-as-you-go).**
   Paste whole PDFs, datasets or multi-modal sources into Gemini's
   million-token context. Heavy research volume adds up even at Flash promo
   rates; the free tier is only enough to test the workflow.
6. **ChatGPT Plus ($20/mo) as the second brain.** General synthesis,
   rewriting and explaining across sources. Route the deep scientific search
   to Consensus and Elicit so ChatGPT handles interpretation, not fact
   retrieval.
7. **Keep a reading queue, not a search spiral.** The danger with this stack
   is researching forever. Define the question before you open any tool.

## What you pay

- **Google AI Studio — pay-as-you-go, ~$50/mo.** Gemini Flash handles huge
  documents and multimodal inputs at promo rates; sustained research volume
  pushes a real monthly bill past the free quota.
- **Perplexity — Max, $200/mo.** The only tier that keeps up with heavy
  research queries without daily throttling; Pro is fine for casual search.
- **Consensus — Premium, $10/mo.** Unlocks full study access and advanced
  filters; the free tier is enough to verify whether the tool fits your
  field.
- **Elicit — Pro, $39/mo.** The paid tier that exports structured extractions
  at literature-review scale; Plus is too tight for dozens of papers.
- **NotebookLM — free tier, $0/mo.** Grounded Q&A and audio overviews are
  fully free for research notebooks; upgrade only if you hit source limits.
- **ChatGPT — Plus, $20/mo.** General synthesis and rewriting without the
  Pro price tag; the scientific heavy lifting lives in Consensus and Elicit.

## When this breaks down

This stack is overkill for a single paper or a quick answer. It earns its
price when you are doing systematic reviews, thesis chapters or
multi-source reports. It also still hallucinates at the synthesis layer —
never trust a generated claim without chasing the citation back to the
original source.

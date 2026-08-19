---
title: Local-First Private AI Setup
use_case: A fully local, private AI workstation — chat, coding, transcription and images with zero cloud calls.
monthly_cost_usd: 0
difficulty: advanced
tools:
  - aider
  - whisper
  - flux
  - qdrant
receipts:
  - https://github.com/Aider-AI/aider
  - https://github.com/openai/whisper
  - https://github.com/black-forest-labs/flux
  - https://github.com/qdrant/qdrant
last_verified: "2026-08-19"
observed_by: whysanesanders
---

## The recipe

1. **Sort out hardware first.** You want 24GB+ of unified memory or VRAM
   (Apple Silicon or an RTX 3090/4090 class card). This stack costs $0/mo
   because the hardware already happened.
2. **Serve open-weight LLMs locally.** Run Llama/Qwen-class models via
   Ollama, LM Studio or llama.cpp — all expose an OpenAI-compatible endpoint
   on localhost, which is what makes the rest of the stack plug in.
3. **Coding with Aider.** Point Aider at the local endpoint. Repo-map and
   git integration work the same; expect 70-80% of cloud-model quality on
   refactors, less on greenfield architecture.
4. **In-editor assist with Aider.** The previous pick here, Continue, was
   acquired and its product wound down. Cover the same ground with Aider's
   watch mode: it picks up instructions from comments in your editor and
   applies edits against the same local endpoint.
5. **Transcription with Whisper.** large-v3 locally: batch-transcribe
   meetings and interviews overnight. Add pyannote if you need speakers.
6. **Images with FLUX.1 [dev].** Open weights, runs on the 24GB card, prompt
   adherence close to hosted rivals. Remember the non-commercial license
   terms for the dev weights.
7. **Search your files with Qdrant.** Self-host in Docker, embed local docs
   with a local embedding model, and never send a byte out.
8. **Audit it.** Block the machine's AI processes in the firewall for a day
   and confirm nothing breaks or phones home. Trust, then verify.

## What you pay

- **Aider — free, open source, $0/mo.** Bring your own local or API model;
  the tool itself costs nothing and works with any OpenAI-compatible endpoint.
- **Whisper — open source (MIT), self-hosted, $0/mo.** Runs on your own GPU;
  skip the hosted transcription APIs entirely for a private workflow.
- **FLUX — open weights, self-hosted, $0/mo.** FLUX.2 klein weights are
  Apache-2.0 and runnable locally; the dev weights are also free but carry
  non-commercial terms.
- **Qdrant — self-hosted, $0/mo.** The open-source vector DB runs in Docker
  with no usage limits and no cloud calls.

## When this breaks down

Local models still lose to frontier APIs on hard reasoning and long-context
work. The honest setup keeps a paid API key for the 10% of tasks where local
isn't enough — pure-local purism costs real productivity.

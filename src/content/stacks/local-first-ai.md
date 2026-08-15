---
title: Local-First Private AI Setup
use_case: A fully local, private AI workstation — chat, coding, transcription and images with zero cloud calls.
monthly_cost_usd: 0
difficulty: advanced
tools:
  - aider
  - continue
  - whisper
  - flux
  - qdrant
receipts:
  - https://github.com/Aider-AI/aider
  - https://github.com/continuedev/continue
  - https://github.com/openai/whisper
  - https://github.com/black-forest-labs/flux
  - https://github.com/qdrant/qdrant
last_verified: "2026-08-15"
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
4. **In-editor assist with Continue.** Same local endpoint, now inside VS
   Code or JetBrains: completions, chat, inline edits. Keep Aider for big
   agent tasks, Continue for line-level help.
5. **Transcription with Whisper.** large-v3 locally: batch-transcribe
   meetings and interviews overnight. Add pyannote if you need speakers.
6. **Images with FLUX.1 [dev].** Open weights, runs on the 24GB card, prompt
   adherence close to hosted rivals. Remember the non-commercial license
   terms for the dev weights.
7. **Search your files with Qdrant.** Self-host in Docker, embed local docs
   with a local embedding model, and never send a byte out.
8. **Audit it.** Block the machine's AI processes in the firewall for a day
   and confirm nothing breaks or phones home. Trust, then verify.

## When this breaks down

Local models still lose to frontier APIs on hard reasoning and long-context
work. The honest setup keeps a paid API key for the 10% of tasks where local
isn't enough — pure-local purism costs real productivity.

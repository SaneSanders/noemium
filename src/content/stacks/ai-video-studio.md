---
title: AI Video Studio
use_case: Produce short marketing and social videos end-to-end — script, voiceover, footage, music.
monthly_cost_usd: 67
difficulty: intermediate
tools:
  - runway
  - kling
  - elevenlabs
  - suno
  - heygen
receipts:
  - https://help.runwayml.com
  - https://klingai.com
  - https://elevenlabs.io/pricing
  - https://suno.com
  - https://www.heygen.com/pricing
last_verified: "2026-08-16"
observed_by: whysanesanders
---

## The recipe

1. **Script first, by hand or with a chat model.** Every minute saved
   scripting is ten lost regenerating video. Lock the script before touching
   any generator.
2. **Voiceover in ElevenLabs (Starter $6/mo).** Clone your voice once or pick
   a stock voice. Export per-scene audio files — they set clip durations.
3. **Presenter shots in HeyGen (Creator $29/mo)** — only if the video needs a
   talking head. Skip this tool entirely for pure b-roll content and the stack
   drops to ~$31/mo.
4. **B-roll in Kling (Standard $10/mo).** Iterate motion and framing here:
   cheapest per-clip cost of the quality tier. Expect 3-5 generations per
   usable shot.
5. **Hero shots in Runway (Standard $15/mo).** Use Gen-4 for the 2-3 shots
   that carry the video, then finish in Runway's editor: inpainting, motion
   brush, upscale.
6. **Music in Suno (Pro $10/mo).** Generate per-mood instrumentals; the Pro
   tier's commercial rights are why it's in the stack.
7. **Assemble in a free NLE.** DaVinci Resolve or CapCut: sync clips to the
   voiceover, cut on beats, captions last. No AI tool on this list replaces
   the timeline.

## What you pay

- **Runway — Standard, $12/mo.** Gen-4 and the editing toolkit are the core
  of the stack; the free 125 credits are only enough to test the workflow.
- **Kling — paid tier, ~$10/mo.** Cheaper motion generation for b-roll and
  experiments; lean on the free daily credits before you commit.
- **ElevenLabs — Starter, $6/mo.** One cloned voice and a month of short
  voiceovers fits the starter quota; upgrade to Creator only for bulk dubbing.
- **Suno — Pro, $10/mo.** Commercial rights and enough credits for background
  instrumentals; the free tier is non-commercial and cap limited.
- **HeyGen — Creator, $29/mo.** Pay only if the video needs a talking head;
  skip it for pure b-roll and the stack drops to ~$38/mo.

## When this breaks down

Consistency across scenes (same character, same product) is still manual
pain. Longer than ~3 minutes, or brand-critical character work, and you're
back to hybrid shoots with real footage.

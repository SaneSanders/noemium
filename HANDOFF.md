# Noemium Handoff

Стоп-кадр: 2026-08-18 ~16:05 МСК. Push+deploy прошли. `/decide` на проде — **404**, не $99.

## Стоп-кадр

**Прод:** `dc05f4f` на `main` → GitHub Actions Deploy [32140135852](https://github.com/SaneSanders/noemium/actions/runs/32140135852) success → rsync Vultr. curl: `/` 200 (204 tools, нав без Decide, about/quiz, footer method), `/tools/openai-codex/` 200, `/api/tools.json` count 204, `/about` `/method` `/quiz` 200, `/decide` и `/decide/` **404** (title «404 — Not found», нет $99).

**В git без Decide-страницы:** каталог A+B (**204 tools / 36 models / 15 stacks** + 14 agents), `/about` `/method`, quiz permalink, Floor, twins, JSON API, copy observation, weekly thread, graveyard successor.

**Не в git (локальный слайс 17.08):** `src/pages/decide.astro`, `DecideForm`, `decide-intake.json`, `docs/decide/`, `decide-brief` lib/tests. Инбокс и оплата не заведены. Часы набора не стартовали.

**Старт следующей сессии:** Decide не включать, пока Владимир явно не скажет (инбокс + оплата).

## Read First

1. [`MEMORY.md`](MEMORY.md)
2. Spec (не прод): [`docs/superpowers/specs/2026-08-17-decision-os-validation-design.md`](docs/superpowers/specs/2026-08-17-decision-os-validation-design.md)

## Exact Stop Point

Vladimir 18.08: ship today's catalog and launch surfaces. Do not publish `/decide` as a live $99 offer. Inbox still unwired. Done and verified on prod.

# Noemium Handoff

Стоп-кадр: 2026-08-18 ~16:00 МСК. Владимир явно: commit + push + deploy сегодняшнего среза. `/decide` как живой $99 оффер на прод **не** выкатывать.

## Стоп-кадр

**Сделано (диск, уходит в git без `/decide` page):** каталог A+B (факт: **204 tools / 36 models / 15 stacks** + 14 agents), `/about` `/method`, quiz permalink, Floor, twins, JSON API, copy observation, weekly thread, graveyard successor, лонч-фиксы сайта. Нав/главная/⌘K без Decide.

**Не в коммите (локальный слайс 17.08):** `src/pages/decide.astro`, `DecideForm`, `decide-intake.json`, `docs/decide/`, `decide-brief` lib/tests. Инбокс (Web3Forms) и ссылка оплаты не заведены. Часы набора не стартовали.

**Прод:** GitHub Actions `Deploy` на push в `main` → rsync `dist/` на Vultr (`noemium.com`). Ожидаемый `/decide` на проде: не 200 с $99.

**Старт следующей сессии:** проверить прод (curl `/` `/tools/openai-codex/` `/api/tools.json` `/decide`). Decide не включать, пока Владимир явно не скажет (инбокс + оплата).

```
[стоп-кадр · механика] 18.08.2026
noemium/app [main] — каталог+лонч-поверхности к коммиту/пушу; /decide page остаётся untracked.
```

## Read First

1. [`MEMORY.md`](MEMORY.md)
2. Spec (не прод): [`docs/superpowers/specs/2026-08-17-decision-os-validation-design.md`](docs/superpowers/specs/2026-08-17-decision-os-validation-design.md)

## Exact Stop Point

Vladimir 18.08: ship today's catalog and launch surfaces. Do not publish `/decide` as a live $99 offer. Inbox still unwired.

## Local decide (not on prod)

- `/decide/` — $99, 48h, 3/week — files on disk only
- no engine, no Watch, no X `PILOT`
- Without the Web3Forms key the form copies the brief

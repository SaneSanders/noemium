# Noemium Handoff

Стоп-кадр: **2026-08-18 ~19:05 МСК**. Прод живой. Decide на проде — **404**.

Сессия 18.08: ресерч каталога + ревью сайта + фичи + выкат + факап (спрятали design-киты) + откат. Владимир уходит в новую сессию **с этого места**.

## Read first

1. Этот файл
2. [`MEMORY.md`](MEMORY.md) — долгие решения
3. Прод: https://noemium.com

Не читать заново всю сессию. Ниже достаточно.

## Прод (факт)

- Репо: `SaneSanders/noemium`, ветка `main`
- HEAD на origin: **`613dbad`** — «Put every catalog tool back on the default shelf»
- Деплой: GitHub Actions `Deploy` → rsync `dist/` на Vultr
  - restore-полки: [32157977373](https://github.com/SaneSanders/noemium/actions/runs/32157977373) success
- Цифры: **204 tools / 36 models / 15 stacks / 14 agents / 1 graveyard**
- Design на дефолтной полке: **29** (не 8)
- `/decide` и `/decide/` → **404**. Нет $99.
- Нав: Tools / Agents / Stacks / Models / Quiz / Compare / Changelog / About. Decide нет.
- `/api/tools.json` count 204

Проверка:

```sh
curl -s https://noemium.com/ | grep -o 'design [0-9]*'   # ожидаем карточку design 29
curl -sI https://noemium.com/tools/lucide/               # 200
curl -sI https://noemium.com/decide/                     # 404
curl -s https://noemium.com/api/tools.json | python3 -c 'import sys,json; print(json.load(sys.stdin)["count"])'
```

Локально `app/` = git-репо. Workspace Cursor: `/Users/vladimir/projects/noemium`.

## Что сделали 18.08 (на проде)

**Каталог A+B** — +47 карточек, было 157 → 204. Без фейкового `ship`.
Волна A: Codex, Cline, Kilo, Amp, Antigravity, Kiro, Goose, Warp, Gemini app, Grok chat, Figma, Linear, Fathom, Ollama, Langfuse, Activepieces, Browser Use, GPT Image 2, Nano Banana, Reve, Wan, Fish Audio.
Волна B: Bolt, Lovable, OpenHands, Pi, Open WebUI, DeepSeek Chat, Mistral Vibe, Mastra, PydanticAI, OpenAI Agents SDK, E2B, Pipedream, Voyage, Parallel, Steel, LlamaParse, Chroma, vLLM, LiteLLM, AssemblyAI, Photoroom, LTX Studio, Dia, Comet, Kimi API.
Апдейты якорей: ChatGPT/Claude → `productivity` (alternatives = ассистенты, не Grammarly); Jasper $69; Zapier `automation`; Cursor/Claude Code receipts с pricing/docs; Copilot CLI в той же карточке; Kimi Code URL `kimi.com/code`.

**Лонч-фиксы:** герой не орёт «receipts for every claim»; weekly = git репо, не рынок; GLM не $0.00; `/about`; CTA Catalog/Quiz; featured → **anchor**; поиск на мобилке.

**Фичи на проде:** VERIFIED → proof drawer + `/method`; permalink `/quiz/<stack>/`; Floor mix + пыль на stale; budget-twins стеков; `/api/{tools,stacks,models}.json`; Copy observation; weekly Copy as X thread / RSS недели; Play.ht `succeeded_by` → Inworld TTS (карточки Inworld в каталоге **нет**).

**Скиллы:** разобрали, **не делали**. Не 13-я категория `/tools`. Если позже — хаб `/skills` на 12–15, не скрейп skills.sh.

## Факап — не повторять

Спрятали UI-киты (Lucide, shadcn, Radix, Footer, 404s, …) с дефолтной полки как «не ИИ». Design 29→8. Владимир: **каталог не только про ИИ, а также инструменты для работы с ИИ. Добавляем, не убавляем.** Откатили `613dbad`. Отдельной полки `?kit=1` больше нет. Не возвращать.

## Не в git (намеренно)

Локальный слайс Decide 17.08, **не пушить**:

- `src/pages/decide.astro`
- `src/islands/DecideForm.tsx`
- `src/data/decide-intake.json`
- `src/lib/decide-brief.ts`
- `docs/decide/`
- `docs/superpowers/plans/2026-08-17-decide-validation-slice.md`
- `tests/decide-brief.test.mjs`
- `tests/decide-pages.test.mjs`

Инбокс (Web3Forms) и оплата не заведены. Часы набора не стартовали. `/decide` на прод — только по явному «выкатывай Decide».

## Что дальше (очередь)

1. **Лонч PH / Show HN** — цифры **204 / 36 / 15** (не 195). Design = 29, не «8 AI». Нав без Decide. Tagline/первый коммент были в буфере с 17.08.
2. **Аналитика** — `PUBLIC_CF_BEACON_TOKEN` (Cloudflare Web Analytics). Без токена слот вслепую. ID не выдумывать.
3. **Полевой прогон** новых карточек → честный `ship`/`skip`. Сейчас у A+B в основном `situational`.
4. **Волна C** (по желанию, не блокер слота): Jules, Replit Agent, Writer, Jenni, LanguageTool, Krisp, Penpot, Seedream, Grok Imagine, CapCut/Descript, **Inworld TTS как карточка**, Bedrock, Vertex, Temporal, Mem0.
5. Слабые receipts подтянуть: Grok, Goose, Wan, Comet, Photoroom.
6. **Скиллы / Decision OS** — после слота. Decide не мешать в PH.

Не тащить: AI-чат «подберём», теги, звёзды, submit без PR, deals, Wall of Shame.

## Команды

```sh
cd /Users/vladimir/projects/noemium/app
npm test && npm run validate && npm run check
# деплой = push в main (не wrangler)
```

Порт preview в сессии сверки был 4330; канон проекта смотри скрипты/`astro dev`.

## Красные линии

- Прод без явного «деплой» не трогать. Этот срез уже выкачен.
- `/decide` не публиковать.
- Не прятать карточки каталога эвристикой «это не ИИ».
- Не ставить `verdict: ship` без полевого прогона.
- Коммит/пуш/деплой — только по слову Владимира.

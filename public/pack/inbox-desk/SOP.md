# SOP — Inbox Desk

Daily loop. The agent writes. You send. No blasts.

## Loop

```
new inbound
  → Inbox: tag + facts + 1 draft or needs_human
  → if lead: Qual, 3–5 questions
  → if Qual = ready_to_book: Closer-lite, prepaid/slot draft
  → you read → send / edit / stay quiet
```

One pass per inbound. Do not run one message through all three roles "just in case".

## 1. New inbound

Collect the text as-is: form, email, WhatsApp, Instagram, voice (if you have a transcript).

Do not clean it up. Keep typos and swearing — Inbox will tag them.

One conversation per run. Do not dump a pile of 20 chats.

## 2. Inbox

Give the raw text to the Inbox profile.

You want:

- tag: `lead` / `existing` / `spam` / `vendor` / `personal` / `unclear`
- fields: name, service, city, budget, urgency — or `unknown`
- one short draft **or** `needs_human`

If Inbox invented a fact that is not in the inbound — drop the draft. Do not send.

Empty "hi" with no second message: `unclear`, draft `—`, wait. Do not dump a price list.

Where next:

| Inbox tag | Do this |
|---|---|
| `lead` | To Qual |
| `existing` | You read history. Qual only for a new service, not a complaint or warranty |
| `unclear` or `needs_human` | You look. Do not feed the agent further |
| `spam` / `vendor` / `personal` | Stop. Do not send to Qual |

## 3. Qual

Qualify only. It does not sell and does not ask anyone to *pay* a deposit.

3–5 questions, not a form:

1. Which service / what to do
2. When (date, window, "this week")
3. Where (address, area, drop-off)
4. Niche constraint: car size, headcount, material, contraindication
5. Ready for a prepaid slot: yes / no / unknown — not "how much will you leave"

Stop:

- service + when + where exist, no red flag → `ready_to_book` → Closer-lite (prepaid and slot live there)
- "never mind" / "already done" / silent after a second touch → `dead`, do not write a third
- yelling, haggling to zero, asking for legal guarantees → `escalate`, not Qual

You decide the second touch, not the agent.

## 4. Closer-lite

Only a warm lead with `status: ready_to_book` — or you said it is warm.

Draft: slot + prepaid. Language of the service — deposit, slot hold, date hold.

No fake urgency ("2 spots left", "today's last price") unless that is in the facts.

**You** check the prepaid sum and the free slot. The agent cannot see the calendar until you give it.

## Escalate — human, agent stops

- anger, threats, "I'll sue", review blackmail
- medicine / diagnosis / "which pill" — clinic books only, no advice
- warranty, "you already did this, it fell apart"
- haggling below cost, "do it free, I'm a blogger"
- a minor without an adult
- other people's data, chats, photos of other clients
- volume clearly not your format
- Inbox set `needs_human` or `unclear`

Escalate = a short internal note. To the client: nothing, or "I'll pass this to the tech, we'll reply ourselves" — if that is the house rule.

## When to stay quiet

- spam, "partnerships", lead-gen, SEO
- a repeat of a question you already answered
- they have the wrong chat / they are writing to themselves
- empty "hi" with no second message — wait, do not dump a price list
- after `dead` — do not resurrect
- night, if there is no night shift: draft in the morning, not "we are 24/7"

Silence is a valid outcome. Not every chat needs an agent reply.

## Do not spam

- one draft per inbound
- no "still with us?" series
- no price-list paste into every DM
- do not write people who did not write you
- do not drag a lead into a blast
- follow-up only if you decided, and only one short touch

## Shift checklist

- Any new ones Inbox has not seen
- Morning `needs_human` still hanging
- Yesterday's Qual went `dead` or to a slot
- No draft with an invented price left the chat

/**
 * Stack Autopsy client logic.
 *
 * Reads the embedded JSON data block, renders the picker, manages the pick tray,
 * and produces the diagnostic report. Nothing leaves the browser.
 */

const CATS = {
  coding: 'Coding',
  'dev-infra': 'Infra',
  data: 'Retrieval',
  'models-api': 'APIs',
  agents: 'Agents',
  automation: 'Automation',
  design: 'Design',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  writing: 'Writing',
  productivity: 'Assistants',
};

const STALE_DAYS = 60;
const LS_STACK = 'noemium.autopsy.stack';
const LS_SEEN = 'noemium.autopsy.seen';
const INITIAL_TILES = 60;

const D = { tools: [], dead: [], stacks: [], price_moves: [], fresh: [], timeline: [] };
const byId = new Map();
let picked = new Set();
let cat = null;
let query = '';
let showAll = false;

const logoSrc = (e) => (e.kind === 'dead' || !e.logo ? null : `/logos/${e.slug}.png`);
const el = (id) => document.getElementById(id);

function init() {
  const dataScript = el('autopsy-data');
  if (!dataScript) return;
  Object.assign(D, JSON.parse(dataScript.textContent));

  for (const t of D.tools) byId.set(t.slug, { ...t, kind: 'tool' });
  for (const g of D.dead) if (!byId.has(g.slug)) byId.set(g.slug, { ...g, kind: 'dead' });

  restore();
  buildCats();
  renderGrid();
  syncTray();
  if (picked.size) cutOpen({ scroll: false });
}

// ------------------------------------------------------------- state
function restore() {
  const fromUrl = new URLSearchParams(location.search).get('s');
  const raw = fromUrl ?? localStorage.getItem(LS_STACK) ?? '';
  picked = new Set(raw.split(',').map((s) => s.trim()).filter((s) => byId.has(s)));
}

function persist() {
  const list = [...picked].join(',');
  localStorage.setItem(LS_STACK, list);
  const url = new URL(location.href);
  if (list) url.searchParams.set('s', list);
  else url.searchParams.delete('s');
  history.replaceState(null, '', url);
}

// ------------------------------------------------------------- picker
function buildCats() {
  const wrap = el('cats');
  const mk = (label, id) => {
    const b = document.createElement('button');
    b.className = 'autopsy-chip' + (id === cat ? ' on' : '');
    b.textContent = label;
    if (id) b.dataset.cat = id;
    b.onclick = () => {
      cat = id;
      showAll = false;
      syncCats();
      renderGrid();
    };
    wrap.appendChild(b);
  };
  mk('all', null);
  for (const id of Object.keys(CATS)) {
    if (D.tools.some((t) => t.category === id)) mk(CATS[id], id);
  }
  mk('buried', '__dead');
}

function syncCats() {
  document.querySelectorAll('#cats .autopsy-chip').forEach((c) => {
    c.classList.toggle('on', (c.dataset.cat ?? null) === cat);
  });
}

el('q').addEventListener('input', (e) => {
  query = e.target.value.trim().toLowerCase();
  showAll = false;
  renderGrid();
});

const rank = (e) =>
  (e.kind === 'dead' ? 4 : 0) +
  (e.featured ? 0 : 1) +
  ({ ship: 0, situational: 1, skip: 2 }[e.verdict] ?? 1);

function candidates() {
  let list = [...byId.values()];
  if (cat === '__dead') list = list.filter((e) => e.kind === 'dead');
  else if (cat) list = list.filter((e) => e.category === cat && e.kind === 'tool');
  if (query) {
    list = list.filter(
      (e) => e.name.toLowerCase().includes(query) || e.slug.includes(query),
    );
  }
  return list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

function renderGrid() {
  const all = candidates();
  const list = showAll ? all : all.slice(0, INITIAL_TILES);
  const grid = el('grid');
  grid.innerHTML = '';
  for (const e of list) grid.appendChild(tile(e));

  const more = el('more');
  const rest = all.length - list.length;
  more.classList.toggle('autopsy-hidden', rest <= 0);
  more.textContent = `show ${rest} more`;
  more.onclick = () => {
    showAll = true;
    renderGrid();
  };
}

function tile(e) {
  const b = document.createElement('button');
  b.className =
    'autopsy-tile' +
    (picked.has(e.slug) ? ' on' : '') +
    (e.kind === 'dead' ? ' is-dead' : '');
  const src = logoSrc(e);
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => img.replaceWith(fallback(e));
    b.appendChild(img);
  } else {
    b.appendChild(fallback(e));
  }
  const txt = document.createElement('span');
  const nm = document.createElement('b');
  nm.textContent = e.name;
  const sub = document.createElement('small');
  sub.textContent = e.kind === 'dead' ? 'buried' : (CATS[e.category] ?? e.category);
  txt.append(nm, sub);
  b.appendChild(txt);
  b.onclick = () => toggle(e.slug);
  return b;
}

function fallback(e) {
  const d = document.createElement('span');
  d.className = 'autopsy-noimg';
  d.textContent =
    (e.name || '?').replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase() || '?';
  return d;
}

function toggle(slug) {
  if (picked.has(slug)) picked.delete(slug);
  else picked.add(slug);
  persist();
  renderGrid();
  syncTray();
}

function syncTray() {
  const reportOpen = !el('stepReport').classList.contains('autopsy-hidden');
  el('tray').classList.toggle('on', picked.size > 0 && !reportOpen);
  document.body.classList.toggle('autopsy-has-tray', picked.size > 0 && !reportOpen);
  el('count').textContent = `${picked.size} picked`;
  const box = el('picks');
  box.innerHTML = '';
  for (const slug of picked) {
    const e = byId.get(slug);
    const b = document.createElement('button');
    b.className = 'autopsy-pick';
    b.title = 'remove';
    const src = logoSrc(e);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.onerror = () => img.remove();
      b.appendChild(img);
    }
    b.append(document.createTextNode(e.name + ' ×'));
    b.onclick = () => toggle(slug);
    box.appendChild(b);
  }
}

el('clearAll').onclick = () => {
  picked.clear();
  persist();
  renderGrid();
  el('stepReport').classList.add('autopsy-hidden');
  collapsePicker(false);
  syncTray();
};

el('cut').onclick = () => cutOpen({ scroll: true });

function collapsePicker(collapsed) {
  el('stepPick').classList.toggle('autopsy-hidden', collapsed);
  el('reopen').classList.toggle('autopsy-hidden', !collapsed);
}

el('reopen').onclick = () => {
  el('stepReport').classList.add('autopsy-hidden');
  collapsePicker(false);
  syncTray();
  el('lede').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ------------------------------------------------------------- the verdicts
const daysSince = (iso) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : null;
};

function diagnose() {
  const mine = [...picked].map((s) => byId.get(s)).filter(Boolean);
  const tools = mine.filter((e) => e.kind === 'tool');
  const graves = mine.filter((e) => e.kind === 'dead');
  const cats = new Set(tools.map((t) => t.category));
  const F = [];

  // 1. A corpse in the stack.
  if (graves.length) {
    F.push({
      warn: true,
      tag: 'buried',
      head:
        graves.length === 1
          ? `${graves[0].name} is dead. You still have it.`
          : `${graves.length} things in your stack are dead.`,
      body: graves.map((g) => {
        const succ = g.no_successor
          ? 'Nothing replaced it.'
          : g.successor
            ? `Replaced by ${g.successor}.`
            : '';
        return `<strong>${g.name}</strong> — died ${g.died}. ${g.cause ?? ''} ${succ}`;
      }),
    });
  }

  // 2. Tools we looked at and rejected.
  const rejected = tools.filter((t) => t.verdict === 'skip');
  if (rejected.length) {
    F.push({
      warn: true,
      tag: 'we said no',
      head: `We rejected ${rejected.length === 1 ? 'one of these' : `${rejected.length} of these`}.`,
      items: rejected,
      quotes: rejected.map((t) => ({ name: t.name, text: t.verdict_text, receipt: t.receipt })),
    });
  }

  // 3. Price moved under you.
  const moves = D.price_moves.filter((m) => picked.has(m.slug));
  if (moves.length) {
    const seen = new Set();
    const uniq = moves.filter((m) => !seen.has(m.slug) && seen.add(m.slug));
    const shown = uniq.slice(0, 5);
    const rest = uniq.length - shown.length;
    F.push({
      tag: 'price moved',
      head: `${uniq.length === 1 ? 'One tool' : `${uniq.length} tools`} changed pricing while you were using them.`,
      body: shown.map((m) => {
        const e = byId.get(m.slug);
        return `<strong>${e?.name ?? m.slug}</strong> · week of ${m.date}<br>
          <span style="opacity:.6">was:</span> ${m.from ?? '—'}<br>
          <span style="opacity:.6">now:</span> ${m.to ?? '—'}`;
      }),
      items: rest > 0 ? uniq.slice(5).map((m) => byId.get(m.slug)).filter(Boolean) : null,
      foot:
        (rest > 0 ? `${rest} more moved too, listed above without the diff. ` : '') +
        'We record the vendor’s own pricing note, before and after. No percentages — the catalogue stores prices as text, not numbers, and an invented number is worse than none.',
    });
  }

  // 4. A free tool we would actually ship sits in the same category.
  const swaps = [];
  for (const t of tools) {
    if (t.pricing !== 'paid') continue;
    const alts = D.tools.filter(
      (o) =>
        o.category === t.category &&
        o.verdict === 'ship' &&
        o.free_tier &&
        o.slug !== t.slug &&
        !picked.has(o.slug),
    ).slice(0, 3);
    if (alts.length) swaps.push({ tool: t, alts });
  }
  if (swaps.length) {
    F.push({
      tag: 'paid, with a free shelf',
      head: swaps.length === 1
        ? 'One paid pick has a free alternative we rate ship.'
        : `${swaps.length} paid picks have a free alternative we rate ship.`,
      pairs: swaps,
      foot: 'Not a claim that they are equivalent — a claim that a free tool in the same category cleared our bar. Open the cards and judge.',
    });
  }

  // 5. Two tools doing the same job.
  const dupes = {};
  for (const t of tools) (dupes[t.category] ??= []).push(t);
  const doubled = Object.entries(dupes).filter(([, v]) => v.length > 1);
  if (doubled.length) {
    F.push({
      tag: 'doubling up',
      head: `You keep ${doubled.length === 1 ? 'two' : 'several'} sets of tools in the same category.`,
      groups: doubled.map(([c, v]) => ({ label: CATS[c] ?? c, items: v })),
      foot: 'Sometimes deliberate, often a leftover subscription. Worth one look.',
    });
  }

  // 6. Shipped since — only from the newest changelog week.
  const fresh = D.fresh
    .map((s) => byId.get(s))
    .filter((e) => e && !picked.has(e.slug) && cats.has(e.category));
  if (fresh.length) {
    F.push({
      tag: `new in ${D.fresh_week}`,
      head: `${fresh.length === 1 ? 'One thing' : `${fresh.length} things`} landed in your categories this week.`,
      items: fresh,
    });
  }

  // 7. Provider lock.
  const locked = tools.filter((t) => t.model_routing === 'locked');
  const declared = tools.filter((t) => t.model_routing);
  if (locked.length >= 2) {
    F.push({
      tag: 'provider lock',
      head: `${locked.length} of your tools are locked to one model provider.`,
      items: locked,
      foot: `Counted over the ${declared.length} of your picks that declare routing at all — most cards do not, so read this as a floor, not a total.`,
    });
  }

  // 8. Altitude.
  const ship = tools.filter((t) => t.verdict === 'ship').length;
  const unsettled = tools.filter((t) => t.verdict === 'situational').length;
  if (tools.length >= 3) {
    const airborne = unsettled >= tools.length * 0.6;
    F.push({
      tag: 'altitude',
      head: airborne
        ? `${unsettled} of your ${tools.length} picks work only under conditions.`
        : `${ship} of your ${tools.length} picks are on solid ground.`,
      body: [
        airborne
          ? 'Most of what you run is unsettled. Normal on the frontier, expensive the moment something moves.'
          : 'You are mostly on proven ground. The cost of that is missing what happens above the horizon.' +
            (unsettled ? ` ${unsettled} of your picks sit in the sky.` : ''),
      ],
      map: true,
    });
  }

  // 9. Archetype.
  let best = null;
  for (const s of D.stacks) {
    const hit = s.tools.filter((t) => picked.has(t));
    if (hit.length >= 2 && (!best || hit.length > best.hit.length)) {
      best = { stack: s, hit, missing: s.tools.filter((t) => !picked.has(t)) };
    }
  }
  if (best) {
    F.push({
      tag: 'archetype',
      head: `You have ${best.hit.length} of ${best.stack.tools.length} of “${best.stack.title}”.`,
      body: [best.stack.use_case],
      missing: best.missing.map((s) => byId.get(s)).filter(Boolean),
      cost: best.stack,
    });
  }

  // 10. Stale cards.
  const stale = tools.filter((t) => (daysSince(t.last_verified) ?? 0) > STALE_DAYS);
  if (stale.length) {
    F.push({
      tag: 'unverified lately',
      head: `We have not re-checked ${stale.length} of your picks in over ${STALE_DAYS} days.`,
      items: stale,
      foot: 'Our problem, not yours. These pages are due for a pass.',
    });
  }

  const clean = [];
  if (!graves.length) clean.push('Nothing in your stack is buried.');
  if (!rejected.length) clean.push('Nothing here carries a skip verdict.');
  if (!moves.length) clean.push('No pricing changes recorded on your picks.');
  if (!doubled.length) clean.push('No two picks compete in the same category.');
  if (!stale.length) clean.push(`Every pick was re-verified within ${STALE_DAYS} days.`);

  return { mine, tools, graves, F, clean, ship, unsettled };
}

// ------------------------------------------------------------- render report
function cutOpen({ scroll }) {
  const r = diagnose();
  const box = el('stepReport');
  box.classList.remove('autopsy-hidden');
  box.innerHTML = '';
  collapsePicker(true);

  const score = document.createElement('div');
  score.className = 'autopsy-score';
  const verdictLine = r.graves.length
    ? 'You are running a corpse.'
    : r.F.some((f) => f.warn)
      ? 'There is something to fix.'
      : 'Nothing rotten. A few things moved.';
  score.innerHTML = `
    <h2>${verdictLine}</h2>
    <div class="autopsy-nums">
      <div class="autopsy-num"><strong>${r.mine.length}</strong><span>in your stack</span></div>
      <div class="autopsy-num"><strong>${r.ship}</strong><span>solid ground</span></div>
      <div class="autopsy-num"><strong>${r.unsettled}</strong><span>unsettled</span></div>
      <div class="autopsy-num${r.graves.length ? ' acc' : ''}"><strong>${r.graves.length}</strong><span>buried</span></div>
      <div class="autopsy-num"><strong>${r.F.length}</strong><span>findings</span></div>
    </div>`;
  box.appendChild(score);

  const since = sinceLastVisit();
  if (since) box.insertAdjacentHTML('beforeend', since);

  for (const f of r.F) box.appendChild(finding(f));
  if (r.clean.length) {
    const c = document.createElement('div');
    c.className = 'autopsy-clean';
    c.innerHTML = `<div class="autopsy-clean-tag">checked, clean</div><ul>${r.clean
      .map((t) => `<li>${t}</li>`)
      .join('')}</ul>`;
    box.appendChild(c);
  }

  const after = document.createElement('div');
  after.className = 'autopsy-after';
  after.innerHTML = `
    <a class="autopsy-btn pri" href="/map/#stack=${[...picked].join(',')}">See it on the map</a>
    <button class="autopsy-btn" id="copyCard">Copy the card</button>
    <a class="autopsy-btn" id="toX" target="_blank" rel="noopener">Post it</a>
    <span class="autopsy-note">Your stack lives in this URL and in your browser. No account, nothing sent anywhere.</span>`;
  box.appendChild(after);

  el('copyCard').onclick = copyCard;
  el('toX').href =
    'https://x.com/intent/post?' +
    new URLSearchParams({ text: shareText(r), url: location.href });

  if (scroll) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  markSeen();
  syncTray();
}

function finding(f) {
  const d = document.createElement('div');
  d.className = 'autopsy-find' + (f.warn ? ' warn' : '');
  let html = `<div class="autopsy-find-tag">${f.tag}</div><div><h3>${f.head}</h3>`;
  for (const p of f.body ?? []) html += `<p>${p}</p>`;
  for (const q of f.quotes ?? []) {
    html += `<div class="autopsy-quote"><strong>${q.name}</strong> — ${q.text}</div>`;
    if (q.receipt) {
      html += `<div class="autopsy-src">receipt: <a href="${q.receipt}" target="_blank" rel="noopener">${new URL(q.receipt).hostname}</a></div>`;
    }
  }
  if (f.items) html += `<div class="autopsy-row">${f.items.map(item).join('')}</div>`;
  for (const g of f.groups ?? []) {
    html += `<p style="margin-top:14px"><span style="opacity:.55">${g.label}</span></p>
      <div class="autopsy-row">${g.items.map(item).join('')}</div>`;
  }
  for (const p of f.pairs ?? []) {
    html += `<p style="margin-top:14px">${item(p.tool)} <span style="opacity:.55">→ free and shippable:</span></p>
      <div class="autopsy-row">${p.alts.map(item).join('')}</div>`;
  }
  if (f.missing?.length) {
    html += `<p style="margin-top:14px"><span style="opacity:.55">missing from it:</span></p>
      <div class="autopsy-row">${f.missing.map(item).join('')}</div>`;
  }
  if (f.cost) {
    const b = f.cost.budget;
    html += `<p>Priced at $${f.cost.monthly_cost_usd}/mo as we verified it${b ? `, or $${b.cost}/mo on the cheaper cut` : ''}.</p>`;
  }
  if (f.map) {
    html += `<p><a href="/map/#stack=${[...picked].join(',')}" style="color:var(--nm-field)">See where your stack sits on the map →</a></p>`;
  }
  if (f.foot) html += `<p style="opacity:.62;font-size:11.5px">${f.foot}</p>`;
  return (d.innerHTML = html + '</div>'), d;
}

function item(e) {
  if (!e) return '';
  const src = logoSrc(e);
  const img = src ? `<img src="${src}" alt="" onerror="this.remove()">` : '';
  const href = e.kind === 'dead' ? '/graveyard/' : `/tools/${e.slug}/`;
  return `<a class="autopsy-item${e.kind === 'dead' ? ' strike' : ''}" href="${href}" target="_blank" rel="noopener" style="text-decoration:none">${img}${e.name}</a>`;
}

function sinceLastVisit() {
  const seen = localStorage.getItem(LS_SEEN);
  if (!seen || seen === D.fresh_week) return null;
  const idx = D.timeline.findIndex((w) => w.id === seen);
  const weeks = idx > 0 ? D.timeline.slice(0, idx) : D.timeline.slice(0, 1);
  const hits = [];
  for (const w of weeks) {
    for (const s of w.buried)
      if (picked.has(s)) hits.push(`${byId.get(s)?.name ?? s} was buried`);
    for (const c of w.changed)
      if (picked.has(c.slug))
        hits.push(`${byId.get(c.slug)?.name ?? c.slug} — ${c.field} changed`);
  }
  if (!hits.length) return null;
  const uniq = [...new Set(hits)].slice(0, 6);
  return `<div class="autopsy-since"><h4>Since you last opened this</h4>
    <p>${uniq.join(' · ')}</p></div>`;
}

function markSeen() {
  localStorage.setItem(LS_SEEN, D.fresh_week ?? '');
}

function shareText(r) {
  const bits = [
    `My stack: ${r.mine.length} tools, ${r.ship} on solid ground, ${r.unsettled} unsettled`,
  ];
  if (r.graves.length) bits.push(`${r.graves.length} already dead`);
  return bits.join(', ') + '.';
}

// ------------------------------------------------------------- share card
function copyCard() {
  const r = diagnose();
  const c = el('cardCanvas');
  const x = c.getContext('2d');
  const W = c.width;
  const H = c.height;

  const root = getComputedStyle(document.documentElement);
  const deep = root.getPropertyValue('--nm-deep').trim();
  const cream = root.getPropertyValue('--nm-cream').trim();
  const field = root.getPropertyValue('--nm-field').trim();

  x.fillStyle = deep;
  x.fillRect(0, 0, W, H);

  x.fillStyle = cream;
  x.beginPath();
  x.moveTo(0, H);
  for (let px = 0; px <= W; px += 8) {
    const t = (px - W / 2) / (W / 2);
    x.lineTo(px, H - 150 + 52 * t * t);
  }
  x.lineTo(W, H);
  x.closePath();
  x.fill();

  x.fillStyle = cream;
  x.font = '600 20px "IBM Plex Mono", monospace';
  x.fillText('N O E M I U M   ·   S T A C K   A U T O P S Y', 64, 78);

  x.font = '500 62px Fraunces, Georgia, serif';
  const head = r.graves.length ? 'You are running a corpse.' : 'Your stack, opened up.';
  x.fillText(head, 64, 190);

  x.font = '400 24px "IBM Plex Mono", monospace';
  x.globalAlpha = 0.74;
  const lines = [
    `${r.mine.length} tools in the stack`,
    `${r.ship} on solid ground · ${r.unsettled} unsettled · ${r.graves.length} buried`,
    ...r.F.slice(0, 3).map((f) => `— ${f.head.replace(/<[^>]+>/g, '')}`),
  ];
  lines.forEach((l, i) => x.fillText(l.slice(0, 62), 64, 258 + i * 42));
  x.globalAlpha = 1;

  x.fillStyle = deep;
  x.font = '600 22px "IBM Plex Mono", monospace';
  x.fillText('noemium.com/autopsy', 64, H - 54);
  x.fillStyle = field;
  x.fillRect(64, H - 44, 268, 3);

  c.toBlob(async (blob) => {
    const btn = el('copyCard');
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      btn.textContent = 'Copied';
    } catch {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'stack-autopsy.png';
      a.click();
      btn.textContent = 'Downloaded';
    }
    setTimeout(() => (btn.textContent = 'Copy the card'), 2200);
  }, 'image/png');
}

init();

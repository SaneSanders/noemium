/* World map — ported from design-refs/lab/map.html. Vanilla SVG, data from /api/map.json. */
const NS = 'http://www.w3.org/2000/svg';
const el = (n, a = {}) => {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, a[k]);
  return e;
};

// Virtual canvas. The map is drawn once at this size and then transformed.
const VW = 2600, VH = 1700;
const HORIZON = 1060, ARC = 128;              // land is a dome, as in hero v4
const horizonAt = (x) => HORIZON + ARC * Math.pow((x - VW / 2) / (VW / 2), 2);

const SKY_TOP = 330;      // above this: model stars only
const SKY_GAP = 78;       // clear band right above the horizon line
const LAND_GAP = 40;
const LAND_DEPTH = 262;   // ground labels are always on, so they need the room
const UNDER_GAP = 360;

// Deterministic pseudo-random from a slug, so the layout never jumps between
// reloads or between builds.
function seed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

const state = { nodes: [], stars: [], regions: [], counts: {}, activeRegion: null, query: '' };

// Autopsy hands the stack over in the hash: map.html#stack=cursor,veo-3
const myStack = new Set(
  (location.hash.match(/stack=([^&]*)/)?.[1] ?? '')
    .split(',').map((s) => decodeURIComponent(s.trim())).filter(Boolean),
);

fetch('/api/map.json').then((r) => r.json()).then((data) => {
  state.nodes = data.nodes;
  state.stars = data.stars;
  state.regions = data.regions;
  state.counts = data.counts;
  layout();
  draw();
  buildChips();
  showCounts();
  showMine();
});

// When Autopsy sends a stack over, say where it actually sits.
function showMine() {
  if (!myStack.size) return;
  const mine = state.nodes.filter((n) => myStack.has(n.slug));
  if (!mine.length) return;
  // Every band must appear or the parts stop adding up to the total: rejected
  // tools sit on the crust and belong to neither sky nor ground.
  const n = (b) => mine.filter((m) => m.band === b).length;
  const parts = [
    [n('land'), 'on the ground'],
    [n('sky'), 'in the sky'],
    [n('crust'), 'rejected on the surface'],
    [n('under'), 'underground'],
  ].filter(([c]) => c > 0).map(([c, label]) => `${c} ${label}`);
  const band = el2('mineband');
  band.classList.remove('hidden');
  band.innerHTML = `<b>Your stack on the map</b> — ${mine.length} marked in cobalt:
    ${parts.join(', ')}.
    <div class="acts">
      <button id="onlyMine">only my stack</button>
      <a href="/autopsy/?s=${[...myStack].join(',')}">back to autopsy</a>
    </div>`;
  const btn = el2('onlyMine');
  btn.onclick = () => {
    state.onlyMine = !state.onlyMine;
    btn.classList.toggle('on', state.onlyMine);
    applyFilter();
  };
}
const el2 = (id) => document.getElementById(id);

// ---------------------------------------------------------------- layout
function layout() {
  const { nodes, stars, regions } = state;

  // Region columns. Width follows crowding, but ground tools count four times:
  // they are the ones whose labels are always drawn, and they set the real
  // horizontal demand. Infra has 16 of them and was strangling itself.
  const per = {}, ground = {};
  for (const n of nodes) {
    per[n.region] = (per[n.region] ?? 0) + 1;
    if (n.band === 'land') ground[n.region] = (ground[n.region] ?? 0) + 1;
  }
  const weight = (id) => (per[id] ?? 1) + 4 * (ground[id] ?? 0);
  const totalWeight = regions.reduce((s, r) => s + weight(r.id), 0);
  const PAD = 168, GUT = 30;   // left margin leaves room for the axis rail
  const usable = VW - PAD * 2 - GUT * (regions.length - 1);
  let x = PAD;
  for (const r of regions) {
    r.w = Math.max(150, usable * (weight(r.id) / totalWeight));
    r.x0 = x;
    x += r.w + GUT;
  }
  // Proportional widths rarely add up; stretch the last region to the margin.
  const last = regions[regions.length - 1];
  last.w = Math.max(150, VW - PAD - last.x0);

  for (const n of nodes) {
    const r = regions.find((rr) => rr.id === n.region) ?? regions[0];
    const rnd = seed(n.slug);
    n.rnd = rnd;
    const inset = 24;
    n.x = r.x0 + inset + rnd() * Math.max(10, r.w - inset * 2);
    n.r = n.featured ? 5.4 : n.band === 'under' ? 3 : 3.8;
  }

  // The raw scores cluster hard (72% of the catalogue is `situational`, 55% is
  // blueshift), so a direct score→pixel mapping leaves two dense stripes and an
  // empty sky. Rank inside the territory instead: order stays meaningful
  // (rising above steady above sinking), and the band actually fills.
  const buckets = {};
  for (const n of nodes) (buckets[n.region + '|' + n.band] ??= []).push(n);

  for (const key in buckets) {
    const list = buckets[key].sort(
      (a, b) => LANE[a.momentum] - LANE[b.momentum] || b.level - a.level,
    );
    list.forEach((n, i) => {
      const spread = list.length > 1 ? i / (list.length - 1) : 0.5;
      const yh = horizonAt(n.x);
      if (n.band === 'sky') {
        // The sky floor is flat, not curved: a curved floor pushes edge nodes
        // below the territory labels and they collide.
        const floor = HORIZON - SKY_GAP;
        // spread 0 = high frontier, 1 = just above the horizon
        n.y = SKY_TOP + spread * (floor - SKY_TOP);
        n.y += (n.rnd() - 0.5) * 62;
      } else if (n.band === 'land') {
        n.y = yh + LAND_GAP + spread * LAND_DEPTH + (n.rnd() - 0.5) * 34;
      } else if (n.band === 'crust') {
        n.y = yh + 17 + (n.rnd() - 0.5) * 12;
      } else {
        n.y = yh + UNDER_GAP + spread * 96;
      }
    });
  }

  relax(nodes.filter((n) => n.band !== 'land'));
  packGround(nodes.filter((n) => n.band === 'land'), regions);

  // Stars: models spread across the whole sky above the tool bands.
  const sorted = [...stars].sort((a, b) => b.popularity - a.popularity);
  sorted.forEach((s, i) => {
    const rnd = seed(s.name);
    // Golden-ratio stride keeps bright stars from clumping on one side.
    const frac = ((i * 0.6180339887) % 1);
    s.x = 200 + frac * (VW - 420);
    s.y = 84 + ((i % 6) / 6) * (SKY_TOP - 150) + rnd() * 30;
    s.r = 1.4 + (s.popularity / 100) * 3.6;
    // Only the brightest get names, and never under the moon or the controls.
    const clearOfMoon = Math.hypot(s.x - (VW - 300), s.y - 176) > 200;
    const clearOfPanel = !(s.x < 620 && s.y < 250);
    s.named = i < 11 && clearOfMoon && clearOfPanel;
  });
}

// Push overlapping marks apart inside their own territory and band.
function relax(nodes) {
  const groups = {};
  for (const n of nodes) (groups[n.region + '|' + n.band] ??= []).push(n);
  for (const key in groups) {
    const list = groups[key];
    for (let pass = 0; pass < 90; pass++) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          const min = 15;
          const d2 = dx * dx + dy * dy;
          if (d2 > min * min || d2 === 0) continue;
          const d = Math.sqrt(d2) || 0.01;
          const push = (min - d) / 2;
          dx /= d; dy /= d;
          a.x -= dx * push; a.y -= dy * push * 0.55;
          b.x += dx * push; b.y += dy * push * 0.55;
        }
      }
    }
  }
}

// Every ground mark is labelled at every zoom, so relaxation is the wrong tool
// here — it settles into overlaps. Pack them into rows inside the territory
// instead: guaranteed clear, and the ordered ground against the scattered sky
// is itself the point. Rows follow the dome, so they curve with the land.
const LANE = { blueshift: 0, steady: 1, redshift: 2 };
const labelW = (n) => n.r * 2 + 6 + n.name.length * 7.5;

function packGround(list, regions) {
  const GAP = 20;
  for (const r of regions) {
    const items = list
      .filter((n) => n.region === r.id)
      .sort(
        (a, b) =>
          LANE[a.momentum] - LANE[b.momentum] || a.name.localeCompare(b.name),
      );
    if (!items.length) continue;

    const maxW = r.w - 16;
    // A few names are longer than their own territory ("Google AI Studio /
    // Gemini API"). Clip the drawn label to fit; the card still shows it whole.
    for (const n of items) {
      n.label = n.name;
      const budget = maxW - n.r * 2 - 6;
      if (labelW(n) > maxW && budget > 40) {
        n.label = n.name.slice(0, Math.floor(budget / 7.5) - 1).trimEnd() + '…';
      }
    }
    const drawnW = (n) => n.r * 2 + 6 + n.label.length * 7.5;

    const rows = [];
    let row = [], w = 0;
    for (const n of items) {
      const wN = drawnW(n);
      if (row.length && w + GAP + wN > maxW) {
        rows.push({ items: row, w });
        row = []; w = 0;
      }
      w += (row.length ? GAP : 0) + wN;
      row.push(n);
    }
    if (row.length) rows.push({ items: row, w });

    // Spread rows over the whole cream, not just the strip under the horizon.
    const span = LAND_DEPTH - 24;
    rows.forEach((rw, ri) => {
      const t = rows.length > 1 ? ri / (rows.length - 1) : 0.28;
      let x = r.x0 + 8 + Math.max(0, (maxW - rw.w) / 2);
      for (const n of rw.items) {
        n.side = 'r';
        n.x = x + n.r;
        n.y = horizonAt(n.x) + LAND_GAP + t * span;
        x += drawnW(n) + GAP;
      }
    });
  }
}

// ---------------------------------------------------------------- draw
const scene = document.getElementById('scene');
let root;

// A 2600-wide canvas squeezed into a phone is unreadable, so narrow screens get
// a slice: about three territories at a time, switched with the chips.
const narrow = () => innerWidth < 760;
function applyViewport() {
  if (!narrow()) {
    scene.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
    return;
  }
  const w = Math.round(VH * (innerWidth / innerHeight));
  const r = state.regions.find((rr) => rr.id === state.activeRegion);
  const cx = r ? r.x0 + r.w / 2 : VW / 2;
  const x0 = Math.max(0, Math.min(VW - w, cx - w / 2));
  scene.setAttribute('viewBox', `${x0} 0 ${w} ${VH}`);
}

function draw() {
  applyViewport();
  scene.innerHTML = '';
  root = el('g');
  scene.appendChild(root);

  // faint rays from the vanishing point, carried over from hero v4
  const rays = el('g');
  const cx = VW / 2, cy = horizonAt(cx) + 60;
  for (let a = 0; a < 180; a += 2.6) {
    const rad = ((a - 90) * Math.PI) / 180;
    rays.appendChild(el('line', {
      x1: cx, y1: cy,
      x2: cx + Math.cos(rad) * 2600, y2: cy - Math.abs(Math.sin(rad)) * 2200,
      class: 'ray',
    }));
  }
  root.appendChild(rays);

  // the moon, carried over from hero v4 — same sky, same night
  const moonR = 46, moonX = VW - 300, moonY = 176;
  const moonId = 'moonbite';
  const defs = el('defs');
  const mask = el('mask', { id: moonId });
  mask.appendChild(el('rect', { x: 0, y: 0, width: VW, height: VH, fill: 'white' }));
  mask.appendChild(el('circle', { cx: moonX + moonR * 0.62, cy: moonY - moonR * 0.16, r: moonR * 1.06, fill: 'black' }));
  defs.appendChild(mask);
  root.appendChild(defs);
  root.appendChild(el('circle', { cx: moonX, cy: moonY, r: moonR, fill: 'var(--ink)', mask: `url(#${moonId})` }));

  // territory dividers: the sky needs structure or it reads as scatter
  const divs = el('g');
  for (const r of state.regions) {
    if (r.x0 <= 100) continue;
    const gx = r.x0 - 15;
    divs.appendChild(el('line', {
      x1: gx, y1: SKY_TOP - 46, x2: gx, y2: horizonAt(gx) - 6,
      stroke: 'color-mix(in srgb, var(--nm-cream) 8%, transparent)', 'stroke-width': 1,
    }));
  }
  root.appendChild(divs);

  // model stars
  const starG = el('g');
  for (const s of state.stars) {
    const g = el('g', { class: 'starwrap' });
    g.appendChild(el('circle', {
      cx: s.x, cy: s.y, r: s.r,
      class: 'star' + (s.retiring ? ' retiring' : ''),
    }));
    if (s.named) {
      const t = el('text', { x: s.x, y: s.y - s.r - 7, class: 'starlbl' });
      t.textContent = s.name;
      g.appendChild(t);
    }
    g.addEventListener('mouseenter', (e) => showStar(s, e));
    g.addEventListener('mouseleave', hideCard);
    starG.appendChild(g);
  }
  root.appendChild(starG);

  // the land: a dome of cream
  let d = `M 0 ${horizonAt(0)}`;
  for (let x = 0; x <= VW; x += 20) d += ` L ${x} ${horizonAt(x)}`;
  d += ` L ${VW} ${VH} L 0 ${VH} Z`;
  root.appendChild(el('path', { d, class: 'land' }));

  // the soil where the buried live: a darker cut of the cream
  const soilTop = (x) => horizonAt(x) + UNDER_GAP - 30;
  let ds = `M 0 ${soilTop(0)}`;
  for (let x = 0; x <= VW; x += 20) ds += ` L ${x} ${soilTop(x)}`;
  ds += ` L ${VW} ${VH} L 0 ${VH} Z`;
  root.appendChild(el('path', { d: ds, fill: 'color-mix(in srgb, var(--nm-deep) 7%, var(--nm-cream))' }));

  let du = `M 0 ${soilTop(0)}`;
  for (let x = 0; x <= VW; x += 20) du += ` L ${x} ${soilTop(x)}`;
  root.appendChild(el('path', { d: du, class: 'under-line', fill: 'none' }));

  // territory labels on one flat line, so they read as a row and not as wobble
  const regionY = HORIZON - 40;
  for (const r of state.regions) {
    const cxr = r.x0 + r.w / 2;
    const t = el('text', { x: cxr, y: regionY, class: 'region-label' });
    t.textContent = r.label;
    root.appendChild(t);
  }

  // the axis rail — without it the whole metaphor is invisible
  root.appendChild(buildRail());

  // tool marks
  const nodeG = el('g');
  for (const n of state.nodes) {
    const g = el('g', {
      class: `node n-${n.band}` + (n.fresh ? ' fresh' : '')
        + (myStack.has(n.slug) ? ' mine' : ''),
      'data-slug': n.slug,
      tabindex: '0',
      role: 'link',
      'aria-label': n.name,
    });
    g.appendChild(el('circle', { cx: n.x, cy: n.y, r: 11, class: 'hit' }));

    if (n.band === 'land') {
      const s = n.r * 1.7;
      g.appendChild(el('rect', { x: n.x - s / 2, y: n.y - s / 2, width: s, height: s, class: 'mk' }));
    } else if (n.band === 'crust') {
      const s = n.r * 1.6;
      const x1 = n.x - s, y1 = n.y - s, x2 = n.x + s, y2 = n.y + s;
      g.appendChild(el('line', { x1, y1, x2, y2, class: 'mk' }));
      g.appendChild(el('line', { x1, y1: y2, x2, y2: y1, class: 'mk' }));
    } else {
      g.appendChild(el('circle', { cx: n.x, cy: n.y, r: n.r, class: 'mk' }));
    }
    if (n.fresh) g.appendChild(el('circle', { cx: n.x, cy: n.y, r: n.r + 4.5, class: 'ring' }));
    if (myStack.has(n.slug)) {
      g.appendChild(el('circle', { cx: n.x, cy: n.y, r: n.r + 8, class: 'halo' }));
    }

    const left = n.side === 'l';
    const lbl = el('text', {
      x: left ? n.x - n.r - 6 : n.x + n.r + 6,
      y: n.y + 3.4,
      class: 'lbl',
      ...(left ? { 'text-anchor': 'end' } : {}),
    });
    lbl.textContent = n.label ?? n.name;
    g.appendChild(lbl);
    n.lbl = lbl;

    g.addEventListener('mouseenter', (e) => showNode(n, e));
    g.addEventListener('mouseleave', hideCard);
    g.addEventListener('focusin', () => { showNode(n, null); placeNear(g); });
    g.addEventListener('focusout', hideCard);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const path = n.kind === 'dead' ? 'graveyard' : `tools/${n.slug}`;
        location.href = `/${path}/`;
      }
    });
    g.addEventListener('click', () => {
      const path = n.kind === 'dead' ? 'graveyard' : `tools/${n.slug}`;
      location.href = `/${path}/`;
    });
    nodeG.appendChild(g);
    n.g = g;
  }
  root.appendChild(nodeG);

  applyLod();
  applyFilter();
}

// The vertical axis is the whole idea, so it gets a rail with named altitudes.
function buildRail() {
  const g = el('g', { class: 'rail' });
  const x = 44;
  const yh = horizonAt(x);
  g.appendChild(el('line', {
    x1: x, y1: 348, x2: x, y2: yh + UNDER_GAP + 78,
    stroke: 'color-mix(in srgb, var(--nm-cream) 16%, transparent)', 'stroke-width': 1,
  }));

  const marks = [
    { y: 372, text: 'frontier', on: 'sky', note: 'newest, unproven' },
    { y: 700, text: 'unsettled', on: 'sky', note: 'works with conditions' },
    { y: yh - 18, text: 'horizon', on: 'sky', note: '' },
    { y: yh + 108, text: 'ground', on: 'land', note: 'put it to work' },
    { y: yh + UNDER_GAP + 4, text: 'buried', on: 'land', note: 'dead' },
  ];
  for (const m of marks) {
    const dark = m.on === 'land';
    const col = dark
      ? 'color-mix(in srgb, var(--nm-deep) 62%, transparent)'
      : 'color-mix(in srgb, var(--nm-cream) 52%, transparent)';
    g.appendChild(el('line', {
      x1: x - 7, y1: m.y, x2: x + 7, y2: m.y, stroke: col, 'stroke-width': 1.2,
    }));
    const t = el('text', {
      x: x + 15, y: m.y + 4,
      class: 'band-label', fill: col,
    });
    t.textContent = m.text;
    g.appendChild(t);
    if (m.note) {
      const n = el('text', {
        x: x + 15, y: m.y + 26,
        'font-size': 13, 'letter-spacing': '0.08em',
        fill: dark
          ? 'color-mix(in srgb, var(--nm-deep) 38%, transparent)'
          : 'color-mix(in srgb, var(--nm-cream) 30%, transparent)',
      });
      n.textContent = m.note;
      g.appendChild(n);
    }
  }
  return g;
}

// ---------------------------------------------------------------- zoom / pan
let zoom = 1, panX = 0, panY = 0;
function apply() {
  root.setAttribute('transform', `translate(${panX} ${panY}) scale(${zoom})`);
  applyLod();
}
// Labels are the thing that turns a map into noise. Reveal them by zoom.
function applyLod() {
  const level = zoom < 1.35 ? 0 : zoom < 2.1 ? 1 : 2;
  for (const n of state.nodes) {
    const show =
      myStack.has(n.slug) ||
      level === 2 ||
      (level === 1 && (n.featured || n.band === 'land' || n.fresh)) ||
      // On the ground everything is named: 63 marks read, 176 would not.
      (level === 0 && (n.featured || n.band === 'land'));
    n.lbl.style.display = show ? '' : 'none';
    const base = n.band === 'land' || n.band === 'crust' ? 15 : 17;
    n.lbl.setAttribute('font-size', (base / Math.max(1, zoom * 0.8)).toFixed(2));
  }
}
scene.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = scene.getBoundingClientRect();
  const sx = ((e.clientX - rect.left) / rect.width) * VW;
  const sy = ((e.clientY - rect.top) / rect.height) * VH;
  const next = Math.max(0.85, Math.min(7, zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  panX = sx - (sx - panX) * (next / zoom);
  panY = sy - (sy - panY) * (next / zoom);
  zoom = next;
  apply();
}, { passive: false });

let drag = null;
scene.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY, px: panX, py: panY };
  scene.classList.add('dragging');
});
scene.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = scene.getBoundingClientRect();
  panX = drag.px + ((e.clientX - drag.x) / rect.width) * VW;
  panY = drag.py + ((e.clientY - drag.y) / rect.height) * VH;
  apply();
});
addEventListener('pointerup', () => { drag = null; scene.classList.remove('dragging'); });

function resetView() { zoom = 1; panX = 0; panY = 0; apply(); }
addEventListener('resize', () => { applyViewport(); resetView(); });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    resetView();
    const q = document.getElementById('q');
    if (q.value) { q.value = ''; state.query = ''; applyFilter(); }
  }
  if (e.key === '/' && document.activeElement !== document.getElementById('q')) {
    e.preventDefault();
    document.getElementById('q').focus();
  }
});

// ---------------------------------------------------------------- filter
function buildChips() {
  const wrap = document.getElementById('regionChips');
  const all = document.createElement('button');
  all.className = 'chip on';
  all.textContent = 'all';
  all.onclick = () => { state.activeRegion = null; syncChips(); applyFilter(); applyViewport(); };
  wrap.appendChild(all);
  for (const r of state.regions) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.dataset.region = r.id;
    b.textContent = r.label;
    b.onclick = () => {
      state.activeRegion = r.id;
      syncChips(); applyFilter(); applyViewport();
    };
    wrap.appendChild(b);
  }
  if (narrow()) {
    state.activeRegion = state.regions[0].id;
    syncChips(); applyFilter(); applyViewport();
  }
}
function syncChips() {
  document.querySelectorAll('#regionChips .chip').forEach((c) => {
    const on = c.dataset.region ? c.dataset.region === state.activeRegion : !state.activeRegion;
    c.classList.toggle('on', on);
  });
}
document.getElementById('q').addEventListener('input', (e) => {
  state.query = e.target.value.trim().toLowerCase();
  applyFilter();
});
function applyFilter() {
  const { activeRegion, query } = state;
  for (const n of state.nodes) {
    const regionOk = !activeRegion || n.region === activeRegion;
    const hit = query && (n.name.toLowerCase().includes(query) || n.slug.includes(query));
    const queryOk = !query || hit;
    const mineOk = !state.onlyMine || myStack.has(n.slug);
    n.g.classList.toggle('dim', !(regionOk && queryOk && mineOk));
    n.g.classList.toggle('hit-match', !!hit);
    if (hit) n.lbl.style.display = '';
  }
}

// ---------------------------------------------------------------- card
const card = document.getElementById('card');
function placeAt(x, y) {
  const w = 300, pad = 14;
  let left = x + 18, top = y + 14;
  if (left + w + pad > innerWidth) left = x - w - 18;
  if (top + 200 > innerHeight) top = innerHeight - 210;
  card.style.left = left + 'px';
  card.style.top = top + 'px';
}
function place(e) { placeAt(e.clientX, e.clientY); }
function placeNear(el) {
  const rect = el.getBoundingClientRect();
  placeAt(rect.right, rect.top);
}
function showNode(n, e) {
  const band = { sky: 'unsettled', land: 'solid ground', crust: 'we looked, no', under: 'buried' }[n.band];
  card.innerHTML = `
    <h3>${n.name}</h3>
    <div class="meta">${n.category} · ${band}${n.momentum ? ' · ' + n.momentum : ''}</div>
    <p>${n.tagline ?? ''}</p>
    <div class="tags">
      ${n.verdict ? `<span class="tag ${n.verdict === 'ship' ? 'ship' : ''}${n.verdict === 'dead' ? 'dead' : ''}">${n.verdict}</span>` : ''}
      ${n.pricing ? `<span class="tag">${n.pricing}</span>` : ''}
      ${n.free_tier ? '<span class="tag">free tier</span>' : ''}
      ${n.open_source ? '<span class="tag">open source</span>' : ''}
      ${n.fresh ? '<span class="tag">new this week</span>' : ''}
      ${n.last_verified ? `<span class="tag">verified ${n.last_verified}</span>` : ''}
    </div>`;
  if (e) place(e);
  card.classList.add('on');
}
function showStar(s, e) {
  const price = s.price_in ? `$${s.price_in}/$${s.price_out} per Mtok` : 'unit priced';
  card.innerHTML = `
    <h3>${s.name}</h3>
    <div class="meta">model · ${s.provider} · heat ${s.popularity}</div>
    <p>${price}${s.context_window ? ` · ${(s.context_window / 1000).toFixed(0)}k context` : ''}</p>
    <div class="tags">
      ${s.open_weights ? '<span class="tag">open weights</span>' : '<span class="tag">closed</span>'}
      ${s.retiring ? `<span class="tag dead">retiring ${s.retiring}</span>` : ''}
    </div>`;
  place(e);
  card.classList.add('on');
}
function hideCard() { card.classList.remove('on'); }

function showCounts() {
  const c = state.counts;
  document.getElementById('counts').innerHTML =
    `<b>${c.tools}</b> tools · <b>${c.ship}</b> solid ground · <b>${c.situational}</b> unsettled · ` +
    `<b>${c.skip}</b> rejected · <b>${c.dead}</b> buried · <b>${c.models}</b> models`;
}

/**
 * Constellation hero — vanilla three.js star field for the home page.
 *
 * Loaded lazily (dynamic import of 'three') after first paint. Never loads
 * under prefers-reduced-motion — the static CSS poster stays instead.
 * Pauses when the canvas leaves the viewport and when the tab is hidden.
 * All star colors are read from CSS tokens at runtime; no hex lives here.
 */

const STAR_COUNT = 2000;
const CLUSTER_COUNT = 10; // one cluster per catalog category
const LENS_RADIUS_PX = 120;
const LENS_STRENGTH_PX = 26;
const DPR_CAP = 1.5;
const DRIFT_RADIANS_PER_SEC = 0.008;

let activeCleanup: (() => void) | null = null;

function tokenColor(name: string): string | null {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || null;
}

/** Deterministic PRNG so the sky looks the same on every visit. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function initHeroField(
  canvas: HTMLCanvasElement,
  poster: HTMLElement | null,
): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  activeCleanup?.();
  activeCleanup = null;

  // Wait a frame so the dynamic import never competes with first paint.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const THREE = await import('three');
  if (!canvas.isConnected) return; // navigated away while three.js loaded

  const ink = tokenColor('--nm-ink');
  const near = tokenColor('--nm-shift-near');
  const gold = tokenColor('--nm-gold');
  if (!ink || !near || !gold) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
  camera.position.z = 60;

  // --- Star positions: 10 gaussian clusters over a wide field -------------
  const rand = mulberry32(20260815);
  const base = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const cInk = new THREE.Color(ink);
  const cNear = new THREE.Color(near);
  const cGold = new THREE.Color(gold);

  const gauss = () => (rand() + rand() + rand() - 1.5) * 2; // approx N(0, ~0.8)

  const clusters: [number, number, number][] = [];
  for (let i = 0; i < CLUSTER_COUNT; i++) {
    const angle = (i / CLUSTER_COUNT) * Math.PI * 2 + rand() * 0.5;
    const radius = 14 + rand() * 34;
    clusters.push([
      Math.cos(angle) * radius * 1.6,
      Math.sin(angle) * radius,
      -26 + rand() * 30,
    ]);
  }

  for (let i = 0; i < STAR_COUNT; i++) {
    const [cx, cy, cz] = clusters[i % CLUSTER_COUNT];
    const spread = 4 + rand() * 7;
    base[i * 3] = cx + gauss() * spread;
    base[i * 3 + 1] = cy + gauss() * spread * 0.7;
    base[i * 3 + 2] = cz + gauss() * spread * 0.5;

    const roll = rand();
    const c = roll < 0.62 ? cInk : roll < 0.9 ? cNear : cGold;
    const dim = 0.35 + rand() * 0.65;
    colors[i * 3] = c.r * dim;
    colors[i * 3 + 1] = c.g * dim;
    colors[i * 3 + 2] = c.b * dim;
  }

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(base); // mutated copy for the lens
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Soft round sprite drawn on a 2D canvas (white; tinted by vertex color).
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = 32;
  spriteCanvas.height = 32;
  const ctx = spriteCanvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
  }
  const sprite = new THREE.CanvasTexture(spriteCanvas);

  const material = new THREE.PointsMaterial({
    size: 1.7,
    map: sprite,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  const sky = new THREE.Group();
  sky.add(points);
  scene.add(sky);

  // --- Sizing ---------------------------------------------------------------
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  // --- Gravitational lens at the cursor -------------------------------------
  const pointer = { x: -1e4, y: -1e4, inside: false };
  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.inside =
      pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
  };
  const onPointerLeave = () => {
    pointer.inside = false;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);

  const projected = new THREE.Vector3();

  const applyLens = () => {
    if (!pointer.inside) {
      positions.set(base);
      geometry.attributes.position.needsUpdate = true;
      return;
    }
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    for (let i = 0; i < STAR_COUNT; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const bz = base[i * 3 + 2];
      projected.set(bx, by, bz).applyMatrix4(sky.matrixWorld).project(camera);
      const sx = (projected.x * 0.5 + 0.5) * w;
      const sy = (-projected.y * 0.5 + 0.5) * h;
      const dx = sx - pointer.x;
      const dy = sy - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= LENS_RADIUS_PX || dist === 0) {
        positions[i * 3] = bx;
        positions[i * 3 + 1] = by;
        positions[i * 3 + 2] = bz;
        continue;
      }
      const falloff = 1 - dist / LENS_RADIUS_PX;
      const pushPx = falloff * falloff * LENS_STRENGTH_PX;
      // Convert the screen-space push into world units at the star's depth.
      const depth = camera.position.z - bz;
      const worldPerPx = (2 * depth * Math.tan((camera.fov * Math.PI) / 360)) / h;
      positions[i * 3] = bx + (dx / dist) * pushPx * worldPerPx;
      positions[i * 3 + 1] = by - (dy / dist) * pushPx * worldPerPx;
      positions[i * 3 + 2] = bz;
    }
    geometry.attributes.position.needsUpdate = true;
  };

  // --- Loop with viewport / tab visibility gating ---------------------------
  let inViewport = false;
  let rafId = 0;
  let running = false;
  let last = 0;

  const frame = (now: number) => {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    sky.rotation.y += DRIFT_RADIANS_PER_SEC * dt;
    sky.rotation.x = Math.sin(now / 24000) * 0.03;
    sky.updateMatrixWorld();
    applyLens();
    renderer.render(scene, camera);
  };

  const updateRunning = () => {
    const should = inViewport && !document.hidden;
    if (should && !running) {
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(rafId);
    }
  };

  const intersectionObserver = new IntersectionObserver((entries) => {
    inViewport = entries[0]?.isIntersecting ?? false;
    updateRunning();
  });
  intersectionObserver.observe(canvas);

  const onVisibility = () => updateRunning();
  document.addEventListener('visibilitychange', onVisibility);

  // Reveal the canvas once the first frame is ready, retire the CSS poster.
  inViewport = true;
  updateRunning();
  canvas.classList.add('nm-hero-live');
  poster?.setAttribute('hidden', '');

  // --- Cleanup (view transitions / unmount) ---------------------------------
  const cleanup = () => {
    running = false;
    cancelAnimationFrame(rafId);
    intersectionObserver.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
    geometry.dispose();
    material.dispose();
    sprite.dispose();
    renderer.dispose();
    if (activeCleanup === cleanup) activeCleanup = null;
  };
  activeCleanup = cleanup;
}

/** Tear down whatever sky is live — called before view-transition swaps. */
export function destroyHeroField() {
  activeCleanup?.();
  activeCleanup = null;
}

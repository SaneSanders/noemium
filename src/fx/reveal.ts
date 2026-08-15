/**
 * Scroll reveal — GSAP fade+12px for elements marked [data-reveal].
 * gsap is a lazy dynamic import; under prefers-reduced-motion (or if the
 * import fails) elements simply stay visible.
 */
export function initReveals() {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (targets.length === 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  void (async () => {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]);
    if (targets.some((el) => !el.isConnected)) return;
    gsap.registerPlugin(ScrollTrigger);
    for (const el of targets) {
      if (!el.isConnected) continue;
      gsap.from(el, {
        opacity: 0,
        y: 12,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    }
  })();
}

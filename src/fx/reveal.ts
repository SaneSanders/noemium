/**
 * Scroll reveal — elements marked [data-reveal] fade+rise into view via
 * IntersectionObserver. No animation library; under prefers-reduced-motion
 * elements simply stay visible (the .nm-reveal CSS also force-shows them).
 */
let observer: IntersectionObserver | null = null;

export function initReveals() {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (targets.length === 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    // The observer outlives view transitions; drop it before each swap so
    // it never keeps firing on detached elements.
    document.addEventListener(
      'astro:before-swap',
      () => {
        observer?.disconnect();
        observer = null;
      },
      { once: true },
    );
  }

  for (const el of targets) {
    el.classList.add('nm-reveal');
    observer.observe(el);
  }
}

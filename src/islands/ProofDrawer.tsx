import { useCallback, useEffect, useState } from 'preact/hooks';
import { githubToolBlob, isHomepageReceipt } from '../lib/shelf';

export interface ProofEntry {
  name: string;
  last_verified: string;
  observed_by: string;
  receipts: string[];
  path: string;
  commit?: string | null;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function pathname(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path === '/' ? '' : path;
  } catch {
    return '';
  }
}

export default function ProofDrawer() {
  const [slug, setSlug] = useState<string | null>(null);
  const [index, setIndex] = useState<Record<string, ProofEntry> | null>(null);

  const loadIndex = useCallback(() => {
    if (index) return;
    fetch('/proof-index.json')
      .then((r) => r.json())
      .then((data: Record<string, ProofEntry>) => setIndex(data))
      .catch(() => setIndex({}));
  }, [index]);

  useEffect(() => {
    const onClick = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const btn = t.closest('[data-proof-slug]');
      if (!(btn instanceof HTMLElement)) return;
      const next = btn.dataset.proofSlug;
      if (!next) return;
      e.preventDefault();
      e.stopPropagation();
      loadIndex();
      setSlug(next);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [loadIndex]);

  useEffect(() => {
    if (!slug) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSlug(null);
    };
    window.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [slug]);

  if (!slug) return null;

  const entry = index?.[slug];

  return (
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSlug(null);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Verification proof"
    >
      <div class="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-lg border-[1.5px] border-ink bg-card shadow-hard-lg sm:rounded-lg">
        <div class="flex items-start justify-between gap-4 border-b-[1.5px] border-ink px-5 py-4">
          <div>
            <p class="font-mono text-[11px] font-bold tracking-[0.14em] text-accent uppercase">
              proof drawer
            </p>
            <h2 class="mt-1 font-display text-2xl font-extrabold tracking-tight">
              {entry?.name ?? slug}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSlug(null)}
            class="rounded-md border-[1.5px] border-ink px-2 py-1 font-mono text-xs text-ink hover:border-accent hover:text-accent"
            aria-label="Close proof drawer"
          >
            esc
          </button>
        </div>

        {!index && <p class="px-5 py-6 font-mono text-xs text-ink-dim">loading receipts…</p>}

        {index && !entry && (
          <p class="px-5 py-6 font-mono text-xs text-ink-dim">
            No proof index for this slug — the card may be newer than the last build.
          </p>
        )}

        {entry && (
          <div class="space-y-5 px-5 py-5">
            <p class="font-mono text-[13px] text-ink">
              <span class="tracking-[0.12em] text-ink-dim uppercase">last verified</span>
              <span class="nm-num mt-1 block text-base font-bold">{entry.last_verified}</span>
            </p>
            <p class="font-mono text-[13px] text-ink">
              <span class="tracking-[0.12em] text-ink-dim uppercase">observed by</span>
              <span class="mt-1 block font-bold">@{entry.observed_by}</span>
            </p>
            <div>
              <p class="font-mono text-[13px] tracking-[0.12em] text-ink-dim uppercase">receipts</p>
              <ol class="mt-2 space-y-2">
                {entry.receipts.map((url, i) => (
                  <li key={url} class="font-mono text-[13px]">
                    <sup class="font-bold text-accent">{i + 1}</sup>{' '}
                    <a href={url} class="text-accent hover:underline" rel="noopener">
                      {hostname(url)}
                      <span class="text-ink-dim">{pathname(url)}</span>
                    </a>
                    {isHomepageReceipt(url) && (
                      <span class="mt-0.5 block text-[11px] text-ink-dim">
                        homepage — not a pricing page
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
            <p class="font-mono text-[13px]">
              <span class="tracking-[0.12em] text-ink-dim uppercase">catalog file</span>
              <a
                href={githubToolBlob(slug)}
                class="mt-1 block text-accent hover:underline"
                rel="noopener"
              >
                {entry.path}
                {entry.commit ? <span class="text-ink-dim"> · {entry.commit}</span> : null}
              </a>
            </p>
            <p class="border-t-[1.5px] border-line-soft pt-4 font-mono text-[12px] leading-relaxed text-ink-dim">
              A homepage receipt still counts as a source — it just isn't a price. How we grade
              claims:{' '}
              <a href="/method" class="text-accent hover:underline">
                /method
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { navigate } from 'astro:transitions/client';
import type { Verdict } from './ui';

interface ToolHit {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  verdict: Verdict;
}
interface StackHit {
  slug: string;
  title: string;
  use_case: string;
}
interface ModelHit {
  slug: string;
  name: string;
  provider: string;
}
interface AgentHit {
  slug: string;
  name: string;
  tagline: string;
  agent_layer: string;
  evidence_tier: 'field-tested' | 'source-verified' | 'radar';
}
interface Index {
  tools: ToolHit[];
  stacks: StackHit[];
  models: ModelHit[];
  agents: AgentHit[];
}

interface Row {
  kind: 'tool' | 'agent' | 'stack' | 'model' | 'command';
  label: string;
  hint: string;
  href: string;
}

/** Subsequence fuzzy score: higher is better, -1 = no match. */
function fuzzy(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  let score = 0;
  let streak = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      streak++;
      score += streak * 2 + (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-' ? 4 : 0);
    } else {
      streak = 0;
    }
  }
  return qi === q.length ? score - t.length * 0.01 : -1;
}

const MISSION = [
  'NOEMIUM — pick AI tools without getting played.',
  '',
  'An open source catalog of AI tools, stacks and models.',
  'No paid listings. No sponsored verdicts. No dark patterns.',
  'Every entry is a pull request; every verdict links its receipts;',
  'every limitation is printed next to the praise.',
  '',
  'The catalog is the code. The code is the catalog.',
  'Fork it: github.com/SaneSanders/noemium',
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<Index | null>(null);
  const [selected, setSelected] = useState(0);
  const [easterEgg, setEasterEgg] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const loadIndex = useCallback(() => {
    if (index) return;
    fetch('/search-index.json')
      .then((r) => r.json())
      .then((data: Index) => setIndex(data))
      .catch(() => {});
  }, [index]);

  const openPalette = useCallback(() => {
    setOpen(true);
    setEasterEgg(false);
    loadIndex();
  }, [loadIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setEasterEgg(false);
        loadIndex();
      }
    };
    const onOpen = () => openPalette();
    window.addEventListener('keydown', onKey);
    window.addEventListener('nm:palette:open', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('nm:palette:open', onOpen);
    };
  }, [loadIndex, openPalette]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commandMode = query.startsWith('>');
  const commandBody = commandMode ? query.slice(1).trim() : '';

  const rows = useMemo<Row[]>(() => {
    if (!index) return [];
    if (commandMode) {
      const [cmd, ...rest] = commandBody.split(/\s+/);
      const arg = rest.join(' ');
      if (cmd === 'noema') {
        return [{ kind: 'command', label: 'noema — why this exists', hint: 'mission', href: '#noema' }];
      }
      if (cmd === 'compare') {
        const picked = rest
          .map((token) => {
            const scored = index.tools
              .map((t) => ({ t, s: Math.max(fuzzy(token, t.slug), fuzzy(token, t.name)) }))
              .filter((x) => x.s >= 0)
              .sort((a, b) => b.s - a.s)[0];
            return scored?.t.slug;
          })
          .filter((s): s is string => Boolean(s));
        const unique = [...new Set(picked)].slice(0, 4);
        if (unique.length >= 2) {
          return [
            {
              kind: 'command',
              label: `compare ${unique.join(' · ')}`,
              hint: `${unique.length} tools side by side`,
              href: `/tools/compare?tools=${unique.join(',')}`,
            },
          ];
        }
        return [
          {
            kind: 'command',
            label: 'compare <tool> <tool> [tool…]',
            hint: 'name 2–4 tools',
            href: '/tools/compare',
          },
        ];
      }
      if (cmd === 'stack') {
        const hits = index.stacks
          .map((s) => ({ s, score: arg ? Math.max(fuzzy(arg, s.title), fuzzy(arg, s.use_case)) : 1 }))
          .filter((x) => x.score >= 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        return hits.map(({ s }) => ({
          kind: 'stack' as const,
          label: s.title,
          hint: 'stack',
          href: `/stacks/${s.slug}`,
        }));
      }
      if (cmd === 'agent') {
        const hits = index.agents
          .map((agent) => ({
            agent,
            score: arg
              ? Math.max(fuzzy(arg, agent.name), fuzzy(arg, agent.tagline), fuzzy(arg, agent.agent_layer))
              : 1,
          }))
          .filter((x) => x.score >= 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);
        return hits.map(({ agent }) => ({
          kind: 'agent' as const,
          label: agent.name,
          hint: agent.evidence_tier === 'radar' ? 'agent · radar' : `agent · ${agent.agent_layer}`,
          href: `/agents/${agent.slug}`,
        }));
      }
      return [
        { kind: 'command', label: 'compare <a> <b>', hint: 'side-by-side table', href: '/tools/compare' },
        { kind: 'command', label: 'agent <query>', hint: 'search agent guides', href: '/agents' },
        { kind: 'command', label: 'stack <query>', hint: 'search stacks', href: '/stacks' },
        { kind: 'command', label: 'noema', hint: 'mission', href: '#noema' },
      ];
    }

    const q = query.trim();
    if (!q) {
      return [
        ...index.tools.slice(0, 5).map((t) => ({
          kind: 'tool' as const,
          label: t.name,
          hint: t.category,
          href: `/tools/${t.slug}`,
        })),
        ...index.agents
          .filter((agent) => agent.evidence_tier !== 'radar')
          .slice(0, 3)
          .map((agent) => ({
            kind: 'agent' as const,
            label: agent.name,
            hint: `agent · ${agent.agent_layer}`,
            href: `/agents/${agent.slug}`,
          })),
        ...index.stacks.slice(0, 3).map((s) => ({
          kind: 'stack' as const,
          label: s.title,
          hint: 'stack',
          href: `/stacks/${s.slug}`,
        })),
      ];
    }

    const tools = index.tools
      .map((t) => ({
        row: {
          kind: 'tool' as const,
          label: t.name,
          hint: `${t.category} · ${t.verdict}`,
          href: `/tools/${t.slug}`,
        },
        score: Math.max(fuzzy(q, t.name), fuzzy(q, t.tagline) * 0.6, fuzzy(q, t.category) * 0.5),
      }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    const stacks = index.stacks
      .map((s) => ({
        row: {
          kind: 'stack' as const,
          label: s.title,
          hint: 'stack',
          href: `/stacks/${s.slug}`,
        },
        score: Math.max(fuzzy(q, s.title), fuzzy(q, s.use_case) * 0.6),
      }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const agents = index.agents
      .map((agent) => ({
        row: {
          kind: 'agent' as const,
          label: agent.name,
          hint: agent.evidence_tier === 'radar' ? 'agent · radar' : `agent · ${agent.agent_layer}`,
          href: `/agents/${agent.slug}`,
        },
        score: Math.max(
          fuzzy(q, agent.name),
          fuzzy(q, agent.tagline) * 0.6,
          fuzzy(q, agent.agent_layer) * 0.5,
        ),
      }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    const models = index.models
      .map((m) => ({
        row: {
          kind: 'model' as const,
          label: m.name,
          hint: `model · ${m.provider}`,
          href: `/models#${m.slug}`,
        },
        score: Math.max(fuzzy(q, m.name), fuzzy(q, m.provider) * 0.5),
      }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return [...tools, ...agents, ...stacks, ...models].map((x) => x.row);
  }, [index, query, commandMode, commandBody]);

  useEffect(() => setSelected(0), [rows.length, query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-row="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const close = () => {
    setOpen(false);
    setEasterEgg(false);
  };

  // Close on Escape even when focus is outside the input.
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  const go = (row: Row) => {
    if (row.href === '#noema') {
      setEasterEgg(true);
      return;
    }
    close();
    void navigate(row.href);
  };

  const onInputKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rows.length > 0) setSelected((s) => Math.min(s + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = rows[selected];
      if (row) go(row);
    }
  };

  if (!open) return null;

  const kindTone: Record<Row['kind'], string> = {
    tool: 'text-accent',
    agent: 'text-accent',
    stack: 'text-ink-dim',
    model: 'text-ink-dim',
    command: 'text-accent',
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 pt-[14vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div class="w-full max-w-xl rounded-lg border-[1.5px] border-ink bg-card shadow-hard-lg">
        {easterEgg ? (
          <div class="p-6">
            <p class="font-mono text-xs font-bold text-accent">&gt; noema</p>
            <pre class="mt-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-dim">
              {MISSION.join('\n')}
            </pre>
            <button
              type="button"
              onClick={() => setEasterEgg(false)}
              class="mt-6 rounded-sm border-[1.5px] border-ink px-3 py-1 font-mono text-xs text-ink transition-all duration-100 hover:-translate-0.5 hover:shadow-hard-sm"
            >
              back to search
            </button>
          </div>
        ) : (
          <>
            <div class="flex items-center gap-2 border-b-[1.5px] border-ink px-4">
              <span class="font-mono text-xs font-bold text-accent">{commandMode ? '>' : '⌘K'}</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                onKeyDown={onInputKey}
                placeholder="Search tools, agents, stacks, models — or type > for commands"
                class="w-full bg-transparent py-3 font-mono text-sm text-ink caret-accent placeholder:text-ink-dim focus:outline-none"
                aria-label="Search the catalog"
              />
              <kbd class="rounded-sm border-[1.5px] border-ink px-1.5 py-0.5 font-mono text-xs text-ink-dim">
                esc
              </kbd>
            </div>
            <ul ref={listRef} class="max-h-80 overflow-y-auto py-2">
              {!index && <li class="px-4 py-3 font-mono text-xs text-ink-dim">loading index…</li>}
              {index && rows.length === 0 && (
                <li class="px-4 py-3 font-mono text-xs text-ink-dim">
                  no matches — try <span class="text-accent">&gt;agent</span> or widen the query
                </li>
              )}
              {rows.map((row, i) => (
                <li key={`${row.kind}-${row.href}-${row.label}`} data-row={i}>
                  <button
                    type="button"
                    onClick={() => go(row)}
                    onMouseEnter={() => setSelected(i)}
                    class={`flex w-full items-baseline gap-3 px-4 py-2 text-left transition-colors duration-100 ${
                      i === selected ? 'bg-paper' : ''
                    }`}
                  >
                    <span
                      class={`w-14 shrink-0 font-mono text-xs tracking-widest uppercase ${kindTone[row.kind]}`}
                    >
                      {row.kind}
                    </span>
                    <span class="text-sm text-ink">{row.label}</span>
                    <span class="ml-auto font-mono text-xs text-ink-dim">{row.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p class="flex items-center justify-between border-t-[1.5px] border-ink px-4 py-2 font-mono text-xs text-ink-dim">
              <span>↑↓ navigate · enter open · esc close</span>
              <a href="/search" class="font-medium text-accent hover:underline" onClick={close}>
                full-text search →
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

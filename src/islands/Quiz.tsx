import { useEffect, useMemo, useState } from 'preact/hooks';
import { navigate } from 'astro:transitions/client';

export interface QuizStackTool {
  slug: string;
  name: string;
  category: string;
  self_host: boolean;
}

export interface QuizStack {
  slug: string;
  title: string;
  use_case: string;
  monthly_cost_usd: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tools: QuizStackTool[];
}

type AnswerKey = 'goal' | 'budget' | 'level' | 'selfhost' | 'team';
type Answers = Partial<Record<AnswerKey, string>>;

const QUESTIONS: {
  key: AnswerKey;
  title: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: 'goal',
    title: 'What are you building?',
    options: [
      { value: 'app', label: 'An app / product' },
      { value: 'content', label: 'Content' },
      { value: 'research', label: 'Research' },
      { value: 'automation', label: 'Automation' },
      { value: 'other', label: 'Something else' },
    ],
  },
  {
    key: 'budget',
    title: 'Monthly budget for AI tools?',
    options: [
      { value: '0', label: '$0 — free tiers only' },
      { value: '50', label: 'Under $50' },
      { value: '200', label: 'Under $200' },
      { value: 'inf', label: 'Whatever it takes' },
    ],
  },
  {
    key: 'level',
    title: 'How technical are you?',
    options: [
      { value: 'nocode', label: 'No code' },
      { value: 'some', label: 'I can follow a tutorial' },
      { value: 'dev', label: 'I write code' },
    ],
  },
  {
    key: 'selfhost',
    title: 'Is self-hosting on the table?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'any', label: "Don't care" },
    ],
  },
  {
    key: 'team',
    title: 'Who is this for?',
    options: [
      { value: 'solo', label: 'Just me' },
      { value: 'small', label: 'A small team' },
      { value: 'large', label: 'A larger org' },
    ],
  },
];

const GOAL_CATEGORIES: Record<string, string[]> = {
  app: ['coding', 'dev-infra', 'models-api', 'agents'],
  content: ['writing', 'image', 'video', 'audio'],
  research: ['data', 'writing', 'productivity'],
  automation: ['automation', 'agents', 'productivity', 'dev-infra', 'data'],
  other: [],
};

function score(stack: QuizStack, a: Answers): number {
  let s = 0;

  const cats = GOAL_CATEGORIES[a.goal ?? 'other'] ?? [];
  for (const tool of stack.tools) {
    if (cats.includes(tool.category)) s += 2;
  }

  const cost = stack.monthly_cost_usd;
  const budget = a.budget;
  if (budget === '0') {
    s += cost === 0 ? 4 : -4;
  } else if (budget === '50' || budget === '200') {
    const cap = Number(budget);
    if (cost <= cap) s += 3;
    else if (cost <= cap * 1.5) s += 0;
    else s -= 4;
  }

  const level = a.level;
  if (level === 'nocode') {
    s += stack.difficulty === 'beginner' ? 3 : stack.difficulty === 'intermediate' ? -1 : -4;
  } else if (level === 'some') {
    s += stack.difficulty === 'intermediate' ? 3 : stack.difficulty === 'beginner' ? 1 : -1;
  } else if (level === 'dev') {
    s += stack.difficulty === 'beginner' ? 0 : 2;
  }

  const anySelfHost = stack.tools.some((t) => t.self_host);
  if (a.selfhost === 'yes' && anySelfHost) s += 1;
  if (a.selfhost === 'no' && anySelfHost) s -= 1;

  if (a.team === 'solo' && cost < 50) s += 1;
  if (a.team === 'large' && stack.difficulty !== 'beginner') s += 1;

  return s;
}

export default function Quiz({ stacks }: { stacks: QuizStack[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const done = step >= QUESTIONS.length;
  const result = useMemo(() => {
    if (!done) return null;
    const ranked = [...stacks].sort((a, b) => score(b, answers) - score(a, answers));
    const winner = ranked[0] ?? null;
    const runnerUp = ranked[1] ?? null;
    let runnerUpLabel: string | null = null;
    if (winner && runnerUp) {
      const winnerScore = score(winner, answers);
      const runnerScore = score(runnerUp, answers);
      const gap = winnerScore > 0 ? (winnerScore - runnerScore) / winnerScore : 0;
      runnerUpLabel = gap <= 0.2 ? 'Close call' : 'Runner-up';
    }
    return { winner, runnerUp, runnerUpLabel };
  }, [done, stacks, answers]);
  const winner = result?.winner ?? null;
  const runnerUp = result?.runnerUp ?? null;
  const runnerUpLabel = result?.runnerUpLabel ?? null;

  const restart = () => {
    setAnswers({});
    setStep(0);
  };

  useEffect(() => {
    if (done && winner) {
      const params = new URLSearchParams({ from: 'quiz' });
      if (runnerUp && runnerUpLabel) {
        params.set('runner_up', runnerUp.slug);
        params.set('runner_up_name', runnerUp.title);
        params.set('runner_up_label', runnerUpLabel);
      }
      void navigate(`/quiz/${winner.slug}/?${params.toString()}`);
    }
  }, [done, winner, runnerUp, runnerUpLabel]);

  if (done && winner) {
    return (
      <p class="nm-card p-6 font-mono text-sm text-ink-dim md:p-10">
        Opening <a href={`/quiz/${winner.slug}/?from=quiz`} class="text-accent hover:underline">{winner.title}</a>
        …
      </p>
    );
  }

  if (done && !winner) {
    return (
      <div class="nm-card p-6 md:p-10">
        <p class="font-mono text-[13px] font-medium tracking-[0.14em] text-ink-dim uppercase">no match</p>
        <h2 class="mt-3 font-display text-2xl font-extrabold tracking-tight uppercase md:text-4xl">No stacks in the catalog yet</h2>
        <p class="mt-3 max-w-xl text-ink-dim">
          There is nothing to match your answers against. Browse the tool catalog instead — or
          contribute the first stack.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="/tools/"
            class="nm-btn nm-btn-solid"
          >
            Browse tools
          </a>
          <button
            type="button"
            onClick={restart}
            class="cursor-pointer font-mono text-[13px] text-ink-dim underline underline-offset-4 transition-colors duration-100 hover:text-ink"
          >
            Run it again
          </button>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[step];
  return (
    <div class="nm-card p-6 md:p-10">
      <p class="nm-num text-[13px] text-ink-dim" aria-live="polite">
        Q{step + 1} / {QUESTIONS.length}
      </p>
      <div key={step} class="nm-step">
        <h2 class="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{q.title}</h2>
        <div class="mt-6 grid gap-3">
          {q.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setAnswers({ ...answers, [q.key]: opt.value });
                setStep(step + 1);
              }}
              class="cursor-pointer rounded-md border-[1.5px] border-ink bg-paper px-5 py-4 text-left text-base font-medium text-ink transition-all duration-100 hover:-translate-0.5 hover:border-accent hover:text-accent hover:shadow-hard"
            >
              {opt.label}
            </button>
          ))}
        </div>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            class="mt-4 cursor-pointer font-mono text-[13px] text-ink-dim transition-colors duration-100 hover:text-ink"
          >
            ← back
          </button>
        )}
      </div>
    </div>
  );
}

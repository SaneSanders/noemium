import test from 'node:test';
import assert from 'node:assert/strict';
import { observationMarkdown } from '../src/lib/observation.ts';
import {
  WEEK_DIFF_DISCLAIMER,
  formatWeekRssDescription,
  formatWeekRssTitle,
  formatWeekThread,
} from '../src/lib/week-thread.ts';

test('observation markdown is a quote, not the yaml', () => {
  const md = observationMarkdown(
    {
      name: 'Cursor',
      verdict: 'ship',
      last_verified: '2026-08-16',
      limitations: ['The model routing is a black box.', 'Price changed.'],
    },
    'https://noemium.com/tools/cursor',
  );
  assert.match(md, /^> \*\*Cursor\*\* — ship/m);
  assert.match(md, /Verified 2026-08-16/);
  assert.match(md, /Limitation: The model routing is a black box\./);
  assert.match(md, /https:\/\/noemium\.com\/tools\/cursor/);
  assert.equal(md.includes('The model routing is a black box.'), true);
  assert.equal(md.includes('Price changed.'), false);
});

const birthWeek = {
  id: '2026-W33',
  from: '2026-08-10',
  to: '2026-08-17',
  counts: { added: 227, removed: 19, changed: 51 },
  added: [{ name: 'Cursor' }, { name: 'Claude Code' }],
  removed: [{ name: 'Play.ht' }],
  changed: [{ name: 'ElevenLabs', field: 'price note', from: '$11', to: '$22' }],
};

test('week thread is git-of-repo, weekly, and not a market launch dump', () => {
  const thread = formatWeekThread(birthWeek);
  assert.match(thread, /1\//);
  assert.match(thread, /Noemium 2026-W33 catalog diff/);
  assert.match(thread, new RegExp(WEEK_DIFF_DISCLAIMER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(thread, /files first committed that week/);
  assert.doesNotMatch(thread, /daily feed of the market/i);
  assert.match(thread, /Added/);
  assert.match(thread, /Removed/);
  assert.match(thread, /Repriced/);
  assert.match(thread, /noemium\.com\/changelog/);
});

test('rss week item names the diff, not last_verified', () => {
  assert.equal(formatWeekRssTitle(birthWeek), '2026-W33 catalog diff: +227 / −19 / ~51');
  const body = formatWeekRssDescription(birthWeek);
  assert.match(body, /Git history of this repo/);
  assert.match(body, /not a daily feed/i);
  assert.doesNotMatch(body, /last_verified/);
});

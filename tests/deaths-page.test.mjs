import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);

function built(path) {
  const file = new URL(`dist/${path}`, root);
  assert.equal(existsSync(file), true, `missing built file: dist/${path}`);
  return readFileSync(file, 'utf8');
}

test('/deaths/ builds as a focused death calendar', () => {
  const html = built('deaths/index.html');
  assert.match(html, /Death calendar/);
  assert.match(html, /Next 90 days/);
  assert.match(html, /Already buried/);
  // Lists at least one known upcoming catalogue death.
  assert.match(html, /Mistral Large|Assistants API|Suno free-tier|Yi API|Sora API|Hunyuan/);
  // Links to the graveyard for past deaths (individual graveyard pages do not exist).
  assert.match(html, /href="\/graveyard\/"/);
  // Does not duplicate the Signals world-status board.
  assert.doesNotMatch(html, /Right now/);
  assert.doesNotMatch(html, /Checked/);
});

test('/deaths/ is linked from the footer and the reference catalog facade', () => {
  assert.match(built('tools/index.html'), /href="\/deaths\/"/);
  assert.match(built('reference/index.html'), /href="\/deaths\/"/);
});

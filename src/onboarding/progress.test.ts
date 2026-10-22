import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { QUESTIONS, REVEAL_ESSENTIALS } from '../data/questions';
import type { Answer } from '../matching/types';
import { isDone, progress } from './progress';

const answer = (mine: Answer['mine']): Answer => ({ mine, importance: 10 });

test('une question est faite si on a répondu ou passé une question sensible', () => {
  assert.equal(isDone(undefined), false);
  assert.equal(isDone(answer('')), false);
  assert.equal(isDone(answer([])), false);
  assert.equal(isDone(answer('oui')), true);
  assert.equal(isDone(answer(['voyages'])), true);
  assert.equal(isDone(answer(178)), true);
  assert.equal(isDone({ mine: '', importance: 0, skipped: true }), true);
});

test('palier « prêt pour le reveal » : bases + questions essentielles', () => {
  const essentials = Object.fromEntries(REVEAL_ESSENTIALS.map((id) => [id, answer('x')]));
  assert.equal(progress(essentials, false).ready, false, 'les bases manquent');
  const p = progress(essentials, true);
  assert.equal(p.ready, true);
  assert.equal(p.essentialsDone, REVEAL_ESSENTIALS.length);
  assert.ok(p.minutesLeft > 0, 'il reste les questions pour affiner');
  const none = progress({}, true);
  assert.equal(none.ready, false);
  assert.equal(none.minutesLeft, Math.ceil((REVEAL_ESSENTIALS.length * 20) / 60));
});

test('les questions essentielles existent toutes', () => {
  for (const id of REVEAL_ESSENTIALS) assert.ok(QUESTIONS.some((q) => q.id === id), id);
});

test('la liste SQL des questions essentielles est identique à celle de l’app', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/0002_onboarding.sql', import.meta.url), 'utf8');
  const m = sql.match(/array\[([^\]]+)\]::text\[\]\s*--\s*REVEAL_ESSENTIALS/);
  assert.ok(m, 'liste introuvable dans la migration');
  const ids = m[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  assert.deepEqual(ids, REVEAL_ESSENTIALS);
});

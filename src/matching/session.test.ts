import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ME, PROFILES } from '../data/mock';
import { QUESTIONS } from '../data/questions';
import { isEligible, pairKey, selectSessionPairs } from './matching';
import type { MatchProfile } from './types';

const pool: MatchProfile[] = [ME, ...PROFILES];

test('reveal par paires : réciproque, 5 max, jamais de profil inéligible', () => {
  const s = selectSessionPairs(pool, QUESTIONS);
  for (const [id, list] of s) {
    assert.ok(list.length <= 5);
    for (const c of list) {
      assert.ok(s.get(c.profile.id)!.some((x) => x.profile.id === id), `${c.profile.id} doit aussi recevoir ${id}`);
      assert.ok(isEligible(pool.find((p) => p.id === id)!, c.profile, QUESTIONS));
    }
    const scores = list.map((c) => c.result.score);
    assert.deepEqual(scores, [...scores].sort((a, b) => a - b), 'ordre du moins au plus compatible');
  }
  assert.ok(s.get('me')!.length > 0, 'Lucien reçoit des profils');
});

test('un deuxième reveal ne repropose aucune paire', () => {
  const first = selectSessionPairs(pool, QUESTIONS);
  const seen = new Set<string>();
  for (const [id, list] of first) for (const c of list) seen.add(pairKey(id, c.profile.id));
  const second = selectSessionPairs(pool, QUESTIONS, { alreadyPaired: seen });
  for (const [id, list] of second) for (const c of list) assert.ok(!seen.has(pairKey(id, c.profile.id)));
});

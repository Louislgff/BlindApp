import { test } from 'node:test';
import assert from 'node:assert/strict';

import { QUESTIONS } from '../data/questions';
import {
  computeMatch,
  confidenceFactor,
  isEligible,
  questionScore,
  selectRevealBatch,
} from './matching';
import { IMPORTANCE, type MatchProfile, type Question } from './types';

const PARIS_11 = { lat: 48.859, lng: 2.38 };
const PARIS_9 = { lat: 48.877, lng: 2.338 };
const LYON = { lat: 45.764, lng: 4.835 };

function profile(over: Partial<MatchProfile> & { id: string }): MatchProfile {
  return {
    firstName: over.id,
    age: 32,
    gender: 'femme',
    seeking: ['homme'],
    ageRange: { min: 28, max: 40 },
    location: PARIS_11,
    maxDistanceKm: 15,
    determinants: [],
    lookingFor: 'similaire',
    answers: {},
    ...over,
  };
}

const Q = (id: string) => QUESTIONS.find((q) => q.id === id) as Question;

test('chaque paire complémentaire désigne des options existantes', () => {
  for (const q of QUESTIONS) {
    const values = new Set((q.options ?? []).map((o) => o.value));
    for (const [a, b] of q.complements ?? []) {
      assert.ok(values.has(a), `${q.id}: ${a}`);
      assert.ok(values.has(b), `${q.id}: ${b}`);
    }
  }
});

test('les identifiants de question sont uniques', () => {
  assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, QUESTIONS.length);
});

test('filtre : genre recherché dans les deux sens', () => {
  const lea = profile({ id: 'lea' });
  const thomas = profile({ id: 'thomas', gender: 'homme', seeking: ['femme'], age: 34 });
  const marc = profile({ id: 'marc', gender: 'homme', seeking: ['homme'], age: 34 });
  assert.equal(isEligible(lea, thomas, QUESTIONS), true);
  assert.equal(isEligible(lea, marc, QUESTIONS), false);
});

test("filtre : tranche d'âge et distance", () => {
  const lea = profile({ id: 'lea', ageRange: { min: 30, max: 36 } });
  const jeune = profile({ id: 'j', gender: 'homme', seeking: ['femme'], age: 27 });
  const lyon = profile({ id: 'l', gender: 'homme', seeking: ['femme'], age: 33, location: LYON });
  const voisin = profile({ id: 'v', gender: 'homme', seeking: ['femme'], age: 33, location: PARIS_9 });
  assert.equal(isEligible(lea, jeune, QUESTIONS), false);
  assert.equal(isEligible(lea, lyon, QUESTIONS), false);
  assert.equal(isEligible(lea, voisin, QUESTIONS), true);
});

test('filtre : critère déterminant non respecté', () => {
  const lea = profile({
    id: 'lea',
    determinants: ['desir-enfants'],
    answers: { 'desir-enfants': { mine: 'oui', accepted: ['oui', 'peut-etre'], importance: IMPORTANCE.determinant } },
  });
  const non = profile({
    id: 'n', gender: 'homme', seeking: ['femme'], age: 34,
    answers: { 'desir-enfants': { mine: 'non', importance: IMPORTANCE.important } },
  });
  const oui = profile({
    id: 'o', gender: 'homme', seeking: ['femme'], age: 34,
    answers: { 'desir-enfants': { mine: 'oui', importance: IMPORTANCE.important } },
  });
  assert.equal(isEligible(lea, non, QUESTIONS), false);
  assert.equal(isEligible(lea, oui, QUESTIONS), true);
});

test('moyenne géométrique : un match déséquilibré est pénalisé', () => {
  const qs = [Q('alcool'), Q('tabac')];
  const a = profile({
    id: 'a',
    answers: {
      alcool: { mine: 'en-soiree', accepted: ['en-soiree'], importance: IMPORTANCE.tresImportant },
      tabac: { mine: 'non-fumeur', accepted: ['non-fumeur'], importance: IMPORTANCE.tresImportant },
    },
  });
  const b = profile({
    id: 'b',
    answers: {
      alcool: { mine: 'en-soiree', accepted: ['jamais'], importance: IMPORTANCE.tresImportant },
      tabac: { mine: 'non-fumeur', accepted: ['non-fumeur'], importance: IMPORTANCE.tresImportant },
    },
  });
  const r = computeMatch(a, b, qs);
  assert.equal(r.satisfactionA, 1);
  assert.equal(r.satisfactionB, 0.5);
  // sqrt(1 × 0,5) ≈ 0,707, × correction 2 questions (0,667) ≈ 47
  assert.equal(r.score, Math.round(Math.sqrt(0.5) * confidenceFactor(2) * 100));
  assert.ok(r.score < Math.round(0.75 * confidenceFactor(2) * 100));
});

test('une question « peu importe » ne pèse pas dans la satisfaction', () => {
  const qs = [Q('cheveux'), Q('alcool')];
  const a = profile({
    id: 'a',
    answers: {
      cheveux: { mine: 'brun', accepted: ['blond'], importance: IMPORTANCE.peuImporte },
      alcool: { mine: 'en-soiree', accepted: ['en-soiree'], importance: IMPORTANCE.important },
    },
  });
  const b = profile({ id: 'b', answers: { cheveux: { mine: 'brun', importance: 0 }, alcool: { mine: 'en-soiree', importance: 0 } } });
  // Les cheveux ne correspondent pas, mais « peu importe » : seule la question alcool compte.
  assert.equal(computeMatch(a, b, qs).satisfactionA, 1);
});

test('importance plafonnée sur cheveux et yeux', () => {
  const qs = [Q('cheveux'), Q('alcool')];
  const a = profile({
    id: 'a',
    answers: {
      cheveux: { mine: 'brun', accepted: ['blond'], importance: IMPORTANCE.determinant },
      alcool: { mine: 'en-soiree', accepted: ['en-soiree'], importance: IMPORTANCE.important },
    },
  });
  const b = profile({ id: 'b', answers: { cheveux: { mine: 'brun', importance: 1 }, alcool: { mine: 'en-soiree', importance: 1 } } });
  // cheveux plafonné à 10 : 10 points sur 20 gagnés, et non 10 sur 260.
  assert.equal(computeMatch(a, b, qs).satisfactionA, 0.5);
});

test('taille : comparée à la fourchette acceptée', () => {
  const q = Q('taille');
  const mine = { mine: 165, accepted: { min: 175, max: 195 }, importance: IMPORTANCE.important } as const;
  assert.equal(questionScore(q, { ...mine }, { mine: 180, importance: 1 }, 'similaire'), 1);
  assert.equal(questionScore(q, { ...mine }, { mine: 170, importance: 1 }, 'similaire'), 0);
});

test('points communs ou complémentarité sur un trait', () => {
  const q = Q('organisation');
  const spontane = { mine: 'spontane', importance: IMPORTANCE.important } as const;
  const organise = { mine: 'organise', importance: IMPORTANCE.important } as const;
  assert.equal(questionScore(q, spontane, organise, 'similaire'), 0);
  assert.equal(questionScore(q, spontane, organise, 'complementaire'), 1);
  assert.equal(questionScore(q, spontane, spontane, 'complementaire'), 0.5);
  assert.equal(questionScore(q, spontane, spontane, 'similaire'), 1);
});

test('tags : bonus réduit en mode complémentaire', () => {
  const q = Q('voyages');
  const a = { mine: ['road-trip', 'montagne'], importance: IMPORTANCE.important } as const;
  const same = { mine: ['road-trip', 'montagne'], importance: 1 } as const;
  const other = { mine: ['plage', 'luxe'], importance: 1 } as const;
  assert.equal(questionScore(q, { ...a, mine: [...a.mine] }, { ...same, mine: [...same.mine] }, 'similaire'), 1);
  assert.equal(questionScore(q, { ...a, mine: [...a.mine] }, { ...other, mine: [...other.mine] }, 'similaire'), 0);
  assert.equal(questionScore(q, { ...a, mine: [...a.mine] }, { ...other, mine: [...other.mine] }, 'complementaire'), 0.5);
});

test('correction de confiance', () => {
  assert.equal(confidenceFactor(0), 0);
  assert.ok(Math.abs(confidenceFactor(5) - 0.833) < 0.001);
  assert.ok(confidenceFactor(50) > 0.98);
});

test('résumé : une différence sans gravité devient « à explorer »', () => {
  const qs = [Q('chronotype'), Q('desir-enfants')];
  const a = profile({
    id: 'a',
    answers: {
      chronotype: { mine: 'plutot-matin', importance: IMPORTANCE.unPeu },
      'desir-enfants': { mine: 'oui', accepted: ['oui'], importance: IMPORTANCE.determinant },
    },
  });
  const b = profile({
    id: 'b',
    answers: {
      chronotype: { mine: 'plutot-soir', importance: IMPORTANCE.unPeu },
      'desir-enfants': { mine: 'oui', accepted: ['oui'], importance: IMPORTANCE.determinant },
    },
  });
  const pts = computeMatch(a, b, qs).points;
  assert.deepEqual(pts.map((p) => [p.questionId, p.kind]), [
    ['desir-enfants', 'commun'],
    ['chronotype', 'a-explorer'],
  ]);
});

test('reveal : 5 profils, jamais déjà vus, du moins au plus compatible', () => {
  const me = profile({
    id: 'me', gender: 'homme', seeking: ['femme'], age: 34,
    answers: { alcool: { mine: 'en-soiree', accepted: ['en-soiree'], importance: IMPORTANCE.tresImportant } },
  });
  const pool: MatchProfile[] = [];
  for (let i = 0; i < 12; i++) {
    const answers: MatchProfile['answers'] = {
      alcool: { mine: i % 3 === 0 ? 'jamais' : 'en-soiree', accepted: ['en-soiree', 'jamais'], importance: IMPORTANCE.important },
    };
    pool.push(profile({ id: `p${i}`, answers }));
  }
  const batch = selectRevealBatch(me, pool, QUESTIONS, { alreadyShown: new Set(['p1']) });
  assert.equal(batch.length, 5);
  assert.ok(!batch.some((c) => c.profile.id === 'p1'));
  const scores = batch.map((c) => c.result.score);
  assert.deepEqual(scores, [...scores].sort((x, y) => x - y));
});

test('les réponses de démonstration utilisent des options existantes', async () => {
  const { ME, PROFILES } = await import('../data/mock');
  const valid = (q: Question, v: unknown) =>
    !q.options || ([] as unknown[]).concat(v).every((x) => q.options!.some((o) => o.value === x));
  for (const p of [ME, ...PROFILES]) {
    for (const q of QUESTIONS) {
      const a = p.answers[q.id];
      if (!a || q.kind === 'range') continue;
      assert.ok(valid(q, a.mine), `${p.id} / ${q.id} : ${String(a.mine)}`);
      if (Array.isArray(a.accepted)) assert.ok(valid(q, a.accepted), `${p.id} / ${q.id} (accepté)`);
    }
  }
});

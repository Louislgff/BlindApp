// Banc d'essai de l'algorithme : une vingtaine de profils construits pour un résultat attendu,
// comparés à Lucien (profil de démo). Lancer : npx tsx --test src/matching/scenarios.test.ts
// Le tableau des scores est affiché en fin de test.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ME } from '../data/mock';
import { QUESTIONS } from '../data/questions';
import { computeMatch, isEligible } from './matching';
import { IMPORTANCE, type Answer, type MatchProfile, type Question } from './types';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const Q = (id: string) => QUESTIONS.find((q) => q.id === id) as Question;
const opts = (q: Question) => (q.options ?? []).map((o) => o.value);

function base(id: string, answers: Record<string, Answer>, over: Partial<MatchProfile> = {}): MatchProfile {
  return {
    id,
    firstName: id,
    age: 33,
    gender: 'femme',
    seeking: ['homme'],
    ageRange: { min: 30, max: 40 },
    location: { lat: 48.859, lng: 2.38 },
    maxDistanceKm: 15,
    determinants: [],
    lookingFor: 'les-deux',
    answers,
    ...over,
  };
}

/** Réponse « opposée » à Lucien : une option qu'il n'accepte pas, et elle n'accepte pas la sienne. */
function opposite(q: Question): Answer {
  const me = ME.answers[q.id];
  if (q.kind === 'range') return { mine: 155, accepted: { min: 160, max: 170 }, importance: IMPORTANCE.tresImportant };
  const all = opts(q);
  const mineMe = Array.isArray(me.mine) ? me.mine : [String(me.mine)];
  const acceptedMe = Array.isArray(me.accepted) && me.accepted.length ? me.accepted : mineMe;
  if (q.kind === 'tags') {
    return { mine: all.filter((v) => !mineMe.includes(v)).slice(0, 2), importance: IMPORTANCE.tresImportant };
  }
  const pick = all.find((v) => !acceptedMe.includes(v) && !mineMe.includes(v)) ?? all.find((v) => !mineMe.includes(v))!;
  return { mine: pick, accepted: [pick], importance: IMPORTANCE.tresImportant };
}

const twinAnswers = () => clone(ME.answers);
const withSteps = (src: Record<string, Answer>, steps: number[], fn: (q: Question) => Answer) => {
  const out = clone(src);
  for (const q of QUESTIONS) if (steps.includes(q.step) && q.id !== 'desir-enfants') out[q.id] = fn(q);
  return out;
};
const allOpposite = () => withSteps(twinAnswers(), [2, 3, 4, 5, 6, 7], opposite);

// Préférences de Lucien sur une question, pour fabriquer un match « à sens unique ».
const preferredByMe = (q: Question): Answer => {
  const me = ME.answers[q.id];
  if (q.kind === 'range') return { mine: 172, accepted: { min: 190, max: 200 }, importance: IMPORTANCE.tresImportant };
  const all = opts(q);
  const mineMe = Array.isArray(me.mine) ? me.mine : [String(me.mine)];
  const acceptedMe = Array.isArray(me.accepted) && me.accepted.length ? me.accepted : mineMe;
  if (q.kind === 'tags') return { mine: mineMe, importance: IMPORTANCE.peuImporte };
  const notMine = all.filter((v) => !mineMe.includes(v));
  // Elle correspond à ce qu'il cherche, mais elle ne veut pas de ce qu'il est.
  return { mine: acceptedMe[0], accepted: notMine.length ? [notMine[0]] : [acceptedMe[0]], importance: IMPORTANCE.tresImportant };
};

const sensitive = QUESTIONS.filter((q) => q.sensitive).map((q) => q.id);

interface Case {
  id: string;
  label: string;
  profile: MatchProfile;
  eligible: boolean;
}

const CASES: Case[] = [
  { id: 'jumelle', label: 'Mêmes réponses que lui', eligible: true, profile: base('jumelle', twinAnswers()) },
  {
    id: 'jumelle-discrete',
    label: 'Jumelle, sans répondre politique/religion',
    eligible: true,
    profile: base('jumelle-discrete', Object.fromEntries(Object.entries(twinAnswers()).map(([k, a]) => [k, sensitive.includes(k) ? { ...a, skipped: true } : a]))),
  },
  { id: 'valeurs', label: 'Mêmes valeurs et mode de vie, autres passions', eligible: true, profile: base('valeurs', withSteps(twinAnswers(), [5, 6, 7], opposite)) },
  { id: 'passions', label: 'Mêmes passions, autres valeurs', eligible: true, profile: base('passions', withSteps(twinAnswers(), [3, 4], opposite)) },
  { id: 'moitie', label: 'Moitié commune, moitié opposée', eligible: true, profile: base('moitie', withSteps(twinAnswers(), [4, 6], opposite)) },
  { id: 'opposee', label: 'Opposée sur tout (sauf enfants)', eligible: true, profile: base('opposee', allOpposite()) },
  {
    id: 'sens-unique',
    label: 'Elle lui plaît, lui ne lui plaît pas',
    eligible: true,
    profile: base('sens-unique', withSteps(twinAnswers(), [3, 4], preferredByMe)),
  },
  {
    id: 'peu-de-reponses',
    label: 'Jumelle, mais 6 réponses seulement',
    eligible: true,
    profile: base('peu-de-reponses', Object.fromEntries(['recherche', 'desir-enfants', 'couple', 'vivre-ensemble', 'projet-5-ans', 'tabac'].map((k) => [k, clone(ME.answers[k])]))),
  },
  {
    id: 'facile',
    label: 'Jumelle, « peu importe » partout',
    eligible: true,
    profile: base('facile', Object.fromEntries(Object.entries(twinAnswers()).map(([k, a]) => [k, { ...a, importance: IMPORTANCE.peuImporte }]))),
  },
  {
    id: 'complementaire',
    label: 'Cherche le complémentaire, traits opposés',
    eligible: true,
    profile: base(
      'complementaire',
      { ...twinAnswers(), organisation: { mine: 'organise', importance: IMPORTANCE.tresImportant }, soiree: { mine: 'j-observe', importance: IMPORTANCE.tresImportant } },
      { lookingFor: 'complementaire' },
    ),
  },
  {
    id: 'introvertie',
    label: 'Jumelle mais introvertie et timide',
    eligible: true,
    profile: base('introvertie', { ...twinAnswers(), temperament: { mine: 'introverti', accepted: ['introverti', 'plutot-reserve'], importance: IMPORTANCE.important }, 'premier-abord': { mine: 'timide', accepted: ['timide', 'reserve-mais-curieux'], importance: IMPORTANCE.important } }),
  },
  {
    id: 'grande-exigence-taille',
    label: 'Jumelle, mais veut quelqu’un de 1,90 m+',
    eligible: true,
    profile: base('grande-exigence-taille', { ...twinAnswers(), taille: { mine: 170, accepted: { min: 190, max: 205 }, importance: IMPORTANCE.tresImportant } }),
  },
  // --- Doivent être exclues avant tout calcul ---
  {
    id: 'pas-d-enfants',
    label: 'Ne veut pas d’enfants (critère de Lucien)',
    eligible: false,
    profile: base('pas-d-enfants', { ...twinAnswers(), 'desir-enfants': { mine: 'non', accepted: ['non'], importance: IMPORTANCE.determinant } }),
  },
  { id: 'lyon', label: 'Habite à Lyon', eligible: false, profile: base('lyon', twinAnswers(), { location: { lat: 45.764, lng: 4.835 } }) },
  { id: 'trop-jeune', label: '26 ans (hors de sa tranche)', eligible: false, profile: base('trop-jeune', twinAnswers(), { age: 26 }) },
  { id: 'cherche-femmes', label: 'Cherche des femmes', eligible: false, profile: base('cherche-femmes', twinAnswers(), { seeking: ['femme'] }) },
  { id: 'veut-plus-jeune', label: 'Veut quelqu’un de moins de 32 ans', eligible: false, profile: base('veut-plus-jeune', twinAnswers(), { ageRange: { min: 28, max: 32 } }) },
  {
    id: 'determinant-elle',
    label: 'Fumeur rédhibitoire pour elle (Lucien ne correspond pas)',
    eligible: false,
    profile: base(
      'determinant-elle',
      { ...twinAnswers(), tabac: { mine: 'non-fumeur', accepted: opts(Q('tabac')).filter((v) => v !== ME.answers.tabac.mine), importance: IMPORTANCE.determinant } },
      { determinants: ['tabac'] },
    ),
  },
  { id: 'proche-distance', label: 'Veut quelqu’un à 2 km maximum', eligible: false, profile: base('proche-distance', twinAnswers(), { maxDistanceKm: 2 }) },
];

const results = CASES.map((c) => {
  const eligible = isEligible(ME, c.profile, QUESTIONS);
  const r = computeMatch(ME, c.profile, QUESTIONS);
  return { ...c, eligibleNow: eligible, score: r.score, sA: r.satisfactionA, sB: r.satisfactionB, n: r.commonQuestions };
});
const S = Object.fromEntries(results.map((r) => [r.id, r]));

test('tableau des scores', () => {
  const rows = results.map((r) =>
    [r.eligibleNow ? `${String(r.score).padStart(3)} %` : ' exclu', `lui ${Math.round(r.sA * 100)} % / elle ${Math.round(r.sB * 100)} %`.padEnd(22), `${String(r.n).padStart(2)} q.`, r.label].join('  '),
  );
  console.log('\n' + rows.join('\n') + '\n');
});

test('filtres : les bons profils sont exclus, et seulement eux', () => {
  for (const r of results) assert.equal(r.eligibleNow, r.eligible, `${r.label}`);
});

test('ordre attendu : jumelle > valeurs communes > passions communes > moitié > opposée', () => {
  assert.ok(S.jumelle.score > S.valeurs.score, 'jumelle > valeurs');
  assert.ok(S.valeurs.score > S.passions.score, 'valeurs > passions (les valeurs pèsent plus que les goûts)');
  assert.ok(S.passions.score > S.opposee.score, 'passions > opposée');
  assert.ok(S.moitie.score > S.opposee.score, 'moitié > opposée');
  assert.ok(S.jumelle.score >= 90, `une jumelle doit dépasser 90 % (obtenu ${S.jumelle.score})`);
  // Lucien cherche « un peu des deux » : des traits complémentaires et des passions nouvelles
  // lui rapportent encore quelques points, d'où un plancher autour de 25 %, pas 0.
  assert.ok(S.opposee.score <= 30, `une personne opposée doit rester sous 30 % (obtenu ${S.opposee.score})`);
});

test('ne pas répondre aux questions sensibles ne pénalise pas', () => {
  assert.ok(S.jumelle.score - S['jumelle-discrete'].score <= 3);
});

test('un match à sens unique est nettement pénalisé', () => {
  assert.ok(S['sens-unique'].sA > S['sens-unique'].sB, 'il est plus satisfait qu’elle');
  assert.ok(S['sens-unique'].score < S.jumelle.score - 20);
});

test('peu de réponses en commun : score prudent', () => {
  assert.ok(S['peu-de-reponses'].score < S.jumelle.score);
});

test('quelqu’un d’ouvert (« peu importe » partout) n’est pas pénalisé', () => {
  assert.ok(S.facile.score >= S.jumelle.score - 10, `obtenu ${S.facile.score} contre ${S.jumelle.score}`);
});

test('une exigence forte non remplie fait baisser le score', () => {
  assert.ok(S['grande-exigence-taille'].score < S.jumelle.score);
  assert.ok(S.introvertie.score < S.jumelle.score);
});

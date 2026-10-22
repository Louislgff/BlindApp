// Génère les profils de démonstration en SQL : Lucien et les 15 profils du prototype,
// plus une population fictive de Parisiens pour tester les reveals à l'échelle d'une ville.
// Tous les comptes de démo ont un email en @demo.blind.test : on peut les effacer d'un coup.
//
// Usage : npx tsx scripts/db/seed.ts [nombre de profils fictifs] > seed.sql

import { createHash } from 'node:crypto';

import { ME, PROFILES, type DisplayProfile } from '../../src/data/mock';
import { ZONES } from '../../src/data/zones';
import { QUESTIONS, SUGGESTED_DETERMINANTS } from '../../src/data/questions';
import { IMPORTANCE, type Answer, type Gender, type Importance, type LookingFor, type MatchProfile } from '../../src/matching/types';

export const DEMO_DOMAIN = 'demo.blind.test';
const SYNTHETIC = Number(process.argv[2] ?? 160);

/** UUID stable dérivé d'un identifiant lisible : les mêmes profils à chaque génération. */
export function demoUuid(key: string): string {
  const h = createHash('md5').update(`blind-demo:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES: Record<'femme' | 'homme' | 'non-binaire', string[]> = {
  femme: ['Agathe', 'Alice', 'Amandine', 'Anna', 'Apolline', 'Aurélie', 'Bérénice', 'Capucine', 'Céline', 'Charlotte', 'Clara', 'Constance', 'Elsa', 'Émilie', 'Eva', 'Fanny', 'Hélène', 'Hortense', 'Jeanne', 'Joséphine', 'Juliette', 'Laure', 'Louise', 'Lucie', 'Margaux', 'Marine', 'Mathilde', 'Mélanie', 'Nina', 'Pauline', 'Romane', 'Salomé', 'Sarah', 'Victoire', 'Zoé'],
  homme: ['Adrien', 'Alexandre', 'Antoine', 'Arthur', 'Augustin', 'Baptiste', 'Benjamin', 'Clément', 'Damien', 'Édouard', 'Étienne', 'Félix', 'Florian', 'Gabriel', 'Guillaume', 'Hugo', 'Jules', 'Julien', 'Karim', 'Louis', 'Martin', 'Mathieu', 'Maxime', 'Nicolas', 'Olivier', 'Paul', 'Pierre', 'Quentin', 'Raphaël', 'Romain', 'Samuel', 'Simon', 'Thomas', 'Victor', 'Yanis'],
  'non-binaire': ['Alex', 'Camille', 'Charlie', 'Dominique', 'Eden', 'Sacha'],
};
const JOBS = ['Avocate', 'Ingénieur', 'Médecin', 'Product manager', 'Professeur', 'Journaliste', 'Designer', 'Architecte', 'Infirmière', 'Consultant', 'Chef de projet', 'Pharmacienne', 'Développeur', 'Photographe', 'Directrice artistique', 'Entrepreneur', 'Chercheuse', 'Commercial', 'Comédien', 'Data scientist', 'Notaire', 'Restaurateur', 'Kinésithérapeute', 'Responsable marketing'];
const PROMPTS: [string, string[]][] = [
  ['Un dimanche parfait à Paris, c’est…', ['Un brunch qui dure, puis le canal Saint-Martin à pied.', 'Un marché, une expo, et un dîner chez des amis.', 'Courir aux Buttes-Chaumont puis ne plus rien faire.']],
  ['On s’entendra bien si…', ['Tu ris facilement, même de toi.', 'Tu dis oui à un week-end improvisé.', 'Tu as un avis sur tout mais tu écoutes aussi.']],
  ['Ce qui me fait craquer…', ['Les gens qui se passionnent pour un sujet obscur.', 'Une bonne adresse partagée sans qu’on la demande.', 'La gentillesse avec les serveurs.']],
  ['Je suis fier de…', ['Avoir changé de métier à 30 ans.', 'Mon potager sur un balcon de 2 m².', 'Avoir couru mon premier marathon.']],
];
const IMPORTANCES: Importance[] = [IMPORTANCE.peuImporte, IMPORTANCE.unPeu, IMPORTANCE.important, IMPORTANCE.important, IMPORTANCE.tresImportant];

function pick<T>(r: () => number, list: T[]): T {
  return list[Math.floor(r() * list.length)];
}

function syntheticProfile(i: number): DisplayProfile & { birthOffsetDays: number } {
  const r = rng(1000 + i);
  const g = r();
  const gender: Gender = g < 0.47 ? 'femme' : g < 0.96 ? 'homme' : 'non-binaire';
  const s = r();
  const seeking: Gender[] =
    gender === 'non-binaire' ? ['femme', 'homme', 'non-binaire']
      : s < 0.82 ? [gender === 'femme' ? 'homme' : 'femme']
      : s < 0.93 ? [gender]
      : ['femme', 'homme'];
  const age = 28 + Math.floor(r() * 18);
  const z = pick(r, ZONES);
  const lookingFor = pick<LookingFor>(r, ['similaire', 'complementaire', 'les-deux', 'les-deux']);
  const answers: Record<string, Answer> = {};
  for (const q of QUESTIONS) {
    if (q.sensitive && r() < 0.25) {
      answers[q.id] = { mine: '', importance: IMPORTANCE.peuImporte, skipped: true };
      continue;
    }
    // Importance : on respecte le plafond éventuel de la question (ex. physique).
    let importance = q.defaultImportance ?? pick(r, IMPORTANCES);
    if (q.maxImportance !== undefined && importance > q.maxImportance) importance = q.maxImportance;
    if (q.kind === 'range') {
      const h = gender === 'homme' ? 168 + Math.floor(r() * 25) : 155 + Math.floor(r() * 25);
      answers[q.id] = { mine: h, accepted: { min: 150 + Math.floor(r() * 15), max: 185 + Math.floor(r() * 20) }, importance };
      continue;
    }
    const opts = (q.options ?? []).map((o) => o.value);
    // Sur Blind, la plupart cherchent une relation sérieuse.
    const mine = q.id === 'recherche' && r() < 0.7 ? opts[0] : pick(r, opts);
    if (q.kind === 'tags') {
      const tags = new Set([mine]);
      while (tags.size < 2 + Math.floor(r() * 2) && tags.size < opts.length) tags.add(pick(r, opts));
      answers[q.id] = { mine: [...tags], importance };
    } else {
      const accepted = new Set([mine]);
      if (r() < 0.6) accepted.add(pick(r, opts));
      answers[q.id] = { mine, accepted: [...accepted], importance };
    }
  }
  // 0, 1 ou 2 critères déterminants, parmi les questions suggérées auxquelles la personne a répondu.
  const d = r();
  const nDet = d < 0.6 ? 0 : d < 0.9 ? 1 : 2;
  const determinants: string[] = [];
  const candidates = SUGGESTED_DETERMINANTS.filter((id) => answers[id] && !answers[id].skipped);
  while (determinants.length < nDet && determinants.length < candidates.length) {
    const id = pick(r, candidates);
    if (!determinants.includes(id)) determinants.push(id);
  }
  const firstName = pick(r, NAMES[gender]);
  const prompts = [pick(r, PROMPTS), pick(r, PROMPTS)]
    .filter((p, k, all) => all.findIndex((x) => x[0] === p[0]) === k)
    .map(([question, options]) => ({ question, answer: pick(r, options) }));
  return {
    id: `synthetique-${i}`,
    firstName,
    age,
    initial: firstName[0],
    job: pick(r, JOBS),
    zone: z.zone,
    gender,
    seeking,
    ageRange: { min: Math.max(25, age - 4 - Math.floor(r() * 4)), max: age + 4 + Math.floor(r() * 5) },
    location: { lat: z.lat, lng: z.lng },
    maxDistanceKm: pick(r, [8, 15, 15, 25]),
    determinants,
    lookingFor,
    answers,
    prompts,
    why: '',
    photos: 3,
    birthOffsetDays: Math.floor(r() * 360),
  };
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;

export function demoPopulation(n = SYNTHETIC): (DisplayProfile & { key: string; birthOffsetDays: number })[] {
  const demo = [ME, ...PROFILES].map((p, k) => ({ ...p, key: p.id === 'me' ? 'lucien' : p.id, birthOffsetDays: 40 + k * 17 }));
  const synth = Array.from({ length: n }, (_, i) => ({ ...syntheticProfile(i), key: `synthetique-${i}` }));
  return [...demo, ...synth];
}

function profileSql(p: DisplayProfile & { key: string; birthOffsetDays: number }): string {
  const id = demoUuid(p.key);
  const email = `${p.key}@${DEMO_DOMAIN}`;
  const lines = [
    `insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change)
values (${q(id)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${q(email)}, '', now(), now(), now(), '{"provider":"email","providers":["email"],"demo":true}', '{}', '', '', '', '');`,
    `insert into profiles (id, first_name, birth_date, gender, seeking, age_min, age_max, city, zone, lat, lng, max_distance_km, looking_for, determinants, job, prompts, phone_verified_at, selfie_verified_at, sensitive_data_consent_at, subscription_status)
values (${q(id)}, ${q(p.firstName)}, (current_date - interval '${p.age} years' - interval '${p.birthOffsetDays} days')::date, ${q(p.gender)}, array[${p.seeking.map(q).join(',')}]::gender[], ${p.ageRange.min}, ${p.ageRange.max}, 'paris', ${q(p.zone)}, ${p.location.lat}, ${p.location.lng}, ${p.maxDistanceKm}, ${q(p.lookingFor)}, array[${p.determinants.map(q).join(',')}]::text[], ${q(p.job)}, ${json(p.prompts)}, now(), now(), now(), 'active');`,
  ];
  const rows = Object.entries(p.answers).map(([qid, a]) =>
    `(${q(id)}, ${q(qid)}, ${json(a.mine)}, ${a.accepted === undefined ? 'null' : json(a.accepted)}, ${a.importance}, ${a.skipped ? 'true' : 'false'})`);
  if (rows.length) lines.push(`insert into answers (user_id, question_id, mine, accepted, importance, skipped) values\n${rows.join(',\n')};`);
  return lines.join('\n');
}

export function seedSql(n = SYNTHETIC): string {
  const people = demoPopulation(n);
  return [
    '-- Généré par scripts/db/seed.ts : profils de démonstration (efface et recrée).',
    'begin;',
    `delete from auth.users where email like '%@${DEMO_DOMAIN}';`,
    `delete from reveal_sessions s where not exists (select 1 from reveal_assignments a where a.session_id = s.id) and not exists (select 1 from matches m where m.session_id = s.id);`,
    ...people.map(profileSql),
    'commit;',
  ].join('\n\n');
}

if (process.argv[1]?.endsWith('seed.ts')) process.stdout.write(seedSql() + '\n');

export type { MatchProfile };

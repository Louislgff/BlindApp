// Calcule un reveal pour toute la ville avec le vrai algorithme, écrit le SQL à appliquer
// et un rapport de cohérence en Markdown.
//
// Usage : npx tsx scripts/db/reveal.ts export.json "2026-10-01T18:00:00Z" "Reveal du 1er octobre" out.sql rapport.md

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

import { QUESTIONS } from '../../src/data/questions';
import { isEligible, pairKey, selectSessionPairs } from '../../src/matching/matching';
import { buildSummary } from '../../src/matching/summary';
import type { Answer, MatchProfile } from '../../src/matching/types';
import { demoUuid } from './seed';

interface Row {
  id: string; email: string; firstName: string; age: number; gender: MatchProfile['gender']; seeking: MatchProfile['gender'][];
  ageMin: number; ageMax: number; lat: number; lng: number; zone: string; maxDistanceKm: number;
  lookingFor: MatchProfile['lookingFor']; determinants: string[]; answers: Record<string, Answer>;
}

const [, , exportPath, startsAt, title, sqlPath, reportPath] = process.argv;
const data = JSON.parse(readFileSync(exportPath, 'utf8')) as { profiles: Row[]; pairs: [string, string][] };

const rows = new Map(data.profiles.map((r) => [r.id, r]));
const pool: MatchProfile[] = data.profiles.map((r) => ({
  id: r.id, firstName: r.firstName, age: r.age, gender: r.gender, seeking: r.seeking,
  ageRange: { min: r.ageMin, max: r.ageMax }, location: { lat: Number(r.lat), lng: Number(r.lng) },
  maxDistanceKm: r.maxDistanceKm, determinants: r.determinants, lookingFor: r.lookingFor, answers: r.answers,
}));
const byId = new Map(pool.map((p) => [p.id, p]));
const already = new Set(data.pairs.map(([a, b]) => pairKey(a, b)));

const session = selectSessionPairs(pool, QUESTIONS, { alreadyPaired: already });
const sessionId = demoUuid(`session:${startsAt}`);

// ---------- SQL ----------
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const assignments: string[] = [];
const matches = new Set<string>();
for (const [userId, list] of session) {
  list.forEach((c, position) => {
    const s = buildSummary(byId.get(userId)!, c.profile, QUESTIONS);
    const why = s.common.length ? `En commun : ${s.common.slice(0, 2).join(' ; ')}.` : 'Un profil différent du vôtre, à découvrir.';
    const points = { common: s.common, complementary: s.complementary, explore: s.explore };
    assignments.push(`(${q(sessionId)}, ${q(userId)}, ${q(c.profile.id)}, ${position + 1}, ${c.result.score}, ${q(JSON.stringify(points))}::jsonb, ${q(why)})`);
    matches.add(pairKey(userId, c.profile.id));
  });
}
const sql = [
  'begin;',
  `insert into reveal_sessions (id, city, starts_at) values (${q(sessionId)}, 'paris', ${q(startsAt)}) on conflict do nothing;`,
  assignments.length ? `insert into reveal_assignments (session_id, user_id, candidate_id, position, score, points, why) values\n${assignments.join(',\n')};` : '',
  matches.size ? `insert into matches (session_id, user_a, user_b) values\n${[...matches].map((k) => { const [a, b] = k.split('|'); return `(${q(sessionId)}, ${q(a)}, ${q(b)})`; }).join(',\n')};` : '',
  'commit;',
].join('\n');
writeFileSync(sqlPath, sql + '\n');

// ---------- Contrôles de cohérence ----------
const checks: [string, boolean, string][] = [];
const counts = [...session.values()].map((l) => l.length);
const dist = [5, 4, 3, 2, 1, 0].map((k) => `${k} profil${k > 1 ? 's' : ''} : ${counts.filter((c) => c === k).length}`).join(' · ');
let reciprocal = true, eligible = true, fresh = true, ordered = true, noSelf = true;
for (const [id, list] of session) {
  for (const c of list) {
    if (!session.get(c.profile.id)!.some((x) => x.profile.id === id)) reciprocal = false;
    if (!isEligible(byId.get(id)!, c.profile, QUESTIONS)) eligible = false;
    if (already.has(pairKey(id, c.profile.id))) fresh = false;
    if (c.profile.id === id) noSelf = false;
  }
  const sc = list.map((c) => c.result.score);
  if (sc.some((v, i) => i > 0 && v < sc[i - 1])) ordered = false;
}
checks.push(['Chacun reçoit 5 profils au plus', counts.every((c) => c <= 5), dist]);
checks.push(['Réciprocité : si A voit B, B voit A le même soir', reciprocal, '']);
checks.push(['Aucun profil hors critères (genre, âge, distance, déterminants), dans les deux sens', eligible, '']);
checks.push(['Aucune paire déjà proposée lors d’un reveal précédent', fresh, `${already.size} paires déjà vues avant ce reveal`]);
checks.push(['Ordre du dévoilement : du moins au plus compatible', ordered, '']);
checks.push(['Personne ne se voit proposer soi-même', noSelf, '']);

// Personnes sans aucun profil : pas de partenaire possible, ou partenaires possibles déjà complets ?
const empty = [...session].filter(([, l]) => l.length === 0).map(([id]) => {
  const me = byId.get(id)!;
  const compatible = pool.filter((o) => o.id !== id && isEligible(me, o, QUESTIONS));
  const possible = compatible.filter((o) => !already.has(pairKey(id, o.id))).length;
  const r = rows.get(id)!;
  return `${r.firstName} (${r.gender}, ${r.age} ans, ${r.zone}) : ${possible === 0 ? (compatible.length ? `ses ${compatible.length} profil${compatible.length > 1 ? 's' : ''} compatible${compatible.length > 1 ? 's' : ''} lui ont déjà été proposés` : 'aucun profil compatible avec ses critères') : `${possible} profil${possible > 1 ? 's' : ''} compatible${possible > 1 ? 's' : ''}, ${possible > 1 ? 'tous' : ''} déjà complet${possible > 1 ? 's' : ''} ce soir`.replace(',  déjà', ', déjà')}`;
});

const all = [...session.values()].flat().map((c) => c.result.score).sort((a, b) => a - b);
const med = all.length ? all[Math.floor(all.length / 2)] : 0;
const lucien = [...session].find(([id]) => rows.get(id)!.email.startsWith('lucien@'));

const md: string[] = [];
md.push(`## ${title}`, '');
md.push(`- Profils actifs et vérifiés : **${pool.length}**`);
md.push(`- Paires proposées ce soir : **${matches.size}** (chaque paire = 2 profils proposés)`);
md.push(`- Scores proposés : min ${all[0] ?? '–'} %, médiane ${med} %, max ${all[all.length - 1] ?? '–'} %`, '');
md.push('| Contrôle | Résultat | Détail |', '|---|---|---|');
for (const [label, ok, detail] of checks) md.push(`| ${label} | ${ok ? '✅' : '❌'} | ${detail} |`);
md.push('');
if (lucien) {
  md.push(`**Les profils de Lucien**, dans l’ordre du dévoilement :`, '');
  for (const c of lucien[1]) { const r = rows.get(c.profile.id)!; md.push(`1. ${r.firstName}, ${r.age} ans, ${r.zone} — ${c.result.score} %`); }
  if (!lucien[1].length) md.push('_Aucun profil ce soir._');
  md.push('');
}
if (empty.length) {
  md.push(`**Personnes sans profil ce soir (${empty.length})** :`, '');
  empty.slice(0, 15).forEach((e) => md.push(`- ${e}`));
  if (empty.length > 15) md.push(`- … et ${empty.length - 15} autres`);
  md.push('');
}
appendFileSync(reportPath, md.join('\n') + '\n');
if (checks.some(([, ok]) => !ok)) { console.error('Contrôle en échec'); process.exitCode = 1; }

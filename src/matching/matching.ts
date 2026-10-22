// Algorithme de matching de Blind.
//
// 1. Filtres éliminatoires dans les deux sens (genre, âge, distance, critères déterminants).
// 2. Satisfaction pondérée de chacun : S_A(B) = points gagnés / points possibles,
//    sur les questions répondues par les deux.
// 3. Score = moyenne géométrique des deux satisfactions (pénalise les matchs déséquilibrés),
//    puis correction quand il y a peu de questions en commun.

import type {
  Answer,
  LookingFor,
  MatchPoint,
  MatchProfile,
  MatchResult,
  Question,
} from './types';

// ---------- Outils ----------

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const asList = (v: Answer['mine']): string[] =>
  Array.isArray(v) ? v : typeof v === 'string' ? [v] : [String(v)];

function usable(a: Answer | undefined): a is Answer {
  return !!a && !a.skipped;
}

function effectiveImportance(q: Question, a: Answer): number {
  return q.maxImportance !== undefined ? Math.min(a.importance, q.maxImportance) : a.importance;
}

/** La réponse de l'autre entre-t-elle dans ce que j'accepte ? (questions "compat" et "range") */
export function isAccepted(q: Question, mine: Answer, theirs: Answer): boolean {
  if (q.kind === 'range') {
    const r = mine.accepted;
    if (!r || Array.isArray(r) || typeof theirs.mine !== 'number') return true;
    return theirs.mine >= r.min && theirs.mine <= r.max;
  }
  const accepted = mine.accepted;
  if (!accepted || !Array.isArray(accepted) || accepted.length === 0) return true;
  return asList(theirs.mine).some((v) => accepted.includes(v));
}

function areComplementary(q: Question, x: string, y: string): boolean {
  return (q.complements ?? []).some(([a, b]) => (a === x && b === y) || (a === y && b === x));
}

/**
 * Part (0–1) des points gagnés sur une question, du point de vue de `self`.
 * Les questions "trait" et "tags" dépendent de ce que `self` cherche (similaire / complémentaire).
 */
export function questionScore(q: Question, self: Answer, other: Answer, lookingFor: LookingFor): number {
  if (q.kind === 'compat' || q.kind === 'range') {
    return isAccepted(q, self, other) ? 1 : 0;
  }

  if (q.kind === 'trait') {
    const x = asList(self.mine)[0];
    const y = asList(other.mine)[0];
    const similar = x === y ? 1 : 0;
    const complementary = areComplementary(q, x, y) ? 1 : 0;
    if (lookingFor === 'similaire') return similar;
    if (lookingFor === 'complementaire') return Math.max(complementary, similar * 0.5);
    // « Un peu des deux » : un trait identique ou complémentaire convient pleinement.
    return Math.max(similar, complementary);
  }

  // tags : passions et goûts
  const mineTags = asList(self.mine);
  const theirTags = asList(other.mine);
  const shared = mineTags.filter((t) => theirTags.includes(t)).length;
  const sharedScore = Math.min(1, shared / 2); // 2 tags communs suffisent pour le maximum
  const novelty = theirTags.some((t) => !mineTags.includes(t)) ? 1 : 0;
  if (lookingFor === 'similaire') return sharedScore;
  if (lookingFor === 'complementaire') return 0.5 * sharedScore + 0.5 * novelty;
  // « Un peu des deux » : des goûts communs suffisent ; à défaut, la découverte compte à moitié.
  return Math.max(sharedScore, 0.5 * sharedScore + 0.5 * novelty);
}

// ---------- Filtres éliminatoires ----------

function oneWayEligible(a: MatchProfile, b: MatchProfile, questions: Map<string, Question>): boolean {
  if (!a.seeking.includes(b.gender)) return false;
  if (b.age < a.ageRange.min || b.age > a.ageRange.max) return false;
  if (distanceKm(a.location, b.location) > a.maxDistanceKm) return false;
  for (const qid of a.determinants) {
    const q = questions.get(qid);
    const mine = a.answers[qid];
    const theirs = b.answers[qid];
    if (!q || !usable(mine)) continue;
    // Pas de réponse en face sur un critère déterminant : on ne prend pas le risque.
    if (!usable(theirs)) return false;
    if (q.kind === 'compat' || q.kind === 'range') {
      if (!isAccepted(q, mine, theirs)) return false;
    } else if (questionScore(q, mine, theirs, a.lookingFor) === 0) {
      return false;
    }
  }
  return true;
}

export function isEligible(a: MatchProfile, b: MatchProfile, questions: Question[]): boolean {
  if (a.id === b.id) return false;
  const map = new Map(questions.map((q) => [q.id, q]));
  return oneWayEligible(a, b, map) && oneWayEligible(b, a, map);
}

// ---------- Score ----------

function satisfaction(self: MatchProfile, other: MatchProfile, questions: Question[]) {
  let possible = 0;
  let earned = 0;
  for (const q of questions) {
    // Les critères déterminants sont déjà garantis par les filtres : les recompter écraserait les écarts
    // (un « Déterminant » pèse 250 et tirerait tous les scores vers le haut).
    if (self.determinants.includes(q.id)) continue;
    const mine = self.answers[q.id];
    const theirs = other.answers[q.id];
    if (!usable(mine) || !usable(theirs)) continue;
    const w = effectiveImportance(q, mine);
    if (w <= 0) continue;
    possible += w;
    earned += w * questionScore(q, mine, theirs, self.lookingFor);
  }
  // Rien ne compte pour cette personne (« peu importe » partout) : elle est satisfaite par défaut.
  return possible === 0 ? 1 : earned / possible;
}

/** Nombre de questions auxquelles les deux ont répondu : mesure la fiabilité du score. */
function sharedAnswers(a: MatchProfile, b: MatchProfile, questions: Question[]): number {
  return questions.filter((q) => usable(a.answers[q.id]) && usable(b.answers[q.id])).length;
}

/** Correction de confiance : 5 questions en commun → ×0,83 ; 50 questions → ×0,98. */
export function confidenceFactor(commonQuestions: number): number {
  return commonQuestions <= 0 ? 0 : 1 - 1 / (commonQuestions + 1);
}

function explain(a: MatchProfile, b: MatchProfile, questions: Question[]): MatchPoint[] {
  const points: MatchPoint[] = [];
  for (const q of questions) {
    const x = a.answers[q.id];
    const y = b.answers[q.id];
    if (!usable(x) || !usable(y)) continue;
    const weight = effectiveImportance(q, x) + effectiveImportance(q, y);
    const sA = questionScore(q, x, y, 'similaire');
    const sB = questionScore(q, y, x, 'similaire');

    if (q.kind === 'trait') {
      const vx = asList(x.mine)[0];
      const vy = asList(y.mine)[0];
      if (vx === vy) points.push({ questionId: q.id, kind: 'commun', weight });
      else if (areComplementary(q, vx, vy)) points.push({ questionId: q.id, kind: 'complementaire', weight });
      else if (weight <= 20) points.push({ questionId: q.id, kind: 'a-explorer', weight });
      continue;
    }
    if (sA > 0 && sB > 0 && weight >= 10) {
      points.push({ questionId: q.id, kind: 'commun', weight });
    } else if ((sA === 0 || sB === 0) && weight <= 20) {
      // Différence sans gravité : un sujet de conversation, pas un point bloquant.
      points.push({ questionId: q.id, kind: 'a-explorer', weight });
    }
  }
  return points.sort((p, q) => q.weight - p.weight);
}

export function computeMatch(a: MatchProfile, b: MatchProfile, questions: Question[]): MatchResult {
  const sa = satisfaction(a, b, questions);
  const sb = satisfaction(b, a, questions);
  const common = sharedAnswers(a, b, questions);
  const raw = Math.sqrt(sa * sb) * confidenceFactor(common);
  return {
    score: Math.round(raw * 100),
    satisfactionA: sa,
    satisfactionB: sb,
    commonQuestions: common,
    points: explain(a, b, questions),
  };
}

// ---------- Sélection des profils d'un reveal ----------

export interface RevealCandidate {
  profile: MatchProfile;
  result: MatchResult;
}

export interface RevealOptions {
  size?: number; // 5 par défaut
  discovery?: number; // profils « découverte » un peu moins bien classés
  alreadyShown?: Set<string>;
  /** Nombre de fois où chaque profil a déjà été proposé ce reveal-ci (équilibre de l'exposition). */
  exposure?: Map<string, number>;
  exposurePenalty?: number; // points de score retirés par exposition
}

/**
 * Choisit les profils d'un reveal pour `user`.
 * Renvoyés du moins compatible au plus compatible : c'est l'ordre du dévoilement.
 */
export function selectRevealBatch(
  user: MatchProfile,
  pool: MatchProfile[],
  questions: Question[],
  opts: RevealOptions = {},
): RevealCandidate[] {
  const size = opts.size ?? 5;
  const discovery = Math.min(opts.discovery ?? 1, size);
  const shown = opts.alreadyShown ?? new Set<string>();
  const penalty = opts.exposurePenalty ?? 3;

  const ranked = pool
    .filter((p) => !shown.has(p.id) && isEligible(user, p, questions))
    .map((profile) => ({ profile, result: computeMatch(user, profile, questions) }))
    .map((c) => ({ ...c, adjusted: c.result.score - penalty * (opts.exposure?.get(c.profile.id) ?? 0) }))
    .sort((x, y) => y.adjusted - x.adjusted);

  const top = ranked.slice(0, size - discovery);
  // Profils découverte : pris juste après les meilleurs, pour tester l'algo sans sacrifier la qualité.
  const rest = ranked.slice(size - discovery, size - discovery + size * 2);
  const picks = [...top, ...rest.filter((_, i) => i % 2 === 0).slice(0, discovery)];
  if (picks.length < size) {
    for (const c of ranked) {
      if (picks.length >= size) break;
      if (!picks.includes(c)) picks.push(c);
    }
  }

  return picks
    .sort((x, y) => x.result.score - y.result.score)
    .map(({ profile, result }) => ({ profile, result }));
}

// ---------- Reveal d'une ville entière (côté serveur) ----------

/** Clé d'une paire, indépendante de l'ordre. */
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export interface SessionOptions {
  size?: number; // 5 profils par personne au maximum
  /** Paires déjà proposées lors d'un reveal précédent : jamais reproposées. */
  alreadyPaired?: Set<string>;
}

/**
 * Compose le reveal de toute une ville d'un coup, par PAIRES : si Léa est proposée à Lucien,
 * Lucien est proposé à Léa le même soir (« Ils vous découvrent au même moment »).
 *
 * Répartition équitable, en tours : au tour 1 chacun reçoit au plus 1 profil, au tour 2 au plus 2…
 * jusqu'à `size`. À chaque tour, on sert d'abord les personnes qui ont le moins d'options
 * (critères rares), chacune avec son meilleur profil encore disponible. Sans cela, les profils
 * très compatibles avec tout le monde sont pris en premier et certains abonnés n'ont rien.
 * Chaque liste est renvoyée du moins au plus compatible (ordre du dévoilement).
 */
export function selectSessionPairs(
  pool: MatchProfile[],
  questions: Question[],
  opts: SessionOptions = {},
): Map<string, RevealCandidate[]> {
  const size = opts.size ?? 5;
  const done = opts.alreadyPaired ?? new Set<string>();
  const byId = new Map(pool.map((p) => [p.id, p]));

  // Options de chacun : profils éligibles dans les deux sens et jamais proposés, du meilleur au moins bon.
  const options = new Map<string, { id: string; result: MatchResult }[]>(pool.map((p) => [p.id, []]));
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i], b = pool[j];
      if (done.has(pairKey(a.id, b.id)) || !isEligible(a, b, questions)) continue;
      const result = computeMatch(a, b, questions);
      options.get(a.id)!.push({ id: b.id, result });
      options.get(b.id)!.push({ id: a.id, result });
    }
  }
  for (const list of options.values()) list.sort((x, y) => y.result.score - x.result.score || x.id.localeCompare(y.id));

  const out = new Map<string, RevealCandidate[]>(pool.map((p) => [p.id, []]));
  const taken = new Set<string>();
  for (let cap = 1; cap <= size; cap++) {
    // Les plus contraints d'abord (moins d'options restantes), puis par identifiant pour un résultat stable.
    const order = pool
      .map((p) => p.id)
      .sort((x, y) => options.get(x)!.length - options.get(y)!.length || x.localeCompare(y));
    for (const id of order) {
      const mine = out.get(id)!;
      if (mine.length >= cap) continue;
      const best = options.get(id)!.find((o) => out.get(o.id)!.length < cap && !taken.has(pairKey(id, o.id)));
      if (!best) continue;
      taken.add(pairKey(id, best.id));
      mine.push({ profile: byId.get(best.id)!, result: best.result });
      out.get(best.id)!.push({ profile: byId.get(id)!, result: best.result });
    }
  }

  // Rééquilibrage : si une personne a peu de profils alors qu'un de ses profils possibles est complet,
  // on lui cède une paire de quelqu'un qui en a nettement plus (au moins 2 de plus).
  // Chaque échange réduit l'écart : la boucle s'arrête forcément.
  let improved = true;
  while (improved) {
    improved = false;
    const order = pool.map((p) => p.id).sort((x, y) => out.get(x)!.length - out.get(y)!.length || x.localeCompare(y));
    for (const u of order) {
      const cu = out.get(u)!.length;
      if (cu >= size) break;
      for (const o of options.get(u)!) {
        if (taken.has(pairKey(u, o.id))) continue;
        const lv = out.get(o.id)!;
        if (lv.length < size) continue; // pas complet : il aurait déjà été pris au dernier tour
        const victim = lv
          .filter((c) => out.get(c.profile.id)!.length >= cu + 2)
          .sort((x, y) => out.get(y.profile.id)!.length - out.get(x.profile.id)!.length)[0];
        if (!victim) continue;
        const w = victim.profile.id;
        // v lâche w, prend u.
        lv.splice(lv.indexOf(victim), 1);
        const lw = out.get(w)!;
        lw.splice(lw.findIndex((c) => c.profile.id === o.id), 1);
        taken.delete(pairKey(o.id, w));
        taken.add(pairKey(u, o.id));
        out.get(u)!.push({ profile: byId.get(o.id)!, result: o.result });
        lv.push({ profile: byId.get(u)!, result: o.result });
        improved = true;
        break;
      }
      if (improved) break;
    }
  }

  for (const list of out.values()) list.sort((x, y) => x.result.score - y.result.score);
  return out;
}

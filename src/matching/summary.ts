// Transforme le résultat de l'algorithme en résumé lisible pour l'écran de match.
// Règle clé : une donnée sensible (politique, religion) n'est jamais affichée en clair.

import { computeMatch } from './matching';
import type { Answer, MatchProfile, Question } from './types';

export interface MatchSummary {
  score: number;
  common: string[];
  complementary: string[];
  explore: string[];
}

function labelOf(q: Question, value: string): string {
  const label = q.options?.find((o) => o.value === value)?.label ?? value;
  // Minuscule en début de libellé seulement, pour garder « Paris » ou « VO ».
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function values(a: Answer): string[] {
  return Array.isArray(a.mine) ? a.mine : [String(a.mine)];
}

export function buildSummary(me: MatchProfile, other: MatchProfile, questions: Question[]): MatchSummary {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const result = computeMatch(me, other, questions);
  const common: string[] = [];
  const complementary: string[] = [];
  const explore: string[] = [];
  let valuesShown = false;

  for (const p of result.points) {
    const q = byId.get(p.questionId);
    if (!q) continue;
    const mine = me.answers[q.id];
    const theirs = other.answers[q.id];

    if (q.sensitive) {
      // Regroupées en une seule ligne neutre, et seulement si c'est un point commun.
      if (p.kind === 'commun' && !valuesShown) {
        common.push('Des valeurs proches');
        valuesShown = true;
      }
      continue;
    }
    if (q.kind === 'range') continue; // le physique n'apparaît pas dans le résumé

    if (p.kind === 'commun' && common.length < 4) {
      const shared = values(mine).filter((v) => values(theirs).includes(v));
      const shown = (shared.length ? shared : values(theirs)).slice(0, 2).map((v) => labelOf(q, v));
      common.push(`${q.summaryLabel} : ${shown.join(', ')}`);
    } else if (p.kind === 'complementaire' && complementary.length < 2) {
      complementary.push(`${q.summaryLabel} : ${labelOf(q, values(theirs)[0])} de son côté, ${labelOf(q, values(mine)[0])} du vôtre`);
    } else if (p.kind === 'a-explorer' && explore.length < 1) {
      explore.push(`${q.summaryLabel} : ${labelOf(q, values(theirs)[0])} de son côté, ${labelOf(q, values(mine)[0])} du vôtre`);
    }
  }
  return { score: result.score, common, complementary, explore };
}

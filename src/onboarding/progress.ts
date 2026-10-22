// Progression du questionnaire : combien de questions sont faites, et le palier
// « Prêt pour le reveal » (les bases + les questions essentielles).

import { QUESTIONS, REVEAL_ESSENTIALS } from '../data/questions';
import type { Answer } from '../matching/types';

/** Temps moyen estimé par question, pour annoncer « encore 3 min ». */
const SECONDS_PER_QUESTION = 20;

/** Une question compte comme faite si on a répondu, ou choisi « Je préfère ne pas répondre ». */
export function isDone(a: Answer | undefined): boolean {
  if (!a) return false;
  if (a.skipped) return true;
  if (Array.isArray(a.mine)) return a.mine.length > 0;
  if (typeof a.mine === 'number') return a.mine > 0;
  return !!a.mine;
}

export interface Progress {
  done: number;
  total: number;
  essentialsDone: number;
  essentialsTotal: number;
  /** Les bases sont remplies et toutes les questions essentielles faites. */
  ready: boolean;
  /** Part du questionnaire faite (0 à 1) et position du palier sur la même barre. */
  ratio: number;
  readyMark: number;
  /** Minutes restantes, jusqu'au palier si pas encore prêt, sinon jusqu'à la fin. */
  minutesLeft: number;
}

export function progress(answers: Record<string, Answer>, basicsDone: boolean): Progress {
  const total = QUESTIONS.length;
  const done = QUESTIONS.filter((q) => isDone(answers[q.id])).length;
  const essentialsDone = REVEAL_ESSENTIALS.filter((id) => isDone(answers[id])).length;
  const essentialsTotal = REVEAL_ESSENTIALS.length;
  const ready = basicsDone && essentialsDone === essentialsTotal;
  const left = ready ? total - done : essentialsTotal - essentialsDone;
  return {
    done,
    total,
    essentialsDone,
    essentialsTotal,
    ready,
    ratio: done / total,
    readyMark: essentialsTotal / total,
    minutesLeft: Math.max(left > 0 ? 1 : 0, Math.ceil((left * SECONDS_PER_QUESTION) / 60)),
  };
}

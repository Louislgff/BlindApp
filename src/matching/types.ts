// Types partagés par l'algorithme de matching de Blind.

/** Échelle d'importance du questionnaire (poids volontairement très écartés). */
export const IMPORTANCE = {
  peuImporte: 0,
  unPeu: 1,
  important: 10,
  tresImportant: 50,
  determinant: 250,
} as const;

export type Importance = (typeof IMPORTANCE)[keyof typeof IMPORTANCE];

/**
 * - "compat"  : valeurs, mode de vie, projet de vie. Toujours calculé sur la compatibilité.
 * - "trait"   : personnalité (choix unique). Sensible au choix points communs / complémentaire.
 * - "tags"    : passions et goûts (multi-tags). Sensible au choix points communs / complémentaire.
 * - "range"   : valeur numérique (ex. taille) comparée à une fourchette acceptée.
 */
export type QuestionKind = 'compat' | 'trait' | 'tags' | 'range';

export interface Question {
  id: string;
  step: number;
  kind: QuestionKind;
  label: string;
  /** Libellé court réutilisé dans le résumé de match (« Voyages », « Projet de vie »…). */
  summaryLabel: string;
  options?: { value: string; label: string }[];
  /** Donnée sensible (RGPD art. 9) : jamais affichée en clair dans un résumé. */
  sensitive?: boolean;
  /** Pour les traits : paires de réponses jugées complémentaires (ex. anime ↔ observe). */
  complements?: [string, string][];
  /** Plafond d'importance autorisé (ex. couleur des cheveux plafonnée à « Important »). */
  maxImportance?: Importance;
  /** Importance proposée par défaut à l'utilisateur. */
  defaultImportance?: Importance;
}

export type AnswerValue = string | string[] | number;

export interface Answer {
  mine: AnswerValue;
  /** Ce que j'accepte chez l'autre : liste de valeurs, ou fourchette pour une question "range". */
  accepted?: string[] | { min: number; max: number };
  importance: Importance;
  /** « Je préfère ne pas répondre » : la question sort du calcul pour cette personne. */
  skipped?: boolean;
}

export type Gender = 'femme' | 'homme' | 'non-binaire';
export type LookingFor = 'similaire' | 'complementaire' | 'les-deux';

export interface MatchProfile {
  id: string;
  firstName: string;
  age: number;
  gender: Gender;
  seeking: Gender[];
  ageRange: { min: number; max: number };
  /** Position approximative (centre de la zone choisie, jamais la position exacte). */
  location: { lat: number; lng: number };
  maxDistanceKm: number;
  /** Au plus 3 questions marquées « critère déterminant » : éliminatoires. */
  determinants: string[];
  lookingFor: LookingFor;
  answers: Record<string, Answer>;
}

export type PointKind = 'commun' | 'complementaire' | 'a-explorer';

export interface MatchPoint {
  questionId: string;
  kind: PointKind;
  /** Importance combinée des deux personnes : sert à classer les points. */
  weight: number;
}

export interface MatchResult {
  score: number; // 0–100
  satisfactionA: number; // à quel point B convient à A (0–1)
  satisfactionB: number; // à quel point A convient à B (0–1)
  commonQuestions: number;
  points: MatchPoint[];
}

// Questions de matching du questionnaire d'inscription (étapes 2 à 7).
// Les champs purement « profil » (prénom, métier, textes, photos) sont dans onboardingSteps.

import { IMPORTANCE, type Question } from '../matching/types';

const o = (...labels: string[]) =>
  labels.map((label) => ({
    value: label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''),
    label,
  }));

export const QUESTIONS: Question[] = [
  // Étape 2 — Les bases
  {
    id: 'recherche', step: 2, kind: 'compat', label: 'Le type de relation que je cherche', summaryLabel: 'Type de relation',
    options: o('Relation sérieuse', 'Voir où ça mène', 'Rencontres sans pression'),
    defaultImportance: IMPORTANCE.tresImportant,
  },

  // Étape 3 — Mode de vie
  { id: 'etudes', step: 3, kind: 'compat', label: "Niveau d'études", summaryLabel: 'Parcours', options: o('Bac', 'Bac+2/3', 'Bac+5', 'Doctorat', 'Autre parcours') },
  { id: 'rythme', step: 3, kind: 'compat', label: 'Rythme de travail', summaryLabel: 'Rythme de vie', options: o('Horaires classiques', 'Décalés', 'Indépendant', 'Beaucoup de déplacements') },
  {
    id: 'chronotype', step: 3, kind: 'trait', label: 'Couche-tôt ou couche-tard', summaryLabel: 'Rythme du quotidien',
    options: o('Plutôt matin', 'Plutôt soir', 'Les deux'),
  },
  { id: 'weekend', step: 3, kind: 'tags', label: 'Mon week-end type', summaryLabel: 'Week-ends', options: o('Sorties et apéros', 'Calme et cocooning', 'Activités et sport', 'Hors de Paris') },
  { id: 'alcool', step: 3, kind: 'compat', label: 'Alcool', summaryLabel: 'Alcool', options: o('Jamais', 'Occasionnellement', 'En soirée', 'Régulièrement') },
  { id: 'tabac', step: 3, kind: 'compat', label: 'Tabac', summaryLabel: 'Tabac', options: o('Non-fumeur', 'Occasionnel', 'Fumeur', 'Vapote') },
  { id: 'alimentation', step: 3, kind: 'compat', label: 'Alimentation', summaryLabel: 'Alimentation', options: o('Omnivore', 'Flexitarien', 'Végétarien', 'Vegan', 'Halal', 'Casher') },
  { id: 'enfants', step: 3, kind: 'compat', label: 'Enfants', summaryLabel: 'Enfants', options: o("Pas d'enfant", "J'en ai, ils vivent avec moi", "J'en ai, en garde alternée") },
  {
    id: 'desir-enfants', step: 3, kind: 'compat', label: "Désir d'enfants", summaryLabel: 'Désir d’enfants',
    options: o('Oui', 'Non', 'Peut-être', "J'en ai déjà assez"), defaultImportance: IMPORTANCE.determinant,
  },
  { id: 'animaux', step: 3, kind: 'compat', label: 'Animaux', summaryLabel: 'Animaux', options: o('Chien', 'Chat', 'Autre', 'Aucun', 'Allergique') },

  // Étape 4 — Valeurs et vision (politique et religion : données sensibles)
  { id: 'politique', step: 4, kind: 'compat', sensitive: true, label: 'Sensibilité politique', summaryLabel: 'Valeurs', options: o('Gauche', 'Centre', 'Droite', 'Apolitique') },
  { id: 'engagement', step: 4, kind: 'compat', sensitive: true, label: 'Engagement politique', summaryLabel: 'Valeurs', options: o("Je n'en parle pas", "J'en parle", 'Je milite') },
  { id: 'religion', step: 4, kind: 'compat', sensitive: true, label: 'Religion', summaryLabel: 'Valeurs', options: o('Croyant pratiquant', 'Croyant non pratiquant', 'Spirituel', 'Athée ou agnostique') },
  { id: 'couple', step: 4, kind: 'compat', label: 'Vision du couple', summaryLabel: 'Vision du couple', options: o('Fusionnel', 'Indépendants ensemble', 'Entre les deux') },
  { id: 'mariage', step: 4, kind: 'compat', label: 'Le mariage', summaryLabel: 'Mariage', options: o('Important pour moi', 'Pourquoi pas', 'Pas pour moi') },
  { id: 'vivre-ensemble', step: 4, kind: 'compat', label: 'Vivre ensemble', summaryLabel: 'Vie à deux', options: o('Rapidement', 'Après quelques années', 'Pas forcément') },
  { id: 'argent', step: 4, kind: 'compat', label: "Rapport à l'argent", summaryLabel: 'Rapport à l’argent', options: o('Économe', 'Équilibré', 'Dépensier') },
  { id: 'ambition', step: 4, kind: 'compat', label: 'Ambition professionnelle', summaryLabel: 'Place du travail', options: o('Carrière prioritaire', 'Équilibre vie pro et perso', 'Vie perso prioritaire') },
  { id: 'famille', step: 4, kind: 'compat', label: 'Place de la famille', summaryLabel: 'Famille', options: o('Très présente', 'Régulière', 'Distante') },
  { id: 'amis', step: 4, kind: 'compat', label: 'Place des amis', summaryLabel: 'Vie sociale', options: o('Vie sociale intense', 'Petit cercle', 'Plutôt solitaire') },
  { id: 'projet-5-ans', step: 4, kind: 'compat', label: 'Mon projet de vie à 5 ans', summaryLabel: 'Projet de vie', options: o('Rester à Paris', 'Partir en région', "Partir à l'étranger", 'Je ne sais pas') },

  // Étape 5 — Passions et goûts
  { id: 'sport', step: 5, kind: 'tags', label: 'Sports pratiqués', summaryLabel: 'Sport', options: o('Running', 'Salle', 'Padel', 'Tennis', 'Yoga', 'Escalade', 'Vélo', 'Natation', 'Ski', 'Football', 'Boxe') },
  { id: 'voyages', step: 5, kind: 'tags', label: 'Ma façon de voyager', summaryLabel: 'Voyages', options: o('City trip', 'Plage', 'Aventure', 'Montagne', 'Road trip', 'Luxe') },
  { id: 'sorties', step: 5, kind: 'tags', label: 'Mes sorties à Paris', summaryLabel: 'Sorties', options: o('Bars à cocktails', 'Restaurants', 'Concerts', 'Théâtre', 'Expos et musées', 'Clubs', 'Brocantes', 'Parcs') },
  { id: 'cinema', step: 5, kind: 'tags', label: 'Cinéma et séries', summaryLabel: 'Cinéma', options: o('Comédie', 'Drame', 'Thriller', 'SF', 'Animation', 'Documentaire', "Cinéma d'auteur") },
  { id: 'musique', step: 5, kind: 'tags', label: 'Musique', summaryLabel: 'Musique', options: o('Pop', 'Rap', 'Rock', 'Électro', 'Jazz', 'Classique', 'Variété française') },
  { id: 'gastronomie', step: 5, kind: 'tags', label: 'Gastronomie', summaryLabel: 'Bonnes tables', options: o('Bonnes adresses', 'Vin', 'Street food', 'Cuisine du monde', "J'adore cuisiner") },

  // Étape 6 — Physique (photos cachées : déclaratif uniquement)
  { id: 'taille', step: 6, kind: 'range', label: 'Taille', summaryLabel: 'Taille' },
  { id: 'silhouette', step: 6, kind: 'compat', label: 'Silhouette', summaryLabel: 'Silhouette', options: o('Mince', 'Athlétique', 'Moyenne', 'Quelques kilos en plus', 'Ronde') },
  { id: 'cheveux', step: 6, kind: 'compat', label: 'Couleur de cheveux', summaryLabel: 'Cheveux', options: o('Blond', 'Brun', 'Châtain', 'Roux', 'Gris', 'Rasé'), maxImportance: IMPORTANCE.important, defaultImportance: IMPORTANCE.peuImporte },
  { id: 'yeux', step: 6, kind: 'compat', label: 'Couleur des yeux', summaryLabel: 'Yeux', options: o('Bleus', 'Verts', 'Marron', 'Gris'), maxImportance: IMPORTANCE.important, defaultImportance: IMPORTANCE.peuImporte },
  { id: 'style', step: 6, kind: 'compat', label: 'Style vestimentaire', summaryLabel: 'Style', options: o('Classique', 'Casual', 'Sportswear', 'Créatif', 'Chic') },

  // Étape 7 — Personnalité
  {
    id: 'temperament', step: 7, kind: 'compat', label: 'Mon tempérament', summaryLabel: 'Tempérament',
    options: o('Introverti', 'Plutôt réservé', 'Entre les deux', 'Plutôt sociable', 'Extraverti'),
    defaultImportance: IMPORTANCE.important,
  },
  {
    id: 'premier-abord', step: 7, kind: 'compat', label: 'Au premier abord, je suis', summaryLabel: 'Premier abord',
    options: o('Timide', 'Réservé mais curieux', 'À l’aise tout de suite'),
  },
  {
    id: 'soiree', step: 7, kind: 'trait', label: 'En soirée, je suis', summaryLabel: 'En soirée',
    options: o('Celui qui anime', 'Je discute en petit comité', "J'observe"),
    complements: [['celui-qui-anime', 'j-observe'], ['celui-qui-anime', 'je-discute-en-petit-comite']],
  },
  { id: 'humour', step: 7, kind: 'tags', label: 'Mon humour', summaryLabel: 'Humour', options: o('Second degré', 'Absurde', 'Pince-sans-rire', 'Taquin', 'Plutôt sérieux') },
  { id: 'communication', step: 7, kind: 'trait', label: 'Pour communiquer', summaryLabel: 'Communication', options: o("J'écris beaucoup", 'Je préfère les vocaux', 'Je préfère voir en vrai vite') },
  {
    id: 'conflit', step: 7, kind: 'trait', label: 'En cas de conflit', summaryLabel: 'Gestion des désaccords',
    options: o("J'en parle tout de suite", "J'ai besoin de temps", "J'évite"),
    complements: [["j-en-parle-tout-de-suite", "j-ai-besoin-de-temps"]],
  },
  {
    id: 'organisation', step: 7, kind: 'trait', label: 'Spontané ou organisé', summaryLabel: 'Organisation',
    options: o('Spontané', 'Organisé', 'Entre les deux'),
    complements: [['spontane', 'organise']],
  },
  { id: 'langage-amour', step: 7, kind: 'tags', label: 'Ce qui me touche le plus', summaryLabel: 'Ce qui vous touche', options: o('Les mots', 'Les attentions', 'Le temps passé ensemble', 'Le contact', 'Les services rendus') },
  { id: 'jalousie', step: 7, kind: 'compat', label: 'Jalousie', summaryLabel: 'Jalousie', options: o('Pas jaloux', 'Un peu', 'Assez') },
];

/** Critères le plus souvent rédhibitoires : proposés en premier comme critères déterminants. */
export const SUGGESTED_DETERMINANTS = ['desir-enfants', 'recherche', 'enfants', 'tabac', 'projet-5-ans', 'vivre-ensemble', 'religion', 'animaux'];

/** Seules les questions de compatibilité (et la taille) peuvent devenir des critères déterminants. */
export const canBeDeterminant = (q: Question) => q.kind === 'compat' || q.kind === 'range';

export const QUESTIONS_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

/**
 * Les questions essentielles : une fois répondues (avec les bases), on entre dans le prochain reveal.
 * Ce sont celles qui pèsent le plus dans le matching. Le reste affine les résultats.
 * Doit rester identique à la liste de supabase/migrations/0002_onboarding.sql (vérifié par un test).
 */
export const REVEAL_ESSENTIALS = [
  'recherche', 'enfants', 'desir-enfants', 'tabac', 'alcool', 'rythme', 'couple', 'vivre-ensemble',
  'mariage', 'projet-5-ans', 'religion', 'sorties', 'voyages', 'temperament', 'communication',
];

export const STEP_TITLES: Record<number, string> = {
  2: 'Les bases',
  3: 'Mode de vie',
  4: 'Valeurs et vision',
  5: 'Passions et goûts',
  6: 'Physique',
  7: 'Personnalité',
};

export const IMPORTANCE_CHOICES = [
  { value: IMPORTANCE.peuImporte, label: 'Peu importe' },
  { value: IMPORTANCE.unPeu, label: 'Un peu' },
  { value: IMPORTANCE.important, label: 'Important' },
  { value: IMPORTANCE.tresImportant, label: 'Très important' },
  { value: IMPORTANCE.determinant, label: 'Déterminant' },
] as const;

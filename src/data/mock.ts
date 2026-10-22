// Données de démonstration, en attendant le backend.
// Les % de match sont calculés pour de vrai par l'algorithme à partir de ces réponses.

import { QUESTIONS } from './questions';
import { IMPORTANCE, type Answer, type Importance, type MatchProfile } from '../matching/types';

export interface DisplayProfile extends MatchProfile {
  job: string;
  zone: string;
  initial: string;
  prompts: { question: string; answer: string }[];
  /** Phrase « Pourquoi vous ». En production : générée côté serveur à partir des points du match. */
  why: string;
  photos: number;
  /** Musique de profil (extrait de 30 s lu depuis un service de streaming). */
  music?: Track;
}

export interface Track {
  title: string;
  artist: string;
}

/** Suggestions du sélecteur de musique (en production : recherche dans le catalogue d'un service de streaming). */
export const MUSIC_LIBRARY: Track[] = [
  { title: '1901', artist: 'Phoenix' },
  { title: 'Le dernier jour du disco', artist: 'Juliette Armanet' },
  { title: 'La femme d’argent', artist: 'Air' },
  { title: 'Dreams', artist: 'Fleetwood Mac' },
  { title: 'Digital Love', artist: 'Daft Punk' },
  { title: 'Vanille fraise', artist: 'L’Impératrice' },
  { title: 'Tilted', artist: 'Christine and the Queens' },
  { title: 'Get Lucky', artist: 'Daft Punk' },
];

/** Ce que Lucien choisit d'afficher sur son profil (écran « Mon profil »). */
export interface ProfileDisplay {
  job: boolean;
  zone: boolean;
  height: boolean;
  studies: boolean;
  /** Jusqu'à 3 passions mises en avant, prises dans ses réponses. */
  highlights: string[];
  autoplay: boolean;
}

// Petit générateur déterministe, pour que les profils soient toujours les mêmes.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const IMPORTANCES: Importance[] = [
  IMPORTANCE.unPeu,
  IMPORTANCE.important,
  IMPORTANCE.important,
  IMPORTANCE.tresImportant,
];

function makeAnswers(seed: number, overrides: Record<string, Partial<Answer>> = {}): Record<string, Answer> {
  const rand = rng(seed);
  const answers: Record<string, Answer> = {};
  for (const q of QUESTIONS) {
    const importance = q.defaultImportance ?? IMPORTANCES[Math.floor(rand() * IMPORTANCES.length)];
    if (q.kind === 'range') {
      const height = 160 + Math.floor(rand() * 30);
      answers[q.id] = { mine: height, accepted: { min: 165, max: 195 }, importance };
    } else {
      const opts = (q.options ?? []).map((x) => x.value);
      const i = Math.floor(rand() * opts.length);
      if (q.kind === 'tags') {
        answers[q.id] = { mine: [opts[i], opts[(i + 2) % opts.length]], importance };
      } else {
        answers[q.id] = {
          mine: opts[i],
          accepted: [opts[i], opts[(i + 1) % opts.length]],
          importance,
        };
      }
    }
    if (overrides[q.id]) answers[q.id] = { ...answers[q.id], ...overrides[q.id] } as Answer;
  }
  return answers;
}

const PARIS = {
  '6e': { lat: 48.849, lng: 2.333 },
  '9e': { lat: 48.877, lng: 2.338 },
  '11e': { lat: 48.859, lng: 2.38 },
  '15e': { lat: 48.841, lng: 2.3 },
  '17e': { lat: 48.887, lng: 2.307 },
  '18e': { lat: 48.892, lng: 2.348 },
  '20e': { lat: 48.864, lng: 2.398 },
};

const commonWomen = {
  gender: 'femme' as const,
  seeking: ['homme' as const],
  ageRange: { min: 30, max: 40 },
  maxDistanceKm: 15,
  determinants: [] as string[],
};

const enfantsOui = { 'desir-enfants': { mine: 'oui', accepted: ['oui', 'peut-etre'] } };

export const ME: DisplayProfile = {
  id: 'me',
  firstName: 'Lucien',
  age: 34,
  initial: 'L',
  job: 'Consultant',
  zone: 'Paris 9e',
  gender: 'homme',
  seeking: ['femme'],
  ageRange: { min: 29, max: 38 },
  location: PARIS['9e'],
  maxDistanceKm: 15,
  determinants: ['desir-enfants'],
  lookingFor: 'les-deux',
  photos: 3,
  why: '',
  music: { title: '1901', artist: 'Phoenix' },
  prompts: [
    { question: 'Un dimanche parfait à Paris, c’est…', answer: 'Un marché le matin, un long déjeuner, et rentrer à pied par les quais.' },
    { question: 'On s’entendra bien si…', answer: 'Tu aimes partir le vendredi soir sans savoir exactement où on dort.' },
  ],
  answers: makeAnswers(7, {
    ...enfantsOui,
    recherche: { mine: 'relation-serieuse', accepted: ['relation-serieuse', 'voir-ou-ca-mene'] },
    voyages: { mine: ['road-trip', 'montagne'] },
    sorties: { mine: ['expos-et-musees', 'brocantes', 'restaurants'] },
    couple: { mine: 'independants-ensemble', accepted: ['independants-ensemble', 'entre-les-deux'] },
    'projet-5-ans': { mine: 'rester-a-paris', accepted: ['rester-a-paris', 'je-ne-sais-pas'] },
    chronotype: { mine: 'plutot-soir', importance: IMPORTANCE.unPeu },
    organisation: { mine: 'spontane' },
    taille: { mine: 182 },
    temperament: { mine: 'plutot-sociable', accepted: ['plutot-reserve', 'entre-les-deux', 'plutot-sociable'], importance: IMPORTANCE.important },
    'premier-abord': { mine: 'a-l-aise-tout-de-suite', accepted: ['reserve-mais-curieux', 'a-l-aise-tout-de-suite'] },
  }),
};

export const PROFILES: DisplayProfile[] = [
  {
    ...commonWomen, id: 'lea', firstName: 'Léa', age: 32, initial: 'L', job: 'Architecte d’intérieur', zone: 'Paris 11e',
    location: PARIS['11e'], lookingFor: 'les-deux', photos: 4,
    music: { title: 'Le dernier jour du disco', artist: 'Juliette Armanet' },
    why: 'Vous cherchez tous les deux une relation sérieuse, vos week-ends se passent souvent loin de Paris, et vous voyez le couple de la même façon : indépendants, ensemble.',
    prompts: [
      { question: 'Un dimanche parfait à Paris, c’est…', answer: 'Les puces de Vanves dès 8 h, un café en terrasse, et l’après-midi à chiner sans rien acheter.' },
      { question: 'On s’entendra bien si…', answer: 'Tu as toujours une adresse à partager et pas peur de te lever tôt le samedi.' },
    ],
    answers: makeAnswers(11, {
      ...enfantsOui,
      recherche: { mine: 'relation-serieuse', accepted: ['relation-serieuse'] },
      voyages: { mine: ['road-trip', 'montagne'] },
      sorties: { mine: ['expos-et-musees', 'brocantes'] },
      couple: { mine: 'independants-ensemble', accepted: ['independants-ensemble'] },
      'projet-5-ans': { mine: 'rester-a-paris', accepted: ['rester-a-paris'] },
      chronotype: { mine: 'plutot-matin', importance: IMPORTANCE.unPeu },
      organisation: { mine: 'organise' },
      temperament: { mine: 'entre-les-deux', accepted: ['entre-les-deux', 'plutot-sociable', 'extraverti'], importance: IMPORTANCE.important },
      'premier-abord': { mine: 'reserve-mais-curieux', accepted: ['reserve-mais-curieux', 'a-l-aise-tout-de-suite'] },
    }),
  },
  {
    ...commonWomen, id: 'sophie', firstName: 'Sophie', age: 31, initial: 'S', job: 'Cheffe de projet', zone: 'Paris 17e',
    location: PARIS['17e'], lookingFor: 'similaire', photos: 4,
    why: 'Vous voulez tous les deux une relation sérieuse, et vous aimez les tables où l’on reste longtemps.',
    prompts: [{ question: 'Ce qui me fait craquer…', answer: 'Quelqu’un qui connaît le nom du serveur de son bistrot.' }],
    answers: makeAnswers(23, { ...enfantsOui, recherche: { mine: 'relation-serieuse' } }),
  },
  {
    ...commonWomen, id: 'anais', firstName: 'Anaïs', age: 33, initial: 'A', job: 'Photographe', zone: 'Paris 20e',
    location: PARIS['20e'], lookingFor: 'complementaire', photos: 5,
    why: 'Elle aime organiser les voyages, vous aimez les improviser : de quoi partir loin.',
    prompts: [{ question: 'Je suis fière de…', answer: 'Ma première expo, dans un garage de Belleville.' }],
    answers: makeAnswers(31, enfantsOui),
  },
  {
    ...commonWomen, id: 'claire', firstName: 'Claire', age: 35, initial: 'C', job: 'Avocate', zone: 'Paris 6e',
    location: PARIS['6e'], lookingFor: 'les-deux', photos: 4,
    why: 'Même vision du couple et même goût pour les week-ends à la montagne.',
    prompts: [{ question: 'Mon adresse préférée à Paris…', answer: 'Une librairie de la rue de l’Odéon, ouverte jusqu’à 22 h.' }],
    answers: makeAnswers(41, { ...enfantsOui, voyages: { mine: ['montagne', 'city-trip'] } }),
  },
  {
    ...commonWomen, id: 'marion', firstName: 'Marion', age: 35, initial: 'M', job: 'Médecin', zone: 'Paris 15e',
    location: PARIS['15e'], lookingFor: 'similaire', photos: 3,
    why: 'Deux rythmes chargés, une même envie de week-ends au calme.',
    prompts: [{ question: 'Ce que j’attends de l’autre…', answer: 'De la constance, et de l’humour quand je rentre de garde.' }],
    answers: makeAnswers(53, enfantsOui),
  },
  {
    ...commonWomen, id: 'julie', firstName: 'Julie', age: 33, initial: 'J', job: 'Journaliste', zone: 'Paris 18e',
    location: PARIS['18e'], lookingFor: 'les-deux', photos: 4,
    why: 'Le même goût des voyages lents et des librairies de quartier.',
    prompts: [{ question: 'On s’entendra bien si…', answer: 'Tu lis la fin des articles.' }],
    answers: makeAnswers(61, enfantsOui),
  },
  {
    ...commonWomen, id: 'camille', firstName: 'Camille', age: 32, initial: 'C', job: 'Designer produit', zone: 'Paris 11e',
    location: PARIS['11e'], lookingFor: 'similaire', photos: 5,
    why: 'Même projet de vie, mêmes brocantes du dimanche.',
    prompts: [{ question: 'Un dimanche parfait…', answer: 'Brocante, vélo, et un film en VO le soir.' }],
    answers: makeAnswers(71, { ...enfantsOui, sorties: { mine: ['brocantes', 'expos-et-musees'] } }),
  },
  {
    ...commonWomen, id: 'alice', firstName: 'Alice', age: 34, initial: 'A', job: 'Directrice financière', zone: 'Paris 9e',
    location: PARIS['9e'], lookingFor: 'les-deux', photos: 4,
    why: 'Vos valeurs, votre vision du couple et vos envies d’ailleurs se répondent presque mot pour mot.',
    prompts: [{ question: 'Ce qu’il faut savoir sur moi…', answer: 'Je planifie tout, sauf mes vacances.' }],
    answers: makeAnswers(83, {
      ...enfantsOui,
      recherche: { mine: 'relation-serieuse', accepted: ['relation-serieuse'] },
      couple: { mine: 'independants-ensemble' },
      voyages: { mine: ['road-trip', 'montagne'] },
      'projet-5-ans': { mine: 'rester-a-paris' },
    }),
  },
  {
    ...commonWomen, id: 'ines', firstName: 'Inès', age: 30, initial: 'I', job: 'Ingénieure', zone: 'Paris 15e',
    location: PARIS['15e'], lookingFor: 'complementaire', photos: 4,
    why: 'Elle observe, vous animez : vos soirées devraient s’équilibrer.',
    prompts: [{ question: 'Ce qui me fait fuir…', answer: 'Les gens pressés au restaurant.' }],
    answers: makeAnswers(97, enfantsOui),
  },
  {
    ...commonWomen, id: 'nora', firstName: 'Nora', age: 36, initial: 'N', job: 'Cheffe pâtissière', zone: 'Paris 17e',
    location: PARIS['17e'], lookingFor: 'similaire', photos: 4,
    why: 'Vous mettez tous les deux la famille au centre, et vous ne refusez jamais un bon dîner.',
    prompts: [{ question: 'Je suis fière de…', answer: 'Avoir ouvert ma boutique à 32 ans, sans plan B.' }],
    answers: makeAnswers(109, { ...enfantsOui, gastronomie: { mine: ['bonnes-adresses', 'vin'] } }),
  },
  {
    ...commonWomen, id: 'emma', firstName: 'Emma', age: 31, initial: 'E', job: 'Consultante RSE', zone: 'Paris 10e',
    location: PARIS['9e'], lookingFor: 'les-deux', photos: 4,
    why: 'Le même besoin de sens au travail, et la même envie de partir loin dès que possible.',
    prompts: [{ question: 'On s’entendra bien si…', answer: 'Tu acceptes que je compare chaque destination à Lisbonne.' }],
    answers: makeAnswers(127, enfantsOui),
  },
  {
    ...commonWomen, id: 'chloe', firstName: 'Chloé', age: 33, initial: 'C', job: 'Kinésithérapeute', zone: 'Paris 14e',
    location: PARIS['15e'], lookingFor: 'similaire', photos: 3,
    why: 'Deux sportifs du matin qui gardent leurs soirées pour les amis.',
    prompts: [{ question: 'Un dimanche parfait…', answer: 'Footing au parc Montsouris, puis brunch interminable.' }],
    answers: makeAnswers(131, enfantsOui),
  },
  {
    ...commonWomen, id: 'sarah', firstName: 'Sarah', age: 35, initial: 'S', job: 'Productrice', zone: 'Paris 3e',
    location: PARIS['11e'], lookingFor: 'complementaire', photos: 4,
    why: 'Elle vit à cent à l’heure, vous savez ralentir : de quoi s’équilibrer.',
    prompts: [{ question: 'Ce qui me fait craquer…', answer: 'Les gens qui savent écouter sans regarder leur téléphone.' }],
    answers: makeAnswers(149, enfantsOui),
  },
  {
    ...commonWomen, id: 'lucie', firstName: 'Lucie', age: 30, initial: 'L', job: 'Professeure de lettres', zone: 'Paris 5e',
    location: PARIS['6e'], lookingFor: 'similaire', photos: 3,
    why: 'Mêmes librairies, mêmes films, même besoin de prendre son temps.',
    prompts: [{ question: 'Mon adresse préférée à Paris…', answer: 'Un cinéma de la rue Champollion, séance de 22 h.' }],
    answers: makeAnswers(151, enfantsOui),
  },
  {
    ...commonWomen, id: 'mathilde', firstName: 'Mathilde', age: 34, initial: 'M', job: 'Avocate d’affaires', zone: 'Paris 8e',
    location: PARIS['17e'], lookingFor: 'les-deux', photos: 4,
    why: 'Deux agendas chargés, une même idée du couple : se retrouver vraiment.',
    prompts: [{ question: 'Ce que j’attends de l’autre…', answer: 'De la franchise, et un bon restaurant le jeudi.' }],
    answers: makeAnswers(163, enfantsOui),
  },
];

export const MY_DISPLAY: ProfileDisplay = {
  job: true,
  zone: true,
  height: false,
  studies: false,
  highlights: ['road-trip', 'expos-et-musees', 'brocantes'],
  autoplay: false,
};

export const PROFILES_BY_ID = new Map(PROFILES.map((p) => [p.id, p]));

// ---------- Conversations ----------

export interface Message {
  id: string;
  from: 'me' | 'them';
  text: string;
  at: string;
}

export interface Conversation {
  id: string;
  profileId: string;
  revealDate: string; // reveal pendant lequel le match a eu lieu
  messages: Message[];
  /** Mon accord pour révéler mes photos (secret pour l'autre). */
  meReady: boolean;
  /** Accord de l'autre : jamais affiché tant que je n'ai pas dit oui moi-même. */
  themReady: boolean;
  revealedOn?: string;
  metOn?: string;
  debriefDone?: boolean;
}

const lines = (pairs: [Message['from'], string][]): Message[] =>
  pairs.map(([from, text], i) => ({ id: `m${i}`, from, text, at: '2026-10-18T19:00:00Z' }));

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'c-lea', profileId: 'lea', revealDate: '15 octobre', meReady: false, themReady: true,
    messages: lines([
      ['me', 'Ton adresse préférée à Paris, c’est laquelle ?'],
      ['them', 'Difficile… mais je dirais un petit café derrière le Marché d’Aligre.'],
      ['me', 'Je le connais ! Celui avec les tables en zinc ?'],
      ['them', 'Exactement. Tu y vas souvent ?'],
      ['me', 'Le samedi, quand je me lève assez tôt. Donc rarement.'],
      ['them', 'Haha. Moi je suis du matin, ça ne m’aide pas à comprendre.'],
      ['them', 'Bon, je l’avoue : je suis déjà allée trois fois au marché aux puces de Vanves ce mois-ci.'],
      ['me', 'Trois fois ! Tu cherches quelque chose de précis ?'],
      ['them', 'Une lampe des années 60 pour un client. Et un peu pour moi aussi.'],
      ['me', 'Alors j’ai une adresse à te donner, mais seulement en échange d’un café.'],
    ]),
  },
  {
    id: 'c-sophie', profileId: 'sophie', revealDate: '15 octobre', meReady: false, themReady: false,
    messages: lines([
      ['them', 'Bonsoir Lucien. Ton dimanche parfait m’a donné faim.'],
      ['me', 'C’est le but du long déjeuner. Tu as une table préférée ?'],
      ['them', 'Plusieurs, mais je ne les donne pas au premier message.'],
      ['me', 'Je note. Et ce soir, opéra ou série ?'],
      ['them', 'Opéra, figure-toi. Je reviens de Garnier.'],
      ['them', 'Haha, je ne t’aurais pas imaginé fan d’opéra'],
    ]),
  },
  {
    id: 'c-anais', profileId: 'anais', revealDate: '1er octobre', meReady: true, themReady: true,
    revealedOn: '8 octobre', metOn: 'samedi 11 octobre', debriefDone: false,
    messages: lines([
      ['them', 'Merci pour samedi, c’était chouette.'],
      ['me', 'Pareil. Et je maintiens que la photo du garage était la meilleure.'],
    ]),
  },
];

/** Matchs du dernier reveal sans conversation commencée. */
export const NEW_MATCHES = ['claire', 'marion'];

/** Vérifications du profil : téléphone + selfie vidéo, sans pièce d'identité. */
export const VERIFICATION = { phoneVerified: true, phoneMasked: '+33 6 •• •• •• 42', selfieVerified: true, verifiedOn: '28 septembre' };

/** Abonnement de l'utilisateur (en production : statut renvoyé par Apple / Google). */
export const SUBSCRIPTION_ACTIVE = true;

export const NEXT_REVEAL = new Date('2026-10-29T20:00:00+01:00');

/** Reveals passés et les cinq profils proposés à chacun (du moins au plus compatible). */
export const PAST_REVEALS = [
  { date: '15 octobre', profileIds: ['emma', 'marion', 'sophie', 'claire', 'lea'] },
  { date: '1er octobre', profileIds: ['lucie', 'chloe', 'mathilde', 'sarah', 'anais'] },
];

/** Profils déjà proposés : ils ne reviennent jamais dans un reveal. */
export const ALREADY_SHOWN = new Set(PAST_REVEALS.flatMap((r) => r.profileIds));

/** Seuil de messages pour proposer le reveal des photos (au moins 5 de chaque côté). */
export const REVEAL_THRESHOLD = { total: 10, eachSide: 5 };

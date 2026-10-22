// DA « Jour et nuit » : l'app est claire au quotidien (crème chaud, encre aubergine),
// le reveal de 20 h garde la palette sombre « Ambre du soir ». Typo : Instrument Serif + Manrope.

import { createContext, useContext } from 'react';

export const day = {
  paper: '#F7EFE6', // fond : crème chaud
  card: '#EFE3D5', // cartes, bulles reçues
  input: '#FCF7F1',
  ink: '#2A1C1F', // texte principal (aubergine), bulles envoyées
  inkSoft: '#4E3A3A',
  muted: '#7D6256', // texte secondaire (contraste AA sur le fond)
  line: '#E6D6C6',
  border: '#D9C4B2',
  accent: '#A9581F', // ambre foncé : texte et pictos (contraste AA sur crème)
  accentFill: '#E8944A', // ambre : boutons et aplats
  onAccent: '#2A1C1F',
  rose: '#9E5A43',
};

export type Palette = typeof day;

/** La nuit du reveal : mêmes noms, valeurs sombres. */
export const night: Palette = {
  paper: '#2A1C1F',
  card: '#3A2729',
  input: '#33232A',
  ink: '#F5E6DA',
  inkSoft: '#E0CBBE',
  muted: '#B79C90',
  line: '#3E2B2E',
  border: '#4E383B',
  accent: '#F2A65A',
  accentFill: '#F2A65A',
  onAccent: '#2A1C1F',
  rose: '#E8B4A6',
};

/** Palette par défaut (jour). Les composants de base lisent plutôt `useColors()` pour suivre <NightTheme>. */
export const colors = day;

export const PaletteContext = createContext<Palette>(day);
export const useColors = () => useContext(PaletteContext);

export const fonts = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'Manrope_400Regular',
  sansMedium: 'Manrope_500Medium',
  sansBold: 'Manrope_600SemiBold',
} as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const radius = { s: 12, m: 16, l: 24, pill: 999 } as const;

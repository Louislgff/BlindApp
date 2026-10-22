// Zones de Paris et de la petite couronne : on ne stocke jamais la position exacte,
// seulement le centre de la zone choisie.

export interface Zone {
  zone: string;
  lat: number;
  lng: number;
}

export const ZONES: Zone[] = [
  ['Paris 1er', 48.862, 2.336], ['Paris 2e', 48.868, 2.342], ['Paris 3e', 48.863, 2.36], ['Paris 4e', 48.854, 2.357],
  ['Paris 5e', 48.844, 2.35], ['Paris 6e', 48.849, 2.333], ['Paris 7e', 48.856, 2.312], ['Paris 8e', 48.873, 2.312],
  ['Paris 9e', 48.877, 2.338], ['Paris 10e', 48.876, 2.361], ['Paris 11e', 48.859, 2.38], ['Paris 12e', 48.835, 2.421],
  ['Paris 13e', 48.828, 2.362], ['Paris 14e', 48.829, 2.323], ['Paris 15e', 48.841, 2.3], ['Paris 16e', 48.86, 2.262],
  ['Paris 17e', 48.887, 2.307], ['Paris 18e', 48.892, 2.348], ['Paris 19e', 48.887, 2.385], ['Paris 20e', 48.864, 2.398],
  ['Montreuil', 48.861, 2.443], ['Boulogne-Billancourt', 48.835, 2.24], ['Vincennes', 48.847, 2.439],
  ['Levallois-Perret', 48.895, 2.287], ['Saint-Denis', 48.936, 2.357], ['Issy-les-Moulineaux', 48.824, 2.27],
].map(([zone, lat, lng]) => ({ zone: zone as string, lat: lat as number, lng: lng as number }));

export const ARRONDISSEMENTS = ZONES.filter((z) => z.zone.startsWith('Paris '));
export const COMMUNES = ZONES.filter((z) => !z.zone.startsWith('Paris '));

/** Distance maximale proposée à l'inscription → kilomètres utilisés par le matching. */
export const DISTANCES: { label: string; km: number }[] = [
  { label: 'Ma zone et voisines', km: 4 },
  { label: 'Tout Paris', km: 10 },
  { label: 'Paris + petite couronne', km: 18 },
  { label: 'Île-de-France', km: 45 },
];

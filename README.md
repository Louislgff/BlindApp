# Blind

Application de rencontre iOS et Android : pas de swipe, cinq profils toutes les deux semaines, photos révélées d'un commun accord.

Version 0.1 : les écrans principaux fonctionnent avec des données de démonstration. L'algorithme de matching est réel et testé ; le backend est prêt à brancher.

## Voir l'app sur ordinateur (navigateur)

```bash
cd blind
npm install
npx expo install --fix
npx expo start --web
```

L'app s'ouvre dans le navigateur. Pour la voir au format téléphone : F12 (ou clic droit › Inspecter), puis l'icône téléphone de la barre d'outils.

## Lancer l'app sur son téléphone

Il faut un ordinateur avec [Node.js](https://nodejs.org) (version LTS) et l'app **Expo Go** sur le téléphone (App Store ou Google Play).

```bash
cd blind
npm install
npx expo install expo@latest && npx expo install --fix   # aligne les versions sur ce qu'Expo Go accepte
npx expo start
```

Un QR code s'affiche : le scanner avec l'appareil photo (iPhone) ou avec Expo Go (Android).

Autres commandes :

```bash
npm test            # tests de l'algorithme de matching
npm run typecheck   # vérification TypeScript
```

## Ce qui est dans le projet

| Dossier | Contenu |
| --- | --- |
| `app/(tabs)/` | Les 3 onglets : Messages, Reveal (accueil, compte à rebours), Profil |
| `app/reveal-day.tsx` | Jour du reveal : ouverture, 5 cartes du moins au plus compatible, récapitulatif |
| `app/match/[id].tsx` | Résumé de match : %, pourquoi vous, en commun, complémentaires, à explorer |
| `app/conversation/[id].tsx` | Messagerie + reveal mutuel et secret après 10 messages (5 de chaque côté) |
| `app/revealed/[id].tsx` | Profil après reveal, avec protection des photos et filigrane |
| `app/debrief/[id].tsx` | Debrief privé après une rencontre |
| `app/onboarding/` | Questionnaire d'inscription (vérification, bases, 6 étapes, critères déterminants) |
| `src/matching/` | Algorithme de matching, résumé de match, tests |
| `src/data/questions.ts` | Toutes les questions du questionnaire |
| `src/data/mock.ts` | Profils et conversations de démonstration |
| `supabase/schema.sql` | Base de données et règles d'accès (testées sur PostgreSQL 16) |

## Règles déjà en place

- **Matching** : filtres éliminatoires dans les deux sens, satisfaction pondérée (0 / 1 / 10 / 50 / 250), moyenne géométrique des deux côtés, correction quand peu de questions en commun, mode points communs / complémentaire / les deux.
- **Reveal** : un profil n'est jamais reproposé ; l'ordre de dévoilement va du moins au plus compatible.
- **Accord de reveal secret** : en base, chacun ne lit que sa propre ligne ; le reveal est créé par le serveur quand les deux ont dit oui et que le seuil de messages est atteint.
- **Photos** : visibles uniquement après un reveal mutuel. Captures bloquées sur Android, détectées sur iPhone (alerte + événement à enregistrer), filigrane au nom de la personne qui regarde.
- **Données sensibles** (politique, religion) : facultatives, jamais affichées en clair ; regroupées en « Des valeurs proches » dans un résumé.
- **Debrief** : jamais visible par l'autre personne.

## Prochaines étapes

1. Brancher Supabase (authentification par SMS, tables, stockage privé des photos) à la place de `src/state/store.tsx`.
2. Fonction serveur qui calcule les reveals toutes les deux semaines (réutilise `src/matching/matching.ts`).
3. Vérification par selfie vidéo (détection du vivant, comparaison avec les photos) via un prestataire. Pas de pièce d'identité.
4. Abonnement 20 €/mois : sur iOS et Android, un abonnement numérique passe par l'achat intégré d'Apple et de Google (commission de 15 à 30 % selon la taille de l'éditeur et l'ancienneté de l'abonnement, à vérifier selon les conditions en vigueur). RevenueCat simplifie l'intégration.
5. Génération de la phrase « Pourquoi vous » et des suggestions de premier message côté serveur.
6. Notifications (jour du reveal, nouveau message, reveal disponible, debrief).

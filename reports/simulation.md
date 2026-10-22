# Simulation des reveals

_Généré automatiquement le 22/10/2026 à 10:45 sur la base Supabase, commit `39cc3ee7d1e3c118482c1b4f7998b95e8d9bafae`._

Profils fictifs : Lucien et les 15 profils du prototype, plus une population de Parisiens générée au hasard (reproductible).
Les pourcentages sont calculés par le vrai algorithme de l’app.

## Reveal du 1er octobre

- Profils actifs et vérifiés : **176**
- Paires proposées ce soir : **347** (chaque paire = 2 profils proposés)
- Scores proposés : min 18 %, médiane 54 %, max 80 %

| Contrôle | Résultat | Détail |
|---|---|---|
| Chacun reçoit 5 profils au plus | ✅ | 5 profils : 58 · 4 profils : 79 · 3 profils : 25 · 2 profils : 4 · 1 profil : 5 · 0 profil : 5 |
| Réciprocité : si A voit B, B voit A le même soir | ✅ |  |
| Aucun profil hors critères (genre, âge, distance, déterminants), dans les deux sens | ✅ |  |
| Aucune paire déjà proposée lors d’un reveal précédent | ✅ | 0 paires déjà vues avant ce reveal |
| Ordre du dévoilement : du moins au plus compatible | ✅ |  |
| Personne ne se voit proposer soi-même | ✅ |  |

**Les profils de Lucien**, dans l’ordre du dévoilement :

1. Sophie, 31 ans, Paris 17e — 53 %
1. Marion, 35 ans, Paris 15e — 67 %
1. Fanny, 37 ans, Levallois-Perret — 67 %
1. Emma, 31 ans, Paris 10e — 68 %
1. Chloé, 33 ans, Paris 14e — 71 %

**Personnes sans profil ce soir (5)** :

- Adrien (homme, 30 ans, Paris 1er) : aucun profil compatible avec ses critères
- Charlie (non-binaire, 32 ans, Paris 7e) : aucun profil compatible avec ses critères
- Antoine (homme, 43 ans, Paris 8e) : aucun profil compatible avec ses critères
- Pauline (femme, 29 ans, Vincennes) : aucun profil compatible avec ses critères
- Quentin (homme, 42 ans, Boulogne-Billancourt) : aucun profil compatible avec ses critères

## Reveal du 15 octobre

- Profils actifs et vérifiés : **176**
- Paires proposées ce soir : **263** (chaque paire = 2 profils proposés)
- Scores proposés : min 18 %, médiane 47 %, max 79 %

| Contrôle | Résultat | Détail |
|---|---|---|
| Chacun reçoit 5 profils au plus | ✅ | 5 profils : 50 · 4 profils : 16 · 3 profils : 62 · 2 profils : 11 · 1 profil : 4 · 0 profil : 33 |
| Réciprocité : si A voit B, B voit A le même soir | ✅ |  |
| Aucun profil hors critères (genre, âge, distance, déterminants), dans les deux sens | ✅ |  |
| Aucune paire déjà proposée lors d’un reveal précédent | ✅ | 347 paires déjà vues avant ce reveal |
| Ordre du dévoilement : du moins au plus compatible | ✅ |  |
| Personne ne se voit proposer soi-même | ✅ |  |

**Les profils de Lucien**, dans l’ordre du dévoilement :

1. Lucie, 29 ans, Paris 9e — 45 %
1. Inès, 30 ans, Paris 15e — 58 %
1. Anaïs, 33 ans, Paris 20e — 58 %
1. Lucie, 30 ans, Paris 5e — 59 %
1. Fanny, 37 ans, Paris 8e — 64 %

**Personnes sans profil ce soir (33)** :

- Adrien (homme, 30 ans, Paris 1er) : aucun profil compatible avec ses critères
- Eden (non-binaire, 41 ans, Paris 8e) : ses 2 profils compatibles lui ont déjà été proposés
- Adrien (homme, 29 ans, Paris 12e) : ses 2 profils compatibles lui ont déjà été proposés
- Anna (femme, 40 ans, Paris 19e) : ses 3 profils compatibles lui ont déjà été proposés
- Jules (homme, 35 ans, Issy-les-Moulineaux) : ses 3 profils compatibles lui ont déjà été proposés
- Aurélie (femme, 32 ans, Paris 14e) : ses 3 profils compatibles lui ont déjà été proposés
- Céline (femme, 31 ans, Paris 9e) : ses 2 profils compatibles lui ont déjà été proposés
- Karim (homme, 45 ans, Paris 12e) : ses 4 profils compatibles lui ont déjà été proposés
- Charlie (non-binaire, 32 ans, Paris 7e) : aucun profil compatible avec ses critères
- Louis (homme, 41 ans, Montreuil) : ses 1 profil compatible lui ont déjà été proposés
- Mathieu (homme, 35 ans, Vincennes) : ses 1 profil compatible lui ont déjà été proposés
- Romain (homme, 29 ans, Paris 15e) : ses 4 profils compatibles lui ont déjà été proposés
- Hélène (femme, 44 ans, Paris 12e) : ses 1 profil compatible lui ont déjà été proposés
- Charlie (non-binaire, 44 ans, Boulogne-Billancourt) : ses 1 profil compatible lui ont déjà été proposés
- Camille (non-binaire, 34 ans, Paris 17e) : ses 3 profils compatibles lui ont déjà été proposés
- … et 18 autres

## Scénario : conversation, accord secret et reveal mutuel

Joué sur la vraie base avec les vraies règles d’accès, entre Lucien et son premier profil du 1er octobre, puis annulé (la base n’est pas modifiée).

- ✅ Lucien lit les 9 messages de sa conversation
- ✅ Accord secret : elle ne voit pas l’accord de Lucien
- ✅ Deux accords mais 9 messages : pas de reveal
- ✅ Avant le reveal, elle ne voit pas les photos de Lucien
- ✅ 10e message avec deux accords : reveal déclenché
- ✅ Après le reveal, elle voit les photos de Lucien
- ✅ Lucien voit aussi ses photos (reveal mutuel)
- ✅ Debrief privé : Lucien ne lit pas le sien
- ✅ Lucien ne lit pas ses réponses au questionnaire
- ✅ Lucien ne lit pas son profil complet (date de naissance, position)
- ✅ Impossible de retirer son accord après le reveal
- ✅ Pas d’accès direct à la liste des profils
- ✅ Impossible de forcer un reveal depuis l’app
- ✅ Un intrus ne lit pas les messages
- ✅ Un intrus ne voit pas le reveal
- ✅ Un intrus ne voit pas les photos
- ✅ Un intrus ne peut pas écrire dans la conversation
- ✅ Un visiteur non connecté ne voit aucun profil ni message


# Format d'un programme

Un programme est un fichier JSON. Le plus simple : dans l'appli, onglet **Profile › Programme › Télécharger (modèle)**. Modifie ce fichier, puis importe-le avec **Importer**. Si le fichier contient une erreur, l'appli la signale et garde l'ancien programme.

## Structure générale

```json
{
  "format": "suivi-muscu-programme",
  "version": 1,
  "name": "Mon programme",
  "start": "2027-01-04",
  "weeks": 12,
  "daily": { "n": "Gainage", "detail": "3 x 30 s · chaque jour" },
  "keyLifts": ["squat", "dc"],
  "rirWeeks": { "1": "3" },
  "mesos": [ ... ],
  "sessions": [ ... ]
}
```

| Champ | Obligatoire | Rôle |
|---|---|---|
| `format` | oui | Toujours `"suivi-muscu-programme"` |
| `name` | oui | Nom affiché dans l'appli |
| `start` | oui | Date de début (AAAA-MM-JJ), de préférence un lundi : les semaines vont du lundi au dimanche. Le profil peut la remplacer. Garde la même date si tu retouches un programme en cours |
| `weeks` | oui | Nombre de semaines (1 à 104) |
| `daily` | non | Tâche quotidienne cochable sur le Dashboard (supprime le champ si inutile) |
| `keyLifts` | non | Identifiants des exercices suivis dans « Objectifs de charge » |
| `rirWeeks` | non | RIR imposé aux polyarticulaires certaines semaines (ex. `"1": "3"` en semaine 1, même écriture que `rirBig`) |

## Mésocycles (`mesos`)

Ils doivent couvrir toutes les semaines, de 1 à `weeks`, sans trou ni chevauchement.

```json
{ "id": "M1", "name": "M1 Fondation", "from": 1, "to": 5, "phase": "Prise de muscle",
  "kcal": "+200 kcal", "bigR": [8, 12], "rirBig": "2", "rirIso": "1" },
{ "id": "A1", "name": "Semaine allégée", "from": 6, "to": 6, "deload": true, "phase": "Récupération" }
```

| Champ | Rôle |
|---|---|
| `from`, `to` | Première et dernière semaine |
| `deload` | `true` = semaine allégée : moitié des séries, RIR 3-4 |
| `bigR` | Fourchette de reps des gros mouvements (exercices `"big": true`) |
| `rirBig` / `rirIso` | RIR des polyarticulaires / de l'isolation (texte : `"2"` ou `"1-2"`). Comparé au RIR noté pour décider de la progression : tout autre texte s'affiche, mais le RIR est alors ignoré |
| `phase`, `kcal` | Textes affichés sur le Dashboard (facultatifs) |

## Séances (`sessions`)

```json
{ "id": "lundi", "dow": 1, "name": "Lundi — Haut du corps", "focus": "Pecs et dos",
  "ex": [
    { "id": "dc", "n": "Développé couché", "s": 3, "r": [8, 12], "rest": 150, "big": true,
      "tempo": "2/0/1/0", "note": "Omoplates serrées", "muscles": { "pecs": 1, "triceps": 0.5 } },
    { "id": "ecarte", "n": "Écarté poulie", "s": 2, "r": [12, 15], "rest": 90, "iso": true,
      "muscles": { "pecs": 1 }, "ranges": [{ "from": 7, "r": [15, 20] }] }
  ] }
```

| Champ | Rôle |
|---|---|
| `id` | Identifiant unique : lettres sans accent, chiffres, tirets (40 caractères maximum) (sert à relier tes séances d'une semaine à l'autre : ne le change plus une fois utilisé) |
| `dow` | Jour de la semaine : 0 dimanche, 1 lundi … 6 samedi (sert à ouvrir la bonne séance le jour J) |
| `n` | Nom de l'exercice |
| `s` | Nombre de séries (1 à 10) |
| `r` | Fourchette de reps `[min, max]` |
| `rest` | Repos en secondes |
| `big` | Gros mouvement : sa fourchette suit `bigR` du mésocycle |
| `iso` | Isolation : RIR `rirIso` (sinon `rirBig`) |
| `cat` | `"postural"` : protocole postural, sans série d'échauffement (W), et son objectif se compare à la séance juste avant au lieu de la même séance la semaine d'avant. Champ facultatif. Sinon : 3 séries W si `big`, 1 si `iso` (0 si le muscle a déjà travaillé dans la séance), 2 pour les autres |
| `noFail` | Jamais à l'échec (RIR 2-3) |
| `bonus` | Nombre de séries retirées si le bilan fatigue compte 2 signaux |
| `inc` | Hausse de charge en kg quand le haut de la fourchette est atteint (par défaut 1 en isolation, 2.5 sinon) |
| `ranges` | Change la fourchette à partir d'une semaine donnée |
| `tempo`, `note` | Affichés sur la page séance |
| `muscles` | Muscles travaillés : 1 = principal, 0.5 = secondaire |

Muscles possibles : `pecs`, `epaules_lat`, `epaules_post`, `dos`, `biceps`, `triceps`, `avantbras`, `abdos`, `quadriceps`, `ischios`, `fessiers`, `mollets`.

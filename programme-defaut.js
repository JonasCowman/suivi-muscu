// Programme par défaut. Sert aussi de modèle : Profile > Télécharger le programme.
const DEFAULT_PROGRAM = {
 "format": "suivi-muscu-programme",
 "version": 1,
 "name": "Programme hypertrophie + sèche — 31 semaines",
 "start": "2026-11-23",
 "weeks": 31,
 "daily": {
  "n": "Oiseau haltères (épaules postérieures)",
  "detail": "2 x 20-50 reps · avant la séance"
 },
 "keyLifts": [
  "decline",
  "chestpress",
  "tractions",
  "hack",
  "legcurlallonge"
 ],
 "rirWeeks": {
  "1": "3",
  "30": "1"
 },
 "mesos": [
  {
   "id": "M1",
   "name": "M1 Fondation",
   "from": 1,
   "to": 6,
   "phase": "Prise de muscle",
   "kcal": "+150 à 250 kcal",
   "bigR": [
    8,
    12
   ],
   "rirBig": "2",
   "rirIso": "1"
  },
  {
   "id": "A1",
   "name": "Semaine allégée",
   "from": 7,
   "to": 7,
   "deload": true,
   "phase": "Récupération",
   "kcal": "+150 à 250 kcal"
  },
  {
   "id": "M2",
   "name": "M2 Transition",
   "from": 8,
   "to": 12,
   "phase": "Prise de muscle",
   "kcal": "+150 à 250 kcal",
   "bigR": [
    8,
    10
   ],
   "rirBig": "1-2",
   "rirIso": "0-1"
  },
  {
   "id": "A2",
   "name": "Semaine allégée",
   "from": 13,
   "to": 13,
   "deload": true,
   "phase": "Début de sèche",
   "kcal": "-300 kcal"
  },
  {
   "id": "M3",
   "name": "M3 Sèche 1",
   "from": 14,
   "to": 18,
   "phase": "Sèche",
   "kcal": "-300 à 400 kcal",
   "bigR": [
    6,
    10
   ],
   "rirBig": "2",
   "rirIso": "1"
  },
  {
   "id": "A3",
   "name": "Semaine allégée",
   "from": 19,
   "to": 19,
   "deload": true,
   "phase": "Pause sèche",
   "kcal": "Maintien"
  },
  {
   "id": "M4",
   "name": "M4 Sèche 2",
   "from": 20,
   "to": 24,
   "phase": "Sèche",
   "kcal": "-300 à 400 kcal",
   "bigR": [
    6,
    10
   ],
   "rirBig": "2",
   "rirIso": "1"
  },
  {
   "id": "A4",
   "name": "Semaine allégée",
   "from": 25,
   "to": 25,
   "deload": true,
   "phase": "Pause sèche",
   "kcal": "Maintien"
  },
  {
   "id": "M5",
   "name": "M5 Finition",
   "from": 26,
   "to": 31,
   "phase": "Fin de sèche puis maintien",
   "kcal": "-300 kcal puis maintien au 1er juin",
   "bigR": [
    6,
    10
   ],
   "rirBig": "1-2",
   "rirIso": "0-1"
  }
 ],
 "sessions": [
  {
   "id": "lundi",
   "dow": 1,
   "name": "Lundi — Pecs / Épaules",
   "focus": "Cage plate et deltoïdes",
   "ex": [
    {
     "id": "oiseau",
     "n": "Oiseau haltères banc incliné",
     "s": 2,
     "r": [
      20,
      50
     ],
     "rest": 60,
     "iso": true,
     "cat": "postural",
     "note": "Avant tout le reste",
     "muscles": {
      "epaules_post": 1
     }
    },
    {
     "id": "pecfly",
     "n": "Pec fly machine",
     "s": 2,
     "r": [
      15,
      20
     ],
     "rest": 90,
     "iso": true,
     "tempo": "2/0/2/1",
     "note": "Droit, cage bien sortie",
     "muscles": {
      "pecs": 1
     },
     "ranges": [
      {
       "from": 26,
       "r": [
        20,
        30
       ]
      }
     ],
     "inc": 2.5
    },
    {
     "id": "decline",
     "n": "Développé décliné convergent",
     "s": 3,
     "r": [
      8,
      12
     ],
     "rest": 150,
     "big": true,
     "tempo": "2/0/1/0",
     "note": "Arrêt 2-3 cm avant la poitrine",
     "muscles": {
      "pecs": 1,
      "triceps": 0.5
     }
    },
    {
     "id": "chestpress",
     "n": "Chest press convergent prise neutre",
     "s": 3,
     "r": [
      10,
      15
     ],
     "rest": 120,
     "tempo": "3/0/1/0",
     "note": "Amplitude réduite",
     "muscles": {
      "pecs": 1,
      "triceps": 0.5
     }
    },
    {
     "id": "ecarte",
     "n": "Écarté décliné haltères",
     "s": 2,
     "r": [
      10,
      15
     ],
     "rest": 90,
     "iso": true,
     "note": "Un pied en avant, amplitude très contrôlée",
     "muscles": {
      "pecs": 1
     },
     "ranges": [
      {
       "from": 14,
       "r": [
        15,
        20
       ]
      }
     ],
     "inc": 2
    },
    {
     "id": "tirageneutre",
     "n": "Tirage vertical prise neutre serrée",
     "s": 4,
     "r": [
      8,
      12
     ],
     "rest": 120,
     "bonus": 1,
     "note": "Coudes le long du corps",
     "muscles": {
      "dos": 1,
      "biceps": 0.5
     }
    },
    {
     "id": "latpoulie",
     "n": "Élévation latérale unilatérale poulie basse",
     "s": 3,
     "r": [
      15,
      20
     ],
     "rest": 60,
     "iso": true,
     "note": "Buste légèrement en arrière",
     "muscles": {
      "epaules_lat": 1
     }
    },
    {
     "id": "triceps",
     "n": "Extension triceps corde poulie haute",
     "s": 3,
     "r": [
      10,
      15
     ],
     "rest": 90,
     "iso": true,
     "bonus": 1,
     "note": "Coudes fixes",
     "muscles": {
      "triceps": 1
     },
     "inc": 2.5
    }
   ]
  },
  {
   "id": "mardi",
   "dow": 2,
   "name": "Mardi — Jambes A",
   "focus": "Ischios puis quadriceps",
   "ex": [
    {
     "id": "oiseau",
     "n": "Oiseau haltères",
     "s": 2,
     "r": [
      20,
      50
     ],
     "rest": 60,
     "iso": true,
     "cat": "postural",
     "note": "Protocole quotidien",
     "muscles": {
      "epaules_post": 1
     }
    },
    {
     "id": "legcurlallonge",
     "n": "Leg curl allongé",
     "s": 3,
     "r": [
      10,
      15
     ],
     "rest": 90,
     "iso": true,
     "note": "Les ischios avant les quadriceps",
     "muscles": {
      "ischios": 1
     },
     "inc": 2.5
    },
    {
     "id": "legext",
     "n": "Leg extension (activation)",
     "s": 2,
     "r": [
      15,
      20
     ],
     "rest": 60,
     "iso": true,
     "noFail": true,
     "note": "RIR 2-3, pas d'échec",
     "muscles": {
      "quadriceps": 1
     },
     "inc": 2.5
    },
    {
     "id": "hack",
     "n": "Hack squat",
     "s": 3,
     "r": [
      8,
      12
     ],
     "rest": 180,
     "big": true,
     "note": "Arrêt avant la parallèle, descente 2-3 s",
     "muscles": {
      "quadriceps": 1,
      "fessiers": 0.5
     }
    },
    {
     "id": "presse",
     "n": "Presse à 45°",
     "s": 3,
     "r": [
      10,
      15
     ],
     "rest": 120,
     "note": "Amplitude contrôlée",
     "muscles": {
      "quadriceps": 1,
      "fessiers": 0.5
     }
    },
    {
     "id": "legcurlassis",
     "n": "Leg curl assis",
     "s": 2,
     "r": [
      12,
      15
     ],
     "rest": 90,
     "iso": true,
     "bonus": 2,
     "muscles": {
      "ischios": 1
     },
     "inc": 2.5
    },
    {
     "id": "mollets",
     "n": "Mollets debout",
     "s": 3,
     "r": [
      12,
      20
     ],
     "rest": 60,
     "iso": true,
     "note": "Pause 1 s étiré en bas",
     "muscles": {
      "mollets": 1
     },
     "inc": 2.5
    },
    {
     "id": "crunch",
     "n": "Crunch à la poulie",
     "s": 2,
     "r": [
      12,
      15
     ],
     "rest": 60,
     "iso": true,
     "muscles": {
      "abdos": 1
     },
     "inc": 2.5
    }
   ]
  },
  {
   "id": "jeudi",
   "dow": 4,
   "name": "Jeudi — Dos / Biceps",
   "focus": "Dorsaux longs + rappel pecs",
   "ex": [
    {
     "id": "oiseau",
     "n": "Oiseau haltères banc incliné",
     "s": 2,
     "r": [
      20,
      50
     ],
     "rest": 60,
     "iso": true,
     "cat": "postural",
     "note": "Obligatoire avant le dos",
     "muscles": {
      "epaules_post": 1
     }
    },
    {
     "id": "pullover",
     "n": "Pull-over à la poulie",
     "s": 2,
     "r": [
      15,
      20
     ],
     "rest": 90,
     "iso": true,
     "note": "Étirement maximal",
     "muscles": {
      "dos": 1
     },
     "inc": 2.5
    },
    {
     "id": "tractions",
     "n": "Tractions / tirage vertical prise large",
     "s": 3,
     "r": [
      8,
      12
     ],
     "rest": 150,
     "note": "Omoplates basses et serrées",
     "muscles": {
      "dos": 1,
      "biceps": 0.5
     }
    },
    {
     "id": "tirage45",
     "n": "Tirage unilatéral 45-60°",
     "s": 4,
     "r": [
      10,
      15
     ],
     "rest": 90,
     "bonus": 1,
     "note": "Coudes bien ouverts",
     "muscles": {
      "dos": 1,
      "epaules_post": 0.5
     }
    },
    {
     "id": "pecfly",
     "n": "Pec fly machine (rappel)",
     "s": 2,
     "r": [
      15,
      20
     ],
     "rest": 90,
     "iso": true,
     "tempo": "2/0/2/1",
     "muscles": {
      "pecs": 1
     },
     "ranges": [
      {
       "from": 26,
       "r": [
        20,
        30
       ]
      }
     ],
     "inc": 2.5
    },
    {
     "id": "declinehalteres",
     "n": "Développé décliné haltères prise neutre",
     "s": 2,
     "r": [
      8,
      12
     ],
     "rest": 150,
     "note": "Arrêt 2-3 cm avant la poitrine",
     "muscles": {
      "pecs": 1,
      "triceps": 0.5
     },
     "inc": 2
    },
    {
     "id": "lathalteres",
     "n": "Élévation latérale haltères",
     "s": 4,
     "r": [
      15,
      20
     ],
     "rest": 60,
     "iso": true,
     "muscles": {
      "epaules_lat": 1
     }
    },
    {
     "id": "marteau",
     "n": "Curl marteau",
     "s": 3,
     "r": [
      10,
      15
     ],
     "rest": 90,
     "iso": true,
     "bonus": 1,
     "muscles": {
      "biceps": 1,
      "avantbras": 0.5
     },
     "inc": 2
    }
   ]
  },
  {
   "id": "vendredi",
   "dow": 5,
   "name": "Vendredi — Jambes B",
   "focus": "Ischios, fessiers + épaules",
   "ex": [
    {
     "id": "oiseau",
     "n": "Oiseau haltères",
     "s": 2,
     "r": [
      20,
      50
     ],
     "rest": 60,
     "iso": true,
     "cat": "postural",
     "muscles": {
      "epaules_post": 1
     }
    },
    {
     "id": "sdjt",
     "n": "Soulevé de terre jambes tendues",
     "s": 3,
     "r": [
      8,
      12
     ],
     "rest": 180,
     "big": true,
     "note": "Dos neutre, barre collée aux jambes",
     "muscles": {
      "ischios": 1,
      "fessiers": 0.5
     }
    },
    {
     "id": "legcurldebout",
     "n": "Leg curl debout unilatéral",
     "s": 3,
     "r": [
      10,
      15
     ],
     "rest": 90,
     "iso": true,
     "muscles": {
      "ischios": 1
     },
     "inc": 2.5
    },
    {
     "id": "hipthrust",
     "n": "Hip thrust",
     "s": 3,
     "r": [
      8,
      12
     ],
     "rest": 120,
     "note": "Pause 1 s en haut",
     "muscles": {
      "fessiers": 1
     }
    },
    {
     "id": "split",
     "n": "Split squat",
     "s": 3,
     "r": [
      8,
      12
     ],
     "rest": 120,
     "note": "Par jambe, buste penché en avant",
     "muscles": {
      "fessiers": 1,
      "quadriceps": 0.5
     }
    },
    {
     "id": "latpoulie",
     "n": "Élévation latérale unilatérale poulie basse",
     "s": 3,
     "r": [
      15,
      20
     ],
     "rest": 60,
     "iso": true,
     "muscles": {
      "epaules_lat": 1
     }
    },
    {
     "id": "curlpoulie",
     "n": "Curl biceps poulie",
     "s": 2,
     "r": [
      12,
      15
     ],
     "rest": 90,
     "iso": true,
     "note": "1re série légère amplitude complète",
     "muscles": {
      "biceps": 1
     },
     "inc": 2.5
    }
   ]
  }
 ]
};
if (typeof module !== 'undefined') module.exports = DEFAULT_PROGRAM;

// Programme et périodisation (source : Programme_muscu_nov2026-juin2027.md)
const START = '2026-11-23';
const TOTAL_WEEKS = 31;

// big = gros mouvement (fourchette selon le méso), iso = isolation, bonus = séries retirées si 2 signaux de fatigue
const SESSIONS = [
  { id: 'lundi', dow: 1, name: 'Lundi — Pecs / Épaules', focus: 'Cage plate et deltoïdes', ex: [
    { id: 'oiseau', n: 'Oiseau haltères banc incliné', s: 2, r: [20, 50], rest: 60, iso: true, note: 'Avant tout le reste' },
    { id: 'pecfly', n: 'Pec fly machine', s: 2, r: [15, 20], rest: 90, iso: true, tempo: '2/0/2/1', note: 'Droit, cage bien sortie' },
    { id: 'decline', n: 'Développé décliné convergent', s: 3, r: [8, 12], rest: 150, big: true, tempo: '2/0/1/0', note: 'Arrêt 2-3 cm avant la poitrine' },
    { id: 'chestpress', n: 'Chest press convergent prise neutre', s: 3, r: [10, 15], rest: 120, tempo: '3/0/1/0', note: 'Amplitude réduite' },
    { id: 'ecarte', n: 'Écarté décliné haltères', s: 2, r: [10, 15], rest: 90, iso: true, note: 'Un pied en avant, amplitude très contrôlée' },
    { id: 'tirageneutre', n: 'Tirage vertical prise neutre serrée', s: 4, r: [8, 12], rest: 120, bonus: 1, note: 'Coudes le long du corps' },
    { id: 'latpoulie', n: 'Élévation latérale unilatérale poulie basse', s: 3, r: [15, 20], rest: 60, iso: true, note: 'Buste légèrement en arrière' },
    { id: 'triceps', n: 'Extension triceps corde poulie haute', s: 3, r: [10, 15], rest: 90, iso: true, bonus: 1, note: 'Coudes fixes' },
  ] },
  { id: 'mardi', dow: 2, name: 'Mardi — Jambes A', focus: 'Ischios puis quadriceps', ex: [
    { id: 'oiseau', n: 'Oiseau haltères', s: 2, r: [20, 50], rest: 60, iso: true, note: 'Protocole quotidien' },
    { id: 'legcurlallonge', n: 'Leg curl allongé', s: 3, r: [10, 15], rest: 90, iso: true, note: 'Les ischios avant les quadriceps' },
    { id: 'legext', n: 'Leg extension (activation)', s: 2, r: [15, 20], rest: 60, iso: true, noFail: true, note: 'RIR 2-3, pas d\'échec' },
    { id: 'hack', n: 'Hack squat', s: 3, r: [8, 12], rest: 180, big: true, note: 'Arrêt avant la parallèle, descente 2-3 s' },
    { id: 'presse', n: 'Presse à 45°', s: 3, r: [10, 15], rest: 120, note: 'Amplitude contrôlée' },
    { id: 'legcurlassis', n: 'Leg curl assis', s: 2, r: [12, 15], rest: 90, iso: true, bonus: 2 },
    { id: 'mollets', n: 'Mollets debout', s: 3, r: [12, 20], rest: 60, iso: true, note: 'Pause 1 s étiré en bas' },
    { id: 'crunch', n: 'Crunch à la poulie', s: 2, r: [12, 15], rest: 60, iso: true },
  ] },
  { id: 'jeudi', dow: 4, name: 'Jeudi — Dos / Biceps', focus: 'Dorsaux longs + rappel pecs', ex: [
    { id: 'oiseau', n: 'Oiseau haltères banc incliné', s: 2, r: [20, 50], rest: 60, iso: true, note: 'Obligatoire avant le dos' },
    { id: 'pullover', n: 'Pull-over à la poulie', s: 2, r: [15, 20], rest: 90, iso: true, note: 'Étirement maximal' },
    { id: 'tractions', n: 'Tractions / tirage vertical prise large', s: 3, r: [8, 12], rest: 150, note: 'Omoplates basses et serrées' },
    { id: 'tirage45', n: 'Tirage unilatéral 45-60°', s: 4, r: [10, 15], rest: 90, bonus: 1, note: 'Coudes bien ouverts' },
    { id: 'pecfly', n: 'Pec fly machine (rappel)', s: 2, r: [15, 20], rest: 90, iso: true, tempo: '2/0/2/1' },
    { id: 'declinehalteres', n: 'Développé décliné haltères prise neutre', s: 2, r: [8, 12], rest: 150, note: 'Arrêt 2-3 cm avant la poitrine' },
    { id: 'lathalteres', n: 'Élévation latérale haltères', s: 4, r: [15, 20], rest: 60, iso: true },
    { id: 'marteau', n: 'Curl marteau', s: 3, r: [10, 15], rest: 90, iso: true, bonus: 1 },
  ] },
  { id: 'vendredi', dow: 5, name: 'Vendredi — Jambes B', focus: 'Ischios, fessiers + épaules', ex: [
    { id: 'oiseau', n: 'Oiseau haltères', s: 2, r: [20, 50], rest: 60, iso: true },
    { id: 'sdjt', n: 'Soulevé de terre jambes tendues', s: 3, r: [8, 12], rest: 180, big: true, note: 'Dos neutre, barre collée aux jambes' },
    { id: 'legcurldebout', n: 'Leg curl debout unilatéral', s: 3, r: [10, 15], rest: 90, iso: true },
    { id: 'hipthrust', n: 'Hip thrust', s: 3, r: [8, 12], rest: 120, note: 'Pause 1 s en haut' },
    { id: 'split', n: 'Split squat', s: 3, r: [8, 12], rest: 120, note: 'Par jambe, buste penché en avant' },
    { id: 'latpoulie', n: 'Élévation latérale unilatérale poulie basse', s: 3, r: [15, 20], rest: 60, iso: true },
    { id: 'curlpoulie', n: 'Curl biceps poulie', s: 2, r: [12, 15], rest: 90, iso: true, note: '1re série légère amplitude complète' },
  ] },
];

const MUSCLES = {
  pecs: 'Pectoraux', epaules_lat: 'Deltoïdes latéraux', epaules_post: 'Deltoïdes postérieurs', dos: 'Dos',
  biceps: 'Biceps', triceps: 'Triceps', avantbras: 'Avant-bras', abdos: 'Abdominaux',
  quadriceps: 'Quadriceps', ischios: 'Ischios', fessiers: 'Fessiers', mollets: 'Mollets',
};

// Muscles par exercice : 1 = muscle principal, 0,5 = muscle secondaire (une série compte pour moitié)
const EX_MUSCLES = {
  oiseau: { epaules_post: 1 }, pecfly: { pecs: 1 }, decline: { pecs: 1, triceps: 0.5 }, chestpress: { pecs: 1, triceps: 0.5 },
  ecarte: { pecs: 1 }, tirageneutre: { dos: 1, biceps: 0.5 }, latpoulie: { epaules_lat: 1 }, lathalteres: { epaules_lat: 1 },
  triceps: { triceps: 1 }, legcurlallonge: { ischios: 1 }, legcurlassis: { ischios: 1 }, legcurldebout: { ischios: 1 },
  legext: { quadriceps: 1 }, hack: { quadriceps: 1, fessiers: 0.5 }, presse: { quadriceps: 1, fessiers: 0.5 },
  mollets: { mollets: 1 }, crunch: { abdos: 1 }, pullover: { dos: 1 }, tractions: { dos: 1, biceps: 0.5 },
  tirage45: { dos: 1, epaules_post: 0.5 }, declinehalteres: { pecs: 1, triceps: 0.5 }, marteau: { biceps: 1, avantbras: 0.5 },
  sdjt: { ischios: 1, fessiers: 0.5 }, hipthrust: { fessiers: 1 }, split: { fessiers: 1, quadriceps: 0.5 }, curlpoulie: { biceps: 1 },
};

// Séries prévues par muscle sur une semaine normale du programme
function plannedWeekly() {
  const out = {};
  for (const s of SESSIONS) for (const e of s.ex) for (const [m, k] of Object.entries(EX_MUSCLES[e.id] || {})) out[m] = (out[m] || 0) + e.s * k;
  return out;
}

const KEY_LIFTS =['decline', 'chestpress', 'tractions', 'hack', 'legcurlallonge'];

const MESOS = [
  { id: 'M1', name: 'M1 Fondation', from: 1, to: 6, phase: 'Prise de muscle', kcal: '+150 à 250 kcal', bigR: [8, 12], rirBig: '2', rirIso: '1' },
  { id: 'A1', name: 'Semaine allégée', from: 7, to: 7, deload: true, phase: 'Récupération', kcal: '+150 à 250 kcal' },
  { id: 'M2', name: 'M2 Transition', from: 8, to: 12, phase: 'Prise de muscle', kcal: '+150 à 250 kcal', bigR: [8, 10], rirBig: '1-2', rirIso: '0-1' },
  { id: 'A2', name: 'Semaine allégée', from: 13, to: 13, deload: true, phase: 'Début de sèche', kcal: '-300 kcal' },
  { id: 'M3', name: 'M3 Sèche 1', from: 14, to: 18, phase: 'Sèche', kcal: '-300 à 400 kcal', bigR: [6, 10], rirBig: '2', rirIso: '1' },
  { id: 'A3', name: 'Semaine allégée', from: 19, to: 19, deload: true, phase: 'Pause sèche', kcal: 'Maintien' },
  { id: 'M4', name: 'M4 Sèche 2', from: 20, to: 24, phase: 'Sèche', kcal: '-300 à 400 kcal', bigR: [6, 10], rirBig: '2', rirIso: '1' },
  { id: 'A4', name: 'Semaine allégée', from: 25, to: 25, deload: true, phase: 'Pause sèche', kcal: 'Maintien' },
  { id: 'M5', name: 'M5 Finition', from: 26, to: 31, phase: 'Fin de sèche puis maintien', kcal: '-300 kcal puis maintien au 1er juin', bigR: [6, 10], rirBig: '1-2', rirIso: '0-1' },
];

function dayDiff(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }

// shift = semaines de décalage (fêtes, semaine allégée anticipée)
function weekOf(dateStr, shift = 0) {
  const w = Math.floor(dayDiff(START, dateStr) / 7) + 1 - shift;
  return Math.max(1, Math.min(TOTAL_WEEKS, w));
}

function mesoOf(week) { return MESOS.find(m => week >= m.from && week <= m.to); }

function nextDeload(week) { const m = MESOS.find(m => m.deload && m.from > week); return m ? m.from : null; }

function rirFor(week, ex) {
  const m = mesoOf(week);
  if (m.deload) return '3-4';
  if (ex.noFail) return '2-3';
  if (ex.big || !ex.iso) return week === 1 ? '3' : week === 30 ? '1' : m.rirBig;
  return m.rirIso;
}

function rangeFor(week, ex) {
  const m = mesoOf(week);
  if (ex.big) return (m.bigR || mesoOf(week - 1).bigR);
  if (ex.id === 'ecarte' && week >= 14) return [15, 20];
  if (ex.id === 'pecfly' && week >= 26) return [20, 30];
  return ex.r;
}

// fatigue = nb de signaux de la semaine précédente
function setsFor(week, ex, fatigue = 0) {
  const m = mesoOf(week);
  if (m.deload || fatigue >= 3) return Math.ceil(ex.s / 2);
  if (fatigue === 2 && ex.bonus) return ex.s - ex.bonus;
  return ex.s;
}

function fatigueAdvice(count) {
  if (count >= 3) return { level: 'high', text: 'Semaine allégée anticipée : moitié des séries, mêmes charges, RIR 3-4. Décale le calendrier d\'une semaine.' };
  if (count === 2) return { level: 'mid', text: 'Retire les séries bonus et passe toutes tes séries à RIR 2.' };
  return { level: 'ok', text: 'Rien à changer, tu continues.' };
}

function countSignals(f) {
  return ['perf', 'motiv', 'sleep', 'courb', 'poids'].filter(k => f[k]).length + ((f.pain || 0) > 3 ? 1 : 0);
}

// Règle +1 rep : sets = [{kg, reps}] de la dernière séance de cet exercice
function progressionHint(lastSets, range) {
  const done = (lastSets || []).filter(s => s.kg > 0 && s.reps > 0);
  if (!done.length) return { kg: null, text: 'Première fois : bas de fourchette, note ta charge.' };
  const kg = Math.max(...done.map(s => s.kg));
  if (done.every(s => s.reps >= range[1])) return { kg: kg + 2.5, text: `Haut de fourchette atteint : ${kg + 2.5} kg, repars à ${range[0]} reps.` };
  return { kg, text: `Même charge (${kg} kg), +1 rep sur une série.` };
}

function e1rm(kg, reps) { return kg * (1 + reps / 30); }

function navyBodyFat(waist, neck, height) {
  if (!(waist > neck) || !height) return null;
  return 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
}

if (typeof module !== 'undefined') module.exports = { START, TOTAL_WEEKS, SESSIONS, KEY_LIFTS, MUSCLES, EX_MUSCLES, plannedWeekly, MESOS, weekOf, mesoOf, nextDeload, rirFor, rangeFor, setsFor, fatigueAdvice, countSignals, progressionHint, e1rm, navyBodyFat };

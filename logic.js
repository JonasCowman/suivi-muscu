// Logique du programme. Le programme actif (par défaut ou importé) est chargé avec setProgram().
const MUSCLES = {
  pecs: 'Pectoraux', epaules_lat: 'Deltoïdes latéraux', epaules_post: 'Deltoïdes postérieurs', dos: 'Dos',
  biceps: 'Biceps', triceps: 'Triceps', avantbras: 'Avant-bras', abdos: 'Abdominaux',
  quadriceps: 'Quadriceps', ischios: 'Ischios', fessiers: 'Fessiers', mollets: 'Mollets',
};

let P = null; // programme actif ; P.start = date de début effective (profil ou programme)

function setProgram(prog, startOverride) { P = Object.assign({}, prog, { start: startOverride || prog.start }); return P; }

// Vérifie un programme importé. Renvoie la liste des erreurs (vide si valide).
function validateProgram(p) {
  const err = [];
  const isInt = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  const isRange = r => Array.isArray(r) && r.length === 2 && isInt(r[0], 1, 100) && isInt(r[1], r[0], 100);
  if (!p || typeof p !== 'object') return ['Le fichier ne contient pas de programme.'];
  if (p.format !== 'suivi-muscu-programme') err.push('Champ "format" : doit valoir "suivi-muscu-programme".');
  if (typeof p.name !== 'string' || !p.name.trim()) err.push('Champ "name" : nom du programme manquant.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.start || '') || isNaN(Date.parse(p.start))) err.push('Champ "start" : date de début au format AAAA-MM-JJ.');
  if (!isInt(p.weeks, 1, 104)) err.push('Champ "weeks" : nombre de semaines entre 1 et 104.');
  const exIds = new Set();
  if (!Array.isArray(p.sessions) || !p.sessions.length) err.push('Champ "sessions" : au moins une séance.');
  else {
    const sIds = new Set();
    p.sessions.forEach((s, i) => {
      const where = `Séance ${i + 1}${s && s.name ? ` (${s.name})` : ''}`;
      if (!s || typeof s.id !== 'string' || !s.id) return err.push(`${where} : "id" manquant.`);
      if (sIds.has(s.id)) err.push(`${where} : "id" en double (${s.id}).`);
      sIds.add(s.id);
      if (typeof s.name !== 'string' || !s.name) err.push(`${where} : "name" manquant.`);
      if (s.dow !== undefined && !isInt(s.dow, 0, 6)) err.push(`${where} : "dow" = jour de 0 (dimanche) à 6 (samedi).`);
      if (!Array.isArray(s.ex) || !s.ex.length) return err.push(`${where} : aucun exercice.`);
      s.ex.forEach((e, j) => {
        const w = `${where}, exercice ${j + 1}${e && e.n ? ` (${e.n})` : ''}`;
        if (!e || typeof e.id !== 'string' || !e.id) return err.push(`${w} : "id" manquant.`);
        exIds.add(e.id);
        if (typeof e.n !== 'string' || !e.n) err.push(`${w} : nom "n" manquant.`);
        if (!isInt(e.s, 1, 10)) err.push(`${w} : "s" = nombre de séries entre 1 et 10.`);
        if (!isRange(e.r)) err.push(`${w} : "r" = fourchette de reps [min, max].`);
        if (!isInt(e.rest, 10, 600)) err.push(`${w} : "rest" = repos en secondes (10 à 600).`);
        if (e.bonus !== undefined && !isInt(e.bonus, 1, (e.s || 1))) err.push(`${w} : "bonus" doit être inférieur ou égal à "s".`);
        if (!e.muscles || typeof e.muscles !== 'object' || !Object.keys(e.muscles).length) err.push(`${w} : "muscles" manquant.`);
        else for (const [m, k] of Object.entries(e.muscles)) {
          if (!MUSCLES[m]) err.push(`${w} : muscle inconnu "${m}" (possibles : ${Object.keys(MUSCLES).join(', ')}).`);
          if (!(typeof k === 'number' && k > 0 && k <= 1)) err.push(`${w} : coefficient du muscle "${m}" entre 0 et 1.`);
        }
        (e.ranges || []).forEach(x => { if (!x || !isInt(x.from, 1, 104) || !isRange(x.r)) err.push(`${w} : "ranges" = [{ "from": semaine, "r": [min, max] }].`); });
      });
    });
  }
  if (!Array.isArray(p.mesos) || !p.mesos.length) err.push('Champ "mesos" : au moins un mésocycle.');
  else if (isInt(p.weeks, 1, 104)) {
    const sorted = [...p.mesos].sort((a, b) => a.from - b.from);
    let next = 1;
    for (const m of sorted) {
      const w = `Mésocycle "${m.name || m.id || '?'}"`;
      if (!isInt(m.from, 1, 104) || !isInt(m.to, m.from, 104)) { err.push(`${w} : "from" et "to" = semaines de début et de fin.`); continue; }
      if (m.from !== next) err.push(`${w} : commence en semaine ${m.from}, attendu ${next} (pas de trou ni de chevauchement).`);
      next = m.to + 1;
      if (typeof m.name !== 'string' || !m.name) err.push(`${w} : "name" manquant.`);
      if (!m.deload && (!isRange(m.bigR) || typeof m.rirBig !== 'string' || typeof m.rirIso !== 'string')) err.push(`${w} : "bigR", "rirBig" et "rirIso" obligatoires (sauf semaine allégée).`);
    }
    if (next !== p.weeks + 1) err.push(`Les mésocycles doivent couvrir les semaines 1 à ${p.weeks}.`);
    if (sorted.length && sorted[0].deload) err.push('Le premier mésocycle ne peut pas être une semaine allégée.');
  }
  if (p.daily !== undefined && (!p.daily || typeof p.daily.n !== 'string' || !p.daily.n)) err.push('Champ "daily" : { "n": "nom", "detail": "précision" } ou supprime le champ.');
  if (p.keyLifts !== undefined && !Array.isArray(p.keyLifts)) err.push('Champ "keyLifts" : liste d\'identifiants d\'exercices.');
  for (const id of Array.isArray(p.keyLifts) ? p.keyLifts : []) if (!exIds.has(id)) err.push(`"keyLifts" : exercice "${id}" introuvable dans les séances.`);
  return err;
}

function exMuscles(id) { for (const s of P.sessions) for (const e of s.ex) if (e.id === id) return e.muscles || {}; return {}; }

// Séries prévues par muscle sur une semaine normale du programme
function plannedWeekly() {
  const out = {};
  for (const s of P.sessions) for (const e of s.ex) for (const [m, k] of Object.entries(e.muscles || {})) out[m] = (out[m] || 0) + e.s * k;
  return out;
}

function dayDiff(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }

// shift = semaines de décalage (fêtes, semaine allégée anticipée)
function weekOf(dateStr, shift = 0) {
  const w = Math.floor(dayDiff(P.start, dateStr) / 7) + 1 - shift;
  return Math.max(1, Math.min(P.weeks, w));
}

function mesoOf(week) { return P.mesos.find(m => week >= m.from && week <= m.to); }

function nextDeload(week) { const m = P.mesos.filter(m => m.deload && m.from > week).sort((a, b) => a.from - b.from)[0]; return m ? m.from : null; }

// Dernier mésocycle non allégé (pour les fourchettes d'une semaine allégée)
function workMeso(week) { for (let w = week; w >= 1; w--) { const m = mesoOf(w); if (!m.deload) return m; } return mesoOf(week); }

function rirFor(week, ex) {
  const m = mesoOf(week);
  if (m.deload) return '3-4';
  if (ex.noFail) return '2-3';
  if (ex.big || !ex.iso) return (P.rirWeeks || {})[week] || m.rirBig;
  return m.rirIso;
}

function rangeFor(week, ex) {
  if (ex.big) return workMeso(week).bigR;
  const o = (ex.ranges || []).filter(x => week >= x.from).sort((a, b) => b.from - a.from)[0];
  return o ? o.r : ex.r;
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

// Méthode US Navy. Femme : la formule utilise aussi le tour de hanches.
function navyBodyFat(sex, waist, neck, height, hips) {
  if (!height || !(waist > 0) || !(neck > 0)) return null;
  if (sex === 'f') {
    if (!(waist + hips - neck > 0) || !hips) return null;
    return 495 / (1.29579 - 0.35004 * Math.log10(waist + hips - neck) + 0.221 * Math.log10(height)) - 450;
  }
  if (!(waist > neck)) return null;
  return 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
}

if (typeof module !== 'undefined') module.exports = { MUSCLES, setProgram, validateProgram, exMuscles, plannedWeekly, weekOf, mesoOf, nextDeload, rirFor, rangeFor, setsFor, fatigueAdvice, countSignals, progressionHint, e1rm, navyBodyFat, getProgram: () => P };

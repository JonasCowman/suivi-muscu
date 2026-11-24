// Logique du programme. Le programme actif (par défaut ou importé) est chargé avec setProgram().
const MUSCLES = {
  pecs: 'Pectoraux', epaules_lat: 'Deltoïdes latéraux', epaules_post: 'Deltoïdes postérieurs', dos: 'Dos',
  biceps: 'Biceps', triceps: 'Triceps', avantbras: 'Avant-bras', abdos: 'Abdominaux',
  quadriceps: 'Quadriceps', ischios: 'Ischios', fessiers: 'Fessiers', mollets: 'Mollets',
};

let P = null; // programme actif ; P.start = date de début effective (profil ou programme)

function setProgram(prog, startOverride) { P = Object.assign({}, prog, { start: startOverride || prog.start }); return P; }

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const isInt = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
const isRange = r => Array.isArray(r) && r.length === 2 && isInt(r[0], 1, 100) && isInt(r[1], r[0], 100);
const isText = v => typeof v === 'string' && !!v.trim();
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
// Lettres, chiffres, tirets : les identifiants servent de clés et d'attributs HTML
const isId = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) && !(v in {});

// Vérifie un programme importé. Renvoie la liste des erreurs (vide si valide). Ne plante jamais, quel que soit le fichier.
function validateProgram(p) {
  const err = [];
  if (!isObj(p)) return ['Le fichier ne contient pas de programme.'];
  const optText = (o, keys, w) => keys.forEach(k => { if (o[k] !== undefined && typeof o[k] !== 'string') err.push(`${w} : "${k}" doit être un texte.`); });
  if (p.format !== 'suivi-muscu-programme') err.push('Champ "format" : doit valoir "suivi-muscu-programme".');
  if (!isText(p.name)) err.push('Champ "name" : nom du programme manquant.');
  if (!isDate(p.start)) err.push('Champ "start" : date de début au format AAAA-MM-JJ.');
  if (!isInt(p.weeks, 1, 104)) err.push('Champ "weeks" : nombre de semaines entre 1 et 104.');
  const exIds = new Set();
  if (!Array.isArray(p.sessions) || !p.sessions.length) err.push('Champ "sessions" : au moins une séance.');
  else {
    const sIds = new Set();
    p.sessions.forEach((s, i) => {
      if (!isObj(s)) return err.push(`Séance ${i + 1} : contenu invalide.`);
      const where = `Séance ${i + 1}${isText(s.name) ? ` (${s.name})` : ''}`;
      if (!isId(s.id)) err.push(`${where} : "id" manquant ou invalide (lettres sans accent, chiffres, tirets).`);
      if (sIds.has(s.id)) err.push(`${where} : "id" en double (${s.id}).`);
      sIds.add(s.id);
      if (!isText(s.name)) err.push(`${where} : "name" manquant.`);
      optText(s, ['focus'], where);
      if (s.dow !== undefined && !isInt(s.dow, 0, 6)) err.push(`${where} : "dow" = jour de 0 (dimanche) à 6 (samedi).`);
      if (!Array.isArray(s.ex) || !s.ex.length) return err.push(`${where} : aucun exercice.`);
      const inSession = new Set();
      s.ex.forEach((e, j) => {
        if (!isObj(e)) return err.push(`${where}, exercice ${j + 1} : contenu invalide.`);
        const w = `${where}, exercice ${j + 1}${isText(e.n) ? ` (${e.n})` : ''}`;
        if (!isId(e.id)) err.push(`${w} : "id" manquant ou invalide (lettres sans accent, chiffres, tirets).`);
        if (inSession.has(e.id)) err.push(`${w} : "id" en double dans la séance (${e.id}).`);
        inSession.add(e.id);
        exIds.add(e.id);
        if (!isText(e.n)) err.push(`${w} : nom "n" manquant.`);
        optText(e, ['tempo', 'note'], w);
        if (!isInt(e.s, 1, 10)) err.push(`${w} : "s" = nombre de séries entre 1 et 10.`);
        if (!isRange(e.r)) err.push(`${w} : "r" = fourchette de reps [min, max].`);
        if (!isInt(e.rest, 10, 600)) err.push(`${w} : "rest" = repos en secondes (10 à 600).`);
        if (e.bonus !== undefined && !isInt(e.bonus, 1, (e.s || 1))) err.push(`${w} : "bonus" doit être inférieur ou égal à "s".`);
        if (e.cat !== undefined && e.cat !== 'postural') err.push(`${w} : "cat" = "postural" ou supprime le champ.`);
        if (e.inc !== undefined && !(typeof e.inc === 'number' && e.inc > 0 && e.inc <= 20)) err.push(`${w} : "inc" = hausse de charge en kg (plus de 0, 20 maximum).`);
        if (!isObj(e.muscles) || !Object.keys(e.muscles).length) err.push(`${w} : "muscles" manquant.`);
        else for (const [m, k] of Object.entries(e.muscles)) {
          if (!Object.hasOwn(MUSCLES, m)) err.push(`${w} : muscle inconnu "${m}" (possibles : ${Object.keys(MUSCLES).join(', ')}).`);
          if (!(typeof k === 'number' && k > 0 && k <= 1)) err.push(`${w} : coefficient du muscle "${m}" entre 0 et 1.`);
        }
        if (e.ranges !== undefined && !(Array.isArray(e.ranges) && e.ranges.every(x => isObj(x) && isInt(x.from, 1, 104) && isRange(x.r)))) err.push(`${w} : "ranges" = [{ "from": semaine, "r": [min, max] }].`);
      });
    });
  }
  if (!Array.isArray(p.mesos) || !p.mesos.length) err.push('Champ "mesos" : au moins un mésocycle.');
  else if (!p.mesos.every(m => isObj(m) && isInt(m.from, 1, 104) && isInt(m.to, m.from, 104))) err.push(`Mésocycle ${p.mesos.findIndex(m => !(isObj(m) && isInt(m.from, 1, 104) && isInt(m.to, m.from, 104))) + 1} : "from" et "to" = semaines de début et de fin.`);
  else {
    const sorted = [...p.mesos].sort((a, b) => a.from - b.from);
    let next = 1;
    for (const m of sorted) {
      const w = `Mésocycle "${isText(m.name) ? m.name : 'S' + m.from}"`;
      if (m.from !== next) err.push(`${w} : commence en semaine ${m.from}, attendu ${next} (pas de trou ni de chevauchement).`);
      next = m.to + 1;
      if (!isText(m.name)) err.push(`${w} : "name" manquant.`);
      optText(m, ['phase', 'kcal'], w);
      if (!m.deload && (!isRange(m.bigR) || !isText(m.rirBig) || !isText(m.rirIso))) err.push(`${w} : "bigR", "rirBig" et "rirIso" obligatoires (sauf semaine allégée).`);
    }
    if (isInt(p.weeks, 1, 104) && next !== p.weeks + 1) err.push(`Les mésocycles doivent couvrir les semaines 1 à ${p.weeks}.`);
    if (sorted[0].deload) err.push('Le premier mésocycle ne peut pas être une semaine allégée.');
  }
  if (p.rirWeeks !== undefined && !(isObj(p.rirWeeks) && Object.values(p.rirWeeks).every(isText))) err.push('Champ "rirWeeks" : { "semaine": "RIR" }, RIR entre guillemets.');
  if (p.daily !== undefined && !(isObj(p.daily) && isText(p.daily.n) && (p.daily.detail === undefined || typeof p.daily.detail === 'string'))) err.push('Champ "daily" : { "n": "nom", "detail": "précision" } ou supprime le champ.');
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

function addDays(d, n) { return new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10); }

// Lundi de la semaine : clé des séances et des bilans, indépendante du programme et du décalage
function mondayOf(d) { return addDays(d, -((new Date(Date.parse(d)).getUTCDay() + 6) % 7)); }

// Rang de la semaine réelle depuis le début du programme (1 = première, 0 ou moins = avant)
function weekIndex(d) { return dayDiff(mondayOf(P.start), mondayOf(d)) / 7 + 1; }

// Semaine du programme. shifts = lundis à partir desquels le programme a été décalé d'une semaine.
function weekOf(d, shifts = []) {
  const from = mondayOf(P.start), m = mondayOf(d);
  return Math.max(1, Math.min(P.weeks, weekIndex(d) - shifts.filter(s => s >= from && s <= m).length));
}

function mesoOf(week) { return P.mesos.find(m => week >= m.from && week <= m.to); }

function nextDeload(week) { const m = P.mesos.filter(m => m.deload && m.from > week).sort((a, b) => a.from - b.from)[0]; return m ? m.from : null; }

// Dernier mésocycle non allégé (pour les fourchettes d'une semaine allégée)
function workMeso(week) { for (let w = week; w >= 1; w--) { const m = mesoOf(w); if (!m.deload) return m; } return mesoOf(week); }

// Semaine allégée, prévue ou anticipée. fatigue = nb de signaux de la semaine précédente
function isLight(week, fatigue = 0) { return !!mesoOf(week).deload || fatigue >= 3; }

function rirFor(week, ex, fatigue = 0) {
  const m = mesoOf(week);
  if (isLight(week, fatigue)) return '3-4';
  if (ex.noFail) return '2-3';
  const rir = ex.big || !ex.iso ? (P.rirWeeks || {})[week] || m.rirBig : m.rirIso;
  return fatigue === 2 && !(parseFloat(rir) >= 2) ? '2' : rir;
}

function rangeFor(week, ex) {
  if (ex.big) return workMeso(week).bigR;
  const o = (ex.ranges || []).filter(x => week >= x.from).sort((a, b) => b.from - a.from)[0];
  return o ? o.r : ex.r;
}

function setsFor(week, ex, fatigue = 0) {
  if (isLight(week, fatigue)) return Math.ceil(ex.s / 2);
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

// Hausse de charge : champ "inc" de l'exercice, sinon 1 kg en isolation et 2,5 kg ailleurs
function incFor(ex) { return ex.inc || (ex.iso ? 1 : 2.5); }

// Objectif de reps par série (règle de l'utilisateur) : meilleur total à cette charge +1, réparti également, le reste sur les dernières séries.
// Le meilleur total, et non le dernier : un objectif raté reste le même. past = séances, de la plus ancienne à la plus récente.
function repTarget(past, max) {
  const n = past[past.length - 1].length, kg = past[past.length - 1][0].kg;
  let best = 0;
  for (const sets of past.filter(p => p.length === n).reverse()) {
    if (!sets.every(s => s.kg === kg)) break;
    best = Math.max(best, sets.reduce((t, s) => t + s.reps, 0));
  }
  const total = Math.min(best + 1, n * max);
  return Array.from({ length: n }, (_, i) => Math.floor(total / n) + (i >= n - total % n ? 1 : 0));
}

const doneSets = arr => (arr || []).filter(s => s && s.done);

// Séances passées de l'exercice, hors semaines allégées, de la plus ancienne à la plus récente : même séance de préférence.
// Protocole postural (fait à chaque séance) : toutes les séances commencées avant celle-ci, la veille comprise.
function pastTimes(logs, e, sid, curKey, today) {
  const all = e.cat === 'postural', now = (logs[curKey + '|' + sid] || {}).start || today, out = [];
  for (const [k, log] of Object.entries(logs)) {
    const [key, s] = k.split('|'), sets = doneSets(log.ex[e.id]);
    if (log.light || !sets.length || key > curKey || k === curKey + '|' + sid) continue;
    const rank = P.sessions.findIndex(x => x.id === s);
    if (all ? key === curKey && !(log.start < now) : key === curKey) continue;
    out.push({ key, same: s === sid, rank, start: log.start || 0, sets });
  }
  out.sort((a, b) => a.key.localeCompare(b.key) || (a.start && b.start ? a.start - b.start : a.rank - b.rank));
  return !all && out.some(t => t.same) ? out.filter(t => t.same) : out;
}

// Conseil du jour. sets = dernière séance (hors semaine allégée), need = séries prévues ce jour-là, n = séries prévues aujourd'hui,
// past = séances comparables jusqu'à sets compris, light = semaine allégée en cours. target = objectif par série, ou null
function progressionHint(sets, { range, need, inc, light, past, n }) {
  const done = (sets || []).filter(s => s && s.kg >= 0 && s.reps > 0);
  if (!done.length) return { kg: null, target: null, text: 'Première fois : bas de fourchette, note ta charge.' };
  const fr = n => String(Math.round(n * 100) / 100).replace('.', ',');
  const kg = Math.max(...done.map(s => s.kg)), load = kg ? `${fr(kg)} kg` : 'poids du corps';
  if (light) return { kg, target: null, text: `Semaine allégée : même charge (${load}), sans forcer.` };
  if (done.length >= need && done.every(s => s.kg === kg && s.reps >= range[1])) {
    const up = kg + inc;
    return { kg: up, target: null, text: `Haut de fourchette atteint : ${fr(up)} kg${kg ? '' : ' de lest'} (ou le cran suivant), repars à ${range[0]} reps.` };
  }
  if (past && done.length >= need && done.length === n && done.every(s => s.kg === kg)) {
    const target = repTarget(past.map(p => p.filter(s => s && s.kg >= 0 && s.reps > 0)), range[1]);
    return { kg, target, text: `Objectif ${target.join('-')} ${kg ? 'à ' + load : 'au poids du corps'}.` };
  }
  return { kg, target: null, text: `Même charge (${load}), +1 rep sur une série.` };
}

// Repos après une série W, selon le pourcentage de la charge de travail (barème fourni par l'utilisateur)
function warmRest(pct, heavy) { return pct <= 0.55 ? 45 : pct <= 0.75 ? 60 : heavy ? 120 : 90; }

// Séries d'échauffement W (PRD) de l'exercice idx. list = exercices de la séance, dans l'ordre
const WARM_HEAVY = [['10', 0.4], ['6', 0.65], ['3', 0.85]], WARM_SECOND = [['10', 0.5], ['5', 0.75]], WARM_ISO = [['10-12', 0.5]];
function warmupFor(list, idx) {
  const e = list[idx];
  if (e.cat === 'postural') return [];
  let sets = e.big ? WARM_HEAVY : WARM_SECOND;
  if (e.iso && !e.big) {
    // Muscle chaud : déjà travaillé plus tôt dans la séance, en principal ou en secondaire
    const top = Math.max(...Object.values(e.muscles)), hot = m => list.slice(0, idx).some(x => m in x.muscles);
    sets = Object.keys(e.muscles).filter(m => e.muscles[m] === top).every(hot) ? [] : WARM_ISO;
  }
  return sets.map(([reps, pct]) => ({ reps, pct, rest: warmRest(pct, !!e.big) }));
}

// Charge d'une série W, au plus proche palier. null : charge inconnue, poids du corps ou arrondi à 0
function warmKg(kg, pct, inc) {
  if (!(kg > 0)) return null;
  return Math.round((Math.round(+(kg * pct / inc).toFixed(6)) * inc) * 100) / 100 || null;
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

const MESURES = ['poids', 'poitrine', 'taille', 'hanches', 'cuisse', 'bras', 'cou'];

// RIR réel d'une série (champ "rir", facultatif) : 0 à 5, 5 = « 5 ou plus »
const isRir = v => isInt(v, 0, 5);
// Garde la série, sans son RIR s'il n'est pas valide
function cleanSet(s) { if (!isObj(s)) return {}; const { rir, ...rest } = s; return isRir(rir) ? s : rest; }

// Zones du check-in articulaire (PRD). Niveaux : 0 rien, 1 gêne, 2 douleur ; zone sans réponse : absente
const JOINTS = { shoulders: 'Épaules', elbows: 'Coudes', knees: 'Genoux', lower_back: 'Lombaires', nerve: 'Asymétrie / blocage nerveux' };
const cleanZones = v => Object.keys(JOINTS).filter(z => Array.isArray(v) && v.includes(z));
function cleanJoints(v) {
  const out = {};
  for (const z of Object.keys(JOINTS)) if (isObj(v) && isInt(v[z], 0, 2)) out[z] = v[z];
  return out;
}

// Séries W cochées d'une séance : { exercice: [true, false…] }
function cleanWarm(w) {
  const out = {};
  for (const [id, a] of Object.entries(isObj(w) ? w : {})) if (isId(id) && Array.isArray(a)) out[id] = Array.from(a.slice(0, 3), v => v === true);
  return out;
}

// Met des données enregistrées (ou une sauvegarde) au format actuel sans perdre de séance. null si ce n'est pas une sauvegarde.
// v1 : séances rangées par numéro de semaine ("3|lundi"), mélangées après un décalage. v2 : par lundi ("2026-12-07|lundi").
function migrate(d, defaultProgram, today) {
  if (!isObj(d) || !isObj(d.logs)) return null;
  const program = d.program && !validateProgram(d.program).length ? d.program : null;
  const height = Number(d.height) > 0 ? Number(d.height) : 183;
  let profile = null;
  if (isObj(d.profile)) {
    profile = { prenom: String(d.profile.prenom || ''), sexe: d.profile.sexe === 'f' ? 'f' : 'h', taille: Number(d.profile.taille) || height, start: isDate(d.profile.start) ? d.profile.start : null, zones: cleanZones(d.profile.zones) };
  } else if (d.height || Object.keys(d.logs).length) profile = { prenom: '', sexe: 'h', taille: height, start: null, zones: [] };
  const start = () => mondayOf((profile && profile.start) || (program || defaultProgram).start);
  const weekKey = n => addDays(start(), 7 * (n - 1));
  let shifts = Array.isArray(d.shifts) ? d.shifts.filter(isDate) : [];
  if (d.v !== 2 && Number.isInteger(d.shift) && d.shift) {
    if (d.shift > 0) shifts = Array(Math.min(d.shift, 104)).fill(mondayOf(today || start()));
    else if (profile) profile.start = addDays(start(), 7 * d.shift);
  }
  const logs = {};
  for (const [k, log] of Object.entries(d.logs)) {
    const [w, sid] = k.split('|');
    if (!isObj(log) || !isId(sid)) continue;
    const ex = {};
    for (const [id, sets] of Object.entries(isObj(log.ex) ? log.ex : {})) if (Array.isArray(sets) && isId(id)) ex[id] = Array.from(sets, cleanSet);
    let key = isDate(w) ? mondayOf(w) : null;
    if (!key) {
      if (!(Number(w) > 0) || (!Object.keys(ex).length && !log.done)) continue;
      key = mondayOf(log.start > 0 ? new Date(log.start).toLocaleDateString('sv-SE') : isDate(log.date) ? log.date : weekKey(+w));
      while (logs[key + '|' + sid]) key = addDays(key, -7);
    }
    logs[key + '|' + sid] = { ...log, ex, ...('warm' in log && { warm: cleanWarm(log.warm) }), ...('joints' in log && { joints: cleanJoints(log.joints) }) };
  }
  const fatigue = {};
  for (const [k, f] of Object.entries(isObj(d.fatigue) ? d.fatigue : {})) {
    if (!isObj(f)) continue;
    const key = isDate(k) ? mondayOf(k) : isDate(f.date) ? mondayOf(f.date) : /^S\d{1,3}$/.test(k) ? weekKey(+k.slice(1)) : null;
    if (key) fatigue[key] = { ...f, count: Number(f.count) || 0, pain: Number(f.pain) || 0 };
  }
  const mesures = (Array.isArray(d.mesures) ? d.mesures : []).filter(m => isObj(m) && isDate(m.date)).map(m => {
    const out = { date: m.date };
    for (const k of MESURES) if (typeof m[k] === 'number' && m[k] > 0) out[k] = m[k];
    return out;
  }).filter(m => Object.keys(m).length > 1);
  return { v: 2, logs, daily: isObj(d.daily) ? d.daily : {}, fatigue, mesures, shifts, profile, program };
}

if (typeof module !== 'undefined') module.exports = { MUSCLES, JOINTS, cleanZones, MESURES, setProgram, validateProgram, migrate, exMuscles, plannedWeekly, addDays, mondayOf, weekIndex, weekOf, mesoOf, nextDeload, isLight, rirFor, rangeFor, setsFor, incFor, fatigueAdvice, countSignals, progressionHint, doneSets, pastTimes, e1rm, warmRest, warmupFor, warmKg, isRir, navyBodyFat, getProgram: () => P };

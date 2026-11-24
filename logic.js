// Logique du programme. Le programme actif (par défaut ou importé) est chargé avec setProgram().
const MUSCLES = {
  pecs: 'Pectoraux', epaules_avant: 'Deltoïdes antérieurs', epaules_lat: 'Deltoïdes latéraux', epaules_post: 'Deltoïdes postérieurs', dos: 'Dos', trapezes: 'Trapèzes', lombaires: 'Lombaires',
  biceps: 'Biceps', triceps: 'Triceps', avantbras: 'Avant-bras', abdos: 'Abdominaux',
  quadriceps: 'Quadriceps', ischios: 'Ischios', adducteurs: 'Adducteurs', fessiers: 'Fessiers', mollets: 'Mollets',
};

// Tags universels des exercices, pour relier les zones suivies aux exercices
const JOINTS = { epaules: 'Épaules', coudes: 'Coudes', poignets: 'Poignets', lombaires: 'Lombaires', hanches: 'Hanches', genoux: 'Genoux', chevilles: 'Chevilles' };
const PATTERNS = { poussee: 'Poussée', tirage: 'Tirage', quads: 'Quadriceps', ischios: 'Ischios' };
const TAGS = Object.fromEntries([...Object.entries(JOINTS).map(([k, l]) => ['joint:' + k, l]), ...Object.entries(PATTERNS).map(([k, l]) => ['pattern:' + k, l])]);
const exTags = e => [...(e.joints || []).map(k => 'joint:' + k), ...(e.patterns || []).map(k => 'pattern:' + k)];

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
        for (const [k, list] of [['joints', JOINTS], ['patterns', PATTERNS]]) if (e[k] !== undefined && !(Array.isArray(e[k]) && e[k].every(x => Object.hasOwn(list, x)))) err.push(`${w} : "${k}" = liste parmi ${Object.keys(list).join(', ')}.`);
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
  if (p.rirLight !== undefined && !isText(p.rirLight)) err.push('Champ "rirLight" : RIR des semaines allégées, entre guillemets.');
  if (p.rirWeeks !== undefined && !(isObj(p.rirWeeks) && Object.values(p.rirWeeks).every(isText))) err.push('Champ "rirWeeks" : { "semaine": "RIR" }, RIR entre guillemets.');
  if (p.daily !== undefined && !(isObj(p.daily) && isText(p.daily.n) && (p.daily.detail === undefined || typeof p.daily.detail === 'string'))) err.push('Champ "daily" : { "n": "nom", "detail": "précision" } ou supprime le champ.');
  if (p.keyLifts !== undefined && !Array.isArray(p.keyLifts)) err.push('Champ "keyLifts" : liste d\'identifiants d\'exercices.');
  for (const id of Array.isArray(p.keyLifts) ? p.keyLifts : []) if (!exIds.has(id)) err.push(`"keyLifts" : exercice "${id}" introuvable dans les séances.`);
  return err;
}

// Programme actif, sinon exercice gardé d'un ancien programme
function exMuscles(id, oldEx = {}) { for (const s of P.sessions) for (const e of s.ex) if (e.id === id) return e.muscles || {}; return (oldEx[id] || {}).muscles || {}; }

// Exercices de « from » déjà faits et absents de « active » : { id: { n, muscles } }, pour garder leur courbe et leurs séries
function oldExFrom(logs, from, active) {
  const ids = new Set(active.sessions.flatMap(s => s.ex.map(e => e.id))), out = {};
  const done = new Set(Object.values(logs).flatMap(l => Object.keys(l.ex).filter(id => doneSets(l.ex[id]).length)));
  for (const s of from.sessions) for (const e of s.ex) if (done.has(e.id) && !ids.has(e.id)) out[e.id] = { n: e.n, muscles: e.muscles };
  return out;
}

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
function rawWeek(d, shifts) { const from = mondayOf(P.start), m = mondayOf(d); return weekIndex(d) - shifts.filter(s => s >= from && s <= m).length; }
function weekOf(d, shifts = []) { return Math.max(1, Math.min(P.weeks, rawWeek(d, shifts))); }

// 'last' : dernière semaine du programme, 'over' : terminé, sinon null
function cycleState(d, shifts = []) { const w = rawWeek(d, shifts); return w > P.weeks ? 'over' : w === P.weeks ? 'last' : null; }

// Zone du dessin : muscles possibles par priorité. Le premier visé par le programme, sinon le dernier (null = zone neutre)
function zoneMuscle(list, plan) { return list.find(m => plan[m]) ?? list[list.length - 1]; }

// Semaines comptées par une période de la carte : la saison part du début du programme, les mois de la première séance si elle est plus ancienne
function periodWeeks(period, logs, cur) {
  const season = Math.max(1, weekIndex(cur));
  if (period === 'all') return season;
  const first = Object.entries(logs).filter(([, l]) => Object.values(l.ex).some(a => doneSets(a).length)).map(([k]) => k.split('|')[0]).sort()[0] || cur;
  return Math.min(period, Math.max(season, dayDiff(first, cur) / 7 + 1));
}

function mesoOf(week) { return P.mesos.find(m => week >= m.from && week <= m.to); }

function nextDeload(week) { const m = P.mesos.filter(m => m.deload && m.from > week).sort((a, b) => a.from - b.from)[0]; return m ? m.from : null; }

// Dernier mésocycle non allégé (pour les fourchettes d'une semaine allégée)
function workMeso(week) { for (let w = week; w >= 1; w--) { const m = mesoOf(w); if (!m.deload) return m; } return mesoOf(week); }

// Semaine allégée, prévue ou anticipée. fatigue = nb de signaux de la semaine précédente
function isLight(week, fatigue = 0) { return !!mesoOf(week).deload || fatigue >= 3; }

function rirFor(week, ex, fatigue = 0) {
  const m = mesoOf(week);
  if (isLight(week, fatigue)) return P.rirLight || '3-4';
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
  if (count >= 3) return { level: 'high', text: `Semaine allégée anticipée : moitié des séries, mêmes charges, RIR ${P.rirLight || '3-4'}. Décale le calendrier d'une semaine.` };
  if (count === 2) return { level: 'mid', text: 'Retire les séries bonus et passe toutes tes séries à RIR 2.' };
  return { level: 'ok', text: 'Rien à changer, tu continues.' };
}

function countSignals(f) {
  return ['perf', 'motiv', 'sleep', 'courb', 'poids'].filter(k => f[k]).length + ((f.pain || 0) > 3 ? 1 : 0);
}

// Hausse de charge : champ "inc" de l'exercice, sinon 1 kg en isolation et 2,5 kg ailleurs
function incFor(ex) { return ex.inc || (ex.iso ? 1 : 2.5); }

// Objectif de reps par série (règle de l'utilisateur) : total fait à cette charge +1, réparti également, le reste sur les dernières séries.
// Objectif raté ou consolidation : le même. past = séances, de la plus ancienne à la plus récente ; efforts = effortOf() de chacune.
function repTarget(past, max, efforts = []) {
  const n = past[past.length - 1].length, kg = past[past.length - 1][0].kg;
  let goal = null;
  past.forEach((sets, i) => {
    if (sets.length !== n) return;
    if (!sets.every(s => s.kg === kg)) { goal = null; return; }
    const sum = sets.reduce((t, s) => t + s.reps, 0);
    if (goal === null) goal = efforts[i] === 'hold' ? sum : sum + 1;
    else if (efforts[i] !== 'hold' && sum >= goal) goal = sum + 1;
  });
  const total = Math.min(goal, n * max);
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
    out.push({ k, key, same: s === sid, rank, start: log.start || 0, sets });
  }
  out.sort((a, b) => a.key.localeCompare(b.key) || (a.start && b.start ? a.start - b.start : a.rank - b.rank));
  const list = !all && out.some(t => t.same) ? out.filter(t => t.same) : out;
  // Une séance avec une série arrêtée (stop) ne fait ni avancer ni reculer l'objectif
  const full = list.filter(t => !t.sets.some(s => s.stop));
  return full.length ? full : list;
}

// Effort d'une séance, séries de travail seulement (méthode de l'utilisateur) : écarts RIR noté - RIR visé, 0 dans la fourchette visée.
// 'up' : hausse permise, 'soft' : +1 rep seulement, 'hold' : consolidation, null : aucun RIR noté ou RIR visé illisible
function effortOf(sets, target) {
  const m = /^\s*(\d)(?:\s*-\s*(\d))?\s*$/.exec(target);
  if (!m) return null;
  const lo = +m[1], hi = +(m[2] || m[1]);
  const d = sets.filter(s => !s.stop && isRir(s.rir)).map(s => (s.rir < lo ? s.rir - lo : Math.max(0, s.rir - hi)));
  if (!d.length) return null;
  const sum = d.reduce((a, b) => a + b, 0);
  if (2 * sum < -d.length || Math.min(...d) <= -2) return 'hold'; // moyenne sous -0,5, ou une série à -2
  return sum >= 0 ? 'up' : 'soft';
}

// ---------- Mode protection (règles de l'utilisateur) ----------
// État d'une zone, déduit des séances : 'ok', 'watch' (orange isolé) ou 'protect'. a = réponse, linked = exercice lié fait, clean = vert valable
function zoneStep(st, { a, light, linked, clean }) {
  if (a === 2) return 'protect'; // le rouge compte même en semaine allégée
  if (light) return st;
  if (a === 1) return st === 'ok' ? 'watch' : 'protect';
  if (st === 'protect') return a === 0 && clean ? 'ok' : st;
  return st === 'watch' && linked ? 'ok' : st;
}

// Alerte sur l'exercice e, pour la séance en cours. before[k] = alerte au début de chaque séance passée. need(clé, exercice) = séries prévues
function guard(logs, zones, e, sid, curKey, today, need) {
  const tags = exTags(e), mine = zones.filter(z => z.tags.some(t => tags.includes(t)));
  const when = log => log.start || Date.parse(log.date) || 0, now = (logs[curKey + '|' + sid] || {}).start || today;
  const list = Object.entries(logs).map(([k, log]) => ({ k, log, key: k.split('|')[0], s: k.split('|')[1], t: when(log) }))
    .filter(x => (x.key === curKey ? x.s !== sid && x.t && x.t < now : x.key < curKey)).sort((a, b) => a.key.localeCompare(b.key) || a.t - b.t);
  const level = { ok: 0, watch: 1, protect: 2 }, worst = (a, b) => (level[b] > level[a] ? b : a);
  const before = Object.fromEntries(list.map(x => [x.k, 'ok']));
  let state = 'ok';
  const ends = mine.map(z => {
    let st = 'ok';
    for (const { k, key, s, log } of list) {
      before[k] = worst(before[k], st);
      const ses = P.sessions.find(x => x.id === s), hit = x => exTags(x).some(t => z.tags.includes(t));
      const ex = (ses ? ses.ex : P.sessions.flatMap(x => x.ex)).filter(hit), sets = x => doneSets(log.ex[x.id]);
      const linked = !!log.done && ex.some(x => sets(x).length);
      const clean = linked && ex.every(x => (ses ? sets(x).length >= need(key, x) : true) && !sets(x).some(y => y.stop));
      st = zoneStep(st, { a: (log.checkin || {})[z.id], light: log.light, linked, clean });
    }
    state = worst(state, st);
    return st;
  });
  return { state, labels: state === 'ok' ? [] : mine.filter((z, i) => ends[i] === state).map(z => z.label), before, order: list.map(x => x.k) };
}

// Retire les séances faites en protection et bloque la progression sous alerte, puis une séance à la sortie.
// past = pastTimes(), efforts = effortOf() de chacune
function applyGuard(past, efforts, g) {
  const keep = past.map((t, i) => ({ t, effort: efforts[i] })).filter(x => g.before[x.t.k] !== 'protect');
  // Aucune séance d'avant protection : on garde l'historique tel quel, sans baisse
  const list = keep.length ? keep : past.map((t, i) => ({ t, effort: efforts[i] }));
  const wasProtected = (from, to) => g.order.slice(g.order.indexOf(from) + 1, to ? g.order.indexOf(to) + 1 : undefined).some(k => g.before[k] === 'protect');
  const last = list[list.length - 1], exit = !!last && g.state !== 'protect' && keep.length > 0 && wasProtected(last.t.k);
  // Une séance freinée reprend l'objectif de la précédente : celle-ci ne doit donc pas avoir fait avancer l'objectif
  const out = list.map((x, i) => {
    const next = list[i + 1];
    const held = next ? g.before[next.t.k] !== 'ok' || wasProtected(x.t.k, next.t.k) : g.state !== 'ok' || exit;
    return held ? 'hold' : x.effort;
  });
  return { past: list.map(x => x.t), efforts: out, guard: { state: g.state, exit, cut: keep.length > 0 } };
}

// Charge en protection : -10 % au palier le plus proche (2,5 kg ou 1 kg), au moins un palier de moins, jamais 0
function protectKg(kg, inc) {
  const p = inc >= 2.5 ? 2.5 : 1;
  let v = Math.round(+(kg * 0.9 / p).toFixed(6)) * p;
  if (v >= kg) v = kg - p;
  return v > 0 ? v : kg;
}

// Conseil du jour. sets = dernière séance (hors semaine allégée), need = séries prévues ce jour-là, n = séries prévues aujourd'hui,
// past = séances comparables jusqu'à sets compris, efforts = effortOf() de chacune, light = semaine allégée en cours,
// guard = alerte de applyGuard(). target = objectif par série, ou null
function progressionHint(sets, { range, need, inc, light, past, n, efforts = [], guard = { state: 'ok' } }) {
  const done = (sets || []).filter(s => s && s.kg >= 0 && s.reps > 0);
  if (!done.length) return { kg: null, target: null, text: 'Première fois : bas de fourchette, note ta charge.' };
  const fr = n => String(Math.round(n * 100) / 100).replace('.', ',');
  const kg = Math.max(...done.map(s => s.kg)), use = guard.state === 'protect' && guard.cut ? protectKg(kg, inc) : kg;
  const load = kg ? `${fr(use)} kg` : 'poids du corps', verb = use < kg ? 'Charge réduite' : 'Même charge';
  if (light) return { kg: use, cut: use < kg, target: null, text: `Semaine allégée : ${verb.toLowerCase()} (${load}), sans forcer.` };
  if (done.some(s => s.stop)) return { kg: use, cut: use < kg, target: null, text: `${verb} (${load}), mêmes reps.` };
  const effort = efforts[efforts.length - 1], hard = effort === 'hold' || effort === 'soft';
  const top = done.length >= need && done.every(s => s.kg === kg && s.reps >= range[1]);
  if (top && !hard) {
    const up = kg + inc;
    return { kg: up, target: null, text: `Haut de fourchette atteint : ${fr(up)} kg${kg ? '' : ' de lest'} (ou le cran suivant), repars à ${range[0]} reps.` };
  }
  if (past && done.length >= need && done.length === n && done.every(s => s.kg === kg)) {
    const target = top ? Array(n).fill(range[1]) : repTarget(past.map(p => p.filter(s => s && s.kg >= 0 && s.reps > 0)), range[1], efforts);
    const goal = `bjectif ${target.join('-')} ${kg ? 'à ' + load : 'au poids du corps'}`;
    if (guard.state !== 'ok' || guard.exit) return { kg: use, cut: use < kg, target, text: `${guard.exit && guard.state === 'ok' ? 'Sortie de protection : o' : 'O'}${goal}, ${guard.state === 'watch' ? 'charge maintenue' : 'sans hausse'}.` };
    if (effort === 'hold') return { kg, target, text: `Consolidation : o${goal}, effort au-dessus de la cible.` };
    return { kg, target, text: top ? `O${goal} : charge maintenue, effort un peu au-dessus de la cible.` : `O${goal}.` };
  }
  if (guard.state !== 'ok' || guard.exit) return { kg: use, cut: use < kg, target: null, text: `${verb} (${load}), mêmes reps.` };
  if (top || effort === 'hold') return { kg, target: null, text: `Même charge (${load}), mêmes reps : effort au-dessus de la cible.` };
  return { kg, target: null, text: `Même charge (${load}), +1 rep sur une série.` };
}

// ---------- Générateur de programme ----------
// lib = LIBRARY de catalogue.js. Règles validées par l'utilisateur (séances Upper/Lower, remplacements, ajout de séries).
const mainMuscle = e => Object.keys(e.muscles).find(m => e.muscles[m] === 1);
const isPoly = e => e.category === 'lourd' || e.category === 'second';

// Remplaçant de l'exercice id : used = déjà pris dans la séance, twin = exercices de la séance jumelle. null : aucun
function pickEx(id, byId, allowed, used, twin) {
  if (allowed(id) && !used.has(id)) return id;
  const e = byId[id], m = mainMuscle(e);
  const cand = [...new Set([...e.swapIds, ...Object.keys(byId)])].filter(x => x !== id && !used.has(x) && allowed(x));
  const same = cand.filter(x => mainMuscle(byId[x]) === m), kind = same.filter(x => isPoly(byId[x]) === isPoly(e));
  const fresh = kind.find(x => !twin.has(x));
  if (fresh) return fresh;
  // Il ne reste qu'un doublon : un exercice relié du même type qui travaille le muscle, sinon le doublon
  if (kind.length) return cand.find(x => !twin.has(x) && isPoly(byId[x]) === isPoly(e) && byId[x].muscles[m] >= 0.5 && (e.swapIds.includes(x) || byId[x].swapIds.includes(id))) || kind[0];
  if (same.length) return same.find(x => !twin.has(x)) || same[0];
  // Dernier recours : un exercice relié qui travaille le muscle à 0,5, sans doublon, du même type d'abord
  const link = cand.filter(x => !twin.has(x) && byId[x].muscles[m] >= 0.5 && (e.swapIds.includes(x) || byId[x].swapIds.includes(id)));
  return link.find(x => isPoly(byId[x]) === isPoly(e)) || link[0] || null;
}

function volumeOf(sessions, byId) {
  const v = {};
  for (const s of sessions) for (const x of s.ex) if (x.id) for (const [m, k] of Object.entries(byId[x.id].muscles)) v[m] = (v[m] || 0) + x.s * k;
  return v;
}

// Exercice du catalogue au format d'un programme. Fourchettes par bloc de 6 semaines, sauf fourchette fixe (reps)
function toProgramEx(e, s, blocks) {
  const key = isPoly(e) ? 'poly' : 'iso', out = { id: e.id, n: e.n, s, r: e.reps || blocks[0][key], rest: e.rest, inc: e.inc, muscles: e.muscles, joints: e.joints, patterns: e.patterns, note: e.cue };
  if (e.category === 'lourd') out.big = true;
  if (!isPoly(e)) out.iso = true;
  if (e.category === 'postural') out.cat = 'postural';
  if (e.noFail) out.noFail = true;
  if (e.tempo) out.tempo = e.tempo;
  if (!e.reps && !out.big) out.ranges = blocks.slice(1).map((b, i) => ({ from: 6 * (i + 1) + 1, r: b[key] }));
  return JSON.parse(JSON.stringify(out));
}

// Renvoie { program, low } : low = muscles sous leur base [{ m, v, base }]. program null si aucune séance n'est possible
function generateProgram({ equipment, refused = [], start }, lib) {
  const byId = Object.fromEntries(lib.CATALOGUE.map(e => [e.id, e]));
  const allowed = id => byId[id].equipment.some(a => a.every(q => equipment.includes(q))) && !refused.includes(id) && !(byId[id].fromWeek > 1);
  const built = [];
  for (const s of lib.UPPER_LOWER.sessions) {
    const prev = built.find(b => b.pair === s.pair), other = lib.UPPER_LOWER.sessions.find(o => o.pair === s.pair && o.id !== s.id);
    const twin = new Set(prev ? prev.ex.map(x => x.id) : other.ex.map(([id]) => id).filter(allowed)), used = new Set();
    const ex = s.ex.map(([id, n], i) => {
      const later = s.ex.slice(i + 1).map(([x]) => x).filter(allowed), got = pickEx(id, byId, allowed, new Set([...used, ...later]), twin);
      used.add(got);
      return { id: got, from: id, s: n };
    });
    built.push({ ...s, ex });
  }
  // Muscle sous sa base : +1 série sur un exercice qui le vise en premier (4 par exercice, 22 par séance)
  for (const [m, base] of Object.entries(lib.VOLUME_BASE)) while ((volumeOf(built, byId)[m] || 0) < base) {
    const list = built.filter(s => s.ex.reduce((t, x) => t + x.s, 0) < 22).flatMap(s => s.ex).filter(x => x.id && mainMuscle(byId[x.id]) === m && x.s < 4);
    if (!list.length) break;
    list.reduce((a, x) => x.s < a.s ? x : a).s++;
  }
  const vol = volumeOf(built, byId), low = Object.entries(lib.VOLUME_BASE).map(([m, base]) => ({ m, v: vol[m] || 0, base })).filter(x => x.v < x.base);
  const sessions = built.map(({ id, dow, name, focus, ex }) => ({ id, dow, name, focus, ex: ex.filter(x => x.id).map(x => toProgramEx(byId[x.id], x.s, lib.BLOCKS)) })).filter(s => s.ex.length);
  if (!sessions.length) return { program: null, low };
  const keyLifts = [...new Set(lib.UPPER_LOWER.keyLifts.map(k => built.flatMap(s => s.ex).find(x => x.from === k).id).filter(Boolean))];
  const mesos = lib.BLOCKS.flatMap((b, i) => [
    { id: 'B' + (i + 1), name: `Bloc ${i + 1} ${b.name}`, from: 6 * i + 1, to: 6 * i + 5, phase: 'Prise de muscle', bigR: [...b.poly], rirBig: b.rirPoly, rirIso: b.rirIso },
    { id: 'A' + (i + 1), name: 'Semaine allégée', from: 6 * i + 6, to: 6 * i + 6, deload: true, phase: 'Récupération' }]);
  return { program: { format: 'suivi-muscu-programme', version: 1, generated: true, name: lib.UPPER_LOWER.name, start, weeks: 6 * lib.BLOCKS.length, rirLight: '3', keyLifts, mesos, sessions }, low };
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

// RIR réel d'une série (champ "rir", facultatif) : 0 à 5, 5 = « 5 ou plus ». stop: true = série arrêtée exprès (douleur, crampe), sans RIR
const isRir = v => isInt(v, 0, 5);
// Garde la série, sans son RIR ou son arrêt s'ils ne sont pas valides
function cleanSet(s) {
  if (!isObj(s)) return {};
  const { rir, stop, ...rest } = s;
  return stop === true ? { ...rest, stop } : isRir(rir) ? { ...rest, rir } : rest;
}

// Zones suivies du profil : { id, label, tags }, tags parmi TAGS
function cleanZones(v) {
  const out = [];
  for (const z of Array.isArray(v) ? v : []) {
    if (!isObj(z) || !isId(z.id) || !isText(z.label) || !Array.isArray(z.tags) || out.some(o => o.id === z.id)) continue;
    const tags = Object.keys(TAGS).filter(t => z.tags.includes(t));
    if (tags.length) out.push({ id: z.id, label: z.label.trim().slice(0, 30), tags });
  }
  return out;
}

// Liste d'identifiants (matériel, exercices refusés)
const cleanIds = v => [...new Set(v.filter(isId))];

// Exercices sortis du programme : { id: { n, muscles } }
function cleanOldEx(v) {
  const out = {};
  for (const [id, e] of Object.entries(isObj(v) ? v : {})) if (isId(id) && isObj(e) && isText(e.n)) out[id] = { n: e.n, muscles: Object.fromEntries(Object.entries(isObj(e.muscles) ? e.muscles : {}).filter(([m, k]) => Object.hasOwn(MUSCLES, m) && typeof k === 'number' && k > 0 && k <= 1)) };
  return out;
}

// Check-in d'une séance : { zone: 0 rien, 1 gêne, 2 douleur } ; zone sans réponse : absente
function cleanCheckin(v) {
  const out = {};
  for (const [id, n] of Object.entries(isObj(v) ? v : {})) if (isId(id) && isInt(n, 0, 2)) out[id] = n;
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
  let program = d.program && !validateProgram(d.program).length ? d.program : null;
  const height = Number(d.height) > 0 ? Number(d.height) : 183;
  let profile = null;
  if (isObj(d.profile)) {
    profile = { prenom: String(d.profile.prenom || ''), sexe: d.profile.sexe === 'f' ? 'f' : 'h', taille: Number(d.profile.taille) || height, start: isDate(d.profile.start) ? d.profile.start : null, trackedZones: cleanZones(d.profile.trackedZones) };
    for (const k of ['equipment', 'refused']) if (Array.isArray(d.profile[k])) profile[k] = cleanIds(d.profile[k]);
  } else if (d.height || Object.keys(d.logs).length) profile = { prenom: '', sexe: 'h', taille: height, start: null, trackedZones: [] };
  // Profil sans programme enregistré : copie figée, pour qu'un futur programme par défaut ne remplace jamais le sien
  if (profile && !d.program) program = JSON.parse(JSON.stringify(defaultProgram));
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
    logs[key + '|' + sid] = { ...log, ex, ...('warm' in log && { warm: cleanWarm(log.warm) }), ...('checkin' in log && { checkin: cleanCheckin(log.checkin) }) };
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
  const oldEx = { ...oldExFrom(logs, defaultProgram, program || defaultProgram), ...cleanOldEx(d.oldEx) };
  // Programme remplacé, avec la date de début qui était choisie dans le profil
  const prev = isObj(d.prev) && !validateProgram(d.prev.program).length ? { program: d.prev.program, start: isDate(d.prev.start) ? d.prev.start : null } : null;
  // Programme en attente de sa date de début
  const next = profile && d.next && !validateProgram(d.next).length ? d.next : null;
  return { v: 2, logs, daily: isObj(d.daily) ? d.daily : {}, fatigue, mesures, shifts, profile, program, oldEx, prev, next };
}

if (typeof module !== 'undefined') module.exports = { MUSCLES, TAGS, exTags, cleanZones, MESURES, setProgram, validateProgram, migrate, exMuscles, oldExFrom, zoneMuscle, periodWeeks, plannedWeekly, addDays, mondayOf, weekIndex, weekOf, cycleState, mesoOf, nextDeload, isLight, rirFor, rangeFor, setsFor, incFor, fatigueAdvice, countSignals, progressionHint, doneSets, pastTimes, effortOf, guard, applyGuard, protectKg, e1rm, generateProgram, warmRest, warmupFor, warmKg, isRir, navyBodyFat, getProgram: () => P };

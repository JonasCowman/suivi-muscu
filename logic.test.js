// node app/logic.test.js
const assert = require('assert');
const L = require('./logic.js');
const DEF = require('./programme-defaut.js');
const clone = o => JSON.parse(JSON.stringify(o));

assert.deepStrictEqual(L.validateProgram(DEF), [], 'le programme par défaut doit être valide');
L.setProgram(DEF);
const ex = id => L.getProgram().sessions.flatMap(s => s.ex).find(e => e.id === id);

assert.strictEqual(L.weekOf('2026-11-23'), 1);
assert.strictEqual(L.weekOf('2026-11-29'), 1);
assert.strictEqual(L.weekOf('2026-11-30'), 2);
assert.strictEqual(L.weekOf('2027-01-04'), 7);
// Décalage : seule la semaine décalée et les suivantes bougent, jamais les semaines passées
assert.strictEqual(L.weekOf('2026-12-14', ['2026-12-14']), 3);
assert.strictEqual(L.weekOf('2026-12-07', ['2026-12-14']), 3);
assert.strictEqual(L.weekOf('2026-12-21', ['2026-12-14']), 4);
assert.strictEqual(L.weekOf('2026-12-14', ['2026-10-05']), 4, 'décalage antérieur au programme ignoré');
assert.strictEqual(L.mondayOf('2026-11-29'), '2026-11-23');
assert.strictEqual(L.mondayOf('2026-11-30'), '2026-11-30');
assert.strictEqual(L.weekOf('2027-06-21'), 31);
assert.strictEqual(L.weekOf('2027-09-01'), 31);

assert.strictEqual(L.mesoOf(7).deload, true);
assert.strictEqual(L.mesoOf(14).id, 'M3');
assert.strictEqual(L.nextDeload(3), 7);
assert.strictEqual(L.nextDeload(26), null);

assert.deepStrictEqual(L.rangeFor(3, ex('decline')), [8, 12]);
assert.deepStrictEqual(L.rangeFor(9, ex('decline')), [8, 10]);
assert.deepStrictEqual(L.rangeFor(15, ex('hack')), [6, 10]);
assert.deepStrictEqual(L.rangeFor(7, ex('decline')), [8, 12]);
assert.deepStrictEqual(L.rangeFor(13, ex('decline')), [8, 10]);
assert.deepStrictEqual(L.rangeFor(13, ex('ecarte')), [10, 15]);
assert.deepStrictEqual(L.rangeFor(14, ex('ecarte')), [15, 20]);
assert.deepStrictEqual(L.rangeFor(26, ex('pecfly')), [20, 30]);

assert.strictEqual(L.setsFor(3, ex('decline')), 3);
assert.strictEqual(L.setsFor(7, ex('decline')), 2);
assert.strictEqual(L.setsFor(3, ex('triceps'), 2), 2);
assert.strictEqual(L.setsFor(3, ex('legcurlassis'), 2), 0);
assert.strictEqual(L.setsFor(3, ex('decline'), 3), 2);

assert.strictEqual(L.rirFor(1, ex('decline')), '3');
assert.strictEqual(L.rirFor(30, ex('decline')), '1');
assert.strictEqual(L.rirFor(2, ex('decline')), '2');
assert.strictEqual(L.rirFor(7, ex('pecfly')), '3-4');
assert.strictEqual(L.rirFor(3, ex('legext')), '2-3');

assert.strictEqual(L.countSignals({ perf: true, motiv: true, pain: 5 }), 3);
assert.strictEqual(L.fatigueAdvice(2).level, 'mid');
assert.strictEqual(L.fatigueAdvice(1).level, 'ok');

// Fatigue : le RIR suit le bilan
assert.strictEqual(L.rirFor(9, ex('decline'), 2), '2');
assert.strictEqual(L.rirFor(9, ex('pecfly'), 2), '2');
assert.strictEqual(L.rirFor(1, ex('decline'), 2), '3', 'ne rend jamais la semaine plus dure');
assert.strictEqual(L.rirFor(3, ex('decline'), 3), '3-4');
assert.strictEqual(L.isLight(3, 3), true);
assert.strictEqual(L.isLight(7, 0), true);
assert.strictEqual(L.isLight(3, 2), false);

const S = (...a) => a.map(([kg, reps]) => ({ kg, reps, done: true }));
const H = (sets, o) => L.progressionHint(sets, Object.assign({ range: [8, 12], need: 3, inc: 2.5 }, o));
assert.strictEqual(H([]).kg, null);
assert.strictEqual(H(S([60, 12], [60, 12], [60, 12])).kg, 62.5);
assert.strictEqual(H(S([60, 12], [60, 10], [60, 10])).kg, 60);
assert.strictEqual(H(S([60, 12])).kg, 60, '1 série sur 3 ne suffit pas');
assert.strictEqual(H(S([60, 12], [40, 12], [40, 12])).kg, 60, 'charges mixtes : pas de hausse');
assert.strictEqual(H(S([5, 20], [5, 20], [5, 20]), { range: [15, 20], inc: 1 }).kg, 6);
assert.strictEqual(H(S([0, 10], [0, 9], [0, 8])).kg, 0, 'poids du corps reconnu');
assert.strictEqual(H(S([60, 12], [60, 12], [60, 12]), { light: true }).kg, 60, 'pas de hausse en semaine allégée');
assert.strictEqual(L.incFor(ex('lathalteres')), 1);
assert.strictEqual(L.incFor(ex('decline')), 2.5);
assert.strictEqual(L.incFor({ iso: true }), 1);
assert.deepStrictEqual(['hack', 'presse', 'sdjt', 'hipthrust', 'split'].map(id => L.incFor(ex(id))), [5, 5, 5, 5, 2.5]);

// Objectif chiffré : total de la dernière fois +1, réparti, le reste sur les dernières séries
const R = (kg, ...reps) => S(...reps.map(r => [kg, r]));
const T = (past, o) => H(past[past.length - 1], { past, n: past[past.length - 1].length, ...o }).target;
assert.deepStrictEqual(T([R(60, 8, 8, 8)]), [8, 8, 9]);
assert.deepStrictEqual(T([R(60, 8, 8, 8), R(60, 8, 8, 9)]), [8, 9, 9]);
assert.deepStrictEqual(T([R(60, 8, 8, 9), R(60, 8, 9, 9)]), [9, 9, 9]);
assert.deepStrictEqual(T([R(5, 17, 16, 15)], { range: [15, 20], inc: 1 }), [16, 16, 17], 'séries inégales');
assert.deepStrictEqual(T([R(60, 8, 8, 8), R(60, 10, 8, 9)]), [9, 9, 10], 'objectif dépassé : total réparti');
assert.deepStrictEqual(T([R(60, 8, 8, 9), R(60, 8, 8, 8)]), [8, 9, 9], 'objectif raté : inchangé');
assert.deepStrictEqual(T([R(60, 14, 12, 10)]), [12, 12, 12], 'plafonné au haut de la fourchette');
assert.strictEqual(H(R(60, 14, 12, 10), { past: [R(60, 14, 12, 10)], n: 3 }).kg, 60, 'pas de hausse si une série manque');
// Cycle : haut de fourchette, hausse, reprise à la nouvelle charge
assert.strictEqual(T([R(60, 12, 12, 11), R(60, 12, 12, 12)]), null);
assert.strictEqual(H(R(60, 12, 12, 12), { past: [R(60, 12, 12, 12)], n: 3 }).kg, 62.5);
assert.deepStrictEqual(T([R(60, 12, 12, 12), R(62.5, 8, 8, 7)]), [8, 8, 8]);
assert.deepStrictEqual(T([R(60, 12, 12, 11), R(62.5, 8, 8, 8), R(60, 9, 9, 9)]), [9, 9, 10], 'charge reprise : le calcul repart');
// Une séance incomplète passée est ignorée ; la dernière, incomplète ou mélangée, ne donne pas d'objectif
assert.deepStrictEqual(T([R(60, 9, 9, 9), R(60, 9, 9), R(60, 8, 8, 8)]), [9, 9, 10]);
assert.strictEqual(T([R(60, 8, 8)]), null);
assert.strictEqual(T([S([60, 8], [55, 8], [55, 8])]), null);
assert.strictEqual(T([R(60, 8, 8, 8)], { n: 2 }), null, 'nombre de séries différent ce jour');
assert.strictEqual(T([R(60, 8, 8, 8)], { light: true }), null);
assert.strictEqual(H(R(0, 8, 8, 8), { past: [R(0, 8, 8, 8)], n: 3 }).text, 'Objectif 8-8-9 au poids du corps.');
assert.strictEqual(H(R(62.5, 8, 8, 8), { past: [R(62.5, 8, 8, 8)], n: 3 }).text, 'Objectif 8-8-9 à 62,5 kg.');
assert.deepStrictEqual(T([R(40, 18, 18)], { range: [20, 30], need: 2 }), [18, 19], 'fourchette relevée');
assert.strictEqual(H([], { past: [], n: 3 }).target, null);

// Séance comparée : la même la semaine d'avant ; protocole postural : celle juste avant, même semaine comprise
const at = (start, reps, o) => ({ start, ex: { x: R(5, reps) }, ...o });
const plogs = { '2026-11-16|lundi': at(1, 20), '2026-11-16|vendredi': at(2, 21), '2026-11-23|lundi': at(3, 22), '2026-11-23|mardi': at(5, 23, { ex: { x: [{ kg: 5, reps: 9 }] } }), '2026-11-09|vendredi': at(0, 30, { light: true }) };
const pt = (cat, sid, now, logs = plogs) => L.pastTimes(logs, { id: 'x', cat }, sid, '2026-11-23', now).map(t => t.sets[0].reps);
assert.deepStrictEqual(pt(undefined, 'vendredi', 9), [21], 'semaine allégée et autres jours ignorés');
assert.deepStrictEqual(pt(undefined, 'lundi', 9), [20], 'séance en cours exclue');
assert.deepStrictEqual(pt(undefined, 'jeudi', 9), [20, 21], 'jamais faite ce jour-là : les autres séances');
assert.deepStrictEqual(pt('postural', 'mardi', 9), [20, 21, 22]);
assert.deepStrictEqual(pt('postural', 'lundi', 9), [20, 21], 'une séance commencée après ne compte pas');

assert.ok(Math.abs(L.navyBodyFat('h', 80, 38.5, 183) - 11.2) < 0.3);
assert.strictEqual(L.navyBodyFat('h', 30, 38, 183), null);
assert.ok(Math.abs(L.navyBodyFat('f', 70, 33, 165, 96) - 24.8) < 0.3);
assert.strictEqual(L.navyBodyFat('f', 70, 33, 165), null);

const pw = L.plannedWeekly();
assert.strictEqual(pw.pecs, 14);
assert.strictEqual(pw.epaules_lat, 10);
assert.strictEqual(pw.ischios, 11);
assert.deepStrictEqual(L.exMuscles('decline'), { pecs: 1, triceps: 0.5 });

// Date de début du profil
L.setProgram(DEF, '2027-01-04');
assert.strictEqual(L.weekOf('2027-01-04'), 1);
L.setProgram(DEF);

// Validation : programmes invalides
const bad = (mut, part) => { const p = clone(DEF); mut(p); const e = L.validateProgram(p); assert.ok(e.some(x => x.includes(part)), `attendu "${part}", reçu ${JSON.stringify(e)}`); };
bad(p => { p.format = 'x'; }, '"format"');
bad(p => { p.start = '23/11/2026'; }, '"start"');
bad(p => { p.sessions[0].ex[0].muscles = { jambes: 1 }; }, 'muscle inconnu');
bad(p => { p.sessions[0].ex[0].r = [12, 8]; }, '"r"');
bad(p => { p.mesos[1].from = p.mesos[1].to = 8; }, 'pas de trou');
bad(p => { p.weeks = 40; }, 'couvrir les semaines 1 à 40');
bad(p => { p.keyLifts = ['inconnu']; }, 'keyLifts');
bad(p => { p.sessions[1].id = p.sessions[0].id; }, 'en double');
assert.deepStrictEqual(L.validateProgram(null), ['Le fichier ne contient pas de programme.']);

bad(p => { p.sessions[0].ex[0].ranges = { from: 1 }; }, '"ranges"');
bad(p => { p.mesos = [null]; }, 'Mésocycle');
bad(p => { p.mesos = 'x'; }, '"mesos"');
bad(p => { p.sessions = [null]; }, 'Séance 1');
bad(p => { p.sessions[0].ex = [null]; }, 'exercice 1');
bad(p => { p.sessions[0].id = '"><img src=x>'; }, '"id"');
bad(p => { p.sessions[0].ex[0].id = 'constructor'; }, '"id"');
bad(p => { p.sessions[0].ex[0].tempo = { a: 1 }; }, '"tempo"');
bad(p => { p.sessions[0].ex[0].muscles = { constructor: 1 }; }, 'muscle inconnu');
bad(p => { p.sessions[0].ex[1].id = p.sessions[0].ex[0].id; }, 'en double');
bad(p => { p.sessions[0].ex[0].inc = -1; }, '"inc"');
bad(p => { p.rirWeeks = { 1: 3 }; }, '"rirWeeks"');
bad(p => { p.daily = { n: 'x', detail: 3 }; }, '"daily"');
bad(p => { p.sessions[0].ex[0].cat = 'x'; }, '"cat"');
for (const v of [0, 'x', [], {}, { sessions: {}, mesos: {}, keyLifts: {} }, { sessions: [1], mesos: [2] }]) assert.ok(L.validateProgram(v).length, 'doit être refusé sans planter');

// Migration des données de la version en ligne (clés « semaine|séance »)
const old = { logs: {
  '1|lundi': { start: Date.parse('2026-11-23T18:00:00'), done: true, date: '2026-11-23', ex: { decline: [null, { kg: 60, reps: 8, done: true }] } },
  '2|lundi': { ex: { decline: [{ kg: 62, reps: 8, done: true }] } },
  '3|mardi': { ex: {} } }, daily: { '2026-11-23': { oiseau: true } }, fatigue: { S1: { count: 2, date: '2026-11-29' }, S2: { count: 1 } },
  mesures: [{ date: '2026-11-23', poids: 82, taille: 80, pecs: null, dos: null }, { date: '2026-11-24', pecs: null }], shift: 0, height: 183 };
const mig = L.migrate(clone(old), DEF);
assert.strictEqual(mig.v, 2);
assert.deepStrictEqual(mig.logs['2026-11-23|lundi'].ex.decline, [{}, { kg: 60, reps: 8, done: true }], 'série manquante réparée');
assert.ok(mig.logs['2026-11-23|lundi'].done);
assert.strictEqual(mig.logs['2026-11-30|lundi'].ex.decline[0].kg, 62);
assert.strictEqual(mig.fatigue['2026-11-23'].count, 2);
assert.strictEqual(mig.fatigue['2026-11-30'].count, 1);
assert.deepStrictEqual(mig.mesures, [{ date: '2026-11-23', poids: 82, taille: 80 }]);
assert.deepStrictEqual(mig.profile, { prenom: '', sexe: 'h', taille: 183, start: null });
assert.deepStrictEqual(mig.daily, old.daily);
assert.deepStrictEqual(L.migrate(clone(mig), DEF), mig, 'migration rejouable sans effet');
// RIR réel : entier de 0 à 5 (5 = « 5 ou plus »), facultatif ; une valeur fausse est retirée sans perdre la série
for (const v of [0, 3, 5]) assert.ok(L.isRir(v));
for (const v of [-1, 6, 1.5, '2', null, undefined, NaN]) assert.ok(!L.isRir(v));
const rirs = L.migrate({ v: 2, logs: { '2026-11-23|lundi': { ex: { a: [{ kg: 1, reps: 1, rir: 0, done: true }, { kg: 2, reps: 1, rir: '<b>', done: true }, { kg: 3, reps: 1, done: true }] } } } }, DEF);
assert.deepStrictEqual(rirs.logs['2026-11-23|lundi'].ex.a, [{ kg: 1, reps: 1, rir: 0, done: true }, { kg: 2, reps: 1, done: true }, { kg: 3, reps: 1, done: true }]);
// Séries W cochées : rangées à part des vraies séries, valeurs fausses retirées
const wm = L.migrate({ v: 2, logs: { '2026-11-23|lundi': { ex: {}, warm: { decline: [true, 'x', null, true], '<b>': [true], hack: 5 } }, '2026-11-24|mardi': { ex: {}, warm: 3 } } }, DEF);
assert.deepStrictEqual(wm.logs['2026-11-23|lundi'].warm, { decline: [true, false, false] });
assert.deepStrictEqual(wm.logs['2026-11-23|mardi'].warm, {});
assert.ok(!('warm' in mig.logs['2026-11-23|lundi']), 'ancienne séance inchangée');
// Deux anciennes semaines tombant la même semaine réelle : aucune donnée perdue
const coll = L.migrate({ logs: { '1|lundi': { start: Date.parse('2026-11-30T18:00:00'), ex: { a: [{ kg: 1, reps: 1, done: true }] } }, '2|lundi': { start: Date.parse('2026-12-01T18:00:00'), ex: { a: [{ kg: 2, reps: 1, done: true }] } } } }, DEF);
assert.deepStrictEqual(Object.values(coll.logs).map(l => l.ex.a[0].kg).sort(), [1, 2]);
assert.strictEqual(L.migrate({ logs: {}, fatigue: {}, shift: 1, height: 183 }, DEF, '2026-12-14').shifts.length, 1);
assert.strictEqual(L.migrate({ logs: {}, shift: -1, height: 183 }, DEF, '2026-12-14').profile.start, '2026-11-16');
for (const v of [null, 5, [], { logs: null }, { logs: [] }, { logs: 'x' }]) assert.strictEqual(L.migrate(v, DEF), null);
assert.strictEqual(L.migrate({ logs: {}, program: { format: 'x' } }, DEF).program, null);

// Séries d'échauffement W (PRD) : nombre par exercice dans l'ordre de la séance
const wCount = sid => { const l = DEF.sessions.find(s => s.id === sid).ex; return l.map((e, i) => e.id + ':' + L.warmupFor(l, i).length).join(' '); };
assert.strictEqual(wCount('lundi'), 'oiseau:0 pecfly:1 decline:3 chestpress:2 ecarte:0 tirageneutre:2 latpoulie:1 triceps:0');
assert.strictEqual(wCount('mardi'), 'oiseau:0 legcurlallonge:1 legext:1 hack:3 presse:2 legcurlassis:0 mollets:1 crunch:1');
assert.strictEqual(wCount('jeudi'), 'oiseau:0 pullover:1 tractions:2 tirage45:2 pecfly:1 declinehalteres:2 lathalteres:1 marteau:0');
assert.strictEqual(wCount('vendredi'), 'oiseau:0 sdjt:3 legcurldebout:0 hipthrust:2 split:2 latpoulie:1 curlpoulie:1');
const lundi = DEF.sessions[0].ex;
assert.deepStrictEqual(L.warmupFor(lundi, 1), [{ reps: '10-12', pct: 0.5, rest: 45 }]);
assert.deepStrictEqual(L.warmupFor(lundi, 2), [{ reps: '10', pct: 0.4, rest: 45 }, { reps: '6', pct: 0.65, rest: 60 }, { reps: '3', pct: 0.85, rest: 120 }]);
assert.deepStrictEqual(L.warmupFor(lundi, 3), [{ reps: '10', pct: 0.5, rest: 45 }, { reps: '5', pct: 0.75, rest: 60 }]);
const iso = muscles => ({ iso: true, muscles });
assert.strictEqual(L.warmupFor([iso({ dos: 1 }), iso({ dos: 1, biceps: 1 })], 1).length, 1, 'chaud seulement si tous les muscles principaux le sont');
// Repos entre séries W : barème de l'utilisateur, bornes comprises
assert.deepStrictEqual([0.55, 0.56, 0.75, 0.76].map(p => L.warmRest(p, false)), [45, 60, 60, 90]);
assert.strictEqual(L.warmRest(0.85, true), 120);
// Charge W : arrondie au palier de l'exercice ; null si elle n'a pas de sens
assert.strictEqual(L.warmKg(62.5, 0.65, 2.5), 40);
assert.strictEqual(L.warmKg(62.5, 0.5, 2.5), 32.5, 'mi-palier arrondi vers le haut');
assert.strictEqual(L.warmKg(9, 0.5, 2), 4);
for (const kg of [null, undefined, 0, NaN, -5]) assert.strictEqual(L.warmKg(kg, 0.5, 2.5), null);
assert.strictEqual(L.warmKg(2, 0.5, 2.5), null, 'arrondi à 0');

// Petit programme valide
const mini = { format: 'suivi-muscu-programme', version: 1, name: 'Test', start: '2027-01-04', weeks: 4, keyLifts: [], mesos: [{ id: 'A', name: 'Bloc', from: 1, to: 4, bigR: [8, 12], rirBig: '2', rirIso: '1' }], sessions: [{ id: 's1', name: 'Full body', ex: [{ id: 'squat', n: 'Squat', s: 3, r: [8, 12], rest: 120, big: true, muscles: { quadriceps: 1 } }] }] };
assert.deepStrictEqual(L.validateProgram(mini), []);
console.log('logic ok');

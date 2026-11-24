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
// Deux anciennes semaines tombant la même semaine réelle : aucune donnée perdue
const coll = L.migrate({ logs: { '1|lundi': { start: Date.parse('2026-11-30T18:00:00'), ex: { a: [{ kg: 1, reps: 1, done: true }] } }, '2|lundi': { start: Date.parse('2026-12-01T18:00:00'), ex: { a: [{ kg: 2, reps: 1, done: true }] } } } }, DEF);
assert.deepStrictEqual(Object.values(coll.logs).map(l => l.ex.a[0].kg).sort(), [1, 2]);
assert.strictEqual(L.migrate({ logs: {}, fatigue: {}, shift: 1, height: 183 }, DEF, '2026-12-14').shifts.length, 1);
assert.strictEqual(L.migrate({ logs: {}, shift: -1, height: 183 }, DEF, '2026-12-14').profile.start, '2026-11-16');
for (const v of [null, 5, [], { logs: null }, { logs: [] }, { logs: 'x' }]) assert.strictEqual(L.migrate(v, DEF), null);
assert.strictEqual(L.migrate({ logs: {}, program: { format: 'x' } }, DEF).program, null);

// Petit programme valide
const mini = { format: 'suivi-muscu-programme', version: 1, name: 'Test', start: '2027-01-04', weeks: 4, keyLifts: [], mesos: [{ id: 'A', name: 'Bloc', from: 1, to: 4, bigR: [8, 12], rirBig: '2', rirIso: '1' }], sessions: [{ id: 's1', name: 'Full body', ex: [{ id: 'squat', n: 'Squat', s: 3, r: [8, 12], rest: 120, big: true, muscles: { quadriceps: 1 } }] }] };
assert.deepStrictEqual(L.validateProgram(mini), []);
console.log('logic ok');

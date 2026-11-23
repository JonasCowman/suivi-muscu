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
assert.strictEqual(L.weekOf('2027-01-11', 1), 7);
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

assert.strictEqual(L.progressionHint([], [8, 12]).kg, null);
assert.strictEqual(L.progressionHint([{ kg: 60, reps: 12 }, { kg: 60, reps: 12 }, { kg: 60, reps: 12 }], [8, 12]).kg, 62.5);
assert.strictEqual(L.progressionHint([{ kg: 60, reps: 12 }, { kg: 60, reps: 10 }], [8, 12]).kg, 60);

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
bad(p => { p.mesos[1].from = 8; }, 'pas de trou');
bad(p => { p.weeks = 40; }, 'couvrir les semaines 1 à 40');
bad(p => { p.keyLifts = ['inconnu']; }, 'keyLifts');
bad(p => { p.sessions[1].id = p.sessions[0].id; }, 'en double');
assert.deepStrictEqual(L.validateProgram(null), ['Le fichier ne contient pas de programme.']);

// Petit programme valide
const mini = { format: 'suivi-muscu-programme', version: 1, name: 'Test', start: '2027-01-04', weeks: 4, keyLifts: [], mesos: [{ id: 'A', name: 'Bloc', from: 1, to: 4, bigR: [8, 12], rirBig: '2', rirIso: '1' }], sessions: [{ id: 's1', name: 'Full body', ex: [{ id: 'squat', n: 'Squat', s: 3, r: [8, 12], rest: 120, big: true, muscles: { quadriceps: 1 } }] }] };
assert.deepStrictEqual(L.validateProgram(mini), []);
console.log('logic ok');

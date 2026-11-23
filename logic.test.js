// node app/logic.test.js
const assert = require('assert');
const L = require('./logic.js');
const ex = id => L.SESSIONS.flatMap(s => s.ex).find(e => e.id === id);

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
assert.deepStrictEqual(L.rangeFor(14, ex('ecarte')), [15, 20]);
assert.deepStrictEqual(L.rangeFor(26, ex('pecfly')), [20, 30]);

assert.strictEqual(L.setsFor(3, ex('decline')), 3);
assert.strictEqual(L.setsFor(7, ex('decline')), 2);
assert.strictEqual(L.setsFor(3, ex('triceps'), 2), 2);
assert.strictEqual(L.setsFor(3, ex('legcurlassis'), 2), 0);
assert.strictEqual(L.setsFor(3, ex('decline'), 3), 2);

assert.strictEqual(L.rirFor(1, ex('decline')), '3');
assert.strictEqual(L.rirFor(7, ex('pecfly')), '3-4');
assert.strictEqual(L.rirFor(3, ex('legext')), '2-3');

assert.strictEqual(L.countSignals({ perf: true, motiv: true, pain: 5 }), 3);
assert.strictEqual(L.fatigueAdvice(2).level, 'mid');
assert.strictEqual(L.fatigueAdvice(1).level, 'ok');

assert.strictEqual(L.progressionHint([], [8, 12]).kg, null);
assert.strictEqual(L.progressionHint([{ kg: 60, reps: 12 }, { kg: 60, reps: 12 }, { kg: 60, reps: 12 }], [8, 12]).kg, 62.5);
assert.strictEqual(L.progressionHint([{ kg: 60, reps: 12 }, { kg: 60, reps: 10 }], [8, 12]).kg, 60);

assert.ok(Math.abs(L.navyBodyFat(80, 38.5, 183) - 11.2) < 0.3);
assert.strictEqual(L.navyBodyFat(30, 38, 183), null);
for (const s of L.SESSIONS) for (const e of s.ex) assert.ok(L.EX_MUSCLES[e.id], 'muscles manquants pour ' + e.id);
for (const m of Object.values(L.EX_MUSCLES)) for (const k of Object.keys(m)) assert.ok(L.MUSCLES[k], 'muscle inconnu ' + k);
const pw = L.plannedWeekly();
assert.strictEqual(pw.pecs, 14);
assert.strictEqual(pw.epaules_lat, 10);
assert.strictEqual(pw.ischios, 11);
console.log('logic ok');

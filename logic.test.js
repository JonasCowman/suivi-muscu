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

// Effort d'une séance (méthode de l'utilisateur : moyenne et minimum des écarts RIR noté - RIR visé)
const E = (rirs, target) => L.effortOf(rirs.map(rir => ({ kg: 60, reps: 8, done: true, ...(rir === 'stop' ? { stop: true } : rir === null ? {} : { rir }) })), target);
assert.strictEqual(E([3, 2, 1], '2'), 'up', 'cas A');
assert.strictEqual(E([4, 3, 3], '2'), 'up', 'cas B');
assert.strictEqual(E([4, 2, 0], '2'), 'hold', 'cas C : minimum -2');
assert.strictEqual(E([1, 0, 0], '2'), 'hold', 'cas D');
assert.strictEqual(E([2, 2, 1], '2'), 'soft');
assert.strictEqual(E([2, 1], '2'), 'soft', 'moyenne -0,5 juste');
assert.strictEqual(E([2, 1, 1], '2'), 'hold', 'moyenne -0,67');
assert.strictEqual(E([2, 2, 2, 2, 1, 1, 1, 1, 1], '2'), 'hold', 'moyenne -0,56');
assert.strictEqual(E([5, 5, 1], '2'), 'up', 'minimum -1 accepté');
assert.strictEqual(E([2, 1, 1], '1-2'), 'up', 'dans la fourchette');
assert.strictEqual(E([2, 1, 0], '1-2'), 'soft');
assert.strictEqual(E([0, 0, 0], '1-2'), 'hold');
assert.strictEqual(E([0, 0, 0], '0-1'), 'up');
assert.strictEqual(E([5, 0], '2'), 'hold', '« 5+ » compte 5, mais le minimum -2 bloque');
assert.strictEqual(E([2, null, 1], '2'), 'soft', 'RIR partiel');
assert.strictEqual(E([2, 'stop', 2], '2'), 'up', 'série arrêtée ignorée');
assert.strictEqual(E([], '2'), null);
assert.strictEqual(E([null, 'stop'], '2'), null);
for (const t of ['échec', '', '3 ou 4', undefined]) assert.strictEqual(E([0, 0, 0], t), null, 'RIR visé illisible : ignoré');

// Effort et objectif
const X = (past, efforts, o) => H(past[past.length - 1], { past, efforts, n: past[past.length - 1].length, ...o });
const full = R(60, 12, 12, 12);
assert.strictEqual(X([full], ['up']).kg, 62.5);
assert.strictEqual(X([full], [null]).kg, 62.5, 'aucun RIR : comme avant');
for (const ef of ['soft', 'hold']) assert.deepStrictEqual([X([full], [ef]).kg, X([full], [ef]).target], [60, [12, 12, 12]]);
assert.deepStrictEqual(X([R(60, 8, 8, 8)], ['up']).target, [8, 8, 9]);
assert.deepStrictEqual(X([R(60, 8, 8, 8)], ['soft']).target, [8, 8, 9]);
assert.deepStrictEqual(X([R(60, 8, 8, 8)], ['hold']).target, [8, 8, 8], 'première séance : total fait, sans +1');
assert.deepStrictEqual(X([R(60, 8, 8, 8), R(60, 8, 8, 9)], ['up', 'hold']).target, [8, 8, 9], 'même objectif que la séance');
assert.deepStrictEqual(X([R(60, 8, 8, 8), R(60, 10, 9, 9)], ['up', 'hold']).target, [8, 8, 9], 'dépassé en forçant : objectif prévu');
assert.deepStrictEqual(X([R(60, 8, 8, 8), R(60, 8, 8, 8)], ['hold', 'hold']).target, [8, 8, 8], 'objectif de la 2e séance : 24, pas 25');
assert.deepStrictEqual(X([R(60, 8, 8, 8), R(60, 8, 8, 7)], ['hold', 'up']).target, [8, 8, 8], 'objectif maintenu puis raté : inchangé');
assert.deepStrictEqual(X([R(60, 8, 8, 8), R(60, 8, 8, 8)], ['hold', 'up']).target, [8, 8, 9], 'objectif maintenu puis atteint');
assert.deepStrictEqual(X([R(60, 8, 8, 8), R(62.5, 8, 8, 8)], ['up', 'hold']).target, [8, 8, 8], 'nouvelle charge : le calcul repart');
assert.ok(X([R(60, 8, 8, 8)], ['hold']).text.startsWith('Consolidation'));
assert.strictEqual(H(R(60, 8, 8), { past: [R(60, 8, 8)], efforts: ['hold'], n: 3 }).text, 'Même charge (60 kg), mêmes reps : effort au-dessus de la cible.');
assert.strictEqual(X([R(60, 8, 8, 8)], ['hold'], { light: true }).target, null);
// Série arrêtée : la séance ne compte pas ; seule au dossier, elle ne donne ni hausse ni objectif
const stopped = full.map((s, i) => (i === 2 ? { ...s, stop: true } : s));
const only = X([stopped], [null]);
assert.deepStrictEqual([only.kg, only.target, only.text], [60, null, 'Même charge (60 kg), mêmes reps.']);
const slogs = { '2026-11-09|lundi': { ex: { x: R(60, 8, 8, 8) } }, '2026-11-16|lundi': { ex: { x: stopped } } };
assert.deepStrictEqual(L.pastTimes(slogs, { id: 'x' }, 'lundi', '2026-11-23', 9).map(t => t.key), ['2026-11-09']);
assert.strictEqual(L.pastTimes({ '2026-11-16|lundi': slogs['2026-11-16|lundi'] }, { id: 'x' }, 'lundi', '2026-11-23', 9).length, 1);
// RIR visé de la séance jugée : semaine 1 (RIR 3) et semaine 2 (RIR 2) ne donnent pas la même classe
assert.deepStrictEqual([1, 2].map(w => E([2, 2, 2], L.rirFor(w, ex('decline')))), ['hold', 'up']);

// Séance comparée : la même la semaine d'avant ; protocole postural : celle juste avant, même semaine comprise
const at = (start, reps, o) => ({ start, ex: { x: R(5, reps) }, ...o });
const plogs = { '2026-11-16|lundi': at(1, 20), '2026-11-16|vendredi': at(2, 21), '2026-11-23|lundi': at(3, 22), '2026-11-23|mardi': at(5, 23, { ex: { x: [{ kg: 5, reps: 9 }] } }), '2026-11-09|vendredi': at(0, 30, { light: true }) };
const pt = (cat, sid, now, logs = plogs) => L.pastTimes(logs, { id: 'x', cat }, sid, '2026-11-23', now).map(t => t.sets[0].reps);
assert.deepStrictEqual(pt(undefined, 'vendredi', 9), [21], 'semaine allégée et autres jours ignorés');
assert.deepStrictEqual(pt(undefined, 'lundi', 9), [20], 'séance en cours exclue');
assert.deepStrictEqual(pt(undefined, 'jeudi', 9), [20, 21], 'jamais faite ce jour-là : les autres séances');
assert.deepStrictEqual(pt('postural', 'mardi', 9), [20, 21, 22]);
const later = { ...plogs, '2026-11-23|jeudi': at(7, 24) };
assert.deepStrictEqual(pt('postural', 'lundi', 9, later), [20, 21], 'séance de la même semaine, validée mais commencée après : ignorée');
assert.deepStrictEqual(pt('postural', 'vendredi', 9, later), [20, 21, 22, 24]);

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
bad(p => { p.sessions[0].ex[0].joints = ['nez']; }, '"joints"');
bad(p => { p.sessions[0].ex[0].joints = 'epaules'; }, '"joints"');
bad(p => { p.sessions[0].ex[0].patterns = ['epaules']; }, '"patterns"');
assert.deepStrictEqual(L.exTags(ex('triceps')), ['joint:coudes', 'pattern:poussee']);
assert.deepStrictEqual(L.exTags({}), [], 'programme sans tags : aucun lien');
for (const s of DEF.sessions) for (const e of s.ex) assert.ok(L.exTags(e).length, e.id + ' sans tag');
for (const id of DEF.sessions.flatMap(s => s.ex.map(e => e.id))) assert.strictEqual(new Set(DEF.sessions.flatMap(s => s.ex).filter(e => e.id === id).map(e => L.exTags(e).join())).size, 1, id + ' : tags différents selon la séance');
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
assert.deepStrictEqual(mig.profile, { prenom: '', sexe: 'h', taille: 183, start: null, trackedZones: [] });
assert.deepStrictEqual(mig.daily, old.daily);
assert.deepStrictEqual(L.migrate(clone(mig), DEF), mig, 'migration rejouable sans effet');
// RIR réel : entier de 0 à 5 (5 = « 5 ou plus »), facultatif ; une valeur fausse est retirée sans perdre la série
for (const v of [0, 3, 5]) assert.ok(L.isRir(v));
for (const v of [-1, 6, 1.5, '2', null, undefined, NaN]) assert.ok(!L.isRir(v));
const rirs = L.migrate({ v: 2, logs: { '2026-11-23|lundi': { ex: { a: [{ kg: 1, reps: 1, rir: 0, done: true }, { kg: 2, reps: 1, rir: '<b>', done: true }, { kg: 3, reps: 1, done: true }] } } } }, DEF);
assert.deepStrictEqual(rirs.logs['2026-11-23|lundi'].ex.a, [{ kg: 1, reps: 1, rir: 0, done: true }, { kg: 2, reps: 1, done: true }, { kg: 3, reps: 1, done: true }]);
const stops = L.migrate({ v: 2, logs: { '2026-11-23|lundi': { ex: { a: [{ kg: 1, reps: 1, stop: true, rir: 2 }, { kg: 2, reps: 1, stop: 'oui', rir: 1 }, { kg: 3, reps: 1, stop: false }] } } } }, DEF);
assert.deepStrictEqual(stops.logs['2026-11-23|lundi'].ex.a, [{ kg: 1, reps: 1, stop: true }, { kg: 2, reps: 1, rir: 1 }, { kg: 3, reps: 1 }]);
// Séries W cochées : rangées à part des vraies séries, valeurs fausses retirées
const wm = L.migrate({ v: 2, logs: { '2026-11-23|lundi': { ex: {}, warm: { decline: [true, 'x', null, true], '<b>': [true], hack: 5 } }, '2026-11-24|mardi': { ex: {}, warm: 3 } } }, DEF);
assert.deepStrictEqual(wm.logs['2026-11-23|lundi'].warm, { decline: [true, false, false] });
assert.deepStrictEqual(wm.logs['2026-11-23|mardi'].warm, {});
assert.ok(!('warm' in mig.logs['2026-11-23|lundi']), 'ancienne séance inchangée');
// Check-in articulaire : zones du profil et réponses contrôlées ; une zone sans réponse n'est pas « Rien » (0)
const pz = trackedZones => L.migrate({ v: 2, logs: {}, profile: { prenom: 'X', sexe: 'f', taille: 170, start: null, trackedZones } }, DEF).profile.trackedZones;
const zA = { id: 'zA', label: 'Zone A', tags: ['joint:chevilles', 'pattern:tirage'] };
assert.deepStrictEqual(pz([zA]), [zA]);
assert.deepStrictEqual(pz([{ id: 'zB', label: '  ' + 'x'.repeat(40), tags: ['joint:nez', 'joint:hanches', 'joint:hanches'] }]), [{ id: 'zB', label: 'x'.repeat(30), tags: ['joint:hanches'] }]);
for (const z of [{ ...zA, id: '<b>' }, { ...zA, label: ' ' }, { ...zA, tags: ['joint:nez'] }, { ...zA, tags: 'joint:chevilles' }, null, 'zA']) assert.deepStrictEqual(pz([z]), []);
assert.deepStrictEqual(pz([zA, { ...zA, label: 'Double' }]), [zA], 'identifiant en double');
for (const v of [undefined, null, 'zA', {}, 3]) assert.deepStrictEqual(pz(v), [], 'ancien profil ou valeur fausse');
const jn = checkin => L.migrate({ v: 2, logs: { '2026-11-23|lundi': { ex: {}, checkin } } }, DEF).logs['2026-11-23|lundi'].checkin;
assert.deepStrictEqual(jn({ zA: 0, zB: 2, zC: 3, zD: '1', zE: null, '<b>': 1 }), { zA: 0, zB: 2 });
for (const v of [null, 5, [], 'x']) assert.deepStrictEqual(jn(v), {});
assert.ok(!('checkin' in mig.logs['2026-11-23|lundi']), 'ancienne séance inchangée');
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

// Mode protection. Exercice fictif « x » relié à la zone A, séance de 3 séries ; « y » sans lien
L.setProgram({ ...clone(DEF), sessions: [
  { id: 'a', name: 'A', ex: [{ id: 'x', n: 'X', s: 3, r: [8, 12], rest: 60, muscles: { dos: 1 }, joints: ['chevilles'] }, { id: 'y', n: 'Y', s: 3, r: [8, 12], rest: 60, muscles: { dos: 1 } }] },
  { id: 'b', name: 'B', ex: [{ id: 'y', n: 'Y', s: 3, r: [8, 12], rest: 60, muscles: { dos: 1 } }] }] });
const eX = { id: 'x', joints: ['chevilles'] }, eY = { id: 'y' };
const zones = [{ id: 'zA', label: 'Zone A', tags: ['joint:chevilles'] }];
const need = () => 3, wkKey = i => L.addDays('2026-11-30', 7 * i);
// Une séance par semaine : [réponse, options]. sid 'a' = liée, 'b' = non liée
const build = list => Object.fromEntries(list.map(([ans, o = {}], i) => { const sid = o.sid || 'a', sets = o.sets || R(60, 8, 8, 8); return [wkKey(i) + '|' + sid, { start: i + 1, done: o.done !== false, light: !!o.light, ex: sid === 'a' ? { x: sets, y: R(40, 8, 8, 8) } : { y: R(40, 8, 8, 8) }, ...(ans === null ? {} : { checkin: { zA: ans } }) }]; }));
const G = (list, e = eX, z = zones) => L.guard(build(list), z, e, 'a', wkKey(list.length), 999, need).state;
const N = null, off = { sid: 'b' }, li = { light: true }, arr = { sets: R(60, 8, 8, 8).map((s, i) => (i ? s : { ...s, stop: true })) };
assert.strictEqual(G([]), 'ok');
assert.strictEqual(G([[1]]), 'watch', 'orange isolé');
assert.strictEqual(G([[1], [1]]), 'protect', '2 oranges de suite');
assert.strictEqual(G([[2]]), 'protect', 'rouge');
assert.strictEqual(G([[1], [0]]), 'ok');
assert.strictEqual(G([[1], [N]]), 'ok', 'orange effacé par une séance liée sans réponse');
assert.strictEqual(G([[1], [N], [1]]), 'watch');
assert.strictEqual(G([[1], [N, off]]), 'watch', 'séance non liée : rien ne change');
assert.strictEqual(G([[1], [N, off], [1]]), 'protect');
assert.strictEqual(G([[1], [0, off]]), 'watch', 'vert sur séance non liée ignoré');
assert.strictEqual(G([[1], [1, off]]), 'protect', 'orange sur séance non liée compté');
assert.strictEqual(G([[1], [N, arr]]), 'ok', 'un arrêt n\'empêche pas l\'orange de s\'effacer');
assert.strictEqual(G([[1], [N, { done: false }]]), 'watch', 'séance non terminée');
assert.strictEqual(G([[2], [N], [N]]), 'protect', 'sans réponse, la protection reste');
assert.strictEqual(G([[2], [1]]), 'protect');
assert.strictEqual(G([[2], [0]]), 'ok', 'vert valable');
assert.strictEqual(G([[2], [0, off]]), 'protect');
assert.strictEqual(G([[2], [0, arr]]), 'protect', 'arrêt : vert non valable');
assert.strictEqual(G([[2], [0, { sets: R(60, 8, 8) }]]), 'protect', 'séries manquantes : vert non valable');
assert.strictEqual(G([[2], [0, { done: false }]]), 'protect');
assert.strictEqual(G([[1], [1, li]]), 'watch', 'semaine allégée : orange ignoré');
assert.strictEqual(G([[2], [0, li]]), 'protect', 'semaine allégée : vert ignoré');
assert.strictEqual(G([[2, li]]), 'protect', 'semaine allégée : rouge compté');
assert.strictEqual(G([[2]], eY), 'ok', 'exercice sans tag');
assert.strictEqual(G([[2]], eX, []), 'ok', 'zone supprimée');
assert.deepStrictEqual(L.guard({ ...build([[1]]), [wkKey(0) + '|b']: { start: 2, done: true, ex: { y: R(1, 8) }, checkin: { zB: 2 } } }, [...zones, { id: 'zB', label: 'Zone B', tags: ['joint:chevilles', 'joint:hanches'] }], eX, 'a', wkKey(1), 999, need).labels, ['Zone B'], 'la zone la plus grave');
assert.strictEqual(L.guard(build([[0], [2]]), zones, eX, 'a', wkKey(1), 999, need).state, 'ok', 'séance en cours exclue');
assert.strictEqual(L.guard({ [wkKey(0) + '|b']: { done: true, date: wkKey(0), ex: {}, checkin: { zA: 2 } } }, zones, eX, 'a', wkKey(0), Date.parse(wkKey(0)) + 1, need).state, 'protect', 'rouge du même jour, séance sans série');

// Baisse de 10 % : palier 2,5 ou 1, au moins un palier, jamais 0
assert.deepStrictEqual([[62.5, 2.5], [62.5, 5], [100, 5], [16, 2], [5, 1], [12.5, 2.5], [10, 2.5], [2.5, 2.5], [1, 1], [0, 1]].map(a => L.protectKg(...a)), [57.5, 57.5, 90, 14, 4, 10, 7.5, 2.5, 1, 0]);

// Cycle complet : conseil du jour après chaque séance
const advise = (list, o) => {
  const logs = build(list), cur = wkKey(list.length), g = L.guard(logs, zones, eX, 'a', cur, 999, need);
  const { past, efforts, guard } = L.applyGuard(L.pastTimes(logs, eX, 'a', cur, 999), list.map(() => null), g);
  const h = L.progressionHint(past.length && past[past.length - 1].sets, { range: [8, 12], need: 3, inc: 2.5, light: false, past: past.map(t => t.sets), n: 3, efforts, guard, ...o });
  return [h.kg, h.target && h.target.join('-'), h.text];
};
const c = [[0, { sets: R(62.5, 8, 8, 8) }], [1, { sets: R(62.5, 8, 8, 9) }]];
assert.deepStrictEqual(advise(c), [62.5, '8-8-9', 'Objectif 8-8-9 à 62,5 kg, charge maintenue.']);
c.push([1, { sets: R(62.5, 8, 8, 9) }]);
assert.deepStrictEqual(advise(c), [57.5, '8-8-9', 'Objectif 8-8-9 à 57,5 kg, sans hausse.']);
assert.deepStrictEqual(advise(c, { light: true }), [57.5, null, 'Semaine allégée : charge réduite (57,5 kg), sans forcer.']);
c.push([N, { sets: R(57.5, 8, 8, 9) }]);
assert.strictEqual(advise(c)[0], 57.5, 'une seule baisse, sur la charge d\'avant');
c.push([0, { sets: R(57.5, 12, 12, 12) }]);
assert.deepStrictEqual(advise(c), [62.5, '8-8-9', 'Sortie de protection : objectif 8-8-9 à 62,5 kg, sans hausse.']);
c.push([0, { sets: R(62.5, 8, 8, 9) }]);
assert.deepStrictEqual(advise(c), [62.5, '8-9-9', 'Objectif 8-9-9 à 62,5 kg.'], 'moteur normal');
// Haut de fourchette : aucune hausse sous alerte
for (const a of [1, 2]) assert.strictEqual(advise([[a, { sets: R(60, 12, 12, 12) }]])[1], '12-12-12');
assert.strictEqual(advise([[2, { sets: R(60, 12, 12, 12) }]])[0], 55, '60 kg : 54, palier 2,5');
assert.deepStrictEqual(advise([[2, { sets: R(0, 8, 8, 8) }]]), [0, '8-8-8', 'Objectif 8-8-8 au poids du corps, sans hausse.']);
assert.deepStrictEqual(advise([[2, { sets: R(60, 8, 8) }]]), [55, null, 'Charge réduite (55 kg), mêmes reps.']);
// Exercice fait pour la première fois sous protection : pas de charge d'avant, donc pas de baisse
assert.strictEqual(advise([[2, off], [N, { sets: R(60, 8, 8, 8) }]])[0], 60);
assert.strictEqual(advise([])[0], null);
// Exercice postural (comparé à la séance juste avant), même semaine : rouge en 1re séance, baisse dès la 2e, une seule baisse, sortie
L.setProgram({ ...clone(DEF), sessions: ['l', 'm', 'j', 'v'].map(id => ({ id, name: id, ex: [{ id: 'x', n: 'X', s: 3, r: [8, 12], rest: 60, muscles: { dos: 1 }, cat: 'postural', joints: ['chevilles'] }] })) });
const eP = { id: 'x', cat: 'postural', joints: ['chevilles'] }, W = '2026-11-30';
const postural = done => {
  const logs = Object.fromEntries(done.map(([sid, kg, ans], i) => [W + '|' + sid, { start: i + 1, done: true, ex: { x: R(kg, 8, 8, 8) }, ...(ans === null ? {} : { checkin: { zA: ans } }) }]));
  const sid = ['l', 'm', 'j', 'v'][done.length], all = L.pastTimes(logs, eP, sid, W, 99);
  const { past, efforts, guard } = L.applyGuard(all, all.map(() => null), L.guard(logs, zones, eP, sid, W, 99, need));
  const h = L.progressionHint(past[past.length - 1].sets, { range: [8, 12], need: 3, inc: 2.5, past: past.map(t => t.sets), n: 3, efforts, guard });
  return [h.kg, h.target.join('-')];
};
assert.deepStrictEqual(postural([['l', 60, 2]]), [55, '8-8-8']);
assert.deepStrictEqual(postural([['l', 60, 2], ['m', 55, null]]), [55, '8-8-8'], 'une seule baisse');
assert.deepStrictEqual(postural([['l', 60, 2], ['m', 55, 0]]), [60, '8-8-8'], 'sortie');
assert.deepStrictEqual(postural([['l', 60, 2], ['m', 55, 0], ['j', 60, 0]]), [60, '8-8-9'], 'moteur normal');
L.setProgram(DEF);

// Petit programme valide
const mini = { format: 'suivi-muscu-programme', version: 1, name: 'Test', start: '2027-01-04', weeks: 4, keyLifts: [], mesos: [{ id: 'A', name: 'Bloc', from: 1, to: 4, bigR: [8, 12], rirBig: '2', rirIso: '1' }], sessions: [{ id: 's1', name: 'Full body', ex: [{ id: 'squat', n: 'Squat', s: 3, r: [8, 12], rest: 120, big: true, muscles: { quadriceps: 1 } }] }] };
assert.deepStrictEqual(L.validateProgram(mini), []);
// Programme figé : un profil sans programme enregistré garde une copie du programme par défaut d'aujourd'hui
assert.deepStrictEqual(mig.program, DEF);
assert.notStrictEqual(mig.program, DEF, 'copie, jamais le même objet');
const prof = { prenom: 'X', sexe: 'f', taille: 170, start: '2027-01-04' };
for (const program of [undefined, null]) assert.deepStrictEqual(L.migrate({ v: 2, logs: {}, profile: prof, program }, DEF).program, DEF, 'profil ou ancienne sauvegarde sans programme');
assert.deepStrictEqual(L.migrate(L.migrate({ v: 2, logs: {}, profile: prof }, DEF), mini).program, DEF, 'un nouveau programme par défaut ne remplace pas le programme figé');
assert.deepStrictEqual(L.migrate({ v: 2, logs: {}, profile: prof, program: mini }, DEF).program, mini, 'programme importé gardé');
assert.strictEqual(L.migrate({ v: 2, logs: {}, profile: prof, program: { format: 'x' } }, DEF).program, null, 'programme illisible : rien de figé');
assert.strictEqual(L.migrate({ v: 2, logs: {} }, DEF).program, null, 'pas de profil : rien à figer');
L.setProgram(DEF);
const imported = L.migrate({ v: 2, logs: { '2026-11-23|lundi': { ex: { decline: [{ kg: 60, reps: 8, done: true }], hack: [{ kg: 9 }], perso: [{ kg: 5, reps: 5, done: true }] } } }, profile: prof, program: mini }, DEF);

// Historique : nom et muscles des exercices déjà faits, sortis du programme actif
assert.deepStrictEqual(imported.oldEx, { decline: { n: ex('decline').n, muscles: ex('decline').muscles } }, 'retrouvé dans le programme par défaut, seulement si une série est faite');
assert.deepStrictEqual(L.migrate(clone(imported), DEF), imported, 'migration rejouable sans effet');
assert.deepStrictEqual(mig.oldEx, {}, 'exercices encore au programme : rien à garder');
assert.deepStrictEqual(L.oldExFrom(imported.logs, DEF, mini), imported.oldEx);
assert.deepStrictEqual(L.oldExFrom(imported.logs, DEF, DEF), {});
const kept = { decline: { n: 'Autre nom', muscles: { dos: 1 } } };
assert.deepStrictEqual(L.migrate({ ...clone(imported), oldEx: kept }, DEF).oldEx, kept, 'la définition enregistrée passe avant celle du programme par défaut');
assert.deepStrictEqual(L.migrate({ v: 2, logs: {}, profile: prof, program: mini, oldEx: { '<b>': { n: 'x', muscles: {} }, constructor: { n: 'x' }, a: { n: ' ' }, b: 5, c: { n: 'C', muscles: { nez: 1, dos: 2, pecs: '1', biceps: 0.5 } }, d: { n: 'D', muscles: 'x' } } }, DEF).oldEx, { c: { n: 'C', muscles: { biceps: 0.5 } }, d: { n: 'D', muscles: {} } }, 'sauvegarde importée : valeurs fausses retirées');
for (const v of [null, 5, [], 'x']) assert.deepStrictEqual(L.migrate({ v: 2, logs: {}, oldEx: v }, DEF).oldEx, {});
L.setProgram(mini);
assert.deepStrictEqual(L.exMuscles('decline', imported.oldEx), DEF.sessions[0].ex.find(e => e.id === 'decline').muscles);
assert.deepStrictEqual(L.exMuscles('squat', { squat: { n: 'x', muscles: { dos: 1 } } }), { quadriceps: 1 }, 'le programme actif passe avant');
assert.deepStrictEqual(L.exMuscles('inconnu', imported.oldEx), {});
assert.deepStrictEqual(L.exMuscles('decline'), {});

// Périodes de la carte : mois au calendrier depuis la première séance, saison depuis le début du programme (mini : 04/01/2027)
const wkLog = d => ({ [d + '|s1']: { ex: { a: [{ kg: 1, reps: 1, done: true }] } } });
assert.strictEqual(L.periodWeeks(4, wkLog('2026-11-23'), '2027-01-04'), 4, 'un nouveau programme ne vide pas le dernier mois');
assert.strictEqual(L.periodWeeks(13, wkLog('2026-11-23'), '2027-01-04'), 7);
assert.strictEqual(L.periodWeeks('all', wkLog('2026-11-23'), '2027-01-11'), 2);
assert.strictEqual(L.periodWeeks(4, {}, '2027-01-11'), 2, 'sans séance : depuis le début du programme');
assert.strictEqual(L.periodWeeks(4, wkLog('2027-01-11'), '2027-01-18'), 3, 'première séance après le début du programme : inchangé');
assert.strictEqual(L.periodWeeks(4, { '2026-11-23|s1': { ex: { a: [{ kg: 1 }] } } }, '2027-01-04'), 1, 'séance ouverte sans série faite : ignorée');
assert.strictEqual(L.periodWeeks('all', {}, '2026-12-21'), 1, 'programme pas encore commencé');

// Trapèzes, lombaires, adducteurs, deltoïde avant : acceptés, et montrés seulement si le programme les vise
const four = clone(mini);
four.sessions[0].ex.push({ id: 'shrug', n: 'Shrug', s: 2, r: [10, 12], rest: 90, iso: true, muscles: { trapezes: 1, lombaires: 0.5, adducteurs: 0.5, epaules_avant: 0.5 } });
assert.deepStrictEqual(L.validateProgram(four), []);
L.setProgram(four);
assert.strictEqual(L.plannedWeekly().trapezes, 2);
const TRAP = ['trapezes', 'dos'], ADD = ['adducteurs', null];
assert.strictEqual(L.zoneMuscle(TRAP, L.plannedWeekly()), 'trapezes');
assert.strictEqual(L.zoneMuscle(ADD, L.plannedWeekly()), 'adducteurs');
L.setProgram(DEF);
assert.strictEqual(L.zoneMuscle(TRAP, L.plannedWeekly()), 'dos', 'programme sans trapèzes : zone colorée avec le dos, comme avant');
assert.strictEqual(L.zoneMuscle(ADD, L.plannedWeekly()), null, 'programme sans adducteurs : zone neutre');
assert.strictEqual(L.zoneMuscle(['pecs'], {}), 'pecs');
console.log('logic ok');

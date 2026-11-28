// Interface. Données stockées uniquement sur l'appareil (localStorage).
const KEY = 'muscu-v1';
// profile = { prenom, sexe: 'h' | 'f', taille, start, trackedZones } ; program = programme suivi (null seulement avant la création du profil)
// profile.equipment, profile.refused : réponses du générateur ; prev = { program, start } : programme remplacé, pour y revenir
// next : nouveau cycle accepté, appliqué à sa date de début (applyNext)
// oldEx : exercices déjà faits, sortis du programme : { id: { n, muscles } }
// logs et fatigue : rangés par lundi de la semaine ("2026-11-23|lundi") ; shifts : lundis où le programme a été décalé
const blank = () => ({ v: 2, logs: {}, daily: {}, fatigue: {}, mesures: [], shifts: [], profile: null, program: null, oldEx: {}, prev: null, next: null });
const today = () => new Date().toLocaleDateString('sv-SE');
let db = blank();
const raw = localStorage.getItem(KEY);
if (raw) {
  let old = null;
  try { old = JSON.parse(raw); } catch {}
  // Copie de sécurité de l'ancien format (ou d'un fichier illisible) avant toute réécriture
  if ((!old || old.v !== 2) && !localStorage.getItem(KEY + '-copie')) localStorage.setItem(KEY + '-copie', raw);
  db = migrate(old, DEFAULT_PROGRAM, today()) || db;
}
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
if (raw && db.program && !JSON.parse(raw).program) save(); // programme figé par migrate() : enregistré avant toute mise à jour de l'appli
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
// Sans profil : programme neutre du générateur. DEFAULT_PROGRAM (31 semaines) ne sert qu'aux profils existants, voir migrate()
function neutralProgram() { return generateProgram({ equipment: Object.keys(EQUIPMENT), start: nextMonday() }, LIBRARY).program; }
function baseProgram() { return db.program || (db.profile ? DEFAULT_PROGRAM : neutralProgram()); }
const applyProgram = () => setProgram(baseProgram(), db.profile && db.profile.start);
applyProgram();

const ui = { tab: 'dash', sid: null, open: null, focus: false, chartEx: null, err: {}, rest: null, restEnd: 0, progErr: [], setup: {}, profDraft: null, zone: { label: '', tags: [] } };
const sex = () => (db.profile && db.profile.sexe) || 'h';
const frDate = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shiftCount = () => db.shifts.filter(s => s >= mondayOf(P.start)).length;
function nextMonday() { const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7)); return d.toLocaleDateString('sv-SE'); }
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const wk = () => mondayOf(today());
const progWeek = key => weekOf(key, db.shifts);
const week = () => progWeek(wk());
const prevFatigue = key => (db.fatigue[addDays(key, -7)] || {}).count || 0;
const light = key => isLight(progWeek(key), prevFatigue(key));
const fmt = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
const shortDate = d => d.slice(8, 10) + '/' + d.slice(5, 7);
const exById = id => P.sessions.flatMap(s => s.ex).find(e => e.id === id);
// Série i, en créant les précédentes si besoin (sinon la sauvegarde contient des trous)
function setAt(arr, i) { while (arr.length <= i) arr.push({}); return arr[i]; }

function logFor(key, sid) {
  const k = key + '|' + sid;
  return db.logs[k] || (db.logs[k] = { ex: {} });
}

// Alerte des zones suivies sur un exercice, pour la séance en cours
const guardOf = (e, sid, key = wk()) => guard(db.logs, db.profile.trackedZones || [], e, sid, key, Date.now(), plannedSets);

// Objectif de l'exercice pour la semaine key (par défaut la semaine en cours ; semaine prochaine dans l'aperçu)
function hintFor(e, sid, key = wk()) {
  const all = pastTimes(db.logs, e, sid, key, Date.now());
  const { past, efforts, guard: alert } = applyGuard(all, all.map(t => effortOf(t.sets, rirFor(progWeek(t.key), e, prevFatigue(t.key)))), guardOf(e, sid, key));
  const last = past[past.length - 1];
  return progressionHint(last && last.sets, { range: rangeFor(progWeek(key), e), need: last ? setsFor(progWeek(last.key), e, prevFatigue(last.key)) : e.s, inc: incFor(e), light: light(key), past: past.map(t => t.sets), efforts, guard: alert, n: plannedSets(key, e) });
}

function bestByWeek(exId) {
  const out = {};
  for (const [k, log] of Object.entries(db.logs)) {
    const key = k.split('|')[0];
    for (const s of doneSets(log.ex[exId])) if (s.kg > 0 && s.reps > 0) out[key] = Math.max(out[key] || 0, e1rm(s.kg, s.reps));
  }
  return out;
}

function sessionDone(key, sid) { return !!(db.logs[key + '|' + sid] || {}).done; }

function plannedSets(key, ex) { return setsFor(progWeek(key), ex, prevFatigue(key)); }

// ---------- Dashboard ----------
// Semaine suivante, en lecture seule : programme prévu, allégée si le bilan de cette semaine le demande
function viewNextWeek() {
  const back = `<button class="ghost" style="width:100%;min-height:44px" data-a="peek" data-v="0">‹ Semaine en cours</button>`;
  const key = addDays(wk(), 7), from = key < mondayOf(P.start) ? mondayOf(P.start) : key;
  if (db.next && db.next.start <= addDays(key, 6)) return `${back}<h1>Semaine prochaine</h1><div class="banner info">Ton nouveau cycle « ${esc(db.next.name)} » commence le ${esc(frDate(db.next.start))}, en semaine 1.</div>`;
  if (cycleState(from, db.shifts) === 'over') return `${back}<h1>Semaine prochaine</h1><div class="banner info">Le programme sera terminé. ${P.generated ? 'Prépare un nouveau cycle depuis le Dashboard.' : ''}</div>`;
  const w = progWeek(from), m = mesoOf(w), f = prevFatigue(from);
  let h = `${back}<h1>Semaine ${w} · ${esc(m.name)}</h1><div class="mut" style="margin-bottom:12px">Du ${esc(frDate(from))} au ${esc(frDate(addDays(from, 6)))}. Aperçu : rien ne s'enregistre ici.</div>`;
  if (m.deload) h += `<div class="banner info">Semaine allégée : moitié des séries, mêmes charges, RIR ${esc(P.rirLight || '3-4')}.</div>`;
  else if (f >= 3) h += `<div class="banner high">Semaine allégée anticipée (bilan fatigue : ${f} signaux) : moitié des séries, mêmes charges.</div>`;
  else if (f === 2) h += `<div class="banner mid">Bilan fatigue : 2 signaux. Séries bonus retirées, RIR 2 au moins.</div>`;
  else if (!db.fatigue[wk()] && key > mondayOf(P.start)) h += `<div class="banner info">Bilan de fatigue pas encore fait : la semaine peut encore devenir allégée.</div>`;
  // Charges : connues seulement quand la même séance de cette semaine est faite (choix de l'utilisateur)
  const started = wk() >= mondayOf(P.start);
  for (const s of P.sessions) {
    const known = !started || sessionDone(wk(), s.id);
    h += `<h2>${esc(s.name)}</h2><div class="card">${known ? '' : '<div class="mut" style="padding-bottom:4px">Charges connues après ta séance de cette semaine.</div>'}${s.ex.map(e => { const rr = rangeFor(w, e); return `<div style="padding:5px 0"><div class="row"><span>${esc(e.n)}</span><span class="mut" style="white-space:nowrap">${setsFor(w, e, f)} × ${rr[0]}-${rr[1]} · RIR ${esc(rirFor(w, e, f))}</span></div>${known ? `<div class="mut">${esc(hintFor(e, s.id, from).text)}</div>` : ''}</div>`; }).join('')}</div>`;
  }
  return h + back;
}

function viewDash() {
  if (ui.peek) return viewNextWeek();
  const key = wk(), w = week(), m = mesoOf(w), f = prevFatigue(key), t = today();
  const adv = fatigueAdvice(f), nd = nextDeload(w);
  const notStarted = t < P.start;
  const isSunday = new Date().getDay() === 0 && !notStarted;
  const hello = db.profile.prenom ? `${esc(db.profile.prenom)} · ` : '';
  let h = `<div class="row"><div><div class="mut">${hello}${esc(m.phase || '')}${m.kcal ? ' · ' + esc(m.kcal) : ''}</div><h1>${esc(m.name)} · Semaine ${w}</h1></div><span class="pill">RIR ${esc(rirFor(w, { big: true }, f))}</span></div>`;
  if (notStarted) h += `<div class="banner info">Le programme démarre le ${esc(frDate(P.start))}.</div>`;
  h += `<div class="mut" style="margin-bottom:14px">Semaine ${w} sur ${P.weeks}${shiftCount() ? ` · calendrier décalé de ${shiftCount()} sem.` : ''}</div>`;
  if (m.deload) h += `<div class="banner info">Semaine allégée : moitié des séries, mêmes charges, RIR ${esc(P.rirLight || '3-4')}.</div>`;
  const end = P.generated ? cycleState(t, db.shifts) : null;
  if (db.next) h += `<div class="banner info">Nouveau cycle prêt : début le ${esc(frDate(db.next.start))}.<button class="ghost" style="width:100%;min-height:44px;margin-top:8px" data-a="next-cancel">Annuler ce nouveau cycle</button></div>`;
  else if (end) h += `<div class="banner info">${end === 'last' ? 'Dernière semaine du programme.' : 'Programme terminé. Les séances restent allégées jusqu\'au nouveau cycle.'}<button class="primary" style="width:100%;min-height:44px;margin-top:8px" data-a="gen-open" data-cycle="1">Préparer un nouveau cycle</button></div>`;
  if (!m.deload && f >= 2) h += `<div class="banner ${adv.level}">Bilan de la semaine dernière : ${f} signaux. ${esc(adv.text)}</div>`;
  if (isSunday && !db.fatigue[key]) h += `<div class="banner info row" data-a="go-fatigue" style="cursor:pointer"><span>C'est dimanche : fais ton bilan de fatigue</span><span class="chev">›</span></div>`;
  if (P.daily) {
    const done = !!(db.daily[t] || {}).oiseau;
    h += `<h2>Priorité quotidienne</h2><div class="card row"><div><div>${esc(P.daily.n)}</div>${P.daily.detail ? `<div class="mut">${esc(P.daily.detail)}</div>` : ''}</div><button class="check ${done ? 'on' : ''}" data-a="oiseau" aria-label="Fait aujourd'hui">${done ? '✓' : ''}</button></div>`;
  }
  // Conseils écrits du programme, les jours d'une séance concernée
  const todayS = P.sessions.filter(s => s.dow === new Date().getDay()), tips = (P.advice || []).filter(a => todayS.some(s => !a.s || a.s.includes(s.id)));
  if (tips.length && !notStarted) h += `<h2>Conseils du jour</h2><div class="card">${tips.map(a => `<div style="padding:4px 0">${esc(a.t)}</div>`).join('')}</div>`;
  h += `<h2>Planning de la semaine</h2>`;
  for (const s of P.sessions) {
    const done = sessionDone(key, s.id);
    h += `<div class="card row" data-a="open-session" data-sid="${s.id}" style="cursor:pointer"><span class="dot ${done ? 'done' : ''}"></span><div style="flex:1"><div>${esc(s.name)}</div><div class="mut">${done ? 'Faite' : esc(s.focus || '')}</div></div><span class="chev">›</span></div>`;
  }
  h += `<button style="width:100%;min-height:44px;margin-top:12px" data-a="peek" data-v="1">Voir la semaine prochaine ›</button>`;
  h += `<div class="mut" style="margin-top:12px">${nd ? `Prochaine semaine allégée : S${nd}` : `Plus de semaine allégée prévue · fin du programme en S${P.weeks}.`}</div>`;
  return h;
}

// ---------- Workout ----------
function defaultSid() {
  const dow = new Date().getDay();
  return (P.sessions.find(s => s.dow === dow) || P.sessions.find(s => !sessionDone(wk(), s.id)) || P.sessions[0]).id;
}

function sessionState() {
  const key = wk(), w = week();
  const sid = ui.sid || (ui.sid = defaultSid());
  const s = P.sessions.find(x => x.id === sid);
  const log = logFor(key, sid);
  const exs = s.ex.filter(e => plannedSets(key, e) > 0);
  let total = 0, done = 0;
  for (const e of exs) { const n = plannedSets(key, e); total += n; done += doneSets((log.ex[e.id] || []).slice(0, n)).length; }
  if (!ui.open || !exs.some(e => e.id === ui.open)) ui.open = (exs.find(e => doneSets(log.ex[e.id]).length < plannedSets(key, e)) || exs[0]).id;
  return { key, w, f: prevFatigue(key), sid, s, log, exs, pct: total ? Math.round(done / total * 100) : 0 };
}

const mmss = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

// Check-in articulaire d'une séance terminée, pour les zones suivies du profil
function viewJoints(log) {
  const v = log.checkin || {}, stateOf = z => guard(db.logs, [z], { joints: z.tags.filter(t => t.startsWith('joint:')).map(t => t.slice(6)), patterns: z.tags.filter(t => t.startsWith('pattern:')).map(t => t.slice(8)) }, ui.sid, wk(), Date.now(), plannedSets).state;
  // Les zones en protection d'abord, pour penser à les valider
  const all = (db.profile.trackedZones || []).map(z => ({ ...z, hot: stateOf(z) === 'protect' })), zones = [...all.filter(z => z.hot), ...all.filter(z => !z.hot)];
  if (!log.done || !zones.length) return '';
  return `<div class="card"><div class="disp">Check-in articulaire</div><div class="mut">Facultatif. Enregistré dès que tu touches.</div>${zones.map(z => `<div class="${z.hot ? 'banner high' : ''}" style="margin:12px 0 0">${esc(z.label)}${z.hot ? ' : en protection, pense à la noter' : ''}</div><div class="lvls" role="group" aria-label="${esc(z.label)}">${['Rien', 'Gêne', 'Douleur'].map((l, n) => `<button class="lvl${n} ${v[z.id] === n ? 'on' : ''}" data-a="checkin" data-z="${z.id}" data-v="${n}" aria-pressed="${v[z.id] === n}">${v[z.id] === n ? '✓ ' : ''}${l}</button>`).join('')}</div>`).join('')}</div>`;
}

// Vue d'ensemble de la séance : un exercice par ligne, on touche pour ouvrir la page séance
function viewWork() {
  if (ui.focus) return viewFocus();
  const { key, w, f, sid, s, log, exs, pct } = sessionState();
  let h = `<div class="chips">${P.sessions.map(x => `<button class="${x.id === sid ? 'on' : ''}" data-a="pick" data-sid="${x.id}">${esc(x.name.split(' — ')[0])}${sessionDone(key, x.id) ? ' ✓' : ''}</button>`).join('')}</div>`;
  h += `<h1>${esc(s.name)}</h1><div class="row mut" style="margin:4px 0 6px"><span>Semaine ${w} · ${esc(mesoOf(w).name)}</span><span id="elapsed">${log.start ? '' : 'Pas commencée'}</span></div>`;
  h += `<div class="bar" style="margin-bottom:14px"><div style="width:${pct}%"></div></div>`;
  h += viewJoints(log);
  if (f === 2 && !mesoOf(w).deload) h += `<div class="banner mid">Séries bonus retirées et RIR 2 cette semaine (bilan fatigue : 2 signaux).</div>`;
  if (f >= 3 && !mesoOf(w).deload) h += `<div class="banner high">Semaine allégée anticipée, RIR ${esc(P.rirLight || '3-4')} (bilan fatigue : ${f} signaux).</div>`;
  if (!log.done) h += `<button class="primary" style="width:100%;margin-bottom:12px" data-a="start">${log.start ? 'Reprendre la séance' : 'Démarrer la séance'}</button>`;
  for (const e of exs) {
    const n = plannedSets(key, e), r = rangeFor(w, e);
    const nDone = doneSets((log.ex[e.id] || []).slice(0, n)).length;
    h += `<div class="card row" data-a="focus-ex" data-ex="${e.id}" style="cursor:pointer"><span class="dot ${nDone >= n ? 'done' : ''}"></span><div style="flex:1">${esc(e.n)}</div><span class="mut">${nDone}/${n} · ${n} x ${r[0]}-${r[1]}</span></div>`;
  }
  h += `<button class="${log.done ? '' : 'ghost'}" style="width:100%;margin-top:8px" data-a="finish">${log.done ? 'Séance terminée ✓' : 'Terminer la séance'}</button>`;
  return h;
}

// Page séance : un exercice à la fois, grand chrono circulaire
function viewFocus() {
  const { key, w, f, sid, s, log, exs, pct } = sessionState();
  const idx = exs.findIndex(e => e.id === ui.open), e = exs[idx];
  const n = plannedSets(key, e), r = rangeFor(w, e), sets = log.ex[e.id] || [], rir = esc(rirFor(w, e, f));
  const hint = hintFor(e, sid);
  const cur = [...Array(n).keys()].find(i => !(sets[i] || {}).done) ?? -1;
  let h = `<div class="row" style="margin-bottom:8px"><button class="ghost" data-a="back" aria-label="Retour à la séance" style="padding:4px 10px;font-size:22px">‹</button><div class="disp" style="flex:1;text-transform:uppercase;font-weight:700;font-size:21px">${esc(s.name)}</div><span class="mut">${idx + 1} / ${exs.length}</span></div>`;
  h += `<div class="mut" id="elapsed">${log.start ? '' : 'Pas commencée'}</div><div class="bar" style="margin:6px 0 14px"><div style="width:${pct}%"></div></div>`;
  h += `<div class="card"><div class="disp">${esc(e.n)}</div>`;
  if (e.note) h += `<div class="warnchip">⚠ ${esc(e.note)}</div>`;
  const al = guardOf(e, sid), names = esc(al.labels.join(', '));
  if (al.state === 'protect') h += `<div class="banner high" style="margin:10px 0 0"><b>Mode Protection${hint.cut ? ' (-10 %)' : ''} : amplitude contrôlée / variante sécurisée</b><br>Zone : ${names}. Sortie : « Rien » au check-in d'une séance complète, sans arrêt.</div>`;
  if (al.state === 'watch') h += `<div class="banner mid" style="margin:10px 0 0">Gêne signalée à la dernière séance : ${names}. Charge maintenue.</div>`;
  h += `<div><span class="tag c">${n} x ${r[0]}-${r[1]}</span><span class="tag c">RIR visé ${rir}</span>${e.tempo ? `<span class="tag">Tempo ${esc(e.tempo)}</span>` : ''}<span class="tag">Repos ${mmss(e.rest)}</span></div>`;
  h += `<div class="mut" style="margin-top:8px;color:var(--cyan)">${esc(hint.text)}</div>`;
  const warm = warmupFor(exs, idx), wDone = (log.warm || {})[e.id] || [], wKg = sets[0] && sets[0].kg != null ? sets[0].kg : hint.kg;
  if (warm.length) {
    h += `<table class="sets"><caption class="mut">Échauffement</caption><tr><th>Série</th><th>Reps</th><th>Charge</th><th>Repos</th><th></th></tr>`;
    warm.forEach((x, i) => {
      h += `<tr><td>W${i + 1}</td><td>${x.reps}</td><td data-wpct="${x.pct}">${warmLoad(e, wKg, x.pct)}</td><td>${mmss(x.rest)}</td><td><button class="check ${wDone[i] ? 'on' : ''}" data-a="warm" data-w="${i}" aria-pressed="${!!wDone[i]}" aria-label="Série d'échauffement ${i + 1} faite">${wDone[i] ? '✓' : ''}</button></td></tr>`;
    });
    h += `</table>`;
  }
  h += `<table class="sets"><tr><th>Série</th><th>Reps</th><th>Charge (kg)</th><th>RIR réel</th><th></th></tr>`;
  for (let i = 0; i < n; i++) {
    const x = sets[i] || {};
    const kg = x.kg ?? sets.slice(0, i).reverse().find(p => p && p.kg != null)?.kg ?? hint.kg ?? '';
    h += `<tr class="${i === cur ? 'cur' : ''}"><td>${i + 1}</td><td><input type="number" inputmode="numeric" min="0" placeholder="${hint.target ? hint.target[i] : r[0] + '-' + r[1]}" value="${esc(x.reps ?? '')}" data-in="reps" data-ex="${e.id}" data-i="${i}" aria-label="Reps, série ${i + 1}"></td><td><input type="number" inputmode="decimal" step="0.5" min="0" value="${esc(kg)}" data-in="kg" data-ex="${e.id}" data-i="${i}" aria-label="Charge en kg, série ${i + 1}"></td><td><select data-in="rir" data-ex="${e.id}" data-i="${i}" aria-label="RIR réel, série ${i + 1}">${['', 0, 1, 2, 3, 4, 5, 'stop'].map(v => `<option value="${v}"${v === (x.stop ? 'stop' : x.rir ?? '') ? ' selected' : ''}>${v === '' ? '–' : v === 5 ? '5+' : v === 'stop' ? 'Arrêt' : v}</option>`).join('')}</select></td><td><button class="check ${x.done ? 'on' : ''}" data-a="set" data-ex="${e.id}" data-i="${i}" aria-label="Valider la série ${i + 1}">${x.done ? '✓' : ''}</button></td></tr>`;
  }
  h += `</table>${ui.err[e.id] ? `<div class="err">${esc(ui.err[e.id])}</div>` : ''}`;
  const em = exMuscles(e.id);
  h += `<div class="row" style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px"><div style="display:flex;gap:4px">${bodySvg(sex(), 'front', em, null, 46)}${bodySvg(sex(), 'back', em, null, 46)}</div><div style="flex:1"><div class="mut">Muscles travaillés</div>${Object.entries(em).map(([m, k]) => `<div${k < 1 ? ' class="mut"' : ''}>${esc(MUSCLES[m])}${k < 1 ? ' (secondaire)' : ''}</div>`).join('')}</div></div></div>`;
  h += `<div class="timer"><button data-a="rest-skip">Passer</button><div class="ring"><svg viewBox="0 0 180 180" width="180" height="180" aria-hidden="true"><circle cx="90" cy="90" r="80" fill="none" stroke="#1b1e22" stroke-width="10"/><circle id="bigRing" cx="90" cy="90" r="80" fill="none" stroke="#22d3ee" stroke-width="10" stroke-linecap="round" stroke-dasharray="502.7" stroke-dashoffset="0" transform="rotate(-90 90 90)"/></svg><div class="ringtxt"><b id="bigT" data-rest="${e.rest}">${mmss(e.rest)}</b><span class="mut" id="bigL">Temps de repos</span></div></div><button data-a="rest-add">+30 s</button></div>`;
  const last = idx === exs.length - 1;
  h += `<div class="bottom"><button data-a="next-set" style="flex:1">${cur === -1 ? 'Exercice terminé ✓' : 'Terminer la série'}</button><button class="primary" data-a="next-ex" style="flex:1">${last ? 'Terminer la séance' : 'Suivant'}</button></div>`;
  return h;
}

// Charge d'une série W : kg et pourcentage, ou pourcentage seul si la charge n'est pas connue
function warmLoad(e, kg, pct) {
  const v = warmKg(kg, pct, incFor(e)), p = Math.round(pct * 100) + ' %';
  return v === null ? p : `${String(v).replace('.', ',')} kg <span class="mut">${p}</span>`;
}

// Les séries W sont rangées dans log.warm, jamais avec les vraies séries : elles ne comptent dans aucune statistique
function toggleWarm(i) {
  const { log, exs } = sessionState(), idx = exs.findIndex(e => e.id === ui.open), id = exs[idx].id;
  const all = log.warm || (log.warm = {}), arr = all[id] || (all[id] = []);
  while (arr.length <= i) arr.push(false);
  arr[i] = !arr[i];
  if (arr[i]) {
    if (!log.start) log.start = Date.now();
    startRest(warmupFor(exs, idx)[i].rest);
  }
  save(); render();
}

// Range un champ de la ligne de série. « Arrêt » n'est pas un nombre : il va dans stop, pas dans rir
function setField(x, inp) {
  const v = inp.value;
  if (inp.dataset.in === 'rir') x.stop = v === 'stop' || undefined;
  x[inp.dataset.in] = v === '' || v === 'stop' ? undefined : +v;
}

function toggleSet(exId, i) {
  const key = wk(), log = logFor(key, ui.sid);
  const sets = log.ex[exId] || (log.ex[exId] = []);
  const row = document.querySelectorAll(`[data-ex="${exId}"][data-i="${i}"]`);
  const x = setAt(sets, i);
  row.forEach(inp => { if (inp.dataset.in) setField(x, inp); });
  if (!x.done && !(x.kg >= 0 && x.reps > 0)) { ui.err[exId] = 'Saisis la charge et les reps avant de valider.'; return render(); }
  delete ui.err[exId];
  x.done = !x.done;
  if (x.done) {
    if (!log.start) log.start = Date.now();
    log.light = light(key);
    startRest(exById(exId).rest);
  }
  save(); render();
}

// ---------- Minuteur de repos ----------
function startRest(sec) { ui.rest = { end: Date.now() + sec * 1000, total: sec }; ui.restEnd = 0; tick(); }
function tick() {
  const el = $('#rest');
  if (ui.tab === 'work' && ui.sid) {
    const log = db.logs[wk() + '|' + ui.sid];
    const e = $('#elapsed');
    if (e && log && log.start && !log.done) { const s = Math.floor((Date.now() - log.start) / 1000); e.textContent = `Séance en cours · ${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
  }
  const big = $('#bigT'), left = ui.rest ? Math.max(0, Math.round((ui.rest.end - Date.now()) / 1000)) : 0;
  if (ui.rest && left === 0) { ui.rest = null; ui.restEnd = Date.now(); if (navigator.vibrate) navigator.vibrate([300, 150, 300]); beep(); }
  const over = !ui.rest && Date.now() - ui.restEnd < 15000; // "C'est reparti" reste affiché 15 s
  if (big) {
    big.textContent = ui.rest ? mmss(left) : over ? 'GO' : mmss(+big.dataset.rest);
    $('#bigL').textContent = over ? 'C\'est reparti' : 'Temps de repos';
    $('#bigRing').setAttribute('stroke', over ? '#34d399' : '#22d3ee');
    $('#bigRing').setAttribute('stroke-dashoffset', ui.rest ? (502.7 * (1 - left / ui.rest.total)).toFixed(1) : '0');
  }
  // Petit chrono tant que le grand n'est pas visible (écran plus long avec les séries W)
  const r = big && big.getBoundingClientRect(), seen = r && r.top >= 0 && r.bottom <= $('.bottom').getBoundingClientRect().top;
  el.style.display = ui.rest && !seen ? 'flex' : 'none';
  if (ui.rest) {
    $('#restT').textContent = mmss(left);
    $('#ring').setAttribute('stroke-dashoffset', (175.9 * (1 - left / ui.rest.total)).toFixed(1));
  }
}
// iPhone : pas de vibration, et le son ne part que s'il a été débloqué par un toucher
let ac = null;
function unlockAudio() { try { ac = ac || new AudioContext(); if (ac.state !== 'running') ac.resume(); } catch {} }
function beep() {
  if (!ac) return;
  try { [0, 0.35, 0.7].forEach(d => { const o = ac.createOscillator(); o.frequency.value = 880; o.connect(ac.destination); o.start(ac.currentTime + d); o.stop(ac.currentTime + d + 0.2); }); } catch {}
}
// Écran allumé sur la page séance : écran verrouillé, le téléphone met l'appli en pause et l'alerte ne part pas
let lock = null, lockBusy = false;
async function keepAwake() {
  const want = document.body.classList.contains('focus') && !!db.profile && document.visibilityState === 'visible';
  if (!('wakeLock' in navigator) || lockBusy || want === !!lock) return;
  lockBusy = true;
  try {
    if (want) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
    else await lock.release();
  } catch {}
  lockBusy = false;
}
document.addEventListener('visibilitychange', () => { tick(); keepAwake(); });
setInterval(tick, 500);

// ---------- Analytics ----------
function chart(exId) {
  const data = bestByWeek(exId), keys = Object.keys(data).sort();
  if (!keys.length) return `<div class="mut">Pas encore de données pour cet exercice.</div>`;
  const start = mondayOf(P.start), end = addDays(start, 7 * (P.weeks - 1 + shiftCount()));
  const from = keys[0] < start ? keys[0] : start, to = keys[keys.length - 1] > end ? keys[keys.length - 1] : end;
  const span = (Date.parse(to) - Date.parse(from)) || 1;
  const vals = keys.map(k => data[k]), lo = Math.min(...vals) * 0.95, hi = Math.max(...vals) * 1.05;
  const X = k => 20 + (Date.parse(k) - Date.parse(from)) / span * 280, Y = v => 110 - (v - lo) / (hi - lo || 1) * 95;
  let marks = '';
  for (let k = start; k <= end; k = addDays(k, 7)) if (mesoOf(progWeek(k)).deload) marks += `<line x1="${X(k)}" y1="8" x2="${X(k)}" y2="112" stroke="#2a2e33" stroke-dasharray="3 3"/>`;
  return `<svg viewBox="0 0 320 125" width="100%" role="img" aria-label="Courbe de progression">${marks}<polyline points="${keys.map(k => `${X(k).toFixed(1)},${Y(data[k]).toFixed(1)}`).join(' ')}" fill="none" stroke="#22d3ee" stroke-width="2.5"/>${keys.map(k => `<circle cx="${X(k)}" cy="${Y(data[k])}" r="3" fill="#22d3ee"/>`).join('')}<text x="20" y="123" fill="#8b9bab" font-size="10">${shortDate(from)}</text><text x="300" y="123" fill="#8b9bab" font-size="10" text-anchor="end">${shortDate(to)}</text></svg>`;
}

// Séries faites par muscle sur la période (en semaines), comparées au volume prévu par le programme
function muscleStats(period) {
  const cur = wk(), n = periodWeeks(period, db.logs, cur), from = addDays(cur, -7 * (n - 1));
  const sets = {};
  for (const [k, log] of Object.entries(db.logs)) {
    const key = k.split('|')[0];
    if (key < from || key > cur) continue;
    for (const [exId, arr] of Object.entries(log.ex)) {
      const done = doneSets(arr).length;
      for (const [m, f] of Object.entries(exMuscles(exId, db.oldEx))) sets[m] = (sets[m] || 0) + done * f;
    }
  }
  const plan = plannedWeekly(), fills = {};
  for (const m in MUSCLES) fills[m] = plan[m] ? (sets[m] || 0) / n / plan[m] : 0;
  return { sets, n, plan, fills };
}

function viewMuscleMap() {
  const p = ui.period || 4, st = muscleStats(p), sel = ui.muscle;
  let h = `<h2>Carte musculaire</h2><div class="chips">${[[4, 'Dernier mois'], [13, '3 derniers mois'], ['all', 'Saison']].map(([v, l]) => `<button class="${v === p ? 'on' : ''}" data-a="period" data-p="${v}">${l}</button>`).join('')}</div>`;
  h += `<div class="card"><div style="display:flex;justify-content:space-around">${bodySvg(sex(), 'front', st.fills, sel, 140)}${bodySvg(sex(), 'back', st.fills, sel, 140)}</div>`;
  h += `<div class="mut" style="display:flex;justify-content:space-around;margin-top:4px"><span>Face</span><span>Dos</span></div>`;
  if (sel) {
    const per = (st.sets[sel] || 0) / st.n;
    h += `<div class="banner info" style="margin:10px 0 0"><b style="font-size:18px">${esc(MUSCLES[sel])}</b><br>${fmt(st.sets[sel] || 0)} séries sur ${st.n} semaine${st.n > 1 ? 's' : ''} · ${fmt(per)} par semaine (${st.plan[sel] ? `prévu ${fmt(st.plan[sel])}` : 'non prévu'})</div>`;
  } else h += `<div class="mut" style="text-align:center;margin-top:6px">Touche un muscle pour le détail. Plus c'est cyan, plus tu es proche du volume prévu.</div>`;
  h += `</div><div class="card">`;
  for (const m of Object.keys(MUSCLES).filter(m => st.plan[m] || st.sets[m]).sort((a, b) => (st.plan[b] || 0) - (st.plan[a] || 0))) {
    const per = (st.sets[m] || 0) / st.n, plan = st.plan[m], pct = plan ? Math.min(100, Math.round(per / plan * 100)) : 0;
    h += `<div data-a="muscle" data-m="${m}" style="padding:6px 0;cursor:pointer${m === sel ? ';color:var(--cyan)' : ''}"><div class="row"><span>${esc(MUSCLES[m])}</span><span class="mut">${plan ? `${fmt(per)} / ${fmt(plan)} séries par sem.` : `${fmt(per)} séries par sem. · non prévu`}</span></div>${plan ? `<div class="bar" style="margin-top:4px"><div style="width:${pct}%"></div></div>` : ''}</div>`;
  }
  return h + `<div class="mut" style="margin-top:6px">Un muscle secondaire compte pour une demi-série (ex. triceps au développé).</div></div>`;
}

function viewStats() {
  const w = week(), key = wk();
  const opts = P.sessions.flatMap(s => s.ex).filter((e, i, a) => a.findIndex(x => x.id === e.id) === i);
  // Exercices sortis du programme ayant une courbe (nom inconnu si leur programme a été remplacé avant l'ajout de oldEx)
  const olds = [...new Set(Object.values(db.logs).flatMap(l => Object.keys(l.ex)))].filter(id => !exById(id) && Object.keys(bestByWeek(id)).length).map(id => ({ id, n: (db.oldEx[id] || {}).n || id }));
  const option = e => `<option value="${e.id}" ${e.id === ui.chartEx ? 'selected' : ''}>${esc(e.n)}</option>`;
  if (![...opts, ...olds].some(e => e.id === ui.chartEx)) ui.chartEx = ((P.keyLifts || []).find(exById)) || opts[0].id;
  const data = bestByWeek(ui.chartEx), ws = Object.keys(data).sort();
  let h = `<h1>Analytics</h1>${viewMuscleMap()}<h2>Progression</h2><div class="card"><select data-in="chart" style="width:100%;font:inherit;color:var(--txt);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px">${opts.map(option).join('')}${olds.length ? `<optgroup label="Anciens exercices">${olds.map(option).join('')}</optgroup>` : ''}</select>`;
  h += `<div class="row" style="margin:10px 0 4px"><span class="mut">Charge estimée sur 1 rep</span><b>${ws.length ? fmt(data[ws[ws.length - 1]]) + ' kg' : '—'}</b></div>${chart(ui.chartEx)}<div class="mut">Les pointillés marquent les semaines allégées.</div></div>`;

  if ((P.keyLifts || []).length) h += `<h2>Objectifs de charge (+7 à 10 %)</h2><div class="card">`;
  for (const id of (P.keyLifts || []).filter(exById)) {
    const d = bestByWeek(id), k = Object.keys(d).sort();
    const ref = k.length ? d[k[0]] : 0, cur = k.length ? d[k[k.length - 1]] : 0, target = ref * 1.1;
    const pct = ref ? Math.max(0, Math.min(100, (cur - ref) / (target - ref) * 100)) : 0;
    h += `<div style="padding:6px 0"><div class="row"><span>${esc(exById(id).n)}</span><span class="mut">${ref ? `${fmt(ref)} → ${fmt(ref * 1.07)}-${fmt(target)} kg` : 'à mesurer'}</span></div><div class="bar" style="margin-top:5px"><div style="width:${pct}%"></div></div></div>`;
  }
  if ((P.keyLifts || []).length) h += `<div class="mut" style="margin-top:6px">Référence = ta première semaine enregistrée.${P.generated ? '' : ' En sèche, l\'objectif est de garder au moins 95 % de tes meilleures charges.'}</div></div>`;

  const f = db.fatigue[key] || {};
  const sig = [['perf', 'Performances en baisse (2 exercices, 2 séances de suite)'], ['motiv', 'Je traîne les pieds pour aller à la salle'], ['sleep', 'Sommeil sous 7 h, ou réveils fatigués 3 nuits ou plus'], ['courb', 'Courbatures encore là après 72 h'], ['poids', 'Perte de poids de plus de 0,7 kg cette semaine (en sèche)']];
  h += `<h2 id="fatigue">Bilan fatigue · semaine ${w}</h2><div class="card">${sig.map(([k, l]) => `<label class="chk"><span>${l}</span><input type="checkbox" data-fat="${k}" ${f[k] ? 'checked' : ''}></label>`).join('')}`;
  h += `<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="row"><span>Douleur coudes / genoux</span><b id="painV">${f.pain || 0} / 10</b></div><input type="range" min="0" max="10" step="1" value="${f.pain || 0}" data-fat="pain"></div>`;
  h += `<button class="primary" style="width:100%" data-a="fat-save">Enregistrer le bilan</button>`;
  if (f.count !== undefined) { const a = fatigueAdvice(f.count); h += `<div class="banner ${a.level === 'ok' ? 'info' : a.level}" style="margin:10px 0 0">${f.count} ${f.count > 1 ? 'signaux' : 'signal'} · semaine prochaine : ${esc(a.text)}</div>`; }
  h += `</div>`;

  const last = db.mesures[db.mesures.length - 1] || {};
  const fields = [['poids', 'Poids moyen (kg)'], ['poitrine', 'Poitrine (cm)'], ['taille', 'Taille au nombril (cm)'], ['hanches', 'Hanches (cm)'], ['cuisse', 'Cuisse (cm)'], ['bras', 'Bras (cm)'], ['cou', 'Cou (cm)']];
  h += `<h2>Mensurations</h2><div class="card"><div class="mut" style="margin-bottom:8px">Toutes les 4 semaines, le matin à jeun.${sex() === 'f' ? ' Les hanches servent au calcul de la masse grasse.' : ''}</div><div class="grid2"><label class="mut">Date<input type="date" data-mes="date" value="${today()}"></label>${fields.map(([k, l]) => `<label class="mut">${l}<input type="number" inputmode="decimal" step="0.1" data-mes="${k}" placeholder="${last[k] ?? ''}"></label>`).join('')}</div>`;
  h += `<div class="err" id="err-mes">${esc(ui.err.mes || '')}</div><button class="primary" style="width:100%;margin-top:10px" data-a="mes-save">Enregistrer les mesures</button></div>`;
  if (db.mesures.length) {
    const bf = navyBodyFat(sex(), last.taille, last.cou, db.profile.taille, last.hanches);
    h += `<div class="grid2" style="margin-bottom:10px"><div class="metric"><span class="mut">Poids</span><b>${last.poids ? fmt(last.poids) + ' kg' : '—'}</b></div><div class="metric"><span class="mut">Taille</span><b>${last.taille ? fmt(last.taille) + ' cm' : '—'}</b></div><div class="metric"><span class="mut">Poitrine</span><b>${last.poitrine ? fmt(last.poitrine) + ' cm' : '—'}</b></div><div class="metric"><span class="mut">Masse grasse (Navy)</span><b>${bf ? '~' + Math.round(bf) + ' %' : '—'}</b></div></div>`;
    h += `<div class="card">${db.mesures.slice().reverse().map((m, i) => `<div class="row" style="padding:5px 0;border-top:${i ? '1px solid var(--line)' : 'none'}"><span>${esc(m.date)}</span><span class="mut">${[m.poids && fmt(m.poids) + ' kg', m.taille && 'taille ' + fmt(m.taille), m.poitrine && 'poitrine ' + fmt(m.poitrine)].filter(Boolean).join(' · ')}</span></div>`).join('')}</div>`;
  }
  h += `<div class="mut">Photos : range-les dans un album dédié de ton téléphone (face, profil, dos), elles ne sont pas stockées dans l'appli.</div>`;
  return h;
}

// ---------- Profil et programme ----------
// Champs du profil (k = préfixe des data-attributs : "p" dans Profile, "s" au premier lancement)
function profileFields(pr, k) {
  pr = pr || {};
  const sx = pr.sexe || '';
  return `<div class="grid2"><label class="mut">Prénom<input type="text" data-${k}="prenom" value="${esc(pr.prenom || '')}" autocomplete="given-name" style="width:100%;font:inherit;color:var(--txt);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px"></label><label class="mut">Taille (cm)<input type="number" inputmode="numeric" data-${k}="taille" value="${esc(pr.taille || '')}" placeholder="175"></label></div>
  <div class="mut" style="margin-top:10px">Sexe (corps affiché et calcul de la masse grasse)</div>
  <div class="row" style="margin-top:6px"><button style="flex:1" class="${sx === 'h' ? 'on-sel' : ''}" data-a="pick-sex" data-k="${k}" data-v="h">Homme</button><button style="flex:1" class="${sx === 'f' ? 'on-sel' : ''}" data-a="pick-sex" data-k="${k}" data-v="f">Femme</button></div>
  <label class="mut" style="display:block;margin-top:10px">Date de début du programme<input type="date" data-${k}="start" value="${esc(pr.start || '')}"></label>
  <div class="mut" style="font-size:12px">Les semaines vont du lundi au dimanche. Vide = ${esc(frDate(defaultStart(k)))}.</div>`;
}

// Zones suivies au check-in (Profile). Enregistrées aussitôt, sans passer par le brouillon du profil
function viewZones() {
  const f = ui.zone, zones = db.profile.trackedZones || [];
  let h = `<h2>Zones suivies</h2><div class="card"><div class="mut">Facultatif. Demandées après chaque séance. Ce sont des données de santé : elles restent sur ce téléphone et dans tes fichiers exportés.</div>`;
  if (!P.sessions.some(s => s.ex.some(e => exTags(e).length))) h += `<div class="banner mid" style="margin:10px 0 0">Ce programme n'a pas de tags : aucune zone ne peut agir sur ses exercices.</div>`;
  h += zones.map(z => `<div class="row" style="margin-top:10px"><div><div>${esc(z.label)}</div><div class="mut">${z.tags.map(t => TAGS[t]).join(', ')}</div></div><button data-a="zone-del" data-z="${z.id}" aria-label="Supprimer ${esc(z.label)}" style="min-height:44px">Supprimer</button></div>`).join('');
  h += `<label class="mut" style="display:block;margin-top:14px">Nom de la nouvelle zone<input type="text" maxlength="30" data-zl value="${esc(f.label)}" style="width:100%;min-height:44px;font:inherit;font-size:17px;color:var(--txt);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px"></label>`;
  h += `<div class="mut" style="margin-top:10px">Articulations et mouvements concernés</div><div class="zones" role="group" aria-label="Articulations et mouvements concernés">${Object.entries(TAGS).map(([t, l]) => `<button class="${f.tags.includes(t) ? 'on-sel' : ''}" data-a="zone-tag" data-tag="${t}" aria-pressed="${f.tags.includes(t)}">${f.tags.includes(t) ? '✓ ' : ''}${l}</button>`).join('')}</div>`;
  return h + `<div class="err" role="alert">${esc(ui.err.zone || '')}</div><button class="primary" style="width:100%;margin-top:10px" data-a="zone-add">Ajouter la zone</button></div>`;
}

const progStart = () => baseProgram().start;
// Premier lancement : jamais une date passée, sinon on arriverait au milieu du programme
function defaultStart(k) { return k === 's' && progStart() < today() ? nextMonday() : progStart(); }

function readProfile(d, k) {
  const taille = +d.taille, start = d.start || null;
  if (!d.sexe) return { error: 'Choisis Homme ou Femme.' };
  if (!(taille >= 120 && taille <= 230)) return { error: 'Indique ta taille en cm (entre 120 et 230).' };
  return { prenom: String(d.prenom || '').trim().slice(0, 40), sexe: d.sexe, taille, start: start || (k === 's' ? defaultStart('s') : null) };
}

function viewProgramCard() {
  const origin = P.generated ? 'créé dans l\'appli' : JSON.stringify(baseProgram()) === JSON.stringify(DEFAULT_PROGRAM) ? 'par défaut' : 'importé';
  let h = `<h2>Programme</h2><div class="card"><div style="font-weight:600">${esc(P.name)}</div><div class="mut">${P.weeks} semaines · ${P.sessions.length} séances par semaine · ${P.mesos.filter(m => !m.deload).length} mésocycles · ${origin}</div>`;
  h += `<div class="row" style="margin-top:10px"><button style="flex:1" data-a="prog-export">Télécharger (modèle)</button><button style="flex:1" data-a="prog-import">Importer</button><input type="file" accept="application/json,.json" id="progFile" hidden></div>`;
  h += `<button style="width:100%;min-height:44px;margin-top:8px" data-a="gen-open">${db.profile ? 'Créer un programme' : 'Adapter à mon corps et ma salle'}</button>`;
  if (db.profile && db.prev) h += `<button class="ghost" style="width:100%;min-height:44px;margin-top:8px" data-a="prog-prev">Revenir au programme précédent : ${esc(db.prev.program.name)}</button>`;
  if (ui.progOk) h += `<div class="banner info" style="margin:10px 0 0">${esc(ui.progOk)}</div>`;
  if (ui.progErr.length) h += `<div class="err">Programme refusé :<ul style="margin:4px 0;padding-left:18px">${ui.progErr.slice(0, 8).map(e => `<li>${esc(e)}</li>`).join('')}</ul>${ui.progErr.length > 8 ? `et ${ui.progErr.length - 8} autre(s) erreur(s).` : ''}</div>`;
  return h + `<div class="mut" style="margin-top:8px;font-size:12px">Pour un programme écrit à la main : télécharge le modèle, modifie-le (voir FORMAT-PROGRAMME.md), puis importe-le.</div></div>`;
}

// ---------- Créer un programme ----------
// ui.gen = { equipment, refused, morpho, zones, start, res } ; res = aperçu (null : questions). morpho : réponses au questionnaire (MORPHO de catalogue.js). Cases natives, sans nouveau rendu : la position et le focus restent
// cycle : nouveau cycle. Dernière semaine : lundi prochain, pour finir la semaine allégée
function openGen(cycle) {
  const saved = db.profile || ui.genSaved || {};
  ui.gen = { equipment: saved.equipment || Object.keys(EQUIPMENT), refused: saved.refused || [], morpho: { ...saved.morpho }, zones: true, start: !db.profile ? ui.setup.start || nextMonday() : cycle && cycleState(today(), db.shifts) === 'last' ? addDays(wk(), 7) : P.generated && !cycle ? P.start : nextMonday(), res: null };
}

function viewGen() {
  const g = ui.gen;
  if (g.res) return viewGenPreview(g.res);
  const all = Object.keys(EQUIPMENT), chk = (k, v, label, on) => `<label class="chk"><span>${esc(label)}</span><input type="checkbox" data-g="${k}" value="${v}" ${on ? 'checked' : ''}></label>`;
  let h = `<div class="gen"><h1 tabindex="-1">${db.profile ? 'Créer un programme' : 'Adapter le programme'}</h1><div class="mut">Upper/Lower : 4 séances par semaine, 24 semaines, prise de muscle, en salle.</div>`;
  h += `<h2>Mon corps</h2><div class="card"><div class="mut" style="margin-bottom:8px">Réponds à ce que tu sais. « Je ne sais pas » ne change rien au programme.</div>`;
  MORPHO.cards.forEach((c, ci) => { h += `<details><summary><span>${esc(c.name)}</span><span class="mut" data-gm="${ci}">${answered(c, g.morpho)}</span></summary>${c.q.map(q => viewQuestion(q, g.morpho[q.id])).join('')}${ci === MORPHO.cards.length - 1 ? '<div class="mut" style="padding:8px 0">Données de santé : elles restent sur ce téléphone et dans tes sauvegardes.</div>' : ''}</details>`; });
  const miss = all.length - g.equipment.length;
  h += `</div><h2>Ma salle</h2><div class="card"><details><summary><span>Il manque quelque chose dans ma salle</span><span class="mut" data-gq>${miss ? miss + ' manquant' + (miss > 1 ? 's' : '') : ''}</span></summary><div role="group" aria-label="Mon matériel">${chk('all', '', 'Salle complète (tout)', g.equipment.length === all.length)}${all.map(k => chk('eq', k, EQUIPMENT[k], g.equipment.includes(k))).join('')}</div></details></div>`;
  h += `<h2>Exercices refusés</h2><div class="card"><div class="mut" style="margin-bottom:8px">Facultatif. Coche ceux que tu ne veux pas faire.</div>`;
  for (const m of Object.keys(MUSCLES)) {
    const list = CATALOGUE.filter(e => mainMuscle(e) === m), n = list.filter(e => g.refused.includes(e.id)).length;
    if (list.length) h += `<details><summary><span>${esc(MUSCLES[m])}</span><span class="mut" data-gn="${m}">${n ? n + ' refusé' + (n > 1 ? 's' : '') : ''}</span></summary>${list.map(e => chk('ref', e.id, e.n, g.refused.includes(e.id))).join('')}</details>`;
  }
  h += `</div>`;
  if (db.profile) h += `<label class="mut" style="display:block">Date de début<input type="date" data-gs value="${esc(g.start)}" style="min-height:44px"></label>`;
  return h + `<div class="err" role="alert" id="err-gen">${esc(ui.err.gen || '')}</div><button class="primary" style="width:100%;margin-top:10px" data-a="gen-preview">Voir le programme</button><button class="ghost" style="width:100%;margin-top:8px" data-a="gen-close">Annuler</button></div>`;
}

// Une question : boutons à choix unique avec « Je ne sais pas », ou cases pour les antécédents
function viewQuestion(q, v) {
  if (q.multi) return `<fieldset class="mq"><legend>${esc(q.label)}</legend><div class="mut">${esc(q.help)}</div>${q.opts.map(([k, l]) => `<label class="chk"><span>${esc(l)}</span><input type="checkbox" data-g="mqm" data-q="${q.id}" value="${k}" ${(v || []).includes(k) ? 'checked' : ''}></label>`).join('')}</fieldset>`;
  return `<fieldset class="mq"><legend>${esc(q.label)}</legend><div class="mut">${esc(q.help)}</div><div class="seg">${[...q.opts, ['', 'Je ne sais pas']].map(([k, l]) => `<label><input type="radio" name="mq-${q.id}" data-g="mq" data-q="${q.id}" value="${k}" ${(v || '') === k ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div></fieldset>`;
}
function answered(c, m) { const n = c.q.filter(q => q.multi ? (m[q.id] || []).length : m[q.id]).length; return n ? n + ' réponse' + (n > 1 ? 's' : '') : ''; }
// Zones à suivre au check-in pour les antécédents cochés, sauf celles déjà suivies (même articulation seule)
function antZones(tags, have = []) {
  return tags.filter(t => MORPHO.zones[t] && !have.some(z => z.tags.length === 1 && z.tags[0] === MORPHO.zones[t][1]))
    .map(t => ({ id: 'z' + Date.now().toString(36) + t.slice(4), label: MORPHO.zones[t][0], tags: [MORPHO.zones[t][1]] }));
}

function viewGenPreview({ program, low, why, zones }) {
  let h = `<div class="gen"><h1 tabindex="-1">Aperçu</h1><div class="mut" style="margin-bottom:12px">${esc(program.name)} · début le ${esc(frDate(program.start))}. Reps du premier bloc.</div>`;
  if (low.length) h += `<div class="banner mid" role="status">${low.map(x => x.v ? `${esc(MUSCLES[x.m])} : ${fmt(x.v)} séries par semaine au lieu de ${fmt(x.base)}.` : `${esc(MUSCLES[x.m])} : aucun exercice possible avec tes réponses.`).join('<br>')}</div>`;
  h += `<h2>Ce qui change pour toi</h2><div class="card">${why.length ? why.map(w => `<div style="padding:5px 0">${esc(w.txt)}<div class="mut">${w.tags.map(t => esc(MORPHO.labels[t] || t)).join(', ')}</div></div>`).join('') : '<div class="mut">Rien : c\'est le programme de base.</div>'}</div>`;
  if (program.advice) h += `<h2>Conseils</h2><div class="card">${program.advice.map(a => `<div style="padding:5px 0">${esc(a.t)}</div>`).join('')}</div>`;
  for (const s of program.sessions) h += `<h2>${esc(s.name)}</h2><div class="card">${s.ex.map(e => `<div style="padding:5px 0"><div class="row"><span>${esc(e.n)}</span><span class="mut" style="white-space:nowrap">${e.s} × ${(e.big ? program.mesos[0].bigR : e.r).join('-')}</span></div>${e.note ? `<div class="mut">${esc(e.note)}</div>` : ''}</div>`).join('')}</div>`;
  if (zones.length) h += `<div class="card" style="margin-top:12px"><label class="chk" style="border:0"><span>Suivre ${esc(zones.map(z => z.label.toLowerCase()).join(', '))} au check-in après chaque séance</span><input type="checkbox" data-g="zones" ${ui.gen.zones ? 'checked' : ''}></label></div>`;
  return h + `<div class="mut" style="margin:12px 0">Ce programme ne remplace pas un avis médical. En cas de douleur ou de doute, demande à un professionnel de santé.</div><button class="primary" style="width:100%" data-a="gen-accept">Accepter ce programme</button><button style="width:100%;margin-top:8px" data-a="gen-edit">Modifier mes réponses</button><button class="ghost" style="width:100%;margin-top:8px" data-a="gen-close">Annuler</button></div>`;
}

// Zones des antécédents ajoutées si la case est cochée : { trackedZones } ou rien
function keepZones() {
  const { res, zones } = ui.gen;
  return zones && res.zones.length ? { trackedZones: cleanZones([...((db.profile || {}).trackedZones || []), ...res.zones]) } : {};
}

// Change d'étape : haut de page et focus sur le titre
function showGen() { render(); window.scrollTo(0, 0); $('#view h1').focus(); }

// Premier lancement : création du profil
function viewSetup() {
  const s = ui.setup;
  return `<h1>Bienvenue</h1><div class="mut" style="margin-bottom:14px">Crée ton profil. Tes données restent sur ce téléphone.</div>
  <div class="card">${profileFields(s, 's')}</div>
  ${viewProgramCard()}
  ${ui.err.setup ? `<div class="err">${esc(ui.err.setup)}</div>` : ''}
  <button class="primary" style="width:100%;margin-top:6px" data-a="setup-save">Commencer</button>
  <button class="ghost" style="width:100%;margin-top:8px" data-a="import-btn">Restaurer une sauvegarde</button><input type="file" accept="application/json" id="importFile" hidden>
  ${ui.err.imp ? `<div class="err">${esc(ui.err.imp)}</div>` : ''}`;
}

function downloadJson(obj, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }));
  const l = document.createElement('a'); l.href = url; l.download = name; l.click(); URL.revokeObjectURL(url);
}

function viewProf() {
  const nLogs = Object.values(db.logs).filter(l => l.done).length;
  const pr = db.profile;
  return `<h1>Profile</h1><div class="mut" style="margin-bottom:14px">${nLogs} séance${nLogs > 1 ? 's' : ''} terminée${nLogs > 1 ? 's' : ''} · début le ${esc(frDate(P.start))}</div>
  <h2>Mon profil</h2><div class="card">${profileFields(ui.profDraft || pr, 'p')}${ui.err.prof ? `<div class="err">${esc(ui.err.prof)}</div>` : ''}<button class="primary" style="width:100%;margin-top:10px" data-a="prof-save">Enregistrer le profil</button></div>
  ${viewZones()}
  ${viewProgramCard()}
  <h2>Calendrier</h2><div class="card"><div class="row"><span>Décalage</span><b>${shiftCount()} semaine${shiftCount() > 1 ? 's' : ''}</b></div><div class="mut" style="margin:6px 0 10px">Après des séances ratées (fêtes) ou une semaine allégée anticipée, décale d'une semaine : le programme reprend la semaine précédente, tes séances déjà faites ne bougent pas.</div><div class="row"><button data-a="shift" data-d="-1" style="flex:1">Annuler le dernier</button><button data-a="shift" data-d="1" style="flex:1">+ 1 semaine</button></div></div>
  <h2>Sauvegarde</h2><div class="card"><div class="mut" style="margin-bottom:10px">Tes données restent sur ce téléphone. Exporte-les chaque semaine : si l'appli est supprimée, elles sont perdues.</div><div class="row"><button data-a="export" style="flex:1">Exporter</button><button style="flex:1" data-a="import-btn">Importer</button><input type="file" accept="application/json" id="importFile" hidden></div>${ui.err.imp ? `<div class="err">${esc(ui.err.imp)}</div>` : ''}</div>
  <h2>Réinitialiser</h2><div class="card"><button class="ghost" style="color:var(--danger);width:100%" data-a="reset">Effacer toutes les données</button></div>`;
}

// ---------- Rendu et événements ----------
// Brouillon du profil : garde la saisie tant qu'elle n'est pas enregistrée
function draft(k) { return k === 's' ? ui.setup : (ui.profDraft = ui.profDraft || { ...db.profile }); }

// Change de programme. Même date de début = même programme retouché : on reste à la même semaine.
function useProgram(p) {
  const before = progStart();
  if (db.profile && db.program) db.prev = { program: db.program, start: db.profile.start };
  db.oldEx = { ...db.oldEx, ...oldExFrom(db.logs, P, p) };
  db.program = p; db.next = null;
  if (db.profile && progStart() !== before) db.profile.start = null;
  save(); applyProgram(); ui.sid = null; ui.open = null; ui.chartEx = null; ui.focus = false;
}

// Nouveau cycle accepté pendant la dernière semaine ou après : remplace le programme le jour de son début, pas pendant une séance ouverte
function applyNext() {
  if (!db.next || db.next.start > today() || ui.focus) return;
  useProgram(db.next); db.profile.start = null; save(); applyProgram();
}

// Affiche une erreur sans redessiner la page (la saisie reste en place)
function showErr(id) { $('#err-' + id).textContent = ui.err[id]; }

function render() {
  applyNext();
  const v = ui.gen ? viewGen() : !db.profile ? viewSetup() : { dash: viewDash, work: viewWork, stats: viewStats, prof: viewProf }[ui.tab]();
  $('#view').innerHTML = v;
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  document.body.classList.toggle('focus', !db.profile || (ui.tab === 'work' && !!ui.focus));
  tick(); keepAwake();
}

document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-tab],[data-a]');
  unlockAudio();
  if (!t) return;
  if (t.dataset.tab) { ui.profDraft = null; ui.gen = null; ui.peek = false; ui.tab = t.dataset.tab; window.scrollTo(0, 0); return render(); }
  const a = t.dataset.a, key = wk();
  if (a === 'oiseau') { const d = db.daily[today()] || (db.daily[today()] = {}); d.oiseau = !d.oiseau; save(); render(); }
  else if (a === 'open-session' || a === 'pick') { ui.sid = t.dataset.sid; ui.open = null; ui.focus = false; ui.tab = 'work'; window.scrollTo(0, 0); render(); }
  else if (a === 'focus-ex' || a === 'start') { if (t.dataset.ex) ui.open = t.dataset.ex; ui.focus = true; window.scrollTo(0, 0); render(); }
  else if (a === 'back') { ui.focus = false; render(); }
  else if (a === 'muscle') { ui.muscle = ui.muscle === t.dataset.m ? null : t.dataset.m; render(); }
  else if (a === 'period') { ui.period = t.dataset.p === 'all' ? 'all' : +t.dataset.p; render(); }
  else if (a === 'next-set') {
    const e = exById(ui.open), sets = logFor(key, ui.sid).ex[e.id] || [], n = plannedSets(key, e);
    const i = [...Array(n).keys()].find(k => !(sets[k] || {}).done);
    if (i !== undefined) toggleSet(e.id, i);
  }
  else if (a === 'next-ex') {
    const { exs, log } = sessionState(), idx = exs.findIndex(x => x.id === ui.open);
    if (idx < exs.length - 1) ui.open = exs[idx + 1].id;
    else { log.done = true; log.date = today(); ui.focus = false; ui.rest = null; save(); }
    window.scrollTo(0, 0); render();
  }
  else if (a === 'warm') toggleWarm(+t.dataset.w);
  else if (a === 'set') toggleSet(t.dataset.ex, +t.dataset.i);
  else if (a === 'finish') { const l = logFor(key, ui.sid); l.done = !l.done; l.date = today(); save(); render(); if (l.done) window.scrollTo(0, 0); }
  else if (a === 'rest-add' && ui.rest) { ui.rest.end += 30000; ui.rest.total += 30; tick(); }
  else if (a === 'rest-skip') { ui.rest = null; tick(); }
  else if (a === 'peek') { ui.peek = t.dataset.v === '1'; render(); window.scrollTo(0, 0); }
  else if (a === 'go-fatigue') { ui.tab = 'stats'; render(); $('#fatigue').scrollIntoView(); }
  else if (a === 'fat-save') {
    const f = { date: today() };
    document.querySelectorAll('[data-fat]').forEach(i => { f[i.dataset.fat] = i.type === 'checkbox' ? i.checked : +i.value; });
    f.count = countSignals(f); db.fatigue[key] = f; save(); render(); $('#fatigue').scrollIntoView();
  }
  else if (a === 'mes-save') {
    const m = {};
    document.querySelectorAll('[data-mes]').forEach(i => { if (i.value !== '') m[i.dataset.mes] = i.type === 'date' ? i.value : +i.value; });
    ui.err.mes = !m.date ? 'Indique la date.' : Object.keys(m).length < 2 ? 'Saisis au moins une mesure.' : '';
    if (ui.err.mes) return showErr('mes');
    db.mesures.push(m); db.mesures.sort((x, y) => x.date.localeCompare(y.date)); save(); render();
  }
  else if (a === 'shift') {
    if (+t.dataset.d > 0) db.shifts.push(key > mondayOf(P.start) ? key : mondayOf(P.start));
    else if (shiftCount()) { db.shifts.sort(); db.shifts.pop(); }
    save(); render();
  }
  else if (a === 'zone-tag') {
    const f = ui.zone, tag = t.dataset.tag;
    f.tags = f.tags.includes(tag) ? f.tags.filter(x => x !== tag) : [...f.tags, tag]; render();
  }
  else if (a === 'zone-add') {
    const f = ui.zone;
    ui.err.zone = !f.label.trim() ? 'Donne un nom à la zone.' : !f.tags.length ? 'Choisis au moins une articulation ou un mouvement.' : '';
    if (!ui.err.zone) {
      // Identifiant jamais réutilisé : les anciennes réponses d'une zone supprimée ne passent pas à une autre
      db.profile.trackedZones = cleanZones([...(db.profile.trackedZones || []), { id: 'z' + Date.now().toString(36), label: f.label, tags: f.tags }]);
      ui.zone = { label: '', tags: [] }; save();
    }
    render();
  }
  else if (a === 'zone-del' && confirm('Supprimer cette zone ? Ses anciennes réponses n\'agiront plus sur tes exercices.')) {
    db.profile.trackedZones = db.profile.trackedZones.filter(z => z.id !== t.dataset.z); save(); render();
  }
  else if (a === 'checkin') {
    const l = logFor(key, ui.sid), c = l.checkin || (l.checkin = {}), z = t.dataset.z, v = +t.dataset.v;
    if (c[z] === v) delete c[z]; else c[z] = v;
    save(); render();
  }
  else if (a === 'pick-sex') {
    draft(t.dataset.k).sexe = t.dataset.v; render();
  }
  else if (a === 'setup-save') {
    const p = readProfile(ui.setup, 's');
    if (p.error) { ui.err.setup = p.error; return render(); }
    delete ui.err.setup; db.profile = { ...p, trackedZones: [], ...ui.genSaved }; db.program = db.program || neutralProgram(); ui.setup = {}; ui.genSaved = null; ui.progErr = []; ui.progOk = ''; save(); applyProgram(); ui.tab = 'dash'; render();
  }
  else if (a === 'prof-save') {
    const p = readProfile(ui.profDraft || db.profile, 'p');
    if (p.error) { ui.err.prof = p.error; return render(); }
    delete ui.err.prof; db.profile = { ...db.profile, ...p }; ui.profDraft = null; save(); applyProgram(); render();
  }
  else if (a === 'prog-export') downloadJson(baseProgram(), 'programme-modele.json');
  else if (a === 'prog-import') $('#progFile').click();
  else if (a === 'prog-prev' && confirm(`Revenir au programme « ${db.prev.program.name} » ? Tes séances enregistrées sont conservées.`)) {
    const { program, start } = db.prev;
    useProgram(program); db.profile.start = start; save(); applyProgram();
    ui.progOk = `Programme « ${P.name} » repris · semaine ${week()}.`; ui.progErr = []; render();
  }
  else if (a === 'next-cancel' && confirm('Annuler le nouveau cycle ? Ton programme actuel ne change pas.')) { db.next = null; save(); render(); }
  else if (a === 'gen-open') { openGen(!!t.dataset.cycle); delete ui.err.gen; showGen(); }
  else if (a === 'gen-close') { ui.gen = null; render(); window.scrollTo(0, 0); }
  else if (a === 'gen-edit') { ui.gen.res = null; showGen(); }
  else if (a === 'gen-preview') {
    const g = ui.gen, tags = morphoTags(g.morpho, MORPHO), res = g.start ? generateProgram({ ...g, tags }, LIBRARY) : null;
    if (res) res.zones = antZones(tags, db.profile ? db.profile.trackedZones : []);
    ui.err.gen = !res ? 'Choisis une date de début.' : !res.program ? 'Aucun exercice possible : coche plus de matériel ou refuse moins d\'exercices.' : '';
    if (ui.err.gen) return showErr('gen');
    g.res = res; showGen();
  }
  else if (a === 'gen-accept' && P.generated && db.profile && cycleState(today(), db.shifts) && ui.gen.start > today()) {
    // Garde la semaine allégée en cours : le nouveau cycle attend sa date
    const { res, equipment, refused, morpho, start } = ui.gen;
    if (!confirm(`Commencer ce nouveau cycle le ${frDate(start)} ? Ton programme actuel continue jusque-là.`)) return;
    db.next = res.program; Object.assign(db.profile, { equipment, refused, morpho }, keepZones()); ui.gen = null; ui.tab = 'dash'; save(); render(); window.scrollTo(0, 0);
  }
  else if (a === 'gen-accept' && (!db.profile || confirm(`Remplacer ton programme « ${P.name} » ? Tes séances enregistrées sont conservées, et tu pourras revenir à ce programme.`))) {
    const { res, equipment, refused, morpho } = ui.gen, zones = keepZones();
    useProgram(res.program); ui.gen = null;
    if (db.profile) { Object.assign(db.profile, { start: null, equipment, refused, morpho }, zones); save(); applyProgram(); } else ui.genSaved = { equipment, refused, morpho, ...zones };
    ui.progOk = `Programme « ${P.name} » créé · début le ${frDate(P.start)}${db.profile ? `, semaine ${week()}` : ''}.`; ui.progErr = []; render(); window.scrollTo(0, 0);
  }
  else if (a === 'export') downloadJson(db, `muscu-${today()}.json`);
  else if (a === 'import-btn') $('#importFile').click();
  else if (a === 'reset' && confirm('Effacer ton profil, tes programmes, tes séances, bilans et mesures ? Cette action est définitive. Exporte d\'abord si besoin.')) { db = blank(); save(); applyProgram(); ui.tab = 'dash'; ui.sid = null; ui.focus = false; ui.setup = {}; ui.genSaved = null; ui.progOk = ''; ui.profDraft = null; ui.zone = { label: '', tags: [] }; render(); }
});

document.addEventListener('input', ev => {
  const i = ev.target;
  if (['kg', 'reps', 'rir'].includes(i.dataset.in)) {
    const log = logFor(wk(), ui.sid), x = setAt(log.ex[i.dataset.ex] || (log.ex[i.dataset.ex] = []), +i.dataset.i);
    setField(x, i); save();
    if (i.dataset.in === 'kg' && i.dataset.i === '0') {
      const e = sessionState().exs.find(v => v.id === i.dataset.ex), kg = x.kg ?? hintFor(e, ui.sid).kg;
      document.querySelectorAll('[data-wpct]').forEach(c => { c.innerHTML = warmLoad(e, kg, +c.dataset.wpct); });
    }
  } else if ('zl' in i.dataset) ui.zone.label = i.value;
  else if (i.dataset.s) draft('s')[i.dataset.s] = i.value;
  else if (i.dataset.p) draft('p')[i.dataset.p] = i.value;
  else if (i.dataset.fat === 'pain') $('#painV').textContent = i.value + ' / 10';
});

document.addEventListener('change', ev => {
  const i = ev.target;
  if ('gs' in i.dataset) ui.gen.start = i.value;
  if (i.dataset.g) {
    const g = ui.gen, put = (list, v) => i.checked ? [...list, v] : list.filter(x => x !== v), box = k => [...document.querySelectorAll(`[data-g=${k}]`)];
    const miss = () => { const n = Object.keys(EQUIPMENT).length - g.equipment.length; $('[data-gq]').textContent = n ? n + ' manquant' + (n > 1 ? 's' : '') : ''; };
    const card = () => { const d = i.closest('details'); d.querySelector('[data-gm]').textContent = answered(MORPHO.cards[+d.querySelector('[data-gm]').dataset.gm], g.morpho); };
    if (i.dataset.g === 'all') { g.equipment = i.checked ? Object.keys(EQUIPMENT) : []; box('eq').forEach(b => { b.checked = i.checked; }); miss(); }
    else if (i.dataset.g === 'eq') { g.equipment = put(g.equipment, i.value); box('all')[0].checked = g.equipment.length === Object.keys(EQUIPMENT).length; miss(); }
    else if (i.dataset.g === 'mq') { if (i.value) g.morpho[i.dataset.q] = i.value; else delete g.morpho[i.dataset.q]; card(); }
    else if (i.dataset.g === 'mqm') { g.morpho[i.dataset.q] = put(g.morpho[i.dataset.q] || [], i.value); card(); }
    else if (i.dataset.g === 'zones') g.zones = i.checked;
    else {
      g.refused = put(g.refused, i.value);
      const d = i.closest('details'), n = d.querySelectorAll('input:checked').length;
      d.querySelector('[data-gn]').textContent = n ? n + ' refusé' + (n > 1 ? 's' : '') : '';
    }
  }
  if (i.dataset.in === 'chart') { ui.chartEx = i.value; render(); }
  if (i.id === 'importFile' && i.files[0]) {
    i.files[0].text().then(txt => {
      const d = migrate(JSON.parse(txt), DEFAULT_PROGRAM, today());
      if (!d) throw new Error();
      if (Object.keys(db.logs).length && !confirm('Remplacer toutes les données de ce téléphone par celles de la sauvegarde ?')) return;
      db = d; save(); applyProgram(); delete ui.err.imp; ui.sid = null; ui.profDraft = null; render();
    }).catch(() => { ui.err.imp = 'Ce fichier n\'est pas une sauvegarde valide.'; render(); });
  }
  if (i.id === 'progFile' && i.files[0]) {
    ui.progOk = ''; ui.progErr = [];
    i.files[0].text().then(txt => {
      let p;
      try { p = JSON.parse(txt); } catch { ui.progErr = ['Le fichier n\'est pas un JSON valide (virgule ou guillemet manquant ?).']; return render(); }
      const errs = validateProgram(p);
      if (errs.length) { ui.progErr = errs; return render(); }
      if (Object.keys(db.logs).length && !confirm('Remplacer le programme ? Tes séances déjà enregistrées sont conservées, mais elles peuvent ne plus correspondre aux nouvelles séances.')) return;
      useProgram(p);
      ui.progOk = `Programme « ${p.name} » importé · début le ${frDate(P.start)}${db.profile ? `, semaine ${week()}` : ''}.`; render();
    }).catch(() => { ui.progErr = ['Le fichier n\'a pas pu être lu.']; render(); });
    i.value = '';
  }
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js');
render();

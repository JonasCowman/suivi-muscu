// Interface. Données stockées uniquement sur l'appareil (localStorage).
const KEY = 'muscu-v1';
const blank = () => ({ logs: {}, daily: {}, fatigue: {}, mesures: [], shift: 0, height: 183 });
let db;
try { db = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { db = blank(); }
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();

const ui = { tab: 'dash', sid: null, open: null, focus: false, chartEx: 'decline', err: {}, rest: null };
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const today = () => new Date().toLocaleDateString('sv-SE');
const week = () => weekOf(today(), db.shift);
const prevFatigue = w => (db.fatigue['S' + (w - 1)] || {}).count || 0;
const fmt = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
const exById = id => SESSIONS.flatMap(s => s.ex).find(e => e.id === id);

function logFor(w, sid) {
  const k = w + '|' + sid;
  return db.logs[k] || (db.logs[k] = { ex: {} });
}

function lastSets(exId, beforeWeek) {
  let best = null, bw = 0;
  for (const [k, log] of Object.entries(db.logs)) {
    const w = +k.split('|')[0];
    const sets = (log.ex[exId] || []).filter(s => s.done);
    if (w < beforeWeek && w > bw && sets.length) { best = sets; bw = w; }
  }
  return best;
}

function bestByWeek(exId) {
  const out = {};
  for (const [k, log] of Object.entries(db.logs)) {
    const w = +k.split('|')[0];
    for (const s of log.ex[exId] || []) if (s.done && s.kg > 0 && s.reps > 0) out[w] = Math.max(out[w] || 0, e1rm(s.kg, s.reps));
  }
  return out;
}

function sessionDone(w, sid) { return !!(db.logs[w + '|' + sid] || {}).done; }

function plannedSets(w, ex) { return setsFor(w, ex, prevFatigue(w)); }

// ---------- Dashboard ----------
function viewDash() {
  const w = week(), m = mesoOf(w), f = prevFatigue(w), t = today();
  const adv = fatigueAdvice(f), nd = nextDeload(w);
  const notStarted = t < START;
  const isSunday = new Date().getDay() === 0 && !notStarted;
  let h = `<div class="row"><div><div class="mut">${esc(m.phase)} · ${esc(m.kcal)}</div><h1>${esc(m.name)} · Semaine ${w}</h1></div><span class="pill">RIR ${esc(rirFor(w, { big: true }))}</span></div>`;
  if (notStarted) h += `<div class="banner info">Le programme démarre le lundi 23 novembre.</div>`;
  h += `<div class="mut" style="margin-bottom:14px">Semaine ${w} sur ${TOTAL_WEEKS}${db.shift ? ` · calendrier décalé de ${db.shift} sem.` : ''}</div>`;
  if (m.deload) h += `<div class="banner info">Semaine allégée : moitié des séries, mêmes charges, RIR 3-4.</div>`;
  else if (f >= 2) h += `<div class="banner ${adv.level}">Bilan de la semaine dernière : ${f} signaux. ${esc(adv.text)}</div>`;
  if (isSunday && !db.fatigue['S' + w]) h += `<div class="banner info row" data-a="go-fatigue" style="cursor:pointer"><span>C'est dimanche : fais ton bilan de fatigue</span><span class="chev">›</span></div>`;
  const oiseau = !!(db.daily[t] || {}).oiseau;
  h += `<h2>Priorité quotidienne</h2><div class="card row"><div><div>Oiseau haltères (épaules postérieures)</div><div class="mut">2 x 20-50 reps · avant la séance</div></div><button class="check ${oiseau ? 'on' : ''}" data-a="oiseau" aria-label="Oiseau fait aujourd'hui">${oiseau ? '✓' : ''}</button></div>`;
  h += `<h2>Planning de la semaine</h2>`;
  for (const s of SESSIONS) {
    const done = sessionDone(w, s.id);
    h += `<div class="card row" data-a="open-session" data-sid="${s.id}" style="cursor:pointer"><span class="dot ${done ? 'done' : ''}"></span><div style="flex:1"><div>${esc(s.name)}</div><div class="mut">${done ? 'Faite' : esc(s.focus)}</div></div><span class="chev">›</span></div>`;
  }
  h += `<div class="mut" style="margin-top:12px">${nd ? `Prochaine semaine allégée : S${nd}` : 'Plus de semaine allégée prévue : retests en S30, bilan en S31.'}</div>`;
  return h;
}

// ---------- Workout ----------
function defaultSid() {
  const dow = new Date().getDay();
  const w = week();
  return (SESSIONS.find(s => s.dow === dow) || SESSIONS.find(s => !sessionDone(w, s.id)) || SESSIONS[0]).id;
}

function sessionState() {
  const w = week();
  const sid = ui.sid || (ui.sid = defaultSid());
  const s = SESSIONS.find(x => x.id === sid);
  const log = logFor(w, sid);
  const exs = s.ex.filter(e => plannedSets(w, e) > 0);
  let total = 0, done = 0;
  for (const e of exs) { const n = plannedSets(w, e); total += n; done += (log.ex[e.id] || []).slice(0, n).filter(x => x.done).length; }
  if (!ui.open || !exs.some(e => e.id === ui.open)) ui.open = (exs.find(e => (log.ex[e.id] || []).filter(x => x.done).length < plannedSets(w, e)) || exs[0]).id;
  return { w, sid, s, log, exs, pct: total ? Math.round(done / total * 100) : 0 };
}

const mmss = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

// Vue d'ensemble de la séance : un exercice par ligne, on touche pour ouvrir la page séance
function viewWork() {
  if (ui.focus) return viewFocus();
  const { w, sid, s, log, exs, pct } = sessionState();
  let h = `<div class="chips">${SESSIONS.map(x => `<button class="${x.id === sid ? 'on' : ''}" data-a="pick" data-sid="${x.id}">${esc(x.name.split(' — ')[0])}${sessionDone(w, x.id) ? ' ✓' : ''}</button>`).join('')}</div>`;
  h += `<h1>${esc(s.name)}</h1><div class="row mut" style="margin:4px 0 6px"><span>Semaine ${w} · ${esc(mesoOf(w).name)}</span><span id="elapsed">${log.start ? '' : 'Pas commencée'}</span></div>`;
  h += `<div class="bar" style="margin-bottom:14px"><div style="width:${pct}%"></div></div>`;
  if (prevFatigue(w) === 2 && !mesoOf(w).deload) h += `<div class="banner mid">Séries bonus retirées cette semaine (bilan fatigue : 2 signaux).</div>`;
  if (prevFatigue(w) >= 3 && !mesoOf(w).deload) h += `<div class="banner high">Semaine allégée anticipée (bilan fatigue : ${prevFatigue(w)} signaux).</div>`;
  if (!log.done) h += `<button class="primary" style="width:100%;margin-bottom:12px" data-a="start">${log.start ? 'Reprendre la séance' : 'Démarrer la séance'}</button>`;
  for (const e of exs) {
    const n = plannedSets(w, e), r = rangeFor(w, e);
    const nDone = (log.ex[e.id] || []).slice(0, n).filter(x => x.done).length;
    h += `<div class="card row" data-a="focus-ex" data-ex="${e.id}" style="cursor:pointer"><span class="dot ${nDone >= n ? 'done' : ''}"></span><div style="flex:1">${esc(e.n)}</div><span class="mut">${nDone}/${n} · ${n} x ${r[0]}-${r[1]}</span></div>`;
  }
  h += `<button class="${log.done ? '' : 'ghost'}" style="width:100%;margin-top:8px" data-a="finish">${log.done ? 'Séance terminée ✓' : 'Terminer la séance'}</button>`;
  return h;
}

// Page séance : un exercice à la fois, grand chrono circulaire
function viewFocus() {
  const { w, s, log, exs, pct } = sessionState();
  const idx = exs.findIndex(e => e.id === ui.open), e = exs[idx];
  const n = plannedSets(w, e), r = rangeFor(w, e), sets = log.ex[e.id] || [], rir = rirFor(w, e);
  const hint = progressionHint(lastSets(e.id, w), r);
  const cur = [...Array(n).keys()].find(i => !(sets[i] || {}).done) ?? -1;
  let h = `<div class="row" style="margin-bottom:8px"><button class="ghost" data-a="back" aria-label="Retour à la séance" style="padding:4px 10px;font-size:22px">‹</button><div class="disp" style="flex:1;text-transform:uppercase;font-weight:700;font-size:21px">${esc(s.name)}</div><span class="mut">${idx + 1} / ${exs.length}</span></div>`;
  h += `<div class="mut" id="elapsed">${log.start ? '' : 'Pas commencée'}</div><div class="bar" style="margin:6px 0 14px"><div style="width:${pct}%"></div></div>`;
  h += `<div class="card"><div class="disp">${esc(e.n)}</div>`;
  if (e.note) h += `<div class="warnchip">⚠ ${esc(e.note)}</div>`;
  h += `<div><span class="tag c">${n} x ${r[0]}-${r[1]}</span><span class="tag c">RIR ${rir}</span>${e.tempo ? `<span class="tag">Tempo ${e.tempo}</span>` : ''}<span class="tag">Repos ${mmss(e.rest)}</span></div>`;
  h += `<div class="mut" style="margin-top:8px;color:var(--cyan)">${esc(hint.text)}</div>`;
  h += `<table class="sets"><tr><th>Série</th><th>Reps</th><th>Charge (kg)</th><th>RIR</th><th></th></tr>`;
  for (let i = 0; i < n; i++) {
    const x = sets[i] || {};
    const kg = x.kg ?? sets.slice(0, i).reverse().find(p => p && p.kg != null)?.kg ?? hint.kg ?? '';
    h += `<tr class="${i === cur ? 'cur' : ''}"><td>${i + 1}</td><td><input type="number" inputmode="numeric" min="0" placeholder="${r[0]}-${r[1]}" value="${x.reps ?? ''}" data-in="reps" data-ex="${e.id}" data-i="${i}"></td><td><input type="number" inputmode="decimal" step="0.5" min="0" value="${kg}" data-in="kg" data-ex="${e.id}" data-i="${i}"></td><td class="mut">${rir}</td><td><button class="check ${x.done ? 'on' : ''}" data-a="set" data-ex="${e.id}" data-i="${i}" aria-label="Valider la série ${i + 1}">${x.done ? '✓' : ''}</button></td></tr>`;
  }
  h += `</table>${ui.err[e.id] ? `<div class="err">${esc(ui.err[e.id])}</div>` : ''}`;
  const em = EX_MUSCLES[e.id] || {};
  h += `<div class="row" style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px"><div style="display:flex;gap:4px">${bodySvg('front', em, null, 46)}${bodySvg('back', em, null, 46)}</div><div style="flex:1"><div class="mut">Muscles travaillés</div>${Object.entries(em).map(([m, k]) => `<div${k < 1 ? ' class="mut"' : ''}>${esc(MUSCLES[m])}${k < 1 ? ' (secondaire)' : ''}</div>`).join('')}</div></div></div>`;
  h += `<div class="timer"><button data-a="rest-skip">Passer</button><div class="ring"><svg viewBox="0 0 180 180" width="180" height="180" aria-hidden="true"><circle cx="90" cy="90" r="80" fill="none" stroke="#1b1e22" stroke-width="10"/><circle id="bigRing" cx="90" cy="90" r="80" fill="none" stroke="#22d3ee" stroke-width="10" stroke-linecap="round" stroke-dasharray="502.7" stroke-dashoffset="0" transform="rotate(-90 90 90)"/></svg><div class="ringtxt"><b id="bigT" data-rest="${e.rest}">${mmss(e.rest)}</b><span class="mut">Temps de repos</span></div></div><button data-a="rest-add">+30 s</button></div>`;
  const last = idx === exs.length - 1;
  h += `<div class="bottom"><button data-a="next-set" style="flex:1">${cur === -1 ? 'Exercice terminé ✓' : 'Terminer la série'}</button><button class="primary" data-a="next-ex" style="flex:1">${last ? 'Terminer la séance' : 'Suivant'}</button></div>`;
  return h;
}

function toggleSet(exId, i) {
  const w = week(), log = logFor(w, ui.sid);
  const sets = log.ex[exId] || (log.ex[exId] = []);
  const row = document.querySelectorAll(`[data-ex="${exId}"][data-i="${i}"]`);
  const x = sets[i] || (sets[i] = {});
  row.forEach(inp => { if (inp.dataset.in) x[inp.dataset.in] = inp.value === '' ? undefined : +inp.value; });
  if (!x.done && !(x.kg >= 0 && x.reps > 0)) { ui.err[exId] = 'Saisis la charge et les reps avant de valider.'; return render(); }
  delete ui.err[exId];
  x.done = !x.done;
  if (x.done) {
    if (!log.start) log.start = Date.now();
    startRest(exById(exId).rest);
  }
  save(); render();
}

// ---------- Minuteur de repos ----------
function startRest(sec) { ui.rest = { end: Date.now() + sec * 1000, total: sec }; tick(); }
function tick() {
  const el = $('#rest');
  if (ui.tab === 'work' && ui.sid) {
    const log = db.logs[week() + '|' + ui.sid];
    const e = $('#elapsed');
    if (e && log && log.start && !log.done) { const s = Math.floor((Date.now() - log.start) / 1000); e.textContent = `Séance en cours · ${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
  }
  const big = $('#bigT');
  if (!ui.rest) {
    el.style.display = 'none';
    if (big) { big.textContent = mmss(+big.dataset.rest); $('#bigRing').setAttribute('stroke-dashoffset', '0'); }
    return;
  }
  const left = Math.max(0, Math.round((ui.rest.end - Date.now()) / 1000));
  el.style.display = big ? 'none' : 'flex';
  $('#restT').textContent = mmss(left);
  $('#ring').setAttribute('stroke-dashoffset', (175.9 * (1 - left / ui.rest.total)).toFixed(1));
  if (big) { big.textContent = mmss(left); $('#bigRing').setAttribute('stroke-dashoffset', (502.7 * (1 - left / ui.rest.total)).toFixed(1)); }
  if (left === 0) { ui.rest = null; if (navigator.vibrate) navigator.vibrate([300, 150, 300]); beep(); setTimeout(tick, 0); }
}
function beep() {
  try { const c = new AudioContext(), o = c.createOscillator(); o.frequency.value = 880; o.connect(c.destination); o.start(); o.stop(c.currentTime + 0.4); } catch {}
}
setInterval(tick, 500);

// ---------- Analytics ----------
function chart(exId) {
  const data = bestByWeek(exId), weeks = Object.keys(data).map(Number).sort((a, b) => a - b);
  if (!weeks.length) return `<div class="mut">Pas encore de données pour cet exercice.</div>`;
  const vals = weeks.map(w => data[w]), lo = Math.min(...vals) * 0.95, hi = Math.max(...vals) * 1.05;
  const X = w => 20 + (w - 1) / (TOTAL_WEEKS - 1) * 290, Y = v => 110 - (v - lo) / (hi - lo || 1) * 95;
  const pts = weeks.map(w => `${X(w).toFixed(1)},${Y(data[w]).toFixed(1)}`).join(' ');
  const marks = MESOS.filter(m => m.deload).map(m => `<line x1="${X(m.from)}" y1="8" x2="${X(m.from)}" y2="112" stroke="#2a2e33" stroke-dasharray="3 3"/>`).join('');
  return `<svg viewBox="0 0 320 125" width="100%" role="img" aria-label="Courbe de progression">${marks}<polyline points="${pts}" fill="none" stroke="#22d3ee" stroke-width="2.5"/>${weeks.map(w => `<circle cx="${X(w)}" cy="${Y(data[w])}" r="3" fill="#22d3ee"/>`).join('')}<text x="20" y="123" fill="#8b9bab" font-size="10">S1</text><text x="300" y="123" fill="#8b9bab" font-size="10">S31</text></svg>`;
}

// Séries faites par muscle sur la période (en semaines), comparées au volume prévu par le programme
function muscleStats(period) {
  const w = week(), n = period === 'all' ? w : Math.min(period, w), from = w - n + 1;
  const sets = {};
  for (const [k, log] of Object.entries(db.logs)) {
    const lw = +k.split('|')[0];
    if (lw < from || lw > w) continue;
    for (const [exId, arr] of Object.entries(log.ex)) {
      const done = arr.filter(s => s && s.done).length;
      for (const [m, f] of Object.entries(EX_MUSCLES[exId] || {})) sets[m] = (sets[m] || 0) + done * f;
    }
  }
  const plan = plannedWeekly(), fills = {};
  for (const m in MUSCLES) fills[m] = (sets[m] || 0) / n / plan[m];
  return { sets, n, plan, fills };
}

function viewMuscleMap() {
  const p = ui.period || 4, st = muscleStats(p), sel = ui.muscle;
  let h = `<h2>Carte musculaire</h2><div class="chips">${[[4, 'Dernier mois'], [13, '3 derniers mois'], ['all', 'Saison']].map(([v, l]) => `<button class="${v === p ? 'on' : ''}" data-a="period" data-p="${v}">${l}</button>`).join('')}</div>`;
  h += `<div class="card"><div style="display:flex;justify-content:space-around">${bodySvg('front', st.fills, sel, 140)}${bodySvg('back', st.fills, sel, 140)}</div>`;
  h += `<div class="mut" style="display:flex;justify-content:space-around;margin-top:4px"><span>Face</span><span>Dos</span></div>`;
  if (sel) {
    const per = (st.sets[sel] || 0) / st.n;
    h += `<div class="banner info" style="margin:10px 0 0"><b style="font-size:18px">${esc(MUSCLES[sel])}</b><br>${fmt(st.sets[sel] || 0)} séries sur ${st.n} semaine${st.n > 1 ? 's' : ''} · ${fmt(per)} par semaine (prévu ${fmt(st.plan[sel])})</div>`;
  } else h += `<div class="mut" style="text-align:center;margin-top:6px">Touche un muscle pour le détail. Plus c'est cyan, plus tu es proche du volume prévu.</div>`;
  h += `</div><div class="card">`;
  for (const m of Object.keys(MUSCLES).sort((a, b) => st.plan[b] - st.plan[a])) {
    const per = (st.sets[m] || 0) / st.n, pct = Math.min(100, Math.round(per / st.plan[m] * 100));
    h += `<div data-a="muscle" data-m="${m}" style="padding:6px 0;cursor:pointer${m === sel ? ';color:var(--cyan)' : ''}"><div class="row"><span>${esc(MUSCLES[m])}</span><span class="mut">${fmt(per)} / ${fmt(st.plan[m])} séries par sem.</span></div><div class="bar" style="margin-top:4px"><div style="width:${pct}%"></div></div></div>`;
  }
  return h + `<div class="mut" style="margin-top:6px">Un muscle secondaire compte pour une demi-série (ex. triceps au développé).</div></div>`;
}

function viewStats() {
  const w = week();
  const opts = SESSIONS.flatMap(s => s.ex).filter((e, i, a) => a.findIndex(x => x.id === e.id) === i);
  const data = bestByWeek(ui.chartEx), ws = Object.keys(data).map(Number).sort((a, b) => a - b);
  let h = `<h1>Analytics</h1>${viewMuscleMap()}<h2>Progression</h2><div class="card"><select data-in="chart" style="width:100%;font:inherit;color:var(--txt);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px">${opts.map(e => `<option value="${e.id}" ${e.id === ui.chartEx ? 'selected' : ''}>${esc(e.n)}</option>`).join('')}</select>`;
  h += `<div class="row" style="margin:10px 0 4px"><span class="mut">Charge estimée sur 1 rep</span><b>${ws.length ? fmt(data[ws[ws.length - 1]]) + ' kg' : '—'}</b></div>${chart(ui.chartEx)}<div class="mut">Les pointillés marquent les semaines allégées.</div></div>`;

  h += `<h2>Objectifs de charge (S12 : +7 à 10 %)</h2><div class="card">`;
  for (const id of KEY_LIFTS) {
    const d = bestByWeek(id), k = Object.keys(d).map(Number).sort((a, b) => a - b);
    const ref = k.length ? d[k[0]] : 0, cur = k.length ? d[k[k.length - 1]] : 0, target = ref * 1.1;
    const pct = ref ? Math.max(0, Math.min(100, (cur - ref) / (target - ref) * 100)) : 0;
    h += `<div style="padding:6px 0"><div class="row"><span>${esc(exById(id).n)}</span><span class="mut">${ref ? `${fmt(ref)} → ${fmt(ref * 1.07)}-${fmt(target)} kg` : 'à mesurer'}</span></div><div class="bar" style="margin-top:5px"><div style="width:${pct}%"></div></div></div>`;
  }
  h += `<div class="mut" style="margin-top:6px">Référence = ta première semaine enregistrée. En sèche, l'objectif est de garder 95 % de tes charges de S12.</div></div>`;

  const f = db.fatigue['S' + w] || {};
  const sig = [['perf', 'Performances en baisse (2 exercices, 2 séances de suite)'], ['motiv', 'Je traîne les pieds pour aller à la salle'], ['sleep', 'Sommeil sous 7 h, ou réveils fatigués 3 nuits ou plus'], ['courb', 'Courbatures encore là après 72 h'], ['poids', 'Perte de poids de plus de 0,7 kg cette semaine (en sèche)']];
  h += `<h2 id="fatigue">Bilan fatigue · semaine ${w}</h2><div class="card">${sig.map(([k, l]) => `<label class="chk"><span>${l}</span><input type="checkbox" data-fat="${k}" ${f[k] ? 'checked' : ''}></label>`).join('')}`;
  h += `<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="row"><span>Douleur coudes / genoux</span><b id="painV">${f.pain || 0} / 10</b></div><input type="range" min="0" max="10" step="1" value="${f.pain || 0}" data-fat="pain"></div>`;
  h += `<button class="primary" style="width:100%" data-a="fat-save">Enregistrer le bilan</button>`;
  if (f.count !== undefined) { const a = fatigueAdvice(f.count); h += `<div class="banner ${a.level === 'ok' ? 'info' : a.level}" style="margin:10px 0 0">${f.count} signal${f.count > 1 ? 'aux' : ''} · semaine prochaine : ${esc(a.text)}</div>`; }
  h += `</div>`;

  const last = db.mesures[db.mesures.length - 1] || {};
  const fields = [['poids', 'Poids moyen (kg)'], ['poitrine', 'Poitrine (cm)'], ['taille', 'Taille au nombril (cm)'], ['hanches', 'Hanches (cm)'], ['cuisse', 'Cuisse (cm)'], ['bras', 'Bras (cm)'], ['cou', 'Cou (cm)']];
  h += `<h2>Mensurations</h2><div class="card"><div class="mut" style="margin-bottom:8px">Toutes les 4 semaines (S4, S8, S12…), le matin à jeun.</div><div class="grid2"><label class="mut">Date<input type="date" data-m="date" value="${today()}"></label>${fields.map(([k, l]) => `<label class="mut">${l}<input type="number" inputmode="decimal" step="0.1" data-m="${k}" placeholder="${last[k] ?? ''}"></label>`).join('')}</div>`;
  h += `${ui.err.mes ? `<div class="err">${esc(ui.err.mes)}</div>` : ''}<button class="primary" style="width:100%;margin-top:10px" data-a="mes-save">Enregistrer les mesures</button></div>`;
  if (db.mesures.length) {
    const bf = navyBodyFat(last.taille, last.cou, db.height);
    h += `<div class="grid2" style="margin-bottom:10px"><div class="metric"><span class="mut">Poids</span><b>${last.poids ? fmt(last.poids) + ' kg' : '—'}</b></div><div class="metric"><span class="mut">Taille</span><b>${last.taille ? fmt(last.taille) + ' cm' : '—'}</b></div><div class="metric"><span class="mut">Poitrine</span><b>${last.poitrine ? fmt(last.poitrine) + ' cm' : '—'}</b></div><div class="metric"><span class="mut">Masse grasse (Navy)</span><b>${bf ? '~' + Math.round(bf) + ' %' : '—'}</b></div></div>`;
    h += `<div class="card">${db.mesures.slice().reverse().map((m, i) => `<div class="row" style="padding:5px 0;border-top:${i ? '1px solid var(--line)' : 'none'}"><span>${esc(m.date)}</span><span class="mut">${[m.poids && fmt(m.poids) + ' kg', m.taille && 'taille ' + fmt(m.taille), m.poitrine && 'poitrine ' + fmt(m.poitrine)].filter(Boolean).join(' · ')}</span></div>`).join('')}</div>`;
  }
  h += `<div class="mut">Photos : range-les dans un album dédié de ton téléphone (face, profil, dos), elles ne sont pas stockées dans l'appli.</div>`;
  return h;
}

// ---------- Profile ----------
function viewProf() {
  const nLogs = Object.values(db.logs).filter(l => l.done).length;
  return `<h1>Profile</h1><div class="mut" style="margin-bottom:14px">${nLogs} séance${nLogs > 1 ? 's' : ''} terminée${nLogs > 1 ? 's' : ''} · début le 23 nov. 2026</div>
  <h2>Calendrier</h2><div class="card"><div class="row"><span>Décalage</span><b>${db.shift} semaine${Math.abs(db.shift) > 1 ? 's' : ''}</b></div><div class="mut" style="margin:6px 0 10px">Après des séances ratées (fêtes) ou une semaine allégée anticipée, décale d'une semaine.</div><div class="row"><button data-a="shift" data-d="-1" style="flex:1">− 1 semaine</button><button data-a="shift" data-d="1" style="flex:1">+ 1 semaine</button></div></div>
  <h2>Taille</h2><div class="card"><label class="mut">Taille en cm (pour la masse grasse)<input type="number" inputmode="numeric" value="${db.height}" data-in="height"></label></div>
  <h2>Sauvegarde</h2><div class="card"><div class="mut" style="margin-bottom:10px">Tes données restent sur ce téléphone. Exporte-les chaque semaine : si l'appli est supprimée, elles sont perdues.</div><div class="row"><button data-a="export" style="flex:1">Exporter</button><button style="flex:1" data-a="import-btn">Importer</button><input type="file" accept="application/json" id="importFile" hidden></div>${ui.err.imp ? `<div class="err">${esc(ui.err.imp)}</div>` : ''}</div>
  <h2>Réinitialiser</h2><div class="card"><button class="ghost" style="color:var(--danger);width:100%" data-a="reset">Effacer toutes les données</button></div>`;
}

// ---------- Rendu et événements ----------
function render() {
  const v = { dash: viewDash, work: viewWork, stats: viewStats, prof: viewProf }[ui.tab]();
  $('#view').innerHTML = v;
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  document.body.classList.toggle('focus', ui.tab === 'work' && !!ui.focus);
  tick();
}

document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-tab],[data-a]');
  if (!t) return;
  if (t.dataset.tab) { ui.tab = t.dataset.tab; window.scrollTo(0, 0); return render(); }
  const a = t.dataset.a, w = week();
  if (a === 'oiseau') { const d = db.daily[today()] || (db.daily[today()] = {}); d.oiseau = !d.oiseau; save(); render(); }
  else if (a === 'open-session' || a === 'pick') { ui.sid = t.dataset.sid; ui.open = null; ui.focus = false; ui.tab = 'work'; window.scrollTo(0, 0); render(); }
  else if (a === 'focus-ex' || a === 'start') { if (t.dataset.ex) ui.open = t.dataset.ex; ui.focus = true; window.scrollTo(0, 0); render(); }
  else if (a === 'back') { ui.focus = false; render(); }
  else if (a === 'muscle') { ui.muscle = ui.muscle === t.dataset.m ? null : t.dataset.m; render(); }
  else if (a === 'period') { ui.period = t.dataset.p === 'all' ? 'all' : +t.dataset.p; render(); }
  else if (a === 'next-set') {
    const e = exById(ui.open), sets = logFor(w, ui.sid).ex[e.id] || [], n = plannedSets(w, e);
    const i = [...Array(n).keys()].find(k => !(sets[k] || {}).done);
    if (i !== undefined) toggleSet(e.id, i);
  }
  else if (a === 'next-ex') {
    const { exs, log } = sessionState(), idx = exs.findIndex(x => x.id === ui.open);
    if (idx < exs.length - 1) ui.open = exs[idx + 1].id;
    else { log.done = true; log.date = today(); ui.focus = false; ui.rest = null; save(); }
    window.scrollTo(0, 0); render();
  }
  else if (a === 'set') toggleSet(t.dataset.ex, +t.dataset.i);
  else if (a === 'finish') { const l = logFor(w, ui.sid); l.done = !l.done; l.date = today(); save(); render(); }
  else if (a === 'rest-add' && ui.rest) { ui.rest.end += 30000; ui.rest.total += 30; tick(); }
  else if (a === 'rest-skip') { ui.rest = null; tick(); }
  else if (a === 'go-fatigue') { ui.tab = 'stats'; render(); $('#fatigue').scrollIntoView(); }
  else if (a === 'fat-save') {
    const f = { date: today() };
    document.querySelectorAll('[data-fat]').forEach(i => { f[i.dataset.fat] = i.type === 'checkbox' ? i.checked : +i.value; });
    f.count = countSignals(f); db.fatigue['S' + w] = f; save(); render(); $('#fatigue').scrollIntoView();
  }
  else if (a === 'mes-save') {
    const m = {};
    document.querySelectorAll('[data-m]').forEach(i => { if (i.value !== '') m[i.dataset.m] = i.type === 'date' ? i.value : +i.value; });
    if (Object.keys(m).length < 2) { ui.err.mes = 'Saisis au moins une mesure.'; return render(); }
    delete ui.err.mes; db.mesures.push(m); db.mesures.sort((x, y) => x.date.localeCompare(y.date)); save(); render();
  }
  else if (a === 'shift') { db.shift += +t.dataset.d; save(); render(); }
  else if (a === 'export') {
    const url = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' }));
    const l = document.createElement('a'); l.href = url; l.download = `muscu-${today()}.json`; l.click(); URL.revokeObjectURL(url);
  }
  else if (a === 'import-btn') $('#importFile').click();
  else if (a === 'reset' && confirm('Effacer toutes tes séances, bilans et mesures ? Cette action est définitive. Exporte d\'abord si besoin.')) { db = blank(); save(); render(); }
});

document.addEventListener('input', ev => {
  const i = ev.target;
  if (i.dataset.in === 'kg' || i.dataset.in === 'reps') {
    const sets = logFor(week(), ui.sid).ex[i.dataset.ex] || (logFor(week(), ui.sid).ex[i.dataset.ex] = []);
    const x = sets[+i.dataset.i] || (sets[+i.dataset.i] = {});
    x[i.dataset.in] = i.value === '' ? undefined : +i.value; save();
  } else if (i.dataset.in === 'height') { db.height = +i.value; save(); }
  else if (i.dataset.fat === 'pain') $('#painV').textContent = i.value + ' / 10';
});

document.addEventListener('change', ev => {
  const i = ev.target;
  if (i.dataset.in === 'chart') { ui.chartEx = i.value; render(); }
  if (i.id === 'importFile' && i.files[0]) {
    i.files[0].text().then(txt => {
      const d = JSON.parse(txt);
      if (!d || typeof d.logs !== 'object') throw new Error();
      db = Object.assign(blank(), d); save(); delete ui.err.imp; render();
    }).catch(() => { ui.err.imp = 'Ce fichier n\'est pas une sauvegarde valide.'; render(); });
  }
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js');
render();

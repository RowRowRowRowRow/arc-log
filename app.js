// ===== ARC Log: state =====
const LS_KEY = 'arcLog.v1';
const DAY_KEYS = ['push', 'pull', 'legs', 'upper', 'lower'];

function defaultState() {
  return {
    version: 1,
    settings: { unit: 'lb', rest: 120 },
    cycle: [...CYCLE_PRESETS['P-P-L-R-U-L-R (7-day week)']],
    cycleIdx: 0,
    templates: JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)),
    custom: [],
    hidden: [],
    history: [],
    active: null,
  };
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (s && s.version) return Object.assign(defaultState(), s);
  } catch (e) { /* ignore */ }
  return defaultState();
}
let S = load();
const save = () => localStorage.setItem(LS_KEY, JSON.stringify(S));

let tab = 'today';
let progressEx = null;
let machineFilter = { q: '', area: 'all' };
let timer = null; // {end, total, beeped}
let pickerCb = null;

// ===== helpers =====
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const allEx = () => EXERCISES.concat(S.custom);
const exMap = () => Object.fromEntries(allEx().map((e) => [e.id, e]));
const ex = (id) => exMap()[id] || { id, name: '(deleted exercise)', area: 'free', p: 'Chest', s: [], inc: 5, cues: [] };
const unit = () => S.settings.unit;
const incFor = (e) => { if (!e.inc) return 0; return unit() === 'kg' ? (e.inc >= 10 ? 5 : 2.5) : e.inc; };
const e1rm = (w, r) => (+w > 0 && +r > 0 ? +w * (1 + Math.min(+r, 15) / 30) : 0);
const fmtT = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtDur = (ms) => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };
const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const dayName = (k) => (k === 'rest' ? 'Rest' : S.templates[k]?.name || k);
const num = (v) => (v === '' || v == null ? '' : +v);
const nSets = (it) => (typeof it.sets === 'number' ? it.sets : it.n || it.sets.length);
const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}

// ===== history queries =====
function lastSession(exId) {
  for (let i = S.history.length - 1; i >= 0; i--) {
    const e = S.history[i].exercises.find((x) => x.ex === exId);
    if (e) {
      const sets = e.sets.filter((s) => s.done && +s.r > 0);
      if (sets.length) return { date: S.history[i].end, sets };
    }
  }
  return null;
}
function bestE1RM(exId) {
  let best = 0;
  for (const h of S.history) for (const e of h.exercises) if (e.ex === exId)
    for (const s of e.sets) if (s.done) best = Math.max(best, e1rm(s.w, s.r));
  return best;
}
function bestSet(exId) {
  let best = null;
  for (const h of S.history) for (const e of h.exercises) if (e.ex === exId)
    for (const s of e.sets) if (s.done && (!best || e1rm(s.w, s.r) > e1rm(best.w, best.r))) best = s;
  return best;
}

// Double-progression suggestion
function suggestion(item) {
  const e = ex(item.ex);
  const last = lastSession(item.ex);
  const inc = incFor(e);
  const u = unit();
  if (!last) {
    return { w: null, r: item.hi, text: e.inc === 0
      ? `First time: do as many clean reps as you can, then log them.`
      : `First time: pick a weight you can lift for ${item.hi} reps with 2-3 left in the tank.` };
  }
  const top = Math.max(...last.sets.map((s) => +s.w || 0));
  const topSets = last.sets.filter((s) => (+s.w || 0) === top);
  const assisted = item.ex === 'm_assist_pullup';
  const hitAll = topSets.length >= nSets(item) && topSets.every((s) => +s.r >= item.hi);
  if (hitAll) {
    if (inc === 0) return { w: top, r: item.hi, text: `You hit ${item.hi}+ on every set. Add weight (dip belt / plate) or slow the reps down.` };
    const nw = assisted ? Math.max(0, top - inc) : top + inc;
    return { w: nw, r: item.lo, up: true, text: `🔥 You hit ${item.hi} on every set last time. ${assisted ? 'Drop the assist' : 'Go up'} to <b>${nw} ${u}</b> × ${item.lo}+.` };
  }
  const minR = Math.min(...topSets.map((s) => +s.r));
  if (minR < item.lo) {
    return { w: top, r: item.lo, text: `Stay at <b>${top} ${u}</b>, aim for ${item.lo}+ on every set. Still stuck next time? Drop 10%.` };
  }
  return { w: top, r: null, text: `Stay at <b>${top} ${u}</b> and beat last time: add a rep to at least one set (goal: ${item.hi} on all ${nSets(item)}).` };
}

// ===== workout lifecycle =====
function startWorkout(key) {
  if (S.active) return toast('Finish or cancel your current workout first');
  const tpl = S.templates[key];
  S.active = {
    id: uid(), day: key || 'custom', name: tpl ? tpl.name : 'Custom Workout', start: Date.now(), notes: '', prs: [],
    fromCycle: key === S.cycle[S.cycleIdx],
    exercises: (tpl ? tpl.items : []).map((it) => ({ ...it, n: it.sets, sets: Array.from({ length: it.sets }, () => ({ w: '', r: '', done: false })) })),
  };
  save(); setTab('today'); window.scrollTo(0, 0);
}

function finishWorkout() {
  const a = S.active;
  const exercises = a.exercises
    .map((e) => ({ ex: e.ex, lo: e.lo, hi: e.hi, sets: e.sets.filter((s) => s.done).map((s) => ({ w: num(s.w) || 0, r: num(s.r) || 0, done: true })) }))
    .filter((e) => e.sets.length);
  if (!exercises.length) {
    if (confirm('No completed sets. Discard this workout?')) { S.active = null; save(); render(); }
    return;
  }
  const rec = { id: a.id, day: a.day, name: a.name, start: a.start, end: Date.now(), notes: a.notes, exercises, prs: a.prs || [] };
  S.history.push(rec);
  advanceCycle(a.day);
  S.active = null; stopTimer(); save(); render();
  showSummary(rec);
}

function advanceCycle(day) {
  const n = S.cycle.length;
  for (let k = 0; k < n; k++) {
    const i = (S.cycleIdx + k) % n;
    if (S.cycle[i] === day) { S.cycleIdx = (i + 1) % n; return; }
  }
}

function showSummary(rec) {
  const sets = rec.exercises.reduce((a, e) => a + e.sets.length, 0);
  const vol = workoutVolume(rec);
  openModal(`
    <h2>💪 ${esc(rec.name)} complete</h2>
    <div class="stats">
      <div class="stat"><b>${fmtDur(rec.end - rec.start)}</b><span>Duration</span></div>
      <div class="stat"><b>${sets}</b><span>Sets</span></div>
      <div class="stat"><b>${Math.round(vol).toLocaleString()}</b><span>Volume (${unit()})</span></div>
    </div>
    ${rec.prs.length ? `<div class="card"><h3>🏆 New PRs</h3><ul class="cues">${rec.prs.map((p) => `<li>${esc(ex(p.ex).name)}: ${p.w} × ${p.r}</li>`).join('')}</ul></div>` : ''}
    <p class="muted">Next up: <b>${dayName(S.cycle[S.cycleIdx])}</b>. Eat some protein, sleep well.</p>
    <button class="btn primary block" data-a="close">Done</button>`);
}

const workoutVolume = (h) => h.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + (+s.w || 0) * (+s.r || 0), 0), 0);

// ===== rest timer =====
function startTimer(sec) {
  timer = { end: Date.now() + sec * 1000, total: sec, beeped: false };
  $('#timer').classList.remove('hidden', 'done'); document.body.classList.add('timing'); tick();
}
function stopTimer() { timer = null; $('#timer').classList.add('hidden'); document.body.classList.remove('timing'); }
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch (e) { /* no audio */ }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
function tick() {
  if (S.active) { const el = $('#elapsed'); if (el) el.textContent = fmtT((Date.now() - S.active.start) / 1000); }
  if (!timer) return;
  const left = (timer.end - Date.now()) / 1000;
  $('#timer-text').textContent = left > 0 ? fmtT(left) : 'Go! ' + fmtT(-left);
  $('#timer-fill').style.width = Math.min(100, Math.max(0, 100 - (left / timer.total) * 100)) + '%';
  if (left <= 0 && !timer.beeped) { timer.beeped = true; $('#timer').classList.add('done'); beep(); }
}
setInterval(tick, 250);

// ===== modal =====
function openModal(html) { $('#sheet').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); pickerCb = null; }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

function openPicker(title, cb) {
  pickerCb = cb;
  openModal(`<h2>${esc(title)}</h2><input id="pick-q" placeholder="Search machines & exercises…" autocomplete="off"><div id="pick-list"></div>`);
  const draw = () => {
    const q = $('#pick-q').value.toLowerCase();
    $('#pick-list').innerHTML = Object.entries(AREAS).map(([k, label]) => {
      const items = allEx().filter((e) => e.area === k && !S.hidden.includes(e.id) && (!q || (e.name + ' ' + e.p).toLowerCase().includes(q)));
      if (!items.length) return '';
      return `<div class="area-h">${label}</div>` + items.map((e) =>
        `<button class="pick-item" data-a="pick" data-v="${e.id}"><span>${esc(e.name)}</span><span class="tag">${e.p}</span></button>`).join('');
    }).join('') || '<p class="muted">No matches.</p>';
  };
  $('#pick-q').addEventListener('input', draw); draw();
}

function exInfo(id) {
  const e = ex(id), last = lastSession(id), best = bestSet(id);
  const hidden = S.hidden.includes(id);
  openModal(`
    <h2>${esc(e.name)}</h2>
    <div class="row wrap"><span class="tag gold">${e.p}</span>${(e.s || []).map((m) => `<span class="tag">${m}</span>`).join('')}<span class="tag">${AREAS[e.area]}</span></div>
    <h3 style="margin-top:14px">Coaching cues</h3>
    <ul class="cues">${(e.cues || []).map((c) => `<li>${esc(c)}</li>`).join('') || '<li class="muted">No cues yet.</li>'}</ul>
    <div class="stats">
      <div class="stat"><b>${best ? `${best.w}×${best.r}` : '—'}</b><span>Best set</span></div>
      <div class="stat"><b>${best ? Math.round(e1rm(best.w, best.r)) : '—'}</b><span>Est. 1RM</span></div>
      <div class="stat"><b>${last ? fmtDate(last.date).split(',')[0] : '—'}</b><span>Last done</span></div>
    </div>
    ${last ? `<p class="small muted">Last session: ${last.sets.map((s) => `${s.w}×${s.r}`).join(', ')}</p>` : ''}
    <div class="row">
      <button class="btn sm ghost" data-a="view-progress" data-v="${id}">📈 Progress</button>
      <button class="btn sm ghost" data-a="toggle-hide" data-v="${id}">${hidden ? '👁 Show in lists' : '🚫 Not at my ARC'}</button>
      ${e.custom ? `<button class="btn sm danger" data-a="del-custom" data-v="${id}">Delete</button>` : ''}
      <span class="grow"></span><button class="btn sm" data-a="close">Close</button>
    </div>`);
}

// ===== views =====
function setTab(t) {
  tab = t;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.v === t));
  render();
}
function render() {
  const v = $('#view');
  v.innerHTML = ({ today: S.active ? viewWorkout : viewToday, split: viewSplit, machines: viewMachines, progress: viewProgress, guide: viewGuide })[tab]();
  if (tab === 'progress') drawChart();
}

function weekStrip() {
  const today = dayStart(Date.now());
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = today - i * 864e5;
    const w = S.history.filter((h) => dayStart(h.end) === d);
    days.push(`<div class="${w.length ? 'hit' : ''} ${i === 0 ? 'today' : ''}">${new Date(d).toLocaleDateString(undefined, { weekday: 'narrow' })}<b>${w.length ? esc(w[0].name.slice(0, 4)) : '·'}</b></div>`);
  }
  return `<div class="week">${days.join('')}</div>`;
}

function viewToday() {
  const next = S.cycle[S.cycleIdx];
  const tip = COACH_TIPS[Math.floor(Date.now() / 864e5) % COACH_TIPS.length];
  let hero;
  if (next === 'rest') {
    hero = `<div class="card hero">
      <span class="tag green">Next up</span><h1>Rest Day 😴</h1>
      <p class="muted">Recovery is when you grow. Go for a walk, stretch, eat your protein.</p>
      <button class="btn primary" data-a="skip-rest">Rest done: next is ${dayName(S.cycle[(S.cycleIdx + 1) % S.cycle.length])} →</button></div>`;
  } else {
    const t = S.templates[next];
    hero = `<div class="card hero">
      <span class="tag gold">Next up</span><h1>${esc(t.name)} Day</h1><div class="muted">${esc(t.focus || '')}</div>
      <ul class="ex-list">${t.items.map((it) => { const l = lastSession(it.ex); return `<li><span>${esc(ex(it.ex).name)}</span><span class="muted">${it.sets}×${it.lo}-${it.hi}${l ? ` · last ${Math.max(...l.sets.map((s) => +s.w))}` : ''}</span></li>`; }).join('')}</ul>
      <button class="btn primary block" style="margin-top:12px" data-a="start" data-v="${next}">▶ Start ${esc(t.name)}</button></div>`;
  }
  return `
    ${hero}
    <h2>This week</h2>${weekStrip()}
    <h2>Train something else</h2>
    <div class="chips">${DAY_KEYS.map((k) => `<button class="chip" data-a="start" data-v="${k}">${esc(dayName(k))}</button>`).join('')}
      <button class="chip" data-a="start" data-v="">+ Empty workout</button></div>
    <h2>Coach's tip</h2><div class="card">💡 ${esc(tip)}</div>`;
}

function viewWorkout() {
  const a = S.active;
  const done = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const total = a.exercises.reduce((n, e) => n + e.sets.length, 0);
  return `
    <div class="wk-head row spread">
      <div><h1 style="margin:0">${esc(a.name)}</h1><span class="muted small">⏱ <span id="elapsed">${fmtT((Date.now() - a.start) / 1000)}</span> · ${done}/${total} sets</span></div>
      <div class="row"><button class="btn sm danger" data-a="cancel">Cancel</button><button class="btn sm primary" data-a="finish">Finish</button></div>
    </div>
    ${a.exercises.map((it, i) => exCard(it, i)).join('')}
    <button class="btn ghost block" data-a="add-ex">+ Add exercise</button>
    <div class="field" style="margin-top:14px"><label>Notes (seat settings, how you felt…)</label>
      <textarea rows="3" data-in="notes">${esc(a.notes)}</textarea></div>`;
}

function exCard(it, i) {
  const e = ex(it.ex);
  const last = lastSession(it.ex);
  const sug = suggestion(it);
  const bw = e.inc === 0;
  const rows = it.sets.map((s, j) => {
    const p = last ? last.sets[Math.min(j, last.sets.length - 1)] : null;
    const phW = sug.w != null ? sug.w : p ? p.w : '';
    const phR = sug.up ? it.lo : p ? p.r : it.hi;
    const pr = (a => a && a.some((x) => x.i === i && x.j === j))(S.active.prs);
    return `<tr class="${s.done ? 'done' : ''}">
      <td class="n">${j + 1}${pr ? '<div class="pr-badge">PR</div>' : ''}</td>
      <td class="prev">${p ? `${p.w}×${p.r}` : '—'}</td>
      <td><input type="number" inputmode="decimal" step="any" placeholder="${phW}" value="${s.w}" data-in="w" data-i="${i}" data-j="${j}"></td>
      <td><input type="number" inputmode="numeric" placeholder="${phR}" value="${s.r}" data-in="r" data-i="${i}" data-j="${j}"></td>
      <td><button class="check" data-a="check" data-i="${i}" data-j="${j}">✓</button></td>
    </tr>`;
  }).join('');
  return `<div class="card ex-card">
    <div class="row spread"><h3 data-a="info" data-v="${it.ex}">${esc(e.name)} <span class="muted small">ⓘ</span></h3>
      <button class="x" data-a="rm-ex" data-i="${i}" title="Remove">✕</button></div>
    <div class="small muted">${nSets(it)} × ${it.lo}-${it.hi} reps · rest ${fmtT(it.rest || S.settings.rest)} · ${e.p}</div>
    <div class="target">🎯 ${sug.text}</div>
    <table class="sets"><thead><tr><th>Set</th><th>Last</th><th>${bw ? '+' + unit() : unit()}</th><th>Reps</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <div class="row" style="margin-top:8px">
      <button class="btn sm ghost" data-a="add-set" data-i="${i}">+ Set</button>
      <button class="btn sm ghost" data-a="rm-set" data-i="${i}">− Set</button>
      <button class="btn sm ghost" data-a="swap-ex" data-i="${i}">⇄ Swap</button>
      <span class="grow"></span>
      ${i > 0 ? `<button class="btn sm ghost" data-a="mv-ex" data-i="${i}" data-v="-1">↑</button>` : ''}
    </div></div>`;
}

function toggleSet(i, j) {
  const it = S.active.exercises[i], s = it.sets[j];
  if (!s.done) {
    // fill from placeholders if left blank
    const row = document.querySelector(`input[data-in="w"][data-i="${i}"][data-j="${j}"]`);
    const rowR = document.querySelector(`input[data-in="r"][data-i="${i}"][data-j="${j}"]`);
    if (s.w === '' && row && row.placeholder !== '') s.w = +row.placeholder;
    if (s.r === '' && rowR && rowR.placeholder !== '') s.r = +rowR.placeholder;
    if (s.w === '') s.w = 0;
    if (!(+s.r > 0)) return toast('Enter your reps first');
    s.done = true;
    const prev = bestE1RM(it.ex);
    const cur = e1rm(s.w, s.r);
    S.active.prs = (S.active.prs || []).filter((p) => p.ex !== it.ex || cur <= e1rm(p.w, p.r));
    const already = S.active.prs.some((p) => p.ex === it.ex);
    if (prev > 0 && cur > prev && !already) {
      S.active.prs.push({ ex: it.ex, w: +s.w, r: +s.r, i, j });
      toast(`🏆 New PR! ${ex(it.ex).name}: ${s.w} × ${s.r}`, 3000);
    }
    startTimer(it.rest || S.settings.rest);
  } else {
    s.done = false;
    S.active.prs = (S.active.prs || []).filter((p) => !(p.i === i && p.j === j));
  }
  save(); render();
}

function viewSplit() {
  const presets = Object.entries(CYCLE_PRESETS);
  const curPreset = presets.find(([, c]) => c.join() === S.cycle.join())?.[0] || '';
  return `
    <h1>Your Split</h1>
    <p class="muted">PPL × UL hits every muscle about twice a week. Tap a day to make it "next up".</p>
    <div class="card">
      <div class="field"><label>Rotation</label>
        <select data-in="preset">${presets.map(([k]) => `<option ${k === curPreset ? 'selected' : ''}>${k}</option>`).join('')}${curPreset ? '' : '<option selected>Custom</option>'}</select></div>
      <div class="chips">${S.cycle.map((k, i) => `<button class="chip ${k === 'rest' ? 'rest' : ''} ${i === S.cycleIdx ? 'next on' : ''}" data-a="set-next" data-v="${i}">${i + 1}. ${esc(dayName(k))}</button>`).join('')}</div>
    </div>
    ${DAY_KEYS.map((k) => {
      const t = S.templates[k];
      return `<div class="card">
        <div class="row spread"><div><h3>${esc(t.name)}</h3><div class="small muted">${esc(t.focus || '')}</div></div>
          <button class="btn sm primary" data-a="start" data-v="${k}">Start</button></div>
        ${t.items.map((it, i) => `<div class="tpl-item">
          <div data-a="info" data-v="${it.ex}" style="cursor:pointer;align-self:center">${esc(ex(it.ex).name)}</div>
          <div class="tpl-btns">
            <button data-a="tpl-mv" data-k="${k}" data-i="${i}" data-v="-1">↑</button>
            <button data-a="tpl-mv" data-k="${k}" data-i="${i}" data-v="1">↓</button>
            <button data-a="tpl-swap" data-k="${k}" data-i="${i}">⇄</button>
            <button data-a="tpl-rm" data-k="${k}" data-i="${i}">✕</button>
          </div>
          <div class="tpl-nums">
            <input type="number" value="${it.sets}" data-in="tpl" data-k="${k}" data-i="${i}" data-f="sets" min="1"> sets
            <input type="number" value="${it.lo}" data-in="tpl" data-k="${k}" data-i="${i}" data-f="lo" min="1"> –
            <input type="number" value="${it.hi}" data-in="tpl" data-k="${k}" data-i="${i}" data-f="hi" min="1"> reps
            <input type="number" value="${it.rest}" data-in="tpl" data-k="${k}" data-i="${i}" data-f="rest" step="15"> s rest
          </div></div>`).join('')}
        <button class="btn sm ghost" style="margin-top:8px" data-a="tpl-add" data-k="${k}">+ Add exercise</button>
      </div>`;
    }).join('')}
    <button class="btn danger sm" data-a="tpl-reset">Reset templates to default</button>`;
}

function viewMachines() {
  const q = machineFilter.q.toLowerCase();
  const list = allEx().filter((e) => (machineFilter.area === 'all' || e.area === machineFilter.area) && (!q || (e.name + ' ' + e.p + ' ' + (e.s || []).join(' ')).toLowerCase().includes(q)));
  return `
    <h1>ARC Machines</h1>
    <p class="muted small">${allEx().length} machines & exercises. Tap one for coaching cues and your stats. Mark anything the ARC doesn't have as "Not at my ARC".</p>
    <input id="m-q" placeholder="Search (e.g. row, chest, curl)…" value="${esc(machineFilter.q)}" autocomplete="off">
    <div class="chips" style="margin:10px 0">
      <button class="chip ${machineFilter.area === 'all' ? 'on' : ''}" data-a="m-area" data-v="all">All</button>
      ${Object.entries(AREAS).map(([k, l]) => `<button class="chip ${machineFilter.area === k ? 'on' : ''}" data-a="m-area" data-v="${k}">${{ free: 'Free Weights', plate: 'Plate-Loaded', pin: 'Pin-Select', cable: 'Cable', smith: 'Smith', bw: 'Bodyweight' }[k]}</button>`).join('')}
    </div>
    <div id="m-list">${machineList(list)}</div>
    <button class="btn ghost block" data-a="add-custom">+ Add a machine / exercise</button>`;
}
function machineList(list) {
  return Object.entries(AREAS).map(([k, label]) => {
    const items = list.filter((e) => e.area === k);
    if (!items.length) return '';
    return `<div class="area-h">${label}</div><div class="card" style="padding:4px 14px">` + items.map((e) => {
      const b = bestSet(e.id); const hid = S.hidden.includes(e.id);
      return `<button class="pick-item" data-a="info" data-v="${e.id}" style="${hid ? 'opacity:.4' : ''}">
        <span>${esc(e.name)}${hid ? ' <span class="small muted">(hidden)</span>' : ''}<br><span class="small muted">${e.p}${e.s?.length ? ' · ' + e.s.join(', ') : ''}</span></span>
        <span class="small ${b ? '' : 'muted'}">${b ? `🏆 ${b.w}×${b.r}` : ''}</span></button>`;
    }).join('') + '</div>';
  }).join('') || '<p class="muted">No matches.</p>';
}

function weeklyVolume() {
  const since = Date.now() - 7 * 864e5;
  const v = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
  for (const h of S.history) if (h.end >= since) for (const e of h.exercises) {
    const x = ex(e.ex); const n = e.sets.length;
    v[x.p] = (v[x.p] || 0) + n;
    (x.s || []).forEach((m) => { v[m] = (v[m] || 0) + n * 0.5; });
  }
  return v;
}

function viewProgress() {
  const now = Date.now();
  const wk = S.history.filter((h) => h.end >= now - 7 * 864e5);
  const mo = S.history.filter((h) => h.end >= now - 30 * 864e5);
  const vol = weeklyVolume();
  const doneIds = [...new Set(S.history.flatMap((h) => h.exercises.map((e) => e.ex)))];
  if (!progressEx || !doneIds.includes(progressEx)) progressEx = doneIds[0] || null;
  const b = progressEx && bestSet(progressEx);
  return `
    <h1>Progress</h1>
    <div class="stats">
      <div class="stat"><b>${wk.length}</b><span>Workouts (7d)</span></div>
      <div class="stat"><b>${mo.length}</b><span>Workouts (30d)</span></div>
      <div class="stat"><b>${S.history.length}</b><span>All time</span></div>
    </div>
    <h2>Weekly sets per muscle</h2>
    <div class="card">
      <p class="small muted" style="margin-top:0">Green zone = 10-20 sets/week, the sweet spot for growth.</p>
      ${MUSCLES.map((m) => { const s = vol[m]; const pct = Math.min(100, (s / 25) * 100); const cls = s >= 10 && s <= 20 ? 'ok' : s > 20 ? 'hi' : '';
        return `<div class="vol-row"><span>${m}</span><div class="vol-bar"><div class="vol-zone"></div><div class="vol-fill ${cls}" style="width:${pct}%"></div></div><b>${+s.toFixed(1)}</b></div>`; }).join('')}
    </div>
    <h2>Exercise progress</h2>
    <div class="card">
      ${doneIds.length ? `
        <select data-in="progress-ex">${doneIds.map((id) => `<option value="${id}" ${id === progressEx ? 'selected' : ''}>${esc(ex(id).name)}</option>`).join('')}</select>
        <p class="small muted">Estimated 1RM per session (Epley). Best set: <b style="color:var(--gold)">${b ? `${b.w} × ${b.r}` : '—'}</b></p>
        <canvas id="chart"></canvas>` : '<p class="muted">Log a workout to see your progress charts.</p>'}
    </div>
    <h2>History</h2>
    ${S.history.slice().reverse().map((h) => `<details class="hist">
      <summary>${esc(h.name)} <span class="muted small">· ${fmtDate(h.end)} · ${fmtDur(h.end - h.start)} · ${Math.round(workoutVolume(h)).toLocaleString()} ${unit()}</span></summary>
      <div>${h.exercises.map((e) => `<div class="small" style="margin:6px 0"><b>${esc(ex(e.ex).name)}</b><br><span class="muted">${e.sets.map((s) => `${s.w}×${s.r}`).join(' · ')}</span></div>`).join('')}
        ${h.notes ? `<p class="small">📝 ${esc(h.notes)}</p>` : ''}
        <button class="btn sm danger" data-a="del-hist" data-v="${h.id}">Delete workout</button></div>
    </details>`).join('') || '<p class="muted">No workouts yet. Your first one is waiting on the Today tab.</p>'}`;
}

function drawChart() {
  const c = $('#chart'); if (!c || !progressEx) return;
  const pts = [];
  for (const h of S.history) {
    const e = h.exercises.find((x) => x.ex === progressEx); if (!e) continue;
    const best = Math.max(...e.sets.map((s) => e1rm(s.w, s.r) || +s.r));
    pts.push({ t: h.end, v: best });
  }
  const dpr = window.devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
  c.width = W * dpr; c.height = H * dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const pad = { l: 40, r: 12, t: 12, b: 24 };
  if (!pts.length) return;
  const vs = pts.map((p) => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (lo === hi) { lo -= 10; hi += 10; }
  const span = hi - lo; lo -= span * 0.1; hi += span * 0.1;
  const x = (i) => pad.l + (pts.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (pts.length - 1)) * (W - pad.l - pad.r));
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  g.font = '11px system-ui'; g.fillStyle = '#8b98b4'; g.strokeStyle = '#26334f'; g.lineWidth = 1;
  for (let k = 0; k <= 3; k++) {
    const v = lo + ((hi - lo) * k) / 3, yy = y(v);
    g.beginPath(); g.moveTo(pad.l, yy); g.lineTo(W - pad.r, yy); g.stroke();
    g.fillText(Math.round(v), 4, yy + 4);
  }
  g.fillText(fmtDate(pts[0].t).split(', ')[1] || '', pad.l, H - 6);
  if (pts.length > 1) { const s = fmtDate(pts[pts.length - 1].t).split(', ')[1] || ''; g.fillText(s, W - pad.r - g.measureText(s).width, H - 6); }
  g.strokeStyle = '#ffbf00'; g.lineWidth = 2.5; g.lineJoin = 'round'; g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(x(i), y(p.v)) : g.moveTo(x(i), y(p.v)))); g.stroke();
  g.fillStyle = '#ffbf00';
  pts.forEach((p, i) => { g.beginPath(); g.arc(x(i), y(p.v), 3.5, 0, 7); g.fill(); });
}

function viewGuide() {
  return `<h1>Training Guide</h1>
    <p class="muted">Your pocket coach. The app applies these rules for you; this is the why.</p>
    ${GUIDE.map((s, i) => `<details ${i === 0 ? 'open' : ''}><summary>${s.t}</summary><div>${s.b}</div></details>`).join('')}
    <h2>All coach's tips</h2>
    <div class="card"><ul class="cues">${COACH_TIPS.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
}

function openSettings() {
  openModal(`
    <h2>Settings</h2>
    <div class="field"><label>Units</label><select data-in="unit"><option ${unit() === 'lb' ? 'selected' : ''}>lb</option><option ${unit() === 'kg' ? 'selected' : ''}>kg</option></select></div>
    <div class="field"><label>Default rest (seconds)</label><input type="number" step="15" value="${S.settings.rest}" data-in="rest"></div>
    <h3 style="margin-top:16px">Your data</h3>
    <p class="small muted">Everything is saved in this browser only. Export a backup now and then, or to move to another device.</p>
    <div class="row wrap">
      <button class="btn sm" data-a="export">⬇ Export backup</button>
      <label class="btn sm" style="display:inline-block">⬆ Import<input type="file" accept=".json" id="import" class="hidden"></label>
      <button class="btn sm danger" data-a="wipe">Erase all data</button>
    </div>
    <button class="btn primary block" style="margin-top:16px" data-a="close">Done</button>`);
  $('#import').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then((txt) => {
      try {
        const d = JSON.parse(txt);
        if (!d.version || !Array.isArray(d.history)) throw new Error('bad');
        if (!confirm(`Import ${d.history.length} workouts? This replaces your current data.`)) return;
        S = Object.assign(defaultState(), d); save(); closeModal(); render(); toast('Imported ✔');
      } catch (err) { toast('That file is not an ARC Log backup'); }
    });
  });
}

function addCustomForm() {
  openModal(`<h2>Add machine / exercise</h2>
    <div class="field"><label>Name</label><input id="c-name" placeholder="e.g. Pendulum Squat"></div>
    <div class="field"><label>Area</label><select id="c-area">${Object.entries(AREAS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
    <div class="field"><label>Primary muscle</label><select id="c-p">${MUSCLES.map((m) => `<option>${m}</option>`).join('')}</select></div>
    <div class="field"><label>Weight jump (lb), 0 for bodyweight</label><input id="c-inc" type="number" value="10"></div>
    <div class="field"><label>Your cues / notes (one per line)</label><textarea id="c-cues" rows="3" placeholder="Seat on 4, pin 3…"></textarea></div>
    <div class="row"><button class="btn ghost" data-a="close">Cancel</button><button class="btn primary grow" data-a="save-custom">Save</button></div>`);
}

// ===== events =====
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-a]'); if (!t) return;
  const a = t.dataset.a, v = t.dataset.v, i = +t.dataset.i, j = +t.dataset.j, k = t.dataset.k;
  const act = S.active;
  switch (a) {
    case 'tab': setTab(v); window.scrollTo(0, 0); break;
    case 'settings': openSettings(); break;
    case 'close': closeModal(); break;
    case 'start': startWorkout(v); break;
    case 'skip-rest': S.cycleIdx = (S.cycleIdx + 1) % S.cycle.length; save(); render(); break;
    case 'finish': finishWorkout(); break;
    case 'cancel': if (confirm('Cancel this workout? Logged sets will be lost.')) { S.active = null; stopTimer(); save(); render(); } break;
    case 'check': toggleSet(i, j); break;
    case 'add-set': { const s = act.exercises[i].sets; s.push({ w: s.length ? s[s.length - 1].w : '', r: '', done: false }); save(); render(); break; }
    case 'rm-set': { const s = act.exercises[i].sets; if (s.length > 1) s.pop(); save(); render(); break; }
    case 'rm-ex': if (confirm(`Remove ${ex(act.exercises[i].ex).name}?`)) { act.exercises.splice(i, 1); act.prs = []; save(); render(); } break;
    case 'mv-ex': { const e = act.exercises.splice(i, 1)[0]; act.exercises.splice(i - 1, 0, e); act.prs = []; save(); render(); break; }
    case 'add-ex': openPicker('Add exercise', (id) => { act.exercises.push({ ex: id, n: 3, lo: 8, hi: 12, rest: S.settings.rest, sets: [1, 2, 3].map(() => ({ w: '', r: '', done: false })) }); save(); render(); }); break;
    case 'swap-ex': openPicker('Swap for…', (id) => { act.exercises[i].ex = id; act.exercises[i].sets.forEach((s) => { s.done = false; s.w = ''; }); act.prs = act.prs.filter((p) => p.i !== i); save(); render(); }); break;
    case 'pick': { const cb = pickerCb; closeModal(); cb && cb(v); break; }
    case 'info': exInfo(v); break;
    case 'view-progress': closeModal(); progressEx = v; setTab('progress'); break;
    case 'toggle-hide': S.hidden = S.hidden.includes(v) ? S.hidden.filter((x) => x !== v) : [...S.hidden, v]; save(); closeModal(); render(); break;
    case 'del-custom': if (confirm('Delete this custom exercise?')) { S.custom = S.custom.filter((e) => e.id !== v); save(); closeModal(); render(); } break;
    case 'timer-add': if (timer) { timer.end += +v * 1000; timer.total = Math.max(timer.total + +v, 1); timer.beeped = false; $('#timer').classList.remove('done'); tick(); } break;
    case 'timer-stop': stopTimer(); break;
    case 'set-next': S.cycleIdx = +v; save(); render(); break;
    case 'tpl-mv': { const it = S.templates[k].items; const n = i + +v; if (n < 0 || n >= it.length) break; [it[i], it[n]] = [it[n], it[i]]; save(); render(); break; }
    case 'tpl-rm': S.templates[k].items.splice(i, 1); save(); render(); break;
    case 'tpl-swap': openPicker('Swap for…', (id) => { S.templates[k].items[i].ex = id; save(); render(); }); break;
    case 'tpl-add': openPicker(`Add to ${S.templates[k].name}`, (id) => { S.templates[k].items.push({ ex: id, sets: 3, lo: 8, hi: 12, rest: 90 }); save(); render(); }); break;
    case 'tpl-reset': if (confirm('Reset all day templates to the defaults?')) { S.templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)); save(); render(); } break;
    case 'm-area': machineFilter.area = v; render(); break;
    case 'add-custom': addCustomForm(); break;
    case 'save-custom': {
      const name = $('#c-name').value.trim(); if (!name) return toast('Give it a name');
      S.custom.push({ id: 'cu_' + uid(), custom: true, name, area: $('#c-area').value, p: $('#c-p').value, s: [], inc: +$('#c-inc').value || 0,
        cues: $('#c-cues').value.split('\n').map((x) => x.trim()).filter(Boolean) });
      save(); closeModal(); render(); toast('Added ✔'); break;
    }
    case 'del-hist': if (confirm('Delete this workout from history?')) { S.history = S.history.filter((h) => h.id !== v); save(); render(); } break;
    case 'export': {
      const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
      const l = document.createElement('a'); l.href = URL.createObjectURL(blob);
      l.download = `arc-log-backup-${new Date().toISOString().slice(0, 10)}.json`; l.click(); break;
    }
    case 'wipe': if (confirm('Erase ALL workouts and settings? This cannot be undone.') && confirm('Really sure?')) { S = defaultState(); save(); stopTimer(); closeModal(); render(); } break;
  }
});

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'm-q') { machineFilter.q = t.value; const q = t.value.toLowerCase();
    const list = allEx().filter((e) => (machineFilter.area === 'all' || e.area === machineFilter.area) && (!q || (e.name + ' ' + e.p + ' ' + (e.s || []).join(' ')).toLowerCase().includes(q)));
    $('#m-list').innerHTML = machineList(list); return; }
  const f = t.dataset.in; if (!f) return;
  if ((f === 'w' || f === 'r') && S.active) { S.active.exercises[+t.dataset.i].sets[+t.dataset.j][f] = t.value === '' ? '' : +t.value; save(); }
  else if (f === 'notes' && S.active) { S.active.notes = t.value; save(); }
  else if (f === 'tpl') { const val = +t.value; if (val > 0) { S.templates[t.dataset.k].items[+t.dataset.i][t.dataset.f] = val; save(); } }
  else if (f === 'rest') { if (+t.value > 0) { S.settings.rest = +t.value; save(); } }
});
document.addEventListener('change', (ev) => {
  const f = ev.target.dataset.in;
  if (f === 'preset' && CYCLE_PRESETS[ev.target.value]) { S.cycle = [...CYCLE_PRESETS[ev.target.value]]; S.cycleIdx = 0; save(); render(); }
  else if (f === 'unit') { S.settings.unit = ev.target.value; save(); render(); }
  else if (f === 'progress-ex') { progressEx = ev.target.value; render(); }
});
window.addEventListener('resize', () => tab === 'progress' && drawChart());

render();

/* أنامل — مدرّب الكتابة السريعة (عربي / English)
   فكرة العمل:
   1) اختبار تحديد مستوى (60 ثانية) يقيس السرعة والدقة لكل حرف.
   2) تدريب تكيّفي: يفتح الحروف تدريجياً (للمبتدئين)، ويركّز على أضعف الحروف،
      ويعيد الكلمات التي أخطأت فيها حتى تكتبها صحيحة 3 مرات.
   3) إحصائيات: منحنى التقدّم، خريطة حرارية للكيبورد، أضعف الحروف. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const AR_RE = /[؀-ۿ]/;
const ALEF = new Set(['ا', 'أ', 'إ', 'آ']);

/* ================= Keyboard layouts ================= */
const ROWS = [
  ['Backquote','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Minus','Equal','Backspace'],
  ['Tab','KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP','BracketLeft','BracketRight','Backslash'],
  ['CapsLock','KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon','Quote','Enter'],
  ['ShiftLeft','KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash','ShiftRight'],
  ['Space']
];
const WIDE = { Backspace: 2, Tab: 1.5, Backslash: 1.5, CapsLock: 1.75, Enter: 2.25, ShiftLeft: 2.25, ShiftRight: 2.75, Space: 6.5 };
const FN_LABEL = { Backspace: '⌫', Tab: 'Tab', CapsLock: 'Caps', Enter: 'Enter', ShiftLeft: 'Shift', ShiftRight: 'Shift', Space: 'Space' };
const CODES = [...ROWS[0].slice(0, 13), ...ROWS[1].slice(1), ...ROWS[2].slice(1, 12), ...ROWS[3].slice(1, 11)];
const EN_N = [..."`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./"];
const EN_S = [...'~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?'];
const AR_N = ['ذ', ...'1234567890-=', ...'ضصثقفغعهخحجد', '\\', ...'شسيبلاتنمكط', 'ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'];
const AR_S = { KeyT: 'لإ', KeyY: 'إ', KeyG: 'لأ', KeyH: 'أ', KeyB: 'لآ', KeyN: 'آ', Slash: '؟' };
const LAYOUT = { en: { Space: [' ', ' '] }, ar: { Space: [' ', ' '] } };
CODES.forEach((c, i) => { LAYOUT.en[c] = [EN_N[i], EN_S[i]]; LAYOUT.ar[c] = [AR_N[i], AR_S[c] || '']; });
const REV = { en: {}, ar: {} };
for (const l of ['en', 'ar']) for (const [code, [n, s]] of Object.entries(LAYOUT[l])) {
  if ([...n].length === 1 && !REV[l][n]) REV[l][n] = { code, shift: false };
  if (s && [...s].length === 1 && !REV[l][s]) REV[l][s] = { code, shift: true };
}
const FINGER = {};
[
  ['Backquote','Digit1','Tab','KeyQ','CapsLock','KeyA','ShiftLeft','KeyZ'],
  ['Digit2','KeyW','KeyS','KeyX'],
  ['Digit3','KeyE','KeyD','KeyC'],
  ['Digit4','Digit5','KeyR','KeyT','KeyF','KeyG','KeyV','KeyB'],
  ['Digit6','Digit7','KeyY','KeyU','KeyH','KeyJ','KeyN','KeyM'],
  ['Digit8','KeyI','KeyK','Comma'],
  ['Digit9','KeyO','KeyL','Period'],
  ['Digit0','Minus','Equal','Backspace','KeyP','BracketLeft','BracketRight','Backslash','Semicolon','Quote','Enter','Slash','ShiftRight'],
  ['Space']
].forEach((arr, i) => arr.forEach(c => FINGER[c] = i));
const FINGER_NAME = ['خنصر اليد اليسرى', 'بنصر اليد اليسرى', 'وسطى اليد اليسرى', 'سبّابة اليد اليسرى', 'سبّابة اليد اليمنى', 'وسطى اليد اليمنى', 'بنصر اليد اليمنى', 'خنصر اليد اليمنى', 'الإبهام'];

/* ترتيب فتح الحروف (من الأكثر شيوعاً ومن الصف الأوسط) */
const ORDER = {
  en: [...'enitrlsaoudhcygmpbfwkvxjqz'],
  ar: ['ا','ل','م','ن','ي','و','ت','ر','ب','ك','ه','س','ع','د','ف','ق','ح','ج','ة','ش','ص','خ','ى','أ','ط','ض','ز','ث','ذ','غ','إ','ظ','ئ','ء','ؤ','آ']
};
const WORDS = {};
for (const l of ['en', 'ar']) {
  const set = new Set(ORDER[l]);
  WORDS[l] = [...new Set(window.WORD_LISTS[l].trim().split(/\s+/))].filter(w => [...w].every(c => set.has(c)));
}

/* ================= State ================= */
const STORE = 'anamil-v1';
const newProfile = () => ({ placed: false, placement: null, keys: {}, history: [], tests: [], errorWords: {}, unlocked: 6, sinceUnlock: 0, target: 25, totalMs: 0 });
let S = null;
try { S = JSON.parse(localStorage.getItem(STORE)); } catch (e) {}
if (!S || typeof S !== 'object') S = {};
S.lang = S.lang || 'ar';
S.theme = S.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
if (S.sound === undefined) S.sound = true;
S.settings = Object.assign({ length: 25, stopOnError: false, lenient: true, keyboard: true, fingers: true, testDur: 60 }, S.settings);
S.profiles = S.profiles || {};
for (const l of ['ar', 'en']) S.profiles[l] = Object.assign(newProfile(), S.profiles[l]);
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} };
const P = () => S.profiles[S.lang];

let view = 'type', tab = 'practice', mode = 'practice', T = null;
let spans = [], caret = null, lineH = 40, line0 = 0, kbKeys = {};
const textEl = $('#text'), wrapEl = $('#textWrap'), board = $('#board');

/* ================= Adaptive lesson logic ================= */
const normU = c => (S.settings.lenient && S.lang === 'ar' && ALEF.has(c)) ? 'ا' : c;
const same = (typed, exp) => typed === exp || (S.settings.lenient && S.lang === 'ar' && ALEF.has(typed) && ALEF.has(exp));

function activeLetters() {
  const o = ORDER[S.lang];
  return o.slice(0, clamp(P().unlocked, 6, o.length));
}
function keyStat(k) { return P().keys[k] || { h: 0, m: 0, t: 0 }; }
function avgTime() {
  const v = Object.values(P().keys).filter(s => s.h + s.m >= 8 && s.t);
  return v.length ? v.reduce((a, s) => a + s.t, 0) / v.length : 0;
}
function weakness(k, avg) {
  const s = keyStat(k), n = s.h + s.m;
  if (n < 8) return 2.2 - n * 0.05;            // حرف لم نجمع عنه بيانات كافية
  const err = (s.m + 0.5) / (n + 5);
  const slow = s.t && avg ? s.t / avg : 1;
  return err * 8 + slow;
}
function pseudo(letters, focus) {
  const len = 3 + Math.floor(Math.random() * 3), fpos = Math.floor(Math.random() * len), out = [];
  const inner = letters.filter(c => !'ةىءئؤآ'.includes(c));
  let guard = 0;
  for (let i = 0; i < len && guard++ < 50; i++) {
    let c = (i === fpos && focus.length) ? pick(focus) : letters[Math.floor(Math.pow(Math.random(), 1.6) * letters.length)];
    if (S.lang === 'ar' && 'ةى'.includes(c) && i !== len - 1) c = pick(inner);
    if (out.length >= 2 && out[out.length - 1] === c && out[out.length - 2] === c) { i--; continue; }
    out.push(c);
  }
  return out.join('');
}
function makeLesson() {
  const p = P(), letters = activeLetters(), set = new Set(letters), all = ORDER[S.lang];
  const ok = w => [...w].every(c => set.has(normU(c)));
  const pool = WORDS[S.lang].filter(ok);
  const avg = avgTime();
  const ranked = letters.slice().sort((a, b) => weakness(b, avg) - weakness(a, avg));
  const focus = [];
  if (p.unlocked < all.length) focus.push(letters[letters.length - 1]);   // آخر حرف تم فتحه
  for (const k of ranked) { if (focus.length >= (p.unlocked < all.length ? 2 : 3)) break; if (!focus.includes(k)) focus.push(k); }
  const N = +S.settings.length, words = [];
  const review = shuffle(Object.keys(p.errorWords).filter(ok)).slice(0, Math.floor(N / 5));
  words.push(...review);
  const withFocus = pool.filter(w => focus.some(f => w.includes(f)));
  let guard = 0;
  while (words.length < N && guard++ < 500) {
    const r = Math.random(); let w;
    if (pool.length < 15 || (withFocus.length < 6 && r < 0.45)) w = pseudo(letters, focus);
    else if (r < 0.65 && withFocus.length) w = pick(withFocus);
    else w = pick(pool);
    if (words[words.length - 1] === w) continue;
    words.push(w);
  }
  return { words: shuffle(words), focus, review };
}
function randomWords(n) {
  const list = WORDS[S.lang], out = [];
  while (out.length < n) { const w = pick(list); if (w !== out[out.length - 1]) out.push(w); }
  return out;
}
function level(wpm) {
  if (wpm < 15) return { name: 'مبتدئ', icon: '🌱' };
  if (wpm < 30) return { name: 'أساسي', icon: '🚶' };
  if (wpm < 45) return { name: 'متوسط', icon: '🏃' };
  if (wpm < 65) return { name: 'متقدّم', icon: '🚀' };
  return { name: 'محترف', icon: '⚡' };
}
function applyPlacement(wpm, acc) {
  const p = P(), n = ORDER[S.lang].length;
  let u = wpm < 15 ? 6 : wpm < 25 ? 10 : wpm < 35 ? 16 : wpm < 45 ? 24 : n;
  if (acc < 0.85) u = Math.max(6, u - 6);
  p.unlocked = Math.min(n, u);
  p.target = clamp(Math.round(wpm * 1.1 / 5) * 5, 20, 90);
  p.sinceUnlock = 0;
  p.placed = true;
  p.placement = { wpm, acc, d: Date.now() };
}
function checkUnlock() {
  const p = P(), all = ORDER[S.lang];
  if (p.unlocked >= all.length) return null;
  p.sinceUnlock = (p.sinceUnlock || 0) + 1;
  const h = p.history.slice(-2);
  if (p.sinceUnlock >= 2 && h.length === 2 && h.every(x => x.wpm >= p.target && x.acc >= 0.93)) {
    p.unlocked++; p.sinceUnlock = 0;
    return all[p.unlocked - 1];
  }
  return null;
}
function recordKey(k, ok, dt) {
  const p = P(); const s = p.keys[k] || (p.keys[k] = { h: 0, m: 0, t: 0 });
  if (ok) { s.h++; if (dt && dt < 2500) s.t = s.t ? s.t * 0.85 + dt * 0.15 : dt; }
  else s.m++;
  if (s.h + s.m > 150) { s.h *= 0.8; s.m *= 0.8; }    // الأداء الأحدث له وزن أكبر
  const ss = T.sk[k] || (T.sk[k] = { h: 0, m: 0 }); ok ? ss.h++ : ss.m++;
}

/* ================= Rendering the text ================= */
function calcWordOf() {
  let wi = 0; T.wordOf = [];
  for (let i = 0; i < T.text.length; i++) { T.wordOf[i] = wi; if (T.text[i] === ' ') wi++; }
}
function appendText(str) {
  const frag = document.createDocumentFragment(); let word = null;
  for (const c of str) {
    const sp = document.createElement('span'); sp.className = c === ' ' ? 'ch sp' : 'ch'; sp.textContent = c;
    if (c === ' ') { word = null; frag.appendChild(sp); }
    else { if (!word) { word = document.createElement('span'); word.className = 'w'; frag.appendChild(word); } word.appendChild(sp); }
    spans.push(sp);
  }
  textEl.insertBefore(frag, caret);
}
function renderText() {
  textEl.innerHTML = ''; spans = [];
  const rtl = S.lang === 'ar';
  textEl.dir = rtl ? 'rtl' : 'ltr';
  textEl.className = 'text ' + S.lang;
  wrapEl.className = 'text-wrap ' + S.lang;
  caret = document.createElement('i'); caret.className = 'caret idle'; textEl.appendChild(caret);
  appendText(T.text);
  textEl.style.transform = '';
}
function measure() {
  lineH = parseFloat(getComputedStyle(textEl).lineHeight) || 40;
  line0 = spans[0] ? spans[0].offsetTop : 0;
}
function placeCaret() {
  if (!spans.length || !T) return;
  const rtl = S.lang === 'ar'; let i = T.pos, end = false;
  if (i >= spans.length) { i = spans.length - 1; end = true; }
  const sp = spans[i], l = sp.offsetLeft, w = sp.offsetWidth;
  const x = rtl ? (end ? l : l + w) : (end ? l + w : l);
  caret.style.transform = `translate(${x - 1}px, ${sp.offsetTop}px)`;
  caret.style.height = sp.offsetHeight + 'px';
  const ln = Math.round((sp.offsetTop - line0) / lineH);
  textEl.style.transform = `translateY(${-Math.max(0, ln - 1) * lineH}px)`;
}

/* ================= Round lifecycle ================= */
function newRound(reuse) {
  stopTicker();
  let words, focus = [], review = [];
  if (mode === 'practice') {
    const L = reuse || makeLesson(); words = L.words; focus = L.focus; review = L.review || [];
  } else words = reuse ? reuse.words : randomWords(mode === 'test' ? Math.max(60, S.settings.testDur * 2) : 120);
  T = {
    words: [...words], focus, review, text: words.join(' '), pos: 0, marks: [], correct: 0, keys: 0, errors: 0,
    started: false, done: false, t0: 0, last: 0, wordErr: new Set(), sk: {}, samples: [], wordOf: [],
    duration: mode === 'test' ? S.settings.testDur : mode === 'placement' ? 60 : 0
  };
  calcWordOf();
  renderText(); renderModeBar(); renderKbLabels(); updateLive();
  $('#result').hidden = true; board.hidden = false; board.classList.remove('running');
  requestAnimationFrame(() => { measure(); placeCaret(); highlight(); });
}
function restart() {
  if (!T) return;
  if (mode === 'practice' && (T.started || T.done)) newRound({ words: T.words, focus: T.focus, review: T.review });
  else newRound();
}
function next() {
  if (T && T.retry) { newRound(); return; }
  if (mode === 'placement') { mode = 'practice'; }
  newRound();
}
function extendTest() {
  const more = randomWords(40), add = ' ' + more.join(' ');
  T.words.push(...more); T.text += add; calcWordOf(); appendText(add);
}

let tick = null;
function startTicker() {
  stopTicker();
  tick = setInterval(() => {
    const el = (performance.now() - T.t0) / 1000;
    if (T.duration) {
      while (T.samples.length < Math.floor(el)) {
        const s = T.samples.length + 1;
        T.samples.push({ wpm: Math.round(T.correct / 5 / (s / 60)), acc: T.keys ? (T.keys - T.errors) / T.keys : 1 });
      }
      if (el >= T.duration) { finish(); return; }
    }
    updateLive();
  }, 100);
}
function stopTicker() { if (tick) clearInterval(tick); tick = null; }

function fmtTime(ms) { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function updateLive() {
  if (!T) return;
  const ms = T.started ? performance.now() - T.t0 : 0;
  const wpm = ms > 1500 ? Math.round(T.correct / 5 / (ms / 60000)) : 0;
  $('#liveWpm').textContent = wpm;
  $('#liveAcc').textContent = (T.keys ? Math.round((T.keys - T.errors) / T.keys * 100) : 100) + '%';
  if (T.duration) {
    $('#liveTime').textContent = fmtTime(T.duration * 1000 - ms);
    $('#timeLbl').textContent = 'المتبقي';
    $('#prog').style.width = clamp(ms / (T.duration * 10), 0, 100) + '%';
  } else {
    $('#liveTime').textContent = fmtTime(ms);
    $('#timeLbl').textContent = 'الوقت';
    $('#prog').style.width = (T.pos / T.text.length * 100) + '%';
  }
}

/* ================= Typing ================= */
function typeChar(c) {
  if (!T || T.done) return;
  const now = performance.now();
  if (!T.started) {
    T.started = true; T.t0 = now; T.last = now; startTicker();
    board.classList.add('running'); caret.classList.remove('idle');
  }
  const exp = T.text[T.pos], ok = same(c, exp), dt = now - T.last;
  T.last = now; T.keys++;
  if (exp !== ' ') recordKey(exp, ok, T.pos > 0 ? dt : 0);
  if (!ok) {
    T.errors++; T.wordErr.add(T.wordOf[T.pos]); sound('err'); flashErr(exp);
    if (S.settings.stopOnError) {
      spans[T.pos].classList.add('miss'); T.hadMiss = true;
      board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
      updateLive(); return;
    }
  } else sound('ok');
  const sp = spans[T.pos];
  sp.className = 'ch' + (exp === ' ' ? ' sp' : '') + (ok ? (sp.classList.contains('miss') ? ' fixed' : ' ok') : ' bad');
  T.marks[T.pos] = ok; if (ok) T.correct++;
  T.pos++;
  if (T.duration && T.text.length - T.pos < 80) extendTest();
  placeCaret(); highlight(); updateLive();
  if (T.pos >= T.text.length) finish();
}
function back(word) {
  if (!T || T.done || T.pos === 0) return;
  const del = () => {
    T.pos--; if (T.marks[T.pos]) T.correct--; T.marks[T.pos] = undefined;
    const sp = spans[T.pos]; sp.className = 'ch' + (T.text[T.pos] === ' ' ? ' sp' : '');
  };
  if (word) {
    while (T.pos > 0 && T.text[T.pos - 1] === ' ') del();
    while (T.pos > 0 && T.text[T.pos - 1] !== ' ') del();
  } else del();
  placeCaret(); highlight(); updateLive();
}
function finish() {
  if (T.done) return;
  T.done = true; stopTicker();
  let ms = performance.now() - T.t0;
  if (T.duration) ms = Math.min(ms, T.duration * 1000);
  ms = Math.max(ms, 1000);
  const wpm = Math.round(T.correct / 5 / (ms / 60000));
  const acc = T.keys ? (T.keys - T.errors) / T.keys : 0;
  const p = P(); p.totalMs += ms;
  const rec = { d: Date.now(), wpm, acc: +acc.toFixed(3), ms: Math.round(ms) };
  const r = { ...rec, mode };

  // الكلمات الخاطئة تدخل قائمة المراجعة، وتخرج بعد كتابتها صحيحة 3 مرات
  const lastWord = T.pos >= T.text.length ? T.words.length - 1 : T.wordOf[Math.max(0, T.pos - 1)] - 1;
  for (let wi = 0; wi <= lastWord; wi++) {
    const w = T.words[wi];
    if (T.wordErr.has(wi)) { delete p.errorWords[w]; p.errorWords[w] = 3; }
    else if (p.errorWords[w] && --p.errorWords[w] <= 0) delete p.errorWords[w];
  }
  const ek = Object.keys(p.errorWords); ek.slice(0, Math.max(0, ek.length - 80)).forEach(k => delete p.errorWords[k]);

  r.miss = Object.entries(T.sk).filter(([, s]) => s.m > 0)
    .sort((a, b) => (b[1].m / (b[1].h + b[1].m)) - (a[1].m / (a[1].h + a[1].m)) || b[1].m - a[1].m)
    .slice(0, 6).map(([k, s]) => ({ k, acc: s.h / (s.h + s.m) }));
  r.reviewCount = Object.keys(p.errorWords).length;

  if (mode === 'placement' && T.keys < 15) {
    save(); board.hidden = true; $('#kb').hidden = true; $('#finger').hidden = true;
    const box = $('#result'); box.hidden = false;
    box.innerHTML = `<h2>ما كتبت كفاية لنقيس مستواك</h2><p class="lbl">اكتب على الأقل كم كلمة خلال الدقيقة. إذا الكيبورد ما بيستجيب، انقر على مربع النص أول.</p><div class="r-actions" style="margin-top:16px"><button class="btn primary big" id="rNext">أعد الاختبار <kbd>Enter</kbd></button></div>`;
    $('#rNext').onclick = () => newRound();
    T.retry = true;
    return;
  }
  if (mode === 'placement') {
    applyPlacement(wpm, acc); r.level = level(wpm); r.samples = T.samples;
    p.tests.push({ ...rec, dur: 60, placement: true });
  } else if (mode === 'practice') {
    const prev = p.history.slice(-10);
    r.avg = prev.length ? Math.round(prev.reduce((a, b) => a + b.wpm, 0) / prev.length) : null;
    p.history.push(rec); if (p.history.length > 600) p.history.shift();
    r.unlocked = checkUnlock();
    r.focus = T.focus.map(k => ({ k, s: T.sk[k] }));
  } else {
    const prevT = p.tests.filter(t => t.dur === T.duration);
    const best = Math.max(0, ...prevT.map(t => t.wpm));
    rec.dur = T.duration; p.tests.push(rec); if (p.tests.length > 300) p.tests.shift();
    r.record = prevT.length > 0 && wpm > best; r.best = Math.max(best, wpm); r.samples = T.samples;
  }
  save(); showResult(r);
}

/* ================= Result card ================= */
function missHtml(miss, title) {
  if (!miss.length) return `<div class="r-box"><h3>${title}</h3><p>ولا غلطة! 👏</p></div>`;
  return `<div class="r-box"><h3>${title}</h3><div class="chips">${miss.map(m => `<span class="chip bad">${m.k}<small>${Math.round(m.acc * 100)}%</small></span>`).join('')}</div></div>`;
}
function showResult(r) {
  board.hidden = true; highlight();
  const box = $('#result'); box.hidden = false;
  const p = P(), all = ORDER[S.lang];
  const delta = r.avg != null ? r.wpm - r.avg : null;
  let html = '', cta = 'التالي';
  if (r.mode === 'placement') {
    html += `<h2>نتيجة اختبار تحديد المستوى</h2><div class="level">${r.level.icon} مستواك: <b>${r.level.name}</b></div>`;
  } else if (r.mode === 'test') {
    html += `<h2>${r.record ? '🏆 رقم قياسي جديد!' : 'نتيجة الاختبار'}</h2><div class="lbl">اختبار ${T.duration} ثانية · أفضل نتيجة لك: <b>${r.best}</b> ك/د</div>`;
  } else {
    html += `<h2>${r.acc >= 0.97 ? 'ممتاز! 🔥' : r.acc >= 0.92 ? 'أحسنت 👍' : 'ركّز على الدقة أكثر من السرعة 🎯'}</h2>`;
  }
  html += `<div class="r-nums">
    <div class="r-num"><b>${r.wpm}</b><span>كلمة/دقيقة${delta != null ? `<em class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'}${Math.abs(delta)}</em>` : ''}</span></div>
    <div class="r-num"><b>${Math.round(r.acc * 100)}%</b><span>الدقة</span></div>
    <div class="r-num sm"><b>${fmtTime(r.ms)}</b><span>الوقت</span></div>
  </div>`;
  html += '%%ACTIONS%%';
  if (r.mode === 'placement') html += `<div class="next-step"><b>الخطوة الجاية 👇</b><p>دروس قصيرة (حوالي دقيقة لكل درس) مبنية على نتيجتك. كل درس بيركّز على الحروف اللي غلطت فيها، وبيرجّعلك الكلمات الخاطئة لحد ما تكتبها صح. بعد كل درس بتشوف نتيجتك وبتضغط <kbd>Enter</kbd> للدرس اللي بعده.</p></div>`;
  if (r.unlocked) html += `<div class="unlock-msg"><span class="chip">${r.unlocked}</span><div><b>فتحت حرفاً جديداً!</b><div class="lbl">وصلت للهدف في درسين متتاليين — الحرف الجديد سيظهر كثيراً في الدروس القادمة.</div></div></div>`;
  html += '<div class="r-grid">';
  if (r.mode === 'placement') {
    html += missHtml(r.miss, 'الحروف اللي غلطت فيها أكثر');
    html += `<div class="r-box"><h3>خطّتك</h3><p>${p.unlocked < all.length
      ? `بنبدأ بـ <b>${p.unlocked}</b> حروف من أصل ${all.length}. كل ما توصل <b>${p.target}</b> كلمة/دقيقة بدقة 93% في درسين متتاليين، بنفتح لك حرفاً جديداً.`
      : `مستواك ممتاز — كل الحروف مفتوحة. الدروس رح تركّز تلقائياً على أضعف حروفك والكلمات اللي بتغلط فيها. هدفك: <b>${p.target}</b> ك/د.`}</p></div>`;
    cta = 'ابدأ التدريب المخصّص';
  } else if (r.mode === 'practice') {
    const f = r.focus.map(({ k, s }) => s ? `<span class="chip ${s.m / (s.h + s.m) > 0.08 ? 'bad' : ''}">${k}<small>${Math.round(s.h / (s.h + s.m) * 100)}%</small></span>` : '').join('');
    html += `<div class="r-box"><h3>حروف التركيز في هذا الدرس</h3><div class="chips">${f || '—'}</div></div>`;
    html += missHtml(r.miss, 'أخطاء هذا الدرس');
    const left = p.unlocked < all.length;
    html += `<div class="r-box"><h3>التقدّم</h3><p>${left
      ? `الحروف المفتوحة <b>${p.unlocked}/${all.length}</b> · الهدف <b>${p.target}</b> ك/د بدقة 93% لدرسين متتاليين.`
      : `كل الحروف مفتوحة ✔ · متوسط آخر 10 دروس: <b>${r.avg ?? r.wpm}</b> ك/د.`}<br>كلمات في قائمة المراجعة: <b>${r.reviewCount}</b></p></div>`;
  } else {
    html += `<div class="r-box" style="grid-column:1/-1"><h3>السرعة خلال الاختبار</h3>${chart(r.samples.map(s => ({ wpm: s.wpm, acc: s.acc })), true)}</div>`;
    html += missHtml(r.miss, 'الحروف اللي غلطت فيها');
  }
  if (r.mode === 'placement' && r.samples.length > 1)
    html += `<div class="r-box" style="grid-column:1/-1"><h3>السرعة خلال الاختبار</h3>${chart(r.samples, true)}</div>`;
  html += '</div>';
  const actions = `<div class="r-actions"><button class="btn primary big" id="rNext">${cta} <kbd>Enter</kbd></button>${r.mode !== 'placement' ? '<button class="btn" id="rAgain">إعادة نفس النص <kbd>Tab</kbd></button>' : ''}<button class="btn ghost" id="rStats">الإحصائيات</button></div>`;
  box.innerHTML = html.replace('%%ACTIONS%%', actions);
  $('#kb').hidden = true; $('#finger').hidden = true;
  box.scrollIntoView({ block: 'start', behavior: 'smooth' });
  $('#rNext').onclick = next;
  if ($('#rAgain')) $('#rAgain').onclick = restart;
  $('#rStats').onclick = () => go('stats');
}

/* ================= Chart ================= */
let gid = 0;
function chart(data, perSecond) {
  if (data.length < 2) return `<div class="empty">تحتاج إلى نتيجتين على الأقل لعرض الرسم البياني</div>`;
  const W = 720, H = 210, L = 38, R = 42, Tp = 12, B = 24, n = data.length, id = 'g' + (++gid);
  const top = Math.ceil(Math.max(20, ...data.map(d => d.wpm)) * 1.15 / 10) * 10;
  const X = i => L + i * (W - L - R) / (n - 1);
  const Y = v => Tp + (1 - v / top) * (H - Tp - B);
  const YA = a => Tp + (1 - (clamp(a, 0.7, 1) - 0.7) / 0.3) * (H - Tp - B);
  let g = '';
  for (let k = 0; k <= 4; k++) {
    const y = Y(top * k / 4).toFixed(1);
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="grid"/><text x="${L - 8}" y="${+y + 4}" class="ax" text-anchor="end">${Math.round(top * k / 4)}</text><text x="${W - R + 8}" y="${+y + 4}" class="ax acc">${Math.round(70 + k * 7.5)}%</text>`;
  }
  const pw = data.map((d, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(d.wpm).toFixed(1)}`).join('');
  const pa = data.map((d, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${YA(d.acc).toFixed(1)}`).join('');
  const area = `${pw}L${X(n - 1).toFixed(1)},${H - B}L${L},${H - B}Z`;
  const dots = n <= 40 ? data.map((d, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(d.wpm).toFixed(1)}" r="3.2" class="dot"><title>${perSecond ? `ث ${i + 1}: ` : ''}${d.wpm} ك/د · ${Math.round(d.acc * 100)}%</title></circle>`).join('') : '';
  const xl = perSecond ? `<text x="${L}" y="${H - 6}" class="ax">1ث</text><text x="${W - R}" y="${H - 6}" class="ax" text-anchor="end">${n}ث</text>` : `<text x="${L}" y="${H - 6}" class="ax">الأقدم</text><text x="${W - R}" y="${H - 6}" class="ax" text-anchor="end">الأحدث</text>`;
  return `<div dir="ltr"><div class="legend" dir="rtl"><span><i style="background:var(--accent)"></i>السرعة (ك/د)</span><span><i style="background:var(--good)"></i>الدقة</span></div>
  <svg viewBox="0 0 ${W} ${H}" class="chart"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
  ${g}<path d="${area}" fill="url(#${id})"/><path d="${pa}" class="la"/><path d="${pw}" class="lw"/>${dots}${xl}</svg></div>`;
}

/* ================= Keyboard ================= */
function buildKeyboard(el) {
  el.innerHTML = ''; const map = {};
  for (const row of ROWS) {
    const r = document.createElement('div'); r.className = 'kr';
    for (const code of row) {
      const k = document.createElement('div');
      k.className = 'key f' + FINGER[code] + (code in FN_LABEL ? ' fn' : '') + (code === 'KeyF' || code === 'KeyJ' ? ' bump' : '');
      if (WIDE[code]) k.style.setProperty('--w', WIDE[code]);
      k.dataset.code = code;
      r.appendChild(k); map[code] = k;
    }
    el.appendChild(r);
  }
  return map;
}
function labelKeyboard(map, opts = {}) {
  const lang = S.lang, other = lang === 'ar' ? 'en' : 'ar', act = opts.locked ? new Set(activeLetters()) : null;
  for (const [code, k] of Object.entries(map)) {
    if (code in FN_LABEL) { k.innerHTML = `<span class="m">${FN_LABEL[code]}</span>`; continue; }
    const [n, s] = LAYOUT[lang][code], o = LAYOUT[other][code][0];
    const main = lang === 'en' ? n.toUpperCase() : n;
    let h = `<span class="m">${main}</span><span class="s">${lang === 'ar' ? o.toUpperCase() : o}</span>`;
    if (lang === 'ar' && s && [...s].length === 1) h += `<span class="sh">${s}</span>`;
    if (opts.heat) {
      const st = P().keys[n], tot = st ? st.h + st.m : 0;
      if (tot >= 5) {
        const err = st.m / tot;
        k.style.background = `color-mix(in srgb, var(--bad) ${clamp(Math.round(err * 450), 0, 85)}%, var(--key))`;
        h += `<span class="pct">${Math.round((1 - err) * 100)}%</span>`;
        k.title = `${n}: دقة ${Math.round((1 - err) * 100)}% · ${st.t ? Math.round(60000 / st.t) : '—'} حرف/دقيقة`;
      } else { k.style.background = ''; k.title = ''; }
    }
    k.innerHTML = h;
    k.classList.toggle('locked', !!act && ORDER[lang].includes(n) && !act.has(n));
  }
}
function renderKbLabels() {
  const kb = $('#kb');
  kb.hidden = !S.settings.keyboard; $('#finger').hidden = !S.settings.keyboard;
  kb.classList.toggle('fingers', S.settings.fingers);
  labelKeyboard(kbKeys, { locked: mode === 'practice' && P().unlocked < ORDER[S.lang].length });
}
function highlight() {
  for (const k of Object.values(kbKeys)) k.classList.remove('next');
  const fEl = $('#finger');
  const exp = T && !T.done ? T.text[T.pos] : null;
  if (!exp) { fEl.innerHTML = ''; return; }
  const r = REV[S.lang][exp];
  if (!r) { fEl.innerHTML = ''; return; }
  kbKeys[r.code]?.classList.add('next');
  let txt = `<b class="f${FINGER[r.code]}">${FINGER_NAME[FINGER[r.code]]}</b>`;
  if (r.shift) {
    const sh = FINGER[r.code] <= 3 ? 'ShiftRight' : 'ShiftLeft';
    kbKeys[sh].classList.add('next');
    txt += ` + Shift ${sh === 'ShiftRight' ? 'الأيمن' : 'الأيسر'}`;
  }
  fEl.innerHTML = `الحرف التالي <b>${exp === ' ' ? 'مسافة' : exp}</b> ← ${txt}`;
}
function pressKey(code) { const k = kbKeys[code]; if (!k) return; k.classList.add('press'); setTimeout(() => k.classList.remove('press'), 110); }
function flashErr(exp) {
  const r = REV[S.lang][exp]; const k = r && kbKeys[r.code]; if (!k) return;
  k.classList.add('err'); setTimeout(() => k.classList.remove('err'), 260);
}

/* ================= Mode bar ================= */
function renderModeBar() {
  const bar = $('#modeBar'), p = P(), all = ORDER[S.lang];
  if (mode === 'practice') {
    const act = activeLetters(), newest = p.unlocked < all.length ? act[act.length - 1] : null;
    let h = `<div class="chips"><span class="lbl">التركيز على</span>${T.focus.map(k => `<span class="chip">${k}</span>`).join('')}</div>`;
    if (p.unlocked < all.length) h += `<div class="unlock" title="الحروف المفتوحة">${all.map((c, i) => `<i class="${i < p.unlocked ? 'on' : ''} ${c === newest ? 'new' : ''}">${c}</i>`).join('')}</div>`;
    h += `<span class="spacer"></span>`;
    if (T.review.length) h += `<span class="pill">🔁 مراجعة <b>${T.review.length}</b> كلمات غلطت فيها</span>`;
    h += `<span class="pill">الهدف <b>${p.target}</b> ك/د</span>`;
    bar.innerHTML = h;
  } else if (mode === 'test') {
    bar.innerHTML = `<span class="lbl">اختبار سرعة بكلمات عشوائية شائعة</span><span class="spacer"></span><div class="durs">${[15, 30, 60, 120].map(d => `<button data-dur="${d}" class="${d === S.settings.testDur ? 'active' : ''}">${d}ث</button>`).join('')}</div>`;
    bar.querySelectorAll('[data-dur]').forEach(b => b.onclick = () => { S.settings.testDur = +b.dataset.dur; save(); b.blur(); newRound(); });
  } else {
    bar.innerHTML = `<div class="chips"><span class="chip">🎯</span><div><b>اختبار تحديد المستوى</b><div class="lbl">اكتب لمدة 60 ثانية بسرعتك الطبيعية — الدقة أهم من السرعة</div></div></div>`;
  }
}

/* ================= Views ================= */
function show(v) { view = v; $$('.view').forEach(s => s.hidden = s.id !== 'view-' + v); }
function go(t) {
  tab = t; stopTicker();
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  if (t === 'stats') { show('stats'); renderStats(); return; }
  if (t === 'practice' && !P().placed) { show('welcome'); renderWelcome(); return; }
  mode = t; show('type'); newRound();
}
function startPlacement() { mode = 'placement'; tab = 'practice'; show('type'); newRound(); }

function renderWelcome() {
  const ar = S.lang === 'ar', other = S.profiles[ar ? 'en' : 'ar'];
  $('#welcomeBody').innerHTML = `<div class="hero">
    <div class="hero-badge">${ar ? 'ع' : 'En'}</div>
    <h1>أهلاً! قبل ما نبلّش، خلّينا نعرف مستواك ${ar ? 'بالعربي' : 'بالإنجليزي'}</h1>
    <p>اختبار قصير مدته دقيقة واحدة. بنقيس سرعتك ودقّتك في كل حرف، وبعدها بنبني لك دروساً تتكيّف مع أخطائك وتتطوّر معك.</p>
    <ol class="steps">
      <li><b>1</b><div><h4>اختبار دقيقة</h4><p>اكتب كلمات شائعة بسرعتك الطبيعية</p></div></li>
      <li><b>2</b><div><h4>تحليل كل حرف</h4><p>نحدّد الحروف البطيئة واللي بتغلط فيها</p></div></li>
      <li><b>3</b><div><h4>تدريب تكيّفي</h4><p>دروس تركّز على نقاط ضعفك وتراجع كلماتك الخاطئة</p></div></li>
    </ol>
    <div class="hero-actions">
      <button class="btn primary" id="startPlacement">ابدأ الاختبار <kbd>Enter</kbd></button>
      <button class="btn ghost" id="skipPlacement">تخطَّ — أنا مبتدئ تماماً</button>
    </div>
    <p class="tip">💡 ${ar ? 'حوّل الكيبورد للعربي بـ <kbd>Alt</kbd>+<kbd>Shift</kbd> — وإذا نسيت، الموقع بيحوّل الحروف تلقائياً.' : 'حوّل الكيبورد للإنجليزي بـ <kbd>Alt</kbd>+<kbd>Shift</kbd> — وإذا نسيت، الموقع بيحوّل الحروف تلقائياً.'}
    ${other.placed ? `<br>مستواك ${ar ? 'بالإنجليزي' : 'بالعربي'}: <b>${other.placement.wpm}</b> ك/د` : ''}</p>
  </div>`;
  $('#startPlacement').onclick = startPlacement;
  $('#skipPlacement').onclick = () => { applyPlacement(0, 1); P().placement.skipped = true; save(); go('practice'); };
}

function renderStats() {
  const p = P(), all = ORDER[S.lang], ar = S.lang === 'ar';
  const merged = [...p.history, ...p.tests].sort((a, b) => a.d - b.d);
  const best = merged.length ? Math.max(...merged.map(x => x.wpm)) : 0;
  const last = p.history.slice(-10);
  const avgW = last.length ? Math.round(last.reduce((a, b) => a + b.wpm, 0) / last.length) : 0;
  const avgA = last.length ? Math.round(last.reduce((a, b) => a + b.acc, 0) / last.length * 100) : 0;
  const first = p.placement && !p.placement.skipped ? p.placement.wpm : (merged[0]?.wpm ?? 0);
  const avg = avgTime();
  const weak = all.map(k => ({ k, s: keyStat(k) })).filter(x => x.s.h + x.s.m >= 8)
    .sort((a, b) => weakness(b.k, avg) - weakness(a.k, avg)).slice(0, 8);
  const ew = Object.keys(p.errorWords).reverse();
  $('#statsBody').innerHTML = `
  <div class="s-head"><h1>إحصائياتك ${ar ? 'بالعربي' : 'بالإنجليزي'}</h1>
    ${p.placement ? `<span class="pill">${level(p.placement.wpm).icon} المستوى عند البداية: <b>${p.placement.skipped ? 'مبتدئ' : p.placement.wpm + ' ك/د'}</b></span>` : ''}</div>
  <div class="cards">
    <div class="card"><b class="acc">${best}</b><span>أفضل سرعة (ك/د)</span></div>
    <div class="card"><b>${avgW}</b><span>متوسط آخر 10 دروس</span></div>
    <div class="card"><b>${avgA}%</b><span>متوسط الدقة</span></div>
    <div class="card"><b>${avgW && first ? (avgW - first >= 0 ? '+' : '') + (avgW - first) : '—'}</b><span>التحسّن منذ البداية</span></div>
    <div class="card"><b>${p.history.length + p.tests.length}</b><span>دروس واختبارات</span></div>
    <div class="card"><b>${Math.round(p.totalMs / 60000)}</b><span>دقائق تدريب</span></div>
  </div>
  <div class="panel"><h2>منحنى التقدّم</h2>${chart(merged.slice(-60))}</div>
  <div class="panel"><h2>خريطة الأخطاء على الكيبورد <span class="lbl">— كلما احمرّ المفتاح زادت أخطاؤك فيه</span></h2><div class="kb heat" id="heatKb"></div></div>
  <div class="two">
    <div class="panel"><h2>أضعف الحروف</h2>${weak.length ? `<table class="kt">${weak.map(({ k, s }) => {
      const e = s.m / (s.h + s.m);
      return `<tr><td>${k}</td><td><div class="bar"><i style="width:${clamp(e * 400, 3, 100)}%"></i></div></td><td class="num">دقة ${Math.round((1 - e) * 100)}%</td><td class="num">${s.t ? Math.round(60000 / s.t) : '—'} ح/د</td></tr>`;
    }).join('')}</table>` : '<div class="empty">تدرّب قليلاً لنعرف أضعف حروفك</div>'}</div>
    <div class="panel"><h2>كلمات للمراجعة <span class="lbl">(${ew.length})</span></h2>${ew.length ? `<div class="words" dir="${ar ? 'rtl' : 'ltr'}">${ew.slice(0, 40).map(w => `<span>${w}</span>`).join('')}</div>` : '<div class="empty">ما في كلمات خاطئة حالياً ✨</div>'}
      ${p.unlocked < all.length ? `<h2 style="margin-top:20px">الحروف المفتوحة ${p.unlocked}/${all.length}</h2><div class="unlock">${all.map((c, i) => `<i class="${i < p.unlocked ? 'on' : ''}">${c}</i>`).join('')}</div>` : ''}
    </div>
  </div>`;
  labelKeyboard(buildKeyboard($('#heatKb')), { heat: true });
}

/* ================= Sound / theme / toast ================= */
let actx = null;
function sound(type) {
  if (!S.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    const err = type === 'err';
    o.type = err ? 'square' : 'triangle';
    o.frequency.value = err ? 130 : 620 + Math.random() * 90;
    g.gain.setValueAtTime(err ? 0.035 : 0.02, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (err ? 0.13 : 0.035));
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.14);
  } catch (e) {}
}
function applyTheme() { document.documentElement.dataset.theme = S.theme; }
function applySound() { $('#soundBtn').textContent = S.sound ? '🔊' : '🔇'; }
let toastT = 0, lastHint = 0;
function toast(msg) { const t = $('#toast'); t.innerHTML = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3500); }
function layoutHint() {
  if (Date.now() - lastHint < 30000) return; lastHint = Date.now();
  toast(S.lang === 'ar' ? '⌨️ الكيبورد على الإنجليزي — بنحوّل للعربي تلقائياً. للتبديل: <kbd>Alt</kbd>+<kbd>Shift</kbd>' : '⌨️ الكيبورد على العربي — بنحوّل للإنجليزي تلقائياً. للتبديل: <kbd>Alt</kbd>+<kbd>Shift</kbd>');
}
function translate(ch, e) {
  const m = LAYOUT[S.lang][e.code]; if (!m || ch === ' ') return ch;
  const isAr = AR_RE.test(ch);
  if (S.lang === 'ar' && !isAr && !/[0-9]/.test(ch)) {
    const t = e.shiftKey ? (m[1] || m[0]) : m[0];
    if (t && AR_RE.test(t)) { layoutHint(); return t; }
  }
  if (S.lang === 'en' && isAr) { layoutHint(); return e.shiftKey ? m[1] : m[0]; }
  return ch;
}

/* ================= Input ================= */
const dlg = $('#settings');
document.addEventListener('keydown', e => {
  if (dlg.open) return;
  if (view === 'welcome') { if (e.key === 'Enter') { e.preventDefault(); startPlacement(); } return; }
  if (view !== 'type' || !T) return;
  pressKey(e.code);
  if (e.getModifierState) $('#capsWarn').hidden = !e.getModifierState('CapsLock');
  if (e.key === 'Tab') { e.preventDefault(); restart(); return; }
  if (e.key === 'Escape') { e.preventDefault(); newRound(); return; }
  if (T.done) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } return; }
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  if (e.key === 'Backspace') { e.preventDefault(); back(e.ctrlKey || e.altKey); return; }
  if (e.metaKey || (e.ctrlKey && !e.altKey) || (e.altKey && !e.ctrlKey) || e.isComposing) return;
  let ch = e.key;
  if (!ch || (ch.length > 1 && !/^[؀-ۿ]+$/.test(ch))) return;
  e.preventDefault();
  for (const c of translate(ch, e)) typeChar(c);
});
window.addEventListener('resize', () => { if (view === 'type' && T) { measure(); placeCaret(); } });
document.fonts && document.fonts.ready.then(() => { if (view === 'type' && T) { measure(); placeCaret(); } });

/* ================= Header controls ================= */
$$('#tabs button').forEach(b => b.onclick = () => { b.blur(); go(b.dataset.tab); });
function setLang(l) {
  S.lang = l; save();
  $$('#langSeg button').forEach(b => b.classList.toggle('active', b.dataset.lang === l));
  go(tab === 'stats' ? 'stats' : tab);
}
$$('#langSeg button').forEach(b => b.onclick = () => { b.blur(); setLang(b.dataset.lang); });
$('#soundBtn').onclick = e => { S.sound = !S.sound; applySound(); save(); e.currentTarget.blur(); };
$('#themeBtn').onclick = e => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; applyTheme(); save(); e.currentTarget.blur(); };
$('#settingsBtn').onclick = () => {
  $('#setLength').value = S.settings.length; $('#setTarget').value = P().target;
  $('#setStop').checked = S.settings.stopOnError; $('#setLenient').checked = S.settings.lenient;
  $('#setKb').checked = S.settings.keyboard; $('#setFingers').checked = S.settings.fingers;
  dlg.showModal();
};
dlg.addEventListener('close', () => {
  S.settings.length = +$('#setLength').value;
  P().target = clamp(+$('#setTarget').value || 25, 10, 150);
  S.settings.stopOnError = $('#setStop').checked; S.settings.lenient = $('#setLenient').checked;
  S.settings.keyboard = $('#setKb').checked; S.settings.fingers = $('#setFingers').checked;
  save();
  if (view === 'type') { if (!T || !T.started || T.done) newRound(); else renderKbLabels(); }
  else if (view === 'stats') renderStats();
});
$('#redoPlacement').onclick = () => { dlg.close(); startPlacement(); };
let resetArmed = 0;
$('#resetLang').onclick = e => {
  const b = e.currentTarget;
  if (Date.now() - resetArmed > 4000) {
    resetArmed = Date.now();
    b.textContent = 'اضغط مرة ثانية للتأكيد — ما في رجعة';
    setTimeout(() => { b.textContent = 'مسح بيانات هذه اللغة'; }, 4000);
    return;
  }
  resetArmed = 0; b.textContent = 'مسح بيانات هذه اللغة';
  S.profiles[S.lang] = newProfile(); save(); dlg.close(); go('practice');
};

/* لما تفقد الصفحة التركيز (مثلاً داخل إطار) نطلب نقرة قبل الكتابة */
const veil = document.createElement('div');
veil.className = 'focus-veil'; veil.textContent = 'انقر هنا ثم ابدأ الكتابة';
board.appendChild(veil);
veil.onclick = () => { window.focus(); document.body.classList.remove('unfocused'); };
window.addEventListener('blur', () => document.body.classList.add('unfocused'));
window.addEventListener('focus', () => document.body.classList.remove('unfocused'));
if (!document.hasFocus()) document.body.classList.add('unfocused');

/* ================= Boot ================= */
kbKeys = buildKeyboard($('#kb'));
applyTheme(); applySound();
$$('#langSeg button').forEach(b => b.classList.toggle('active', b.dataset.lang === S.lang));
go('practice');
})();

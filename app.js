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
const AR_S = { KeyT: 'لإ', KeyY: 'إ', KeyG: 'لأ', KeyH: 'أ', KeyB: 'لآ', KeyN: 'آ', Slash: '؟',
  KeyK: '،', KeyP: '؛', Semicolon: ':', Quote: '"', Period: '.', Comma: ',', Digit1: '!', KeyL: '/' };
const LAYOUT = { en: { Space: [' ', ' '] }, ar: { Space: [' ', ' '] } };
CODES.forEach((c, i) => { LAYOUT.en[c] = [EN_N[i], EN_S[i]]; LAYOUT.ar[c] = [AR_N[i], AR_S[c] || '']; });
const REV = { en: {}, ar: {} };
for (const l of ['en', 'ar']) for (const [code, [n, s]] of Object.entries(LAYOUT[l])) {
  if ([...n].length === 1 && !REV[l][n]) REV[l][n] = { code, shift: false };
  if (s && [...s].length === 1 && !REV[l][s]) REV[l][s] = { code, shift: true };
}
REV.en['\n'] = { code: 'Enter', shift: false };
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
/* مكان كل مفتاح (صف، وإزاحة أفقية بوحدة المفتاح) لمعرفة المفاتيح المتجاورة */
const POS = {};
[[0, ROWS[0].slice(0, 13)], [1.5, ROWS[1].slice(1)], [1.75, ROWS[2].slice(1, 12)], [2.25, ROWS[3].slice(1, 11)]]
  .forEach(([off, codes], r) => codes.forEach((c, i) => POS[c] = { r, x: off + i }));
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
/* الجمل الحقيقية: حروف + علامات ترقيم (+ أحرف كبيرة بالإنجليزي) */
const PUNCT = { ar: '،.؟!؛:', en: ",.?!';:-" };
const SENT = {};
for (const l of ['en', 'ar']) {
  const ok = new Set([...ORDER[l], ...(l === 'en' ? ORDER.en.map(c => c.toUpperCase()) : []), ...PUNCT[l], ' ']);
  SENT[l] = (window.SENTENCES ? window.SENTENCES[l] : '').split('\n').map(s => s.trim().replace(/\s+/g, ' ')).filter(s => s && [...s].every(c => ok.has(c)));
}

/* ================= State ================= */
const STORE = 'anamil-v1';
const newProfile = () => ({ placed: false, placement: null, keys: {}, history: [], tests: [], sentHist: [], codeHist: [], drillHist: [], games: [], gameBest: 0,
  seenSent: [], errorWords: {}, conf: {}, bi: {}, unlocked: 6, sinceUnlock: 0, target: 25, totalMs: 0 });
const TOUCH = matchMedia('(pointer: coarse)').matches;
let S = null;
try { S = JSON.parse(localStorage.getItem(STORE)); } catch (e) {}
if (!S || typeof S !== 'object') S = {};
S.lang = S.lang || 'ar';
S.theme = S.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
if (S.sound === undefined) S.sound = true;
const firstRun = !S.settings;
S.settings = Object.assign({ length: 25, stopOnError: false, lenient: true, keyboard: !TOUCH, fingers: true, testDur: 60,
  ghost: 'best', combo: true, fx: true, fontAr: 'plex', fontEn: 'jet', size: 'm', caret: 'line', smooth: true, volume: 0.6,
  soundPack: 'soft', metro: false, metroCpm: 'auto', nolook: false, codeLang: 'js' }, S.settings);
if (firstRun && TOUCH) S.settings.keyboard = false;
S.ach = S.ach || {};
S.counts = Object.assign({ ghostWins: 0, sentences: 0, code: 0, drills: 0, games: 0 }, S.counts);
S.profiles = S.profiles || {};
for (const l of ['ar', 'en']) S.profiles[l] = Object.assign(newProfile(), S.profiles[l]);
const save = () => {
  // وضع الكود بيحوّل اللغة للإنجليزي مؤقتاً، فبنحفظ اللغة الأصلية
  const cur = S.lang; if (typeof codePrevLang !== 'undefined' && codePrevLang) S.lang = codePrevLang;
  try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {}
  S.lang = cur;
};
const P = () => S.profiles[S.lang];

let view = 'type', tab = 'practice', mode = 'practice', T = null;
let spans = [], caret = null, ghostEl = null, lineH = 40, line0 = 0, kbKeys = {};
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
  // تمرين على أكثر خطأ متكرر: كلمات فيها الحرف الصح، ويفضّل فيها الحرفين مع بعض
  const drill = topConfusions(5, 3).find(c => set.has(normU(c.exp)) && c.type !== 'shift');
  if (drill) {
    if (!focus.includes(drill.exp)) focus[focus.length - 1] = drill.exp;
    const both = pool.filter(w => w.includes(drill.exp) && w.includes(drill.typed));
    const one = pool.filter(w => w.includes(drill.exp));
    const src = both.length >= 2 ? both : one;
    for (let i = 0; i < Math.min(4, Math.floor(N / 6)) && src.length; i++) words.push(pick(src));
  }
  // أبطأ ثنائيات حروف: كلمات فيها هالتركيبات
  const bis = weakBigrams(2, set).filter(b => b.score > 1.15 && pool.some(w => w.includes(b.key)));
  for (const b of bis) {
    const src = pool.filter(w => w.includes(b.key));
    for (let i = 0; i < Math.min(3, Math.floor(N / 8)); i++) words.push(pick(src));
  }
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
  return { words: shuffle(words), focus, review, drill, bigrams: bis.map(b => b.key) };
}
function makeSentences() {
  const p = P(), list = SENT[S.lang], avg = avgTime();
  const n = { 15: 2, 25: 3, 40: 5 }[S.settings.length] || 3;
  const weak = ORDER[S.lang].filter(k => { const s = keyStat(k); return s.h + s.m >= 8; })
    .sort((a, b) => weakness(b, avg) - weakness(a, avg)).slice(0, 4);
  for (const c of topConfusions(2, 3)) if (ORDER[S.lang].includes(c.exp) && !weak.includes(c.exp)) weak.unshift(c.exp);
  const seen = new Set(p.seenSent);
  const bis = weakBigrams(3).filter(b => b.score > 1.15).map(b => b.key);
  const picked = list.map((s, i) => {
    const low = s.toLowerCase(); let sc = Math.random() * 2;
    for (const k of weak) sc += (low.split(k).length - 1) * 0.6;   // جمل فيها حروفك الضعيفة أولاً
    for (const b of bis) sc += (low.split(b).length - 1) * 0.8;    // وثنائياتك البطيئة
    if (seen.has(i)) sc -= 6;                                        // وتجنّب تكرار جمل قريبة
    return { i, sc };
  }).sort((a, b) => b.sc - a.sc).slice(0, n).map(x => x.i);
  p.seenSent = [...p.seenSent, ...picked].slice(-Math.floor(list.length * 0.6));
  const text = picked.map(i => list[i]).join(' ');
  return { words: text.split(' '), focus: weak.slice(0, 3), review: [], bigrams: bis.filter(b => text.toLowerCase().includes(b)).slice(0, 2) };
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
/* ================= Repeated-mistake analysis ================= */
const SEP = '\u0001';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CONF_INFO = {
  ahead:      { label: 'سبقت الحرف', tip: 'كتبت الحرف اللي بعده قبله. الإيقاع أهم من السرعة: خلّي الضغطات متساوية.' },
  shift:      { label: 'مشكلة Shift', tip: 'نفس المفتاح بس Shift غلط. اضغط Shift بخنصر اليد الثانية وثبّته لحد ما تضغط الحرف.' },
  neighbor:   { label: 'مفتاح جار', tip: 'إصبعك بيزيح عن مكانه. ارجع لصف البداية بعد كل ضغطة، وخفّف السرعة شوي.' },
  sameFinger: { label: 'نفس الإصبع بصف ثاني', tip: 'نفس الإصبع بس الصف غلط. حرّك الإصبع لفوق أو لتحت بدون ما ترفع إيدك.' },
  mirror:     { label: 'خلط بين اليدين', tip: 'نفس الإصبع باليد الثانية. حدّد اليد قبل الضغطة، وتدرّب ببطء على الحرفين.' },
  other:      { label: 'خلط بين حرفين', tip: 'تدرّب على الحرفين ببطء وانتبه لمكان كل واحد.' }
};
function classify(exp, typed, ahead) {
  if (ahead) return 'ahead';
  const a = REV[S.lang][exp], b = REV[S.lang][typed];
  if (!a || !b) return 'other';
  if (a.code === b.code) return 'shift';
  const pa = POS[a.code], pb = POS[b.code], fa = FINGER[a.code], fb = FINGER[b.code];
  if (pa && pb) {
    const dr = Math.abs(pa.r - pb.r), dx = Math.abs(pa.x - pb.x);
    if ((dr === 0 && dx <= 1) || (dr === 1 && dx <= 1)) return fa === fb ? 'sameFinger' : 'neighbor';
    if (fa === fb) return 'sameFinger';
    if (fa + fb === 7 && dr === 0) return 'mirror';
  }
  return 'other';
}
function topConfusions(k = 8, min = 2) {
  return Object.entries(P().conf || {}).filter(([, e]) => e.n >= min)
    .map(([key, e]) => { const [exp, typed] = key.split(SEP); return { exp, typed, n: e.n, type: classify(exp, typed, e.a / e.n >= 0.5) }; })
    .sort((a, b) => b.n - a.n).slice(0, k);
}
function recordConf(exp, c) {
  if (exp === ' ' || c === ' ' || !exp) return;
  const p = P(), key = exp + SEP + c;
  const e = p.conf[key] || (p.conf[key] = { n: 0, a: 0 });
  e.n++; if (T.text[T.pos + 1] === c) e.a++;
  T.conf[key] = (T.conf[key] || 0) + 1;
  if (e.n >= 4 && !T.confHinted) {          // تنبيه واحد بالدرس لما الخطأ يتكرر
    T.confHinted = true;
    const r = REV[S.lang][exp], info = CONF_INFO[classify(exp, c, e.a / e.n >= 0.5)];
    toast(`🔁 خطأ متكرر: كتبت <b>${esc(c)}</b> بدل <b>${esc(exp)}</b> (${info.label})${r ? ` — الحرف الصح بـ${FINGER_NAME[FINGER[r.code]]}` : ''}`);
  }
}
function decayConf() {
  const p = P();
  for (const [k, e] of Object.entries(p.conf)) { e.n *= 0.96; e.a *= 0.96; if (e.n < 0.6) delete p.conf[k]; }
  const keys = Object.entries(p.conf).sort((a, b) => b[1].n - a[1].n);
  keys.slice(150).forEach(([k]) => delete p.conf[k]);
}
function confRow(c) {
  const info = CONF_INFO[c.type];
  return `<tr><td>${esc(c.exp)}</td><td class="num">كتبت <b class="badk">${esc(c.typed)}</b></td><td><span class="tag t-${c.type}">${info.label}</span></td><td class="num">×${Math.round(c.n)}</td></tr>`;
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
  for (let i = 0; i < T.text.length; i++) { T.wordOf[i] = wi; if (T.text[i] === ' ' || T.text[i] === '\n') wi++; }
}
const baseCls = c => c === ' ' ? 'ch sp' : c === '\n' ? 'ch nl' : 'ch';
function appendText(str) {
  const frag = document.createDocumentFragment(); let word = null;
  for (const c of str) {
    const sp = document.createElement('span'); sp.className = baseCls(c); sp.textContent = c === '\n' ? '↵' : c;
    if (c === '\n') { word = null; frag.appendChild(sp); frag.appendChild(document.createTextNode('\n')); }
    else if (c === ' ') { word = null; frag.appendChild(sp); }
    else { if (!word) { word = document.createElement('span'); word.className = 'w'; frag.appendChild(word); } word.appendChild(sp); }
    spans.push(sp);
  }
  textEl.insertBefore(frag, caret);
}
function renderText() {
  textEl.innerHTML = ''; spans = [];
  const rtl = S.lang === 'ar';
  textEl.dir = rtl ? 'rtl' : 'ltr';
  textEl.className = 'text ' + S.lang + (mode === 'code' ? ' code' : '');
  wrapEl.className = 'text-wrap ' + S.lang;
  board.classList.toggle('nolook', !!S.settings.nolook && mode !== 'placement');
  nearFrom = 0; nearTo = 0;
  caret = document.createElement('i'); caret.className = 'caret idle'; textEl.appendChild(caret);
  ghostEl = document.createElement('i'); ghostEl.className = 'ghost-caret'; ghostEl.hidden = true; textEl.appendChild(ghostEl);
  appendText(T.text);
  textEl.style.transform = '';
}
function measure() {
  lineH = parseFloat(getComputedStyle(textEl).lineHeight) || 40;
  line0 = spans[0] ? spans[0].offsetTop : 0;
}
function posFor(i) {
  const rtl = S.lang === 'ar'; let end = false;
  if (i >= spans.length) { i = spans.length - 1; end = true; }
  const sp = spans[i], l = sp.offsetLeft, w = sp.offsetWidth;
  const x = rtl ? (end ? l : l + w) : (end ? l + w : l);
  return { x, l, w: end ? 0 : w, y: sp.offsetTop, h: sp.offsetHeight };
}
function placeCaret() {
  if (!spans.length || !T) return;
  const p = posFor(T.pos), cs = S.settings.caret;
  if (cs === 'line') {
    caret.style.width = ''; caret.style.height = p.h + 'px';
    caret.style.transform = `translate(${p.x - 1}px, ${p.y}px)`;
  } else {
    const w = p.w || Math.round(lineH * 0.3), left = p.w ? p.l : (S.lang === 'ar' ? p.x - w : p.x);
    caret.style.width = w + 'px';
    caret.style.height = cs === 'block' ? p.h + 'px' : '3px';
    caret.style.transform = `translate(${left}px, ${p.y + (cs === 'block' ? 0 : p.h - 3)}px)`;
  }
  const ln = Math.round((p.y - line0) / lineH);
  textEl.style.transform = `translateY(${-Math.max(0, ln - 1) * lineH}px)`;
}
/* الشبح: مؤشر بيمشي بسرعة أفضل نتيجة إلك */
function ghostRef() {
  const g = S.settings.ghost, p = P();
  if (g === 'off' || mode === 'placement') return 0;
  if (g === 'target') return p.target;
  const list = histFor(mode) || p.tests.filter(t => t.dur === S.settings.testDur && !t.placement);
  const recent = list.slice(-30);
  if (!recent.length) return 0;
  if (g === 'best') return Math.max(...recent.map(x => x.wpm));
  const last = recent.slice(-10);
  return Math.round(last.reduce((a, b) => a + b.wpm, 0) / last.length);
}
function updateGhost() {
  const box = $('#ghostBox');
  if (!T || !T.ghostWpm) { box.hidden = true; if (ghostEl) ghostEl.hidden = true; return; }
  box.hidden = false;
  if (!T.started) { ghostEl.hidden = true; $('#liveGhost').textContent = T.ghostWpm; $('#ghostLbl').textContent = '👻 سرعة الشبح'; box.dataset.state = ''; return; }
  const idx = Math.min(spans.length, Math.floor(T.ghostWpm * 5 / 60 * (performance.now() - T.t0) / 1000));
  const p = posFor(idx);
  ghostEl.hidden = T.done; ghostEl.style.height = p.h + 'px';
  ghostEl.style.transform = `translate(${p.x - 1}px, ${p.y}px)`;
  const diff = T.pos - idx;
  $('#liveGhost').textContent = (diff > 0 ? '+' : '') + diff;
  $('#ghostLbl').textContent = diff >= 0 ? '👻 حرف قدّام الشبح' : '👻 حرف ورا الشبح';
  box.dataset.state = diff >= 0 ? 'ahead' : 'behind';
}

/* ثنائيات الحروف: كم بتاخد من حرف للحرف اللي بعده */
function recordBigram(a, b, ok, dt) {
  const p = P(), key = S.lang === 'en' ? (a + b).toLowerCase() : a + b;
  if (!/^\p{L}\p{L}$/u.test(key)) return;
  const s = p.bi[key] || (p.bi[key] = { n: 0, m: 0, t: 0 });
  if (ok) { s.n++; if (dt > 15 && dt < 2500) s.t = s.t ? s.t * 0.8 + dt * 0.2 : dt; }
  else s.m++;
  if (s.n + s.m > 120) { s.n *= 0.8; s.m *= 0.8; }
}
function weakBigrams(k = 8, set = null) {
  const e = Object.entries(P().bi).filter(([key, s]) => s.n + s.m >= 6 && s.t && (!set || [...key].every(c => set.has(normU(c)))));
  if (!e.length) return [];
  const avg = e.reduce((a, [, s]) => a + s.t, 0) / e.length;
  return e.map(([key, s]) => ({ key, s, score: s.t / avg + (s.m / (s.n + s.m)) * 6 }))
    .sort((a, b) => b.score - a.score).slice(0, k);
}

/* ================= Round lifecycle ================= */
function histFor(m) {
  const p = P();
  return { practice: p.history, sentences: p.sentHist, code: p.codeHist, drill: p.drillHist }[m] || null;
}
function newRound(reuse) {
  stopTicker(); stopMetro();
  let words, focus = [], review = [], drill = null, bigrams = [], text = null, snippet = null;
  if (mode === 'practice' || mode === 'sentences') {
    const L = reuse || (mode === 'practice' ? makeLesson() : makeSentences()); words = L.words; focus = L.focus; review = L.review || []; drill = L.drill || null; bigrams = L.bigrams || [];
  } else if (mode === 'code') {
    const L = reuse || makeCode(); text = L.text; snippet = L.snippet; words = text.split(/[ \n]+/);
  } else if (mode === 'drill') {
    const L = reuse || makeDrill(); words = L.words; focus = L.focus;
  } else words = reuse ? reuse.words : randomWords(mode === 'test' ? Math.max(60, S.settings.testDur * 2) : 120);
  T = {
    words: [...words], focus, review, drill, bigrams, snippet, conf: {}, confHinted: false, combo: 0, bestCombo: 0, ghostWpm: ghostRef(),
    text: text || words.join(' '), pos: 0, marks: [], correct: 0, keys: 0, errors: 0, iv: [],
    started: false, done: false, t0: 0, last: 0, wordErr: new Set(), sk: {}, samples: [], wordOf: [],
    duration: mode === 'test' ? S.settings.testDur : (mode === 'placement' || mode === 'drill') ? 60 : 0
  };
  calcWordOf();
  renderText(); renderModeBar(); renderKbLabels(); updateLive(); updateCombo(); updateGhost(); updateNear();
  $('#result').hidden = true; board.hidden = false; board.classList.remove('running');
  requestAnimationFrame(() => { measure(); placeCaret(); highlight(); });
}
function restart() {
  if (!T) return;
  if (['practice', 'sentences', 'code', 'drill'].includes(mode) && (T.started || T.done))
    newRound({ words: T.words, focus: T.focus, review: T.review, drill: T.drill, bigrams: T.bigrams, text: T.snippet ? T.text : null, snippet: T.snippet });
  else newRound();
}

/* ---------- كود ---------- */
function makeCode() {
  const lang = S.settings.codeLang === 'py' ? 'py' : 'js', list = CODE[lang];
  S.seenCode = S.seenCode || [];
  const fresh = list.map((_, i) => i).filter(i => !S.seenCode.includes(lang + i));
  const i = fresh.length ? pick(fresh) : Math.floor(Math.random() * list.length);
  S.seenCode = [...S.seenCode.filter(x => x !== lang + i), lang + i].slice(-Math.floor(list.length * 1.4));
  return { text: list[i], snippet: lang + i };
}
/* ---------- تمرين الضعف: دقيقة على أضعف 3 حروف ---------- */
function weakest3() {
  const avg = avgTime(), letters = activeLetters();
  const withData = letters.filter(k => { const s = keyStat(k); return s.h + s.m >= 8; });
  return (withData.length >= 3 ? withData : letters).slice().sort((a, b) => weakness(b, avg) - weakness(a, avg)).slice(0, 3);
}
function drillWords(n, focus) {
  const set = new Set(activeLetters());
  const pool = WORDS[S.lang].filter(w => [...w].every(c => set.has(normU(c))));
  const hits = pool.filter(w => focus.some(f => w.includes(f)));
  const out = [];
  while (out.length < n) {
    const r = Math.random();
    const w = hits.length >= 8 && r < 0.75 ? pick(hits) : r < 0.9 ? pseudo([...set], focus) : pick(pool.length ? pool : hits);
    if (w && w !== out[out.length - 1]) out.push(w);
  }
  return out;
}
function makeDrill() { const focus = weakest3(); return { words: drillWords(90, focus), focus }; }
function next() {
  if (T && T.retry) { newRound(); return; }
  if (mode === 'placement') { mode = 'practice'; }
  newRound();
}
function extendTest() {
  const more = mode === 'drill' ? drillWords(40, T.focus) : randomWords(40), add = ' ' + more.join(' ');
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
    updateLive(); updateGhost();
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
    T.started = true; T.t0 = now; T.last = now; startTicker(); startMetro();
    board.classList.add('running'); caret.classList.remove('idle');
  }
  const exp = T.text[T.pos], ok = same(c, exp), dt = now - T.last;
  T.last = now; T.keys++;
  if (T.pos > 0 && ok && dt > 15 && dt < 2000) T.iv.push(dt);
  if (exp !== ' ' && exp !== '\n') recordKey(exp, ok, T.pos > 0 ? dt : 0);
  const prevC = T.text[T.pos - 1];
  if (exp !== ' ' && prevC && prevC !== ' ' && T.marks[T.pos - 1] === true) recordBigram(prevC, exp, ok, dt);
  if (ok) { T.combo++; if (T.combo > T.bestCombo) T.bestCombo = T.combo; updateCombo(); }
  else { const had = T.combo >= 10; T.combo = 0; updateCombo(had); }
  if (!ok) {
    T.errors++; T.wordErr.add(T.wordOf[T.pos]); sound('err'); flashErr(exp); recordConf(exp, c);
    if (S.settings.stopOnError) {
      spans[T.pos].classList.add('miss'); T.hadMiss = true;
      board.classList.remove('shake'); void board.offsetWidth; board.classList.add('shake');
      updateLive(); return;
    }
  } else sound(exp === ' ' || exp === '\n' ? 'space' : 'ok');
  const sp = spans[T.pos];
  sp.className = baseCls(exp) + (ok ? (sp.classList.contains('miss') ? ' fixed' : ' ok') : ' bad');
  T.marks[T.pos] = ok; if (ok) T.correct++;
  T.pos++;
  // بعد سطر جديد بالكود، المسافات اللي بأول السطر بتنكتب لحالها
  if (exp === '\n' && ok) while (T.text[T.pos] === ' ') { spans[T.pos].className = 'ch sp ok'; T.marks[T.pos] = true; T.correct++; T.pos++; }
  if (T.duration && T.text.length - T.pos < 80) extendTest();
  placeCaret(); highlight(); updateLive(); updateNear();
  if (T.pos >= T.text.length) finish();
}
function back(word) {
  if (!T || T.done || T.pos === 0) return;
  const del = () => {
    T.pos--; if (T.marks[T.pos]) T.correct--; T.marks[T.pos] = undefined;
    spans[T.pos].className = baseCls(T.text[T.pos]);
  };
  const sepc = c => c === ' ' || c === '\n';
  if (word) {
    while (T.pos > 0 && sepc(T.text[T.pos - 1])) del();
    while (T.pos > 0 && !sepc(T.text[T.pos - 1])) del();
  } else del();
  placeCaret(); highlight(); updateLive(); updateNear();
}
function finish() {
  if (T.done) return;
  T.done = true; stopTicker(); stopMetro(); updateNear();
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
  for (let wi = 0; wi <= lastWord && mode !== 'code'; wi++) {
    let w = (T.words[wi] || '').replace(/[^\p{L}]/gu, '');
    if (S.lang === 'en') w = w.toLowerCase();
    if (!w) continue;
    if (T.wordErr.has(wi)) { delete p.errorWords[w]; p.errorWords[w] = 3; }
    else if (p.errorWords[w] && --p.errorWords[w] <= 0) delete p.errorWords[w];
  }
  const ek = Object.keys(p.errorWords); ek.slice(0, Math.max(0, ek.length - 80)).forEach(k => delete p.errorWords[k]);

  r.miss = Object.entries(T.sk).filter(([, s]) => s.m > 0)
    .sort((a, b) => (b[1].m / (b[1].h + b[1].m)) - (a[1].m / (a[1].h + a[1].m)) || b[1].m - a[1].m)
    .slice(0, 6).map(([k, s]) => ({ k, acc: s.h / (s.h + s.m) }));
  r.reviewCount = Object.keys(p.errorWords).length;
  r.conf = Object.entries(T.conf).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([key, n]) => {
    const [exp, typed] = key.split(SEP), e = p.conf[key];
    return { exp, typed, n, type: classify(exp, typed, e && e.a / e.n >= 0.5) };
  });
  decayConf();
  const biKeys = Object.entries(p.bi);
  if (biKeys.length > 600) biKeys.sort((a, b) => (a[1].n + a[1].m) - (b[1].n + b[1].m)).slice(0, biKeys.length - 600).forEach(([k]) => delete p.bi[k]);
  r.bestCombo = T.bestCombo;
  if (T.ghostWpm) {
    const ghostMs = T.text.length / (T.ghostWpm * 5 / 60) * 1000;
    r.ghost = { ref: T.ghostWpm, win: T.duration ? wpm >= T.ghostWpm : ms <= ghostMs };
  }
  const prevList = histFor(mode);
  if (prevList && prevList.length) r.newBest = wpm > Math.max(...prevList.map(x => x.wpm));
  r.rhythm = rhythmScore(T.iv);
  r.metro = S.settings.metro; r.nolook = S.settings.nolook;
  if (r.ghost && r.ghost.win) S.counts.ghostWins++;

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
  } else if (mode === 'sentences' || mode === 'code' || mode === 'drill') {
    const list = histFor(mode), prev = list.slice(-10);
    r.avg = prev.length ? Math.round(prev.reduce((a, b) => a + b.wpm, 0) / prev.length) : null;
    list.push(rec); if (list.length > 300) list.shift();
    let h = 0, m = 0;
    for (const [k, s] of Object.entries(T.sk)) if (!/\p{L}/u.test(k) || k !== k.toLowerCase()) { h += s.h; m += s.m; }
    r.punct = h + m ? { acc: h / (h + m), n: h + m } : null;
    r.focus = T.focus.map(k => ({ k, s: T.sk[k] }));
    S.counts[{ sentences: 'sentences', code: 'code', drill: 'drills' }[mode]]++;
  } else {
    const prevT = p.tests.filter(t => t.dur === T.duration);
    const best = Math.max(0, ...prevT.map(t => t.wpm));
    rec.dur = T.duration; p.tests.push(rec); if (p.tests.length > 300) p.tests.shift();
    r.record = prevT.length > 0 && wpm > best; r.best = Math.max(best, wpm); r.samples = T.samples;
  }
  sound('done');
  save(); showResult(r);
  checkAch({ r, textLen: T.text.length });
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
    <div class="r-num"><b data-to="${r.wpm}">0</b><span>كلمة/دقيقة${delta != null ? `<em class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'}${Math.abs(delta)}</em>` : ''}</span></div>
    <div class="r-num"><b data-to="${Math.round(r.acc * 100)}" data-suf="%">0%</b><span>الدقة</span></div>
    <div class="r-num sm"><b>${fmtTime(r.ms)}</b><span>الوقت</span></div>
    ${r.bestCombo ? `<div class="r-num sm"><b data-to="${r.bestCombo}">0</b><span>أطول سلسلة</span></div>` : ''}
    ${r.rhythm != null ? `<div class="r-num sm"><b data-to="${r.rhythm}" data-suf="%">0%</b><span>${r.metro ? '🎵 ' : ''}انتظام الإيقاع</span></div>` : ''}
  </div>`;
  if (r.mode === 'drill') html = html.replace('<h2>', '<h2>⚡ ');
  const badges = [];
  if (r.newBest) badges.push('<span class="badge-pop gold">🏆 أفضل نتيجة إلك</span>');
  if (r.ghost) badges.push(r.ghost.win ? `<span class="badge-pop good">👻 سبقت الشبح (${r.ghost.ref} ك/د)</span>` : `<span class="badge-pop">👻 الشبح سبقك — سرعته ${r.ghost.ref} ك/د</span>`);
  if (badges.length) html += `<div class="badges-row">${badges.join('')}</div>`;
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
  } else if (r.mode === 'sentences') {
    html += missHtml(r.miss, 'أخطاء هذه الجمل');
    html += `<div class="r-box"><h3>${S.lang === 'en' ? 'علامات الترقيم والأحرف الكبيرة' : 'علامات الترقيم'}</h3><p>${r.punct
      ? `دقتك فيها <b>${Math.round(r.punct.acc * 100)}%</b> من ${r.punct.n} ضغطة.${r.punct.acc < 0.9 ? '<br>ركّز على Shift: اضغطه بخنصر اليد المعاكسة للحرف.' : ''}`
      : 'ما في علامات بهذه الجمل.'}</p></div>`;
    cta = 'جمل جديدة';
  } else if (r.mode === 'code') {
    html += missHtml(r.miss, 'أخطاء هذا الكود');
    html += `<div class="r-box"><h3>الرموز والأحرف الكبيرة</h3><p>${r.punct
      ? `دقتك فيها <b>${Math.round(r.punct.acc * 100)}%</b> من ${r.punct.n} ضغطة.${r.punct.acc < 0.9 ? '<br>الأقواس والرموز بتحتاج Shift: ثبّته بخنصر اليد الثانية.' : ''}`
      : '—'}</p></div>`;
    cta = 'كود جديد';
  } else if (r.mode === 'drill') {
    const f = r.focus.map(({ k, s }) => s ? `<span class="chip ${s.m / (s.h + s.m) > 0.08 ? 'bad' : ''}">${k}<small>${Math.round(s.h / (s.h + s.m) * 100)}%</small></span>` : `<span class="chip">${k}</span>`).join('');
    html += `<div class="r-box"><h3>أضعف 3 حروف تدرّبت عليها</h3><div class="chips">${f}</div><p class="hint">كرّر التمرين كم مرة باليوم، ورح تشوف الحروف بتتغيّر لما تتحسّن.</p></div>`;
    html += missHtml(r.miss, 'أخطاء التمرين');
    cta = 'تمرين ضعف ثاني';
  } else {
    html += `<div class="r-box" style="grid-column:1/-1"><h3>السرعة خلال الاختبار</h3>${chart(r.samples.map(s => ({ wpm: s.wpm, acc: s.acc })), true)}</div>`;
    html += missHtml(r.miss, 'الحروف اللي غلطت فيها');
  }
  if (r.mode === 'placement' && r.samples.length > 1)
    html += `<div class="r-box" style="grid-column:1/-1"><h3>السرعة خلال الاختبار</h3>${chart(r.samples, true)}</div>`;
  if (r.conf && r.conf.length) {
    const top = r.conf[0];
    html += `<div class="r-box"><h3>🔀 حروف خلطت بينها</h3><div class="pairs">${r.conf.map(c =>
      `<span class="pair"><b>${esc(c.typed)}</b> بدل <b>${esc(c.exp)}</b>${c.n > 1 ? ` <small>×${c.n}</small>` : ''}<i class="tag t-${c.type}">${CONF_INFO[c.type].label}</i></span>`).join('')}</div>
      <p class="hint">💡 ${CONF_INFO[top.type].tip}</p></div>`;
  }
  html += '</div>';
  const actions = `<div class="r-actions"><button class="btn primary big" id="rNext">${cta} <kbd>Enter</kbd></button>${r.mode !== 'placement' ? '<button class="btn" id="rAgain">إعادة نفس النص <kbd>Tab</kbd></button>' : ''}${r.mode === 'practice' ? '<button class="btn" id="rDrill">⚡ تمرين الضعف (دقيقة)</button>' : ''}<button class="btn ghost" id="rStats">الإحصائيات</button></div>`;
  box.innerHTML = html.replace('%%ACTIONS%%', actions);
  box.querySelectorAll('[data-to]').forEach(countUp);
  if (r.mode === 'placement' || r.record || r.newBest || r.unlocked) setTimeout(() => burst(r.mode === 'placement' ? 140 : 110), 250);
  else if (r.ghost && r.ghost.win) setTimeout(() => burst(50), 250);
  $('#kb').hidden = true; $('#finger').hidden = true;
  box.scrollIntoView({ block: 'start', behavior: 'smooth' });
  $('#rNext').onclick = next;
  if ($('#rAgain')) $('#rAgain').onclick = restart;
  if ($('#rDrill')) $('#rDrill').onclick = startDrill;
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
  const showKb = S.settings.keyboard && !(S.settings.nolook && mode !== 'placement');
  kb.hidden = !showKb; $('#finger').hidden = !showKb;
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
  fEl.innerHTML = `الحرف التالي <b>${exp === ' ' ? 'مسافة' : exp === '\n' ? 'Enter' : esc(exp)}</b> ← ${txt}`;
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
    if (T.bigrams.length) h += `<span class="pill">🔗 ثنائيات: ${T.bigrams.map(b => `<b>${esc(b)}</b>`).join(' · ')}</span>`;
    if (T.drill) h += `<span class="pill" title="${esc(CONF_INFO[T.drill.type].tip)}">🔀 تمرين: <b>${esc(T.drill.exp)}</b> مش <b>${esc(T.drill.typed)}</b></span>`;
    if (T.review.length) h += `<span class="pill">🔁 مراجعة <b>${T.review.length}</b> كلمات غلطت فيها</span>`;
    h += `<span class="pill">الهدف <b>${p.target}</b> ك/د</span>`;
    bar.innerHTML = h;
  } else if (mode === 'sentences') {
    bar.innerHTML = `<div class="chips"><span class="lbl">جمل حقيقية بعلامات ترقيم${S.lang === 'en' ? ' وأحرف كبيرة' : ''}</span></div>`
      + (T.focus.length ? `<div class="chips"><span class="lbl">اخترنا جملاً فيها حروفك الضعيفة</span>${T.focus.map(k => `<span class="chip">${k}</span>`).join('')}</div>` : '')
      + `<span class="spacer"></span>`
      + (T.bigrams.length ? `<span class="pill">🔗 ثنائيات: ${T.bigrams.map(b => `<b>${esc(b)}</b>`).join(' · ')}</span>` : '')
      + `<span class="pill">${SENT[S.lang].length} جملة بالمكتبة</span>`;
  } else if (mode === 'test') {
    bar.innerHTML = `<span class="lbl">اختبار سرعة بكلمات عشوائية شائعة</span><span class="spacer"></span><div class="durs">${[15, 30, 60, 120].map(d => `<button data-dur="${d}" class="${d === S.settings.testDur ? 'active' : ''}">${d}ث</button>`).join('')}</div>`;
    bar.querySelectorAll('[data-dur]').forEach(b => b.onclick = () => { S.settings.testDur = +b.dataset.dur; save(); b.blur(); newRound(); });
  } else if (mode === 'code') {
    bar.innerHTML = `<span class="lbl">💻 كود حقيقي — <kbd>Enter</kbd> لسطر جديد، والمسافات بأول السطر بتنكتب لحالها</span><span class="spacer"></span>
      <div class="durs">${Object.entries({ js: 'JavaScript', py: 'Python' }).map(([k, v]) => `<button data-cl="${k}" class="${S.settings.codeLang === k ? 'active' : ''}">${v}</button>`).join('')}</div>`;
    bar.querySelectorAll('[data-cl]').forEach(b => b.onclick = () => { S.settings.codeLang = b.dataset.cl; save(); b.blur(); newRound(); });
  } else if (mode === 'drill') {
    bar.innerHTML = `<div class="chips"><span class="chip">⚡</span><div><b>تمرين الضعف — دقيقة وحدة</b><div class="lbl">كلمات مليانة بأضعف 3 حروف عندك</div></div></div><span class="spacer"></span>
      <div class="chips">${T.focus.map(k => `<span class="chip bad">${esc(k)}</span>`).join('')}</div>`;
  } else {
    bar.innerHTML = `<div class="chips"><span class="chip">🎯</span><div><b>اختبار تحديد المستوى</b><div class="lbl">اكتب لمدة 60 ثانية بسرعتك الطبيعية — الدقة أهم من السرعة</div></div></div>`;
  }
  if (mode !== 'placement') {
    const cpm = metroCpm();
    bar.insertAdjacentHTML('beforeend', `<div class="mods">
      <button class="mod ${S.settings.metro ? 'on' : ''}" data-mod="metro" title="نبضة صوت ثابتة تكتب عليها">🎵 إيقاع <small>${cpm}</small></button>
      <button class="mod ${S.settings.nolook ? 'on' : ''}" data-mod="nolook" title="الكيبورد بيختفي والنص الجاي بيبيّن شوي شوي">🙈 بدون نظر</button></div>`);
    bar.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => {
      const k = b.dataset.mod; S.settings[k] = !S.settings[k]; save(); b.blur();
      if (!T.started || T.done) newRound(T.done ? null : { words: T.words, focus: T.focus, review: T.review, drill: T.drill, bigrams: T.bigrams, text: T.snippet ? T.text : null, snippet: T.snippet });
      else { b.classList.toggle('on', S.settings[k]); if (k === 'metro') S.settings.metro ? startMetro() : stopMetro(); else { board.classList.toggle('nolook', S.settings.nolook); renderKbLabels(); updateNear(); } }
    });
  }
}

/* ================= Metronome & no-look ================= */
function metroCpm() {
  const v = S.settings.metroCpm;
  return v === 'auto' ? clamp(Math.round(P().target * 5 / 10) * 10, 60, 400) : +v;
}
let metroT = null, metroN = 0;
function startMetro() {
  stopMetro();
  if (!S.settings.metro || !T || T.done || mode === 'placement') return;
  const box = $('#metroBox'), dot = $('#metroDot'), cpm = metroCpm();
  box.hidden = false; $('#metroLive').textContent = cpm;
  const beat = () => {
    metroN++; sound(metroN % 4 === 1 ? 'tickHi' : 'tick');
    if (!reduced) { dot.classList.remove('beat'); void dot.offsetWidth; dot.classList.add('beat'); }
  };
  metroN = 0; beat(); metroT = setInterval(beat, 60000 / cpm);
}
function stopMetro() {
  if (metroT) clearInterval(metroT); metroT = null;
  const b = $('#metroBox'); if (!b) return;
  b.hidden = !S.settings.metro || mode === 'placement';
  $('#metroLive').textContent = metroCpm();
}
function rhythmScore(iv) {
  if (!iv || iv.length < 20) return null;
  const a = iv.slice().sort((x, y) => x - y), cut = a.slice(Math.floor(a.length * 0.05), Math.ceil(a.length * 0.95));
  const mean = cut.reduce((s, x) => s + x, 0) / cut.length;
  const sd = Math.sqrt(cut.reduce((s, x) => s + (x - mean) ** 2, 0) / cut.length);
  return clamp(Math.round((1 - sd / mean) * 100), 0, 100);
}
let nearFrom = 0, nearTo = 0;
function updateNear() {
  for (let i = nearFrom; i < nearTo && i < spans.length; i++) spans[i].classList.remove('near');
  nearFrom = nearTo = 0;
  if (!S.settings.nolook || !T || T.done || mode === 'placement') return;
  // الكلمة الحالية والكلمة اللي بعدها بس واضحين
  let end = T.pos, seps = 0;
  while (end < spans.length && seps < 2) { const c = T.text[end]; if (c === ' ' || c === '\n') seps++; end++; }
  nearFrom = T.pos; nearTo = end;
  for (let i = nearFrom; i < nearTo; i++) spans[i].classList.add('near');
}

/* ================= Views ================= */
function show(v) {
  view = v;
  $$('.view').forEach(s => {
    const on = s.id === 'view-' + v; s.hidden = !on;
    if (on && !reduced) { s.classList.remove('enter'); void s.offsetWidth; s.classList.add('enter'); }
  });
}
var codePrevLang = null;
function syncLangSeg() { $$('#langSeg button').forEach(b => b.classList.toggle('active', b.dataset.lang === S.lang)); }
function go(t) {
  tab = t; stopTicker(); stopMetro(); gameStop();
  // الكود دايماً على الكيبورد الإنجليزي
  if (t === 'code') { if (S.lang !== 'en') { codePrevLang = S.lang; S.lang = 'en'; syncLangSeg(); kbKeys = buildKeyboard($('#kb')); } }
  else if (codePrevLang) { S.lang = codePrevLang; codePrevLang = null; syncLangSeg(); kbKeys = buildKeyboard($('#kb')); }
  $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === (t === 'drill' ? 'practice' : t)));
  if (t === 'stats') { show('stats'); renderStats(); return; }
  if (t === 'game') { show('game'); gameIntro(); return; }
  if (t === 'practice' && !P().placed) { show('welcome'); renderWelcome(); return; }
  mode = t; show('type'); newRound();
}
function startDrill() { go('drill'); tab = 'practice'; }
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

function confPanel() {
  const list = topConfusions(8);
  if (!list.length) return `<div class="panel"><h2>🔀 الأخطاء المتكررة</h2><div class="empty">لسا ما في أخطاء متكررة. لما تخلط بين حرفين أكثر من مرة، بتطلع هون مع نصيحة.</div></div>`;
  const counts = {};
  for (const c of list) counts[c.type] = (counts[c.type] || 0) + c.n;
  const main = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  return `<div class="panel"><h2>🔀 الأخطاء المتكررة <span class="lbl">— الحرف اللي بتكتبه بدل الصح</span></h2>
    <div class="conf-grid"><table class="kt conf">${list.map(confRow).join('')}</table>
    <div class="conf-tip"><span class="tag t-${main}">${CONF_INFO[main].label}</span><p>أكثر نوع خطأ عندك. ${CONF_INFO[main].tip}</p>
    <p class="lbl">الدروس بتضيف تمرين تلقائي على أكثر خطأ متكرر، والأخطاء القديمة بتخف مع الوقت لما تتحسّن.</p></div></div></div>`;
}
function biPanel() {
  const list = weakBigrams(10);
  if (!list.length) return `<div class="panel"><h2>🔗 ثنائيات الحروف</h2><div class="empty">بعد كم درس بنعرف أي تركيبات حرفين (مثل «ال» و«th») بتبطّئك.</div></div>`;
  const fastest = Math.max(...list.map(b => 60000 / b.s.t));
  return `<div class="panel"><h2>🔗 أبطأ ثنائيات الحروف <span class="lbl">— الدروس والجمل بتركّز عليها تلقائياً</span></h2>
    <div class="bigrams" dir="${S.lang === 'ar' ? 'rtl' : 'ltr'}">${list.map(({ key, s }) => {
      const cpm = Math.round(60000 / s.t), acc = Math.round(s.n / (s.n + s.m) * 100);
      return `<div class="bgm"><b>${esc(key)}</b><div class="bar"><i style="width:${clamp(cpm / fastest * 100, 8, 100)}%;background:var(--accent)"></i></div><span class="num">${cpm} ح/د · ${acc}%</span></div>`;
    }).join('')}</div></div>`;
}
function renderStats() {
  const p = P(), all = ORDER[S.lang], ar = S.lang === 'ar';
  const merged = [...p.history, ...p.sentHist, ...p.codeHist, ...p.drillHist, ...p.tests].sort((a, b) => a.d - b.d);
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
    ${p.placement ? `<span class="pill">${level(p.placement.wpm).icon} المستوى عند البداية: <b>${p.placement.skipped ? 'مبتدئ' : p.placement.wpm + ' ك/د'}</b></span>` : ''}
    <span class="spacer"></span>${p.placed ? '<button class="btn primary" id="sDrill">⚡ تمرين الضعف — دقيقة</button>' : ''}</div>
  ${achPanel()}
  <div class="cards">
    <div class="card"><b class="acc">${best}</b><span>أفضل سرعة (ك/د)</span></div>
    <div class="card"><b>${avgW}</b><span>متوسط آخر 10 دروس</span></div>
    <div class="card"><b>${avgA}%</b><span>متوسط الدقة</span></div>
    <div class="card"><b>${avgW && first ? (avgW - first >= 0 ? '+' : '') + (avgW - first) : '—'}</b><span>التحسّن منذ البداية</span></div>
    <div class="card"><b>${merged.length}</b><span>دروس واختبارات</span></div>
    <div class="card"><b>${Math.round(p.totalMs / 60000)}</b><span>دقائق تدريب</span></div>
    <div class="card"><b>${p.gameBest || 0}</b><span>🎮 أعلى نتيجة باللعبة</span></div>
  </div>
  <div class="panel"><h2>منحنى التقدّم</h2>${chart(merged.slice(-60))}</div>
  ${confPanel()}
  ${biPanel()}
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
  if ($('#sDrill')) $('#sDrill').onclick = startDrill;
}

/* ================= Sound / theme / toast ================= */
let actx = null;
/* حزم الأصوات: كلها مركّبة بـ WebAudio بدون ملفات */
const PACKS = { soft: 'ناعم', mech: 'ميكانيكي', type: 'آلة كاتبة', bubble: 'فقاعات' };
let noiseBuf = null;
function tone(type, f0, f1, peak, dur, t) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function hiss(freq, q, peak, dur, t, kind = 'bandpass') {
  if (!noiseBuf) {
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.25, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuf; f.type = kind; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(actx.destination); s.start(t, Math.random() * 0.1); s.stop(t + dur + 0.02);
}
function sound(type) {
  const metro = type === 'tick' || type === 'tickHi';
  if (!S.sound && !metro) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const v = (S.settings.volume ?? 0.6) * 1.6;
    if (v <= 0) return;
    const t = actx.currentTime, pack = S.settings.soundPack, sp = type === 'space';
    switch (type) {
      case 'tick': tone('sine', 1250, 0, 0.06 * v, 0.035, t); return;
      case 'tickHi': tone('sine', 1750, 0, 0.08 * v, 0.04, t); return;
      case 'err': pack === 'soft' ? tone('square', 130, 0, 0.035 * v, 0.13, t) : tone('square', 120, 70, 0.04 * v, 0.16, t); return;
      case 'done': tone('sine', 1568, 0, 0.05 * v, 0.9, t); tone('sine', 2093, 0, 0.03 * v, 0.7, t + 0.08); return;
      case 'pop': tone('sine', 480, 1500, 0.07 * v, 0.12, t); hiss(5000, 0.7, 0.03 * v, 0.05, t, 'highpass'); return;
      case 'level': [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, 0, 0.045 * v, 0.25, t + i * 0.08)); return;
      case 'lose': tone('sine', 240, 80, 0.08 * v, 0.4, t); return;
      case 'ach': [1047, 1319, 1568, 2093].forEach((f, i) => tone('sine', f, 0, 0.05 * v, 0.5, t + i * 0.09)); return;
    }
    if (pack === 'mech') { hiss(sp ? 1600 : 3200, 1.1, 0.12 * v, 0.03, t); tone('sine', sp ? 85 : 150, 0, 0.06 * v, 0.045, t); }
    else if (pack === 'type') { hiss(4200, 0.8, 0.16 * v, 0.02, t, 'highpass'); tone('square', sp ? 170 : 380 + Math.random() * 60, 0, 0.014 * v, 0.025, t); }
    else if (pack === 'bubble') tone('sine', sp ? 260 : 360 + Math.random() * 140, sp ? 520 : 900, 0.055 * v, 0.07, t);
    else tone('triangle', sp ? 480 : 620 + Math.random() * 90, 0, 0.022 * v, 0.035, t);
  } catch (e) {}
}

/* ================= Code snippets ================= */
const CODE = { js: (window.CODE_SNIPPETS || {}).js || ['let x = 1;'], py: (window.CODE_SNIPPETS || {}).py || ['x = 1'] };

/* ================= Achievements ================= */
const ACH = [
  { id: 'first',    icon: '🌱', name: 'البداية',          desc: 'خلّص أول درس',                       ok: c => true },
  { id: 'placed',   icon: '🎯', name: 'عرفت مستواك',      desc: 'خلّص اختبار تحديد المستوى',          ok: c => c.r && c.r.mode === 'placement' },
  { id: 'w30',      icon: '🚶', name: '30 ك/د',           desc: 'وصّل سرعة 30 كلمة بالدقيقة',          ok: c => c.r && c.textLen >= 60 && c.r.wpm >= 30 },
  { id: 'w50',      icon: '🏃', name: '50 ك/د',           desc: 'وصّل سرعة 50 كلمة بالدقيقة',          ok: c => c.r && c.textLen >= 60 && c.r.wpm >= 50 },
  { id: 'w70',      icon: '🚀', name: '70 ك/د',           desc: 'وصّل سرعة 70 كلمة بالدقيقة',          ok: c => c.r && c.textLen >= 60 && c.r.wpm >= 70 },
  { id: 'w100',     icon: '⚡', name: '100 ك/د',          desc: 'وصّل سرعة 100 كلمة بالدقيقة',         ok: c => c.r && c.textLen >= 60 && c.r.wpm >= 100 },
  { id: 'perfect',  icon: '💎', name: 'بدون ولا غلطة',    desc: 'درس كامل بدقة 100%',                  ok: c => c.r && c.textLen >= 60 && c.r.acc >= 1 },
  { id: 'combo100', icon: '🔥', name: 'سلسلة 100',         desc: '100 حرف صح ورا بعض',                 ok: c => c.r && c.r.bestCombo >= 100 },
  { id: 'combo300', icon: '☄️', name: 'سلسلة 300',         desc: '300 حرف صح ورا بعض',                 ok: c => c.r && c.r.bestCombo >= 300 },
  { id: 'ghost5',   icon: '👻', name: 'صيّاد الأشباح',     desc: 'اسبق الشبح 5 مرات',                   ok: () => S.counts.ghostWins >= 5 },
  { id: 'allAr',    icon: '🏆', name: 'الأبجدية العربية',  desc: 'افتح كل الحروف العربية',               ok: () => S.profiles.ar.unlocked >= ORDER.ar.length },
  { id: 'allEn',    icon: '🔤', name: 'كل الحروف الإنجليزية', desc: 'افتح كل الحروف الإنجليزية',        ok: () => S.profiles.en.unlocked >= ORDER.en.length },
  { id: 'bi',       icon: '🌍', name: 'ثنائي اللغة',       desc: 'تدرّب بالعربي والإنجليزي',             ok: () => ['ar', 'en'].every(l => { const q = S.profiles[l]; return q.history.length + q.tests.length + q.sentHist.length > 0; }) },
  { id: 'sent10',   icon: '📝', name: 'قارئ نهم',          desc: 'خلّص 10 دروس جمل',                    ok: () => S.counts.sentences >= 10 },
  { id: 'coder',    icon: '💻', name: 'مبرمج',             desc: 'خلّص أول تمرين كود',                  ok: () => S.counts.code >= 1 },
  { id: 'drill5',   icon: '⚡', name: 'مطارد الضعف',       desc: 'خلّص 5 تمارين ضعف',                   ok: () => S.counts.drills >= 5 },
  { id: 'metro',    icon: '🎵', name: 'على الإيقاع',       desc: 'خلّص درس بالإيقاع بدقة 95%',          ok: c => c.r && c.r.metro && c.r.acc >= 0.95 && c.textLen >= 60 },
  { id: 'nolook',   icon: '🙈', name: 'بدون نظر',          desc: 'خلّص درس بدون نظر بدقة 95%',          ok: c => c.r && c.r.nolook && c.r.acc >= 0.95 && c.textLen >= 60 },
  { id: 'game1k',   icon: '🎮', name: 'لاعب',              desc: '1000 نقطة باللعبة',                   ok: c => c.game && c.game.score >= 1000 },
  { id: 'game5k',   icon: '👾', name: 'أسطورة اللعبة',     desc: '5000 نقطة باللعبة',                   ok: c => c.game && c.game.score >= 5000 },
  { id: 'hour',     icon: '⏳', name: 'ساعة تدريب',        desc: 'مجموع تدريبك وصل ساعة',               ok: () => S.profiles.ar.totalMs + S.profiles.en.totalMs >= 3600000 }
];
let achQueue = [], achShowing = false;
function checkAch(ctx) {
  const fresh = ACH.filter(a => !S.ach[a.id] && a.ok(ctx));
  if (!fresh.length) return;
  for (const a of fresh) S.ach[a.id] = Date.now();
  save(); achQueue.push(...fresh); if (!achShowing) nextAch();
}
function nextAch() {
  const a = achQueue.shift(); if (!a) { achShowing = false; return; }
  achShowing = true;
  setTimeout(() => {
    toast(`<span class="ach-toast"><b>${a.icon}</b><span>إنجاز جديد!<br><strong>${a.name}</strong></span></span>`);
    sound('ach'); burst(70);
    setTimeout(nextAch, 2600);
  }, 900);
}
function achPanel() {
  const got = ACH.filter(a => S.ach[a.id]).length;
  return `<div class="panel"><h2>🏅 الإنجازات <span class="lbl">— ${got} من ${ACH.length}</span></h2>
    <div class="ach-grid">${ACH.map(a => { const d = S.ach[a.id];
      return `<div class="ach ${d ? 'got' : ''}" title="${esc(a.desc)}"><b>${a.icon}</b><span>${a.name}</span><small>${d ? new Date(d).toLocaleDateString('ar') : esc(a.desc)}</small></div>`; }).join('')}</div></div>`;
}

/* ================= Falling words game ================= */
const G = { on: false, paused: false, words: [], target: null, raf: 0 };
const arena = $('#arena');
function gameIntro() {
  gameStop();
  const p = P();
  arena.querySelectorAll('.fw').forEach(e => e.remove());
  gHud();
  $('#gOverlay').hidden = false;
  $('#gOverlay').innerHTML = `<div class="g-card"><div class="g-emoji">🎮</div><h2>الكلمات النازلة</h2>
    <p>اكتب كل كلمة قبل ما توصل للأرض. كل 8 كلمات بيطلع مستوى أسرع، ومعك 3 أرواح ❤️</p>
    <p class="lbl">أعلى نتيجة إلك ${S.lang === 'ar' ? 'بالعربي' : 'بالإنجليزي'}: <b>${p.gameBest || 0}</b></p>
    <button class="btn primary big" id="gStart">ابدأ اللعبة <kbd>Enter</kbd></button></div>`;
  $('#gStart').onclick = gameStart;
}
function gHud() {
  $('#gScore').textContent = G.score || 0; $('#gLevel').textContent = G.level || 1;
  $('#gLives').textContent = '❤️'.repeat(Math.max(0, G.lives ?? 3)) + '🖤'.repeat(Math.max(0, 3 - (G.lives ?? 3)));
  const min = G.t0 ? (performance.now() - G.t0) / 60000 : 0;
  $('#gWpm').textContent = min > 0.05 ? Math.round((G.chars || 0) / 5 / min) : 0;
}
function gameStart() {
  gameStop();
  arena.querySelectorAll('.fw').forEach(e => e.remove());
  Object.assign(G, { on: true, paused: false, words: [], target: null, score: 0, level: 1, lives: 3, cleared: 0, chars: 0, keys: 0, errors: 0,
    combo: 0, t0: performance.now(), last: performance.now(), lastSpawn: 0 });
  $('#gOverlay').hidden = true; gHud();
  if (TOUCH) focusMobile();
  G.raf = requestAnimationFrame(gameStep);
}
function gameStop() { G.on = false; cancelAnimationFrame(G.raf); }
function gamePause(p) {
  if (!G.on) return;
  G.paused = p;
  $('#gOverlay').hidden = !p;
  if (p) $('#gOverlay').innerHTML = `<div class="g-card"><div class="g-emoji">⏸</div><h2>إيقاف مؤقت</h2><button class="btn primary big" id="gResume">كمّل <kbd>Esc</kbd></button></div>`, $('#gResume').onclick = () => gamePause(false);
  else { G.last = performance.now(); G.raf = requestAnimationFrame(gameStep); }
}
function gamePool() {
  const list = WORDS[S.lang].filter(w => w.length >= 2 && w.length <= 3 + Math.min(6, G.level));
  const weak = weakest3();
  const hits = list.filter(w => weak.some(k => w.includes(k)));
  return Math.random() < 0.35 && hits.length ? hits : list;
}
function spawnWord() {
  const used = new Set(G.words.map(w => w.text[0]));
  let text = '', tries = 0;
  do { text = pick(gamePool()); tries++; } while (used.has(text[0]) && tries < 12);
  const el = document.createElement('div');
  el.className = 'fw ' + S.lang; el.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  el.innerHTML = `<span class="gt"></span><span class="gr">${esc(text)}</span>`;
  arena.appendChild(el);
  const W = arena.clientWidth, w = el.offsetWidth;
  const word = { el, text, x: 10 + Math.random() * Math.max(10, W - w - 20), y: -40, typed: 0 };
  el.style.transform = `translate(${word.x}px, ${word.y}px)`;
  G.words.push(word);
}
function gameStep(now) {
  if (!G.on || G.paused) return;
  const dt = Math.min(60, now - G.last); G.last = now;
  const speed = 26 + G.level * 9, every = Math.max(650, 2300 - G.level * 170), H = arena.clientHeight;
  if (now - G.lastSpawn > every && G.words.length < 4 + G.level) { spawnWord(); G.lastSpawn = now; }
  for (const w of [...G.words]) {
    w.y += speed * dt / 1000;
    w.el.style.transform = `translate(${w.x}px, ${w.y}px)`;
    w.el.classList.toggle('danger', w.y > H * 0.7);
    if (w.y > H - 44) gameMiss(w);
  }
  if (G.on) { gHud(); G.raf = requestAnimationFrame(gameStep); }
}
function removeWord(w, cls) {
  G.words = G.words.filter(x => x !== w);
  if (G.target === w) G.target = null;
  w.el.classList.add(cls); setTimeout(() => w.el.remove(), 450);
}
function gameMiss(w) {
  if (!G.on) return;
  removeWord(w, 'miss'); G.lives--; G.combo = 0; sound('lose');
  arena.classList.remove('hit'); void arena.offsetWidth; arena.classList.add('hit');
  $('#gBuf').textContent = '';
  if (G.lives <= 0) gameOver();
}
function renderTarget(w) {
  w.el.querySelector('.gt').textContent = w.text.slice(0, w.typed);
  w.el.querySelector('.gr').textContent = w.text.slice(w.typed);
  $('#gBuf').textContent = w.text.slice(0, w.typed);
}
function gameChar(c) {
  if (!G.on || G.paused || c === ' ' || c === '\n') return;
  G.keys++;
  if (!G.target) {
    const cands = G.words.filter(w => same(c, w.text[0])).sort((a, b) => b.y - a.y);
    if (!cands.length) return gameErr();
    G.target = cands[0]; G.target.el.classList.add('locked');
  } else if (!same(c, G.target.text[G.target.typed])) return gameErr();
  const w = G.target; w.typed++; G.chars++; G.combo++; sound('ok'); renderTarget(w);
  if (w.typed >= w.text.length) {
    const pts = w.text.length * 10 * G.level + Math.min(50, G.combo);
    G.score += pts; G.cleared++; sound('pop');
    const fl = document.createElement('div'); fl.className = 'pts'; fl.textContent = '+' + pts;
    fl.style.transform = `translate(${w.x}px, ${w.y}px)`; arena.appendChild(fl); setTimeout(() => fl.remove(), 800);
    removeWord(w, 'boom'); $('#gBuf').textContent = '';
    if (G.cleared % 8 === 0) {
      G.level++; sound('level');
      const lv = document.createElement('div'); lv.className = 'lvl-up'; lv.textContent = `المستوى ${G.level}!`;
      arena.appendChild(lv); setTimeout(() => lv.remove(), 1300);
    }
  }
  gHud();
}
function gameErr() {
  G.errors++; G.combo = 0; sound('err');
  const w = G.target; if (w) { w.el.classList.remove('shake'); void w.el.offsetWidth; w.el.classList.add('shake'); }
}
function gameBack() {
  const w = G.target; if (!w) return;
  w.typed--; if (w.typed <= 0) { w.typed = 0; w.el.classList.remove('locked'); G.target = null; }
  renderTarget(w);
}
function gameOver() {
  gameStop(); G.lives = Math.max(0, G.lives); gHud();
  const p = P(), min = (performance.now() - G.t0) / 60000;
  const wpm = Math.round(G.chars / 5 / Math.max(min, 0.05)), acc = G.keys ? (G.keys - G.errors) / G.keys : 0;
  const best = p.gameBest || 0, record = G.score > best;
  p.gameBest = Math.max(best, G.score); p.totalMs += min * 60000;
  p.games.push({ d: Date.now(), score: G.score, level: G.level, wpm }); if (p.games.length > 100) p.games.shift();
  S.counts.games++; save();
  $('#gOverlay').hidden = false;
  $('#gOverlay').innerHTML = `<div class="g-card"><div class="g-emoji">${record ? '🏆' : '💥'}</div><h2>${record ? 'رقم قياسي جديد!' : 'انتهت اللعبة'}</h2>
    <div class="r-nums g-nums"><div class="r-num"><b data-to="${G.score}">0</b><span>النقاط</span></div><div class="r-num sm"><b>${G.level}</b><span>المستوى</span></div>
    <div class="r-num sm"><b>${G.cleared}</b><span>كلمة</span></div><div class="r-num sm"><b>${wpm}</b><span>ك/د</span></div><div class="r-num sm"><b>${Math.round(acc * 100)}%</b><span>الدقة</span></div></div>
    <p class="lbl">أعلى نتيجة: <b>${p.gameBest}</b></p>
    <button class="btn primary big" id="gStart">العب مرة ثانية <kbd>Enter</kbd></button></div>`;
  $('#gOverlay').querySelectorAll('[data-to]').forEach(countUp);
  $('#gStart').onclick = gameStart;
  if (record && G.score > 0) burst(120);
  checkAch({ game: { score: G.score } });
}
function gameKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); if (G.on) gamePause(!G.paused); return; }
  if (!G.on) { if (e.key === 'Enter') { e.preventDefault(); gameStart(); } return; }
  if (G.paused) { if (e.key === 'Enter') { e.preventDefault(); gamePause(false); } return; }
  if (e.key === 'Backspace') { e.preventDefault(); gameBack(); return; }
  if (e.metaKey || (e.ctrlKey && !e.altKey) || (e.altKey && !e.ctrlKey) || e.isComposing) return;
  const ch = e.key;
  if (!ch || (ch.length > 1 && !/^[؀-ۿ]+$/.test(ch))) return;
  e.preventDefault();
  for (const c of translate(ch, e)) gameChar(c);
}
/* ================= Appearance ================= */
const SKINS = {
  night:    { name: 'ليلي',      base: 'dark',  bg: '#0d0f13', ac: '#f2b544', tx: '#e9ebf1' },
  sand:     { name: 'رملي',      base: 'light', bg: '#f5f3ee', ac: '#d08a10', tx: '#1c2029' },
  navy:     { name: 'كحلي',      base: 'dark',  bg: '#0b1324', ac: '#5cc8ff', tx: '#e6edf9' },
  mint:     { name: 'نعناعي',    base: 'light', bg: '#eef7f3', ac: '#14a37f', tx: '#16302a' },
  paper:    { name: 'ورق قديم',  base: 'light', bg: '#f3ead8', ac: '#a4532b', tx: '#3b2f22' },
  contrast: { name: 'تباين عالي', base: 'dark',  bg: '#000000', ac: '#ffe600', tx: '#ffffff' }
};
const FONTS_AR = { plex: ['IBM Plex', '"IBM Plex Sans Arabic"'], cairo: ['Cairo', '"Cairo"'], tajawal: ['Tajawal', '"Tajawal"'], amiri: ['أميري', '"Amiri"'] };
const FONTS_EN = { jet: ['JetBrains', '"JetBrains Mono"'], plexmono: ['Plex Mono', '"IBM Plex Mono"'], source: ['Source Code', '"Source Code Pro"'] };
const SIZES = { s: ['صغير', 0.85], m: ['وسط', 1], l: ['كبير', 1.18], xl: ['أكبر', 1.35] };
const CARETS = { line: 'خط', block: 'مربع', under: 'تحت الحرف' };
const GHOSTS = { off: 'بدون', best: 'أفضل نتيجة', avg: 'متوسطي', target: 'الهدف' };
const LENGTHS = { 15: 'قصير', 25: 'متوسط', 40: 'طويل' };
if (!SKINS[S.skin]) S.skin = S.theme === 'light' ? 'sand' : 'night';
if (!FONTS_AR[S.settings.fontAr]) S.settings.fontAr = 'plex';
if (!FONTS_EN[S.settings.fontEn]) S.settings.fontEn = 'jet';
if (!SIZES[S.settings.size]) S.settings.size = 'm';
if (!CARETS[S.settings.caret]) S.settings.caret = 'line';
if (!GHOSTS[S.settings.ghost]) S.settings.ghost = 'best';

function applyAppearance() {
  const sk = SKINS[S.skin], root = document.documentElement, st = S.settings;
  root.dataset.theme = sk.base; root.dataset.skin = S.skin;
  root.style.setProperty('--font-ar', FONTS_AR[st.fontAr][1] + ', "IBM Plex Sans Arabic", sans-serif');
  root.style.setProperty('--font-en', FONTS_EN[st.fontEn][1] + ', "JetBrains Mono", monospace');
  root.style.setProperty('--fscale', SIZES[st.size][1]);
  root.dataset.caret = st.caret; root.dataset.smooth = st.smooth ? '1' : '0';
  $('#comboBox').hidden = !st.combo;
  const re = () => { if (view === 'type' && T) { measure(); placeCaret(); } };
  requestAnimationFrame(re);
  if (document.fonts) document.fonts.ready.then(re);
}

/* ================= Settings drawer ================= */
const drawer = $('#drawer'), scrim = $('#scrim');
const drawerOpen = () => drawer.classList.contains('open');
function openDrawer() {
  buildSettings();
  drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); scrim.hidden = false;
  requestAnimationFrame(() => scrim.classList.add('on'));
}
function closeDrawer(silent) {
  drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
  scrim.classList.remove('on'); setTimeout(() => { if (!drawerOpen()) scrim.hidden = true; }, 250);
  if (silent) return;
  if (view === 'type' && T) { if (!T.started && !T.done) newRound(); else renderKbLabels(); }
  else if (view === 'stats') renderStats();
}
function segCtl(id, opts, cur, onPick, styleFn) {
  const el = $('#' + id);
  el.innerHTML = Object.entries(opts).map(([k, v]) =>
    `<button type="button" data-k="${k}" class="${String(k) === String(cur) ? 'active' : ''}"${styleFn ? ` style="${styleFn(k)}"` : ''}>${Array.isArray(v) ? v[0] : v}</button>`).join('');
  el.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    el.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    onPick(b.dataset.k); save();
  };
}
function switchCtl(id, get, set) {
  const el = $('#' + id); el.checked = get();
  el.onchange = () => { set(el.checked); save(); };
}
function renderPreview() {
  const ar = S.lang === 'ar', txt = ar ? 'الكتابة السريعة متعة' : 'Typing fast is fun', done = ar ? 6 : 5;
  const pv = $('#preview');
  pv.dir = ar ? 'rtl' : 'ltr'; pv.className = 'preview text ' + S.lang;
  pv.innerHTML = [...txt].map((c, i) => `<span class="ch ${i < done ? 'ok' : i === done ? 'bad' : ''}">${c}</span>`).join('') ;
  const sp = pv.children[done + 1], cr = document.createElement('i'); cr.className = 'caret idle';
  pv.appendChild(cr);
  requestAnimationFrame(() => {
    const l = sp.offsetLeft, w = sp.offsetWidth, cs = S.settings.caret;
    const x = ar ? l + w : l;
    if (cs === 'line') { cr.style.height = sp.offsetHeight + 'px'; cr.style.transform = `translate(${x - 1}px,${sp.offsetTop}px)`; }
    else {
      cr.style.width = w + 'px';
      cr.style.height = cs === 'block' ? sp.offsetHeight + 'px' : '3px';
      cr.style.transform = `translate(${l}px,${sp.offsetTop + (cs === 'block' ? 0 : sp.offsetHeight - 3)}px)`;
    }
  });
}
function buildSettings() {
  const st = S.settings, look = () => { applyAppearance(); renderPreview(); };
  $('#swatches').innerHTML = Object.entries(SKINS).map(([k, s]) =>
    `<button type="button" class="swatch ${k === S.skin ? 'active' : ''}" data-k="${k}" style="--sb:${s.bg};--sa:${s.ac};--st:${s.tx}" aria-label="${s.name}"><i><b></b></i><span>${s.name}</span></button>`).join('');
  $('#swatches').onclick = e => {
    const b = e.target.closest('.swatch'); if (!b) return;
    S.skin = b.dataset.k; save(); look();
    $$('#swatches .swatch').forEach(x => x.classList.toggle('active', x === b));
  };
  segCtl('fontAr', FONTS_AR, st.fontAr, k => { st.fontAr = k; look(); }, k => `font-family:${FONTS_AR[k][1].replace(/"/g, "'")}`);
  segCtl('fontEn', FONTS_EN, st.fontEn, k => { st.fontEn = k; look(); }, k => `font-family:${FONTS_EN[k][1].replace(/"/g, "'")}`);
  segCtl('fontSize', SIZES, st.size, k => { st.size = k; look(); });
  segCtl('caretStyle', CARETS, st.caret, k => { st.caret = k; look(); });
  switchCtl('setSmooth', () => st.smooth, v => { st.smooth = v; look(); });
  segCtl('setLength', LENGTHS, st.length, k => { st.length = +k; });
  segCtl('setGhost', GHOSTS, st.ghost, k => { st.ghost = k; });
  $('#setTarget').value = P().target;
  $('#setTarget').onchange = () => { P().target = clamp(Math.round(+$('#setTarget').value || 25), 10, 150); $('#setTarget').value = P().target; save(); };
  $('#tgtMinus').onclick = () => { $('#setTarget').value = +$('#setTarget').value - 5; $('#setTarget').onchange(); };
  $('#tgtPlus').onclick = () => { $('#setTarget').value = +$('#setTarget').value + 5; $('#setTarget').onchange(); };
  switchCtl('setStop', () => st.stopOnError, v => st.stopOnError = v);
  switchCtl('setLenient', () => st.lenient, v => st.lenient = v);
  switchCtl('setKb', () => st.keyboard, v => st.keyboard = v);
  switchCtl('setFingers', () => st.fingers, v => st.fingers = v);
  switchCtl('setCombo', () => st.combo, v => { st.combo = v; applyAppearance(); });
  switchCtl('setFx', () => st.fx, v => { st.fx = v; if (v) burst(60); });
  switchCtl('setSound', () => S.sound, v => { S.sound = v; applySound(); if (v) sound('ok'); });
  segCtl('soundPack', PACKS, st.soundPack, k => { st.soundPack = k; if (!S.sound) { S.sound = true; applySound(); $('#setSound').checked = true; } [0, 110, 220].forEach((d, i) => setTimeout(() => sound(i === 2 ? 'space' : 'ok'), d)); });
  switchCtl('setMetro', () => st.metro, v => { st.metro = v; });
  segCtl('metroCpm', { auto: 'تلقائي', 120: '120', 180: '180', 240: '240', 300: '300' }, st.metroCpm, k => { st.metroCpm = k; });
  switchCtl('setNolook', () => st.nolook, v => { st.nolook = v; });
  const vol = $('#setVol'); vol.value = st.volume;
  vol.oninput = () => { st.volume = +vol.value; save(); };
  vol.onchange = () => sound('ok');
  $('#drLang').textContent = S.lang === 'ar' ? 'العربي' : 'الإنجليزي';
  renderPreview();
}

/* ================= Effects ================= */
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(el) {
  const to = +el.dataset.to, suf = el.dataset.suf || '';
  if (reduced) { el.textContent = to + suf; return; }
  const t0 = performance.now(), d = 850;
  const f = now => {
    const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(to * e) + suf;
    if (k < 1) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}
const fx = $('#fx'), fctx = fx.getContext('2d');
let parts = [], fxRun = false;
function burst(n = 120) {
  if (!S.settings.fx || reduced) return;
  const dpr = window.devicePixelRatio || 1;
  fx.width = innerWidth * dpr; fx.height = innerHeight * dpr; fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cs = getComputedStyle(document.documentElement);
  const cols = ['--accent', '--good', '--f4', '--f5', '--f0', '--f2'].map(v => cs.getPropertyValue(v).trim()).filter(Boolean);
  for (let i = 0; i < n; i++) {
    const side = i % 2;
    parts.push({ x: innerWidth * (side ? 0.12 : 0.88), y: innerHeight * 0.4, vx: (side ? 1 : -1) * (2 + Math.random() * 7), vy: -5 - Math.random() * 9,
      life: 80 + Math.random() * 60, c: pick(cols), s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35 });
  }
  if (!fxRun) { fxRun = true; requestAnimationFrame(stepFx); }
}
function stepFx() {
  fctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life-- > 0);
  for (const p of parts) {
    p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
    fctx.save(); fctx.globalAlpha = Math.min(1, p.life / 30); fctx.translate(p.x, p.y); fctx.rotate(p.r);
    fctx.fillStyle = p.c; fctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); fctx.restore();
  }
  if (parts.length) requestAnimationFrame(stepFx); else { fxRun = false; fctx.clearRect(0, 0, innerWidth, innerHeight); }
}
function updateCombo(broke) {
  const box = $('#comboBox'), el = $('#liveCombo'); if (!T) return;
  el.textContent = T.combo;
  box.dataset.tier = T.combo >= 50 ? 3 : T.combo >= 25 ? 2 : T.combo >= 10 ? 1 : 0;
  if (reduced) return;
  if (broke) { box.classList.remove('break'); void box.offsetWidth; box.classList.add('break'); }
  else if (T.combo && T.combo % 10 === 0) { box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); }
}

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
const mi = $('#mobileInput');
document.addEventListener('keydown', e => {
  if (drawerOpen()) { if (e.key === 'Escape') closeDrawer(); return; }
  if (view === 'welcome') { if (e.key === 'Enter') { e.preventDefault(); startPlacement(); } return; }
  if (view === 'game') { if (document.activeElement && document.activeElement !== mi && document.activeElement !== document.body) document.activeElement.blur(); gameKey(e); return; }
  if (view !== 'type' || !T) return;
  pressKey(e.code);
  if (e.getModifierState) $('#capsWarn').hidden = !e.getModifierState('CapsLock');
  if (e.key === 'Tab') { e.preventDefault(); restart(); return; }
  if (e.key === 'Escape') { e.preventDefault(); newRound(); return; }
  if (T.done) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } return; }
  if (document.activeElement && document.activeElement !== document.body && document.activeElement !== mi) document.activeElement.blur();
  if (e.key === 'Enter') { e.preventDefault(); if (T.text[T.pos] === '\n') typeChar('\n'); return; }
  if (e.key === 'Backspace') { e.preventDefault(); back(e.ctrlKey || e.altKey); return; }
  if (e.metaKey || (e.ctrlKey && !e.altKey) || (e.altKey && !e.ctrlKey) || e.isComposing) return;
  let ch = e.key;
  if (!ch || (ch.length > 1 && !/^[؀-ۿ]+$/.test(ch))) return;
  e.preventDefault();
  for (const c of translate(ch, e)) typeChar(c);
});
/* ---------- الموبايل والتابلت: حقل مخفي بيفتح كيبورد الجهاز ---------- */
function resetMI() { mi.value = ' '; try { mi.setSelectionRange(1, 1); } catch (e) {} }
function focusMobile() { resetMI(); mi.focus({ preventScroll: true }); }
function mobileChar(c) {
  if (view === 'game') { if (!G.on) gameStart(); else gameChar(c); return; }
  if (view !== 'type' || !T) return;
  if (T.done) { if (c === ' ' || c === '\n') next(); return; }
  typeChar(c);
}
function mobileBack() {
  if (view === 'game') gameBack();
  else if (view === 'type' && T && !T.done) back(false);
}
mi.addEventListener('input', () => {
  const v = mi.value;
  if (v.length === 0) mobileBack();
  else if (v[0] !== ' ') for (const c of v) mobileChar(c);
  else for (const c of v.slice(1)) mobileChar(c);
  resetMI();
});
mi.addEventListener('focus', () => document.body.classList.add('mi-on'));
mi.addEventListener('blur', () => document.body.classList.remove('mi-on'));
if (TOUCH) document.body.classList.add('touch');
board.addEventListener('click', () => { if (TOUCH) focusMobile(); });
arena.addEventListener('click', e => { if (TOUCH && !e.target.closest('button')) focusMobile(); });
window.addEventListener('resize', () => { if (view === 'type' && T) { measure(); placeCaret(); } });
window.addEventListener('blur', () => { if (view === 'game' && G.on && !G.paused) gamePause(true); });

/* ---------- تثبيت كتطبيق (PWA) ---------- */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#installBtn').hidden = false; });
$('#installBtn').onclick = async () => {
  if (!installEvt) return;
  installEvt.prompt();
  try { await installEvt.userChoice; } catch (e) {}
  installEvt = null; $('#installBtn').hidden = true;
};
try {
  const top = window.top === window.self;
  if ('serviceWorker' in navigator && top && (location.protocol === 'https:' || location.hostname === 'localhost'))
    navigator.serviceWorker.register('sw.js').catch(() => {});
} catch (e) {}
document.fonts && document.fonts.ready.then(() => { if (view === 'type' && T) { measure(); placeCaret(); } });

/* ================= Header controls ================= */
$$('#tabs button').forEach(b => b.onclick = () => { b.blur(); go(b.dataset.tab); });
function setLang(l) {
  if (tab === 'code') { if (l === 'ar') toast('💻 الكود دايماً على الكيبورد الإنجليزي'); return; }
  S.lang = l; save();
  $$('#langSeg button').forEach(b => b.classList.toggle('active', b.dataset.lang === l));
  go(tab === 'stats' ? 'stats' : tab);
}
$$('#langSeg button').forEach(b => b.onclick = () => { b.blur(); setLang(b.dataset.lang); });
$('#soundBtn').onclick = e => { S.sound = !S.sound; applySound(); save(); e.currentTarget.blur(); };
$('#themeBtn').onclick = e => { S.skin = SKINS[S.skin].base === 'dark' ? 'sand' : 'night'; applyAppearance(); save(); e.currentTarget.blur(); };
$('#settingsBtn').onclick = e => { e.currentTarget.blur(); openDrawer(); };
$('#drClose').onclick = () => closeDrawer();
scrim.onclick = () => closeDrawer();
$('#redoPlacement').onclick = () => { closeDrawer(true); startPlacement(); };
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
  S.profiles[S.lang] = newProfile(); save(); closeDrawer(true); go('practice');
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
applyAppearance(); applySound();
$$('#langSeg button').forEach(b => b.classList.toggle('active', b.dataset.lang === S.lang));
go('practice');
})();

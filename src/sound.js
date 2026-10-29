// Sound über die Web Audio API (docs/GDD.md, Abschnitt Sound). Welche Datei wann spielt, steht in data/sounds.json.
// Grundregel: Fehlt eine Sound-id oder eine Datei oder lädt sie nicht, passiert nichts; die Konsole meldet es einmal.
// assets/sounds/files.json listet die vorhandenen Dateien (npm run sounds), damit fehlende gar nicht erst geladen werden.
// Kanäle: Hintergrund (raum_), Schritte (schritt_) und Effekte (alles andere) unter einer Gesamtlautstärke.
// Der Ton startet erst mit dem ersten Klick oder Tastendruck (Vorgabe der Browser).

let DEFS = {};
let present = null;          // Set der vorhandenen Dateien oder null (unbekannt: alles versuchen)
const buffers = new Map();   // Datei → AudioBuffer | Promise | null (lädt nicht)
const reported = new Set();  // einmal gemeldete Hinweise
let ctx = null, master = null;
const ch = {};               // bg, fx, steps
let mood = null, loopNode = null, randomTimer = null, ducked = false;
let enemySteps = 0;          // laufende Gegner-Schritte (höchstens zwei gleichzeitig)

const BASE = "assets/sounds/";
const once = (k, text) => { if (!reported.has(k)) { reported.add(k); console.info(text); } };
const channelOf = (id) => (id.startsWith("raum_") ? "bg" : id.startsWith("schritt_") ? "steps" : "fx");
const BG_LEVEL = 1, DUCK_LEVEL = 0.5, FADE = 1.0;

// Beim Start: Zuordnung und Dateiliste laden. Fehler stoppen das Spiel nicht.
export async function loadSounds() {
  try {
    const res = await fetch("data/sounds.json");
    DEFS = await res.json();
    delete DEFS._info;
  } catch (e) {
    console.info("data/sounds.json fehlt, das Spiel bleibt still");
    DEFS = {};
  }
  try {
    const res = await fetch(BASE + "files.json");
    if (res.ok) present = new Set(await res.json());
  } catch (e) { present = null; }
  const unlock = () => { start(); window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

function start() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  ["bg", "fx", "steps"].forEach(k => { ch[k] = ctx.createGain(); ch[k].connect(master); });
  ch.bg.gain.value = ducked ? DUCK_LEVEL : BG_LEVEL;
  if (mood) { const m = mood; mood = null; setMood(m); } // Raum-Stimmung, die vor dem ersten Klick gewählt wurde
}

// Datei laden und dekodieren; null, wenn sie fehlt oder nicht lädt
function load(file) {
  if (buffers.has(file)) return buffers.get(file);
  if (present && !present.has(file)) { buffers.set(file, null); return null; }
  const p = fetch(BASE + file)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(b => ctx.decodeAudioData(b))
    .then(buf => { buffers.set(file, buf); return buf; })
    .catch(() => { buffers.set(file, null); once("f:" + file, "Sound-Datei fehlt oder lädt nicht: " + BASE + file); return null; });
  buffers.set(file, p);
  return p;
}

// Gibt es die Sound-id (mit mindestens einer möglichen Datei)?
export function hasSound(id) {
  const d = DEFS[id];
  return !!(d && d.files && d.files.some(f => !present || present.has(f)));
}

/**
 * Spielt eine Sound-id. opts: { volume (Faktor), rate (Tonhöhe), pan (-1 bis 1), loop, onEnd }
 * Ergebnis: Promise mit { source, gain } oder null.
 */
export async function play(id, opts) {
  opts = opts || {};
  if (!ctx || !id) return null;
  const d = DEFS[id];
  if (!d || !d.files || !d.files.length) { once("id:" + id, "Kein Sound festgelegt: " + id); return null; }
  const files = d.files.filter(f => !present || present.has(f));
  if (!files.length) { once("id:" + id, "Keine Datei für Sound " + id + " (" + d.files.join(", ") + ")"); return null; }
  const buf = await load(files[Math.floor(Math.random() * files.length)]);
  if (!buf) return null;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = opts.rate || 1;
  if (opts.loop) {
    src.loop = true;
    if (d.loopStart !== undefined) src.loopStart = d.loopStart;
    if (d.loopEnd !== undefined) src.loopEnd = d.loopEnd;
  }
  const gain = ctx.createGain();
  gain.gain.value = (d.volume === undefined ? 1 : d.volume) * (opts.volume === undefined ? 1 : opts.volume);
  let node = src;
  if (opts.pan && ctx.createStereoPanner) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = opts.pan;
    src.connect(pan);
    node = pan;
  }
  node.connect(gain);
  gain.connect(ch[opts.channel || channelOf(id)]);
  if (opts.onEnd) src.onended = opts.onEnd;
  src.start(0, opts.loop && d.loopStart ? d.loopStart : 0);
  return { source: src, gain };
}

// Erste vorhandene Sound-id aus einer Liste (etwa treffer_rat, sonst treffer)
export function playFirst(ids, opts) {
  const id = ids.find(hasSound);
  return id ? play(id, opts) : null;
}

/**
 * Raum-Stimmung: Loop raum_<mood>_loop mit Überblendung (etwa 1 Sekunde) und Zufallsgeräusche raum_<mood>_zufall
 * alle 8 bis 20 Sekunden mit wechselnder Lautstärke und Richtung. mood null: Stille.
 */
export function setMood(next) {
  if (next === mood) return;
  mood = next || null;
  if (!ctx) return;
  const old = loopNode;
  loopNode = null;
  if (old) {
    const t = ctx.currentTime;
    old.gain.gain.setValueAtTime(old.gain.gain.value, t);
    old.gain.gain.linearRampToValueAtTime(0, t + FADE);
    old.source.stop(t + FADE + 0.05);
  }
  clearTimeout(randomTimer);
  if (!mood) return;
  const mine = mood;
  play("raum_" + mood + "_loop", { loop: true }).then(n => {
    if (!n) return;
    if (mood !== mine) { n.source.stop(); return; }
    const v = n.gain.gain.value, t = ctx.currentTime;
    n.gain.gain.setValueAtTime(0, t);
    n.gain.gain.linearRampToValueAtTime(v, t + FADE);
    loopNode = n;
  });
  const tick = () => {
    randomTimer = setTimeout(() => {
      if (mood !== mine) return;
      play("raum_" + mood + "_zufall", { volume: 0.7 + Math.random() * 0.3, pan: (Math.random() * 2 - 1) * 0.6 });
      tick();
    }, 8000 + Math.random() * 12000);
  };
  tick();
}

// Während Events und Kämpfen läuft der Hintergrund mit halber Lautstärke
export function setDuck(on) {
  on = !!on;
  if (on === ducked) return;
  ducked = on;
  if (!ctx) return;
  const t = ctx.currentTime;
  ch.bg.gain.setValueAtTime(ch.bg.gain.value, t);
  ch.bg.gain.linearRampToValueAtTime(on ? DUCK_LEVEL : BG_LEVEL, t + 0.4);
}

/**
 * Ein Schritt: schritt_<kind> mit um bis zu 5 % anderer Tonhöhe.
 * opts: { enemy (leiser, höchstens zwei gleichzeitig), big (2×2-Figur, tiefer) }
 */
export function step(kind, opts) {
  if (!ctx || !kind) return;
  opts = opts || {};
  if (opts.enemy && enemySteps >= 2) return;
  const rate = (opts.big ? 0.8 : 1) * (0.95 + Math.random() * 0.1);
  if (opts.enemy) enemySteps++;
  const p = play("schritt_" + kind, { rate, volume: opts.enemy ? 0.5 : 1, onEnd: () => { if (opts.enemy) enemySteps--; } });
  if (opts.enemy) p.then(n => { if (!n) enemySteps--; });
}

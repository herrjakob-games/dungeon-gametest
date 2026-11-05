// Würfelanzeige (docs/GDD.md, „Würfelanzeige“): Spielerwürfe rollen als 3D-Würfel auf einem unsichtbaren Würfelfeld
// über dem Raum. Eigener WebGLRenderer mit durchsichtigem Hintergrund (#diceField), eigene Szene, Kamera und Licht;
// gerendert wird nur während der Bewegung und einmal am Ende. Die Flugbahnen kommen aus data/dice-rolls.json, das
// Ergebnis legt der Regelcode fest: Der Würfel wird in sich so gedreht, dass der gewünschte Wert oben landet.
// Fehlt eine Aufnahme oder klappt WebGL nicht, bleibt es beim Text.
import { DATA } from "./data.js";
import { reduceMotion } from "./config.js";
import { play } from "./sound.js";
import { setDialogHooks } from "./dialog.js";
import { dieShape, targetRotation, rollKey, sidesOf, qNorm } from "./diceLogic.js";
const THREE = window.THREE;

const BODY = "#F0E5D3", INK = "#2A2230";
const FADE_IN = 0.3, FADE_OUT = 0.2, HOLD = 0.4;
const PX_PER_UNIT = 200, FOV = 30, TILT = 78 * Math.PI / 180;

let renderer = null, scene = null, camera = null, failed = false;
let dice = [];          // { group, mats }
let anim = null;        // laufender Wurf: { frames, fps, S, t, duration, landed, holdLeft, resolve }
let fading = null;      // Ausblenden: { t, resolve, promise }
let raf = 0, last = 0;
const textures = {};

function canvasEl() {
  let c = document.getElementById("diceField");
  if (!c) {
    c = document.createElement("canvas");
    c.id = "diceField";
    document.body.appendChild(c);
  }
  return c;
}

function init() {
  if (renderer || failed) return !!renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl(), alpha: true, antialias: true });
  } catch (e) { failed = true; return false; }
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b5a4c, 0.62));
  const sun = new THREE.DirectionalLight(0xffffff, 0.72);
  sun.position.set(1.2, 10, 1.6); // fast von oben
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 20 });
  sun.shadow.radius = 4;
  scene.add(sun);
  // Unsichtbare Ebene, die nur den Schatten zeigt
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.5 }));
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  scene.add(plane);
  camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  resize();
  window.addEventListener("resize", () => { if (renderer) { resize(); renderer.render(scene, camera); } });
  return true;
}

// 200 Pixel pro Einheit, in schmalen Fenstern Breite durch 4; Kamera mit 78° Neigung auf die Raummitte
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const ppu = Math.min(PX_PER_UNIT, w / 4);
  const d = h / (2 * Math.tan(FOV / 2 * Math.PI / 180) * ppu);
  camera.position.set(0, d * Math.sin(TILT), d * Math.cos(TILT));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

// ---------- Würfelkörper ----------
// Textur einer Seite: Ziffer (6 und 9 unterstrichen) auf hellem Grund; beim W4 drei Zahlen, jede zu ihrer Ecke
function faceTexture(n, face, corners) {
  const key = n + ":" + (n === 4 ? corners.map(c => c.label).join(",") : face.value);
  if (textures[key]) return textures[key];
  const size = 128, c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = BODY;
  g.fillRect(0, 0, size, size);
  g.fillStyle = INK;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const font = getComputedStyle(document.documentElement).getPropertyValue("--body").trim() || "sans-serif";
  const digit = (text, x, y, px, rot) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.font = "800 " + px + "px " + font;
    g.fillText(text, 0, 0);
    if (text === "6" || text === "9") g.fillRect(-px * 0.22, px * 0.42, px * 0.44, Math.max(2, px * 0.07));
    g.restore();
  };
  if (n === 4) corners.forEach(k => digit(k.label, size / 2 + k.x * size * 0.3, size / 2 - k.y * size * 0.3, 30, Math.atan2(k.x, k.y)));
  else digit(String(face.value), size / 2, size / 2, { 6: 64, 8: 50, 10: 44, 12: 50, 20: 42 }[n], 0);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  textures[key] = tex;
  return tex;
}

function buildDie(n) {
  const S = dieShape(n);
  const group = new THREE.Group(), mats = [];
  S.faces.forEach(f => {
    // Lage in der Seite: right = up × normal, damit die Ziffer von außen nicht gespiegelt ist
    const u = f.up, nn = f.normal;
    const r = [u[1] * nn[2] - u[2] * nn[1], u[2] * nn[0] - u[0] * nn[2], u[0] * nn[1] - u[1] * nn[0]];
    const loc = f.idx.map(i => {
      const p = S.v[i], d = [p[0] - f.center[0], p[1] - f.center[1], p[2] - f.center[2]];
      return [d[0] * r[0] + d[1] * r[1] + d[2] * r[2], d[0] * u[0] + d[1] * u[1] + d[2] * u[2]];
    });
    const ext = Math.max(...loc.map(l => Math.max(Math.abs(l[0]), Math.abs(l[1])))) * 2.1;
    const pos = [], uv = [];
    for (let k = 1; k < f.idx.length - 1; k++) for (const j of [0, k, k + 1]) {
      pos.push(...S.v[f.idx[j]]);
      uv.push(0.5 + loc[j][0] / ext, 0.5 + loc[j][1] / ext);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    // W4: jede Ecke trägt die Zahl ihrer Nummer + 1 (die Zahl an der oberen Spitze gilt)
    const corners = n === 4 ? f.idx.map((i, j) => ({ label: String(i + 1), x: loc[j][0] / ext * 2, y: loc[j][1] / ext * 2 })) : null;
    const mat = new THREE.MeshLambertMaterial({ map: faceTexture(n, f, corners), transparent: true, opacity: 0 }) // flach: jede Seite hat eigene Ecken;
    mats.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);
  });
  scene.add(group);
  return { group, mats };
}

function clearDice() {
  dice.forEach(d => { scene.remove(d.group); d.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); d.mats.forEach(m => m.dispose()); });
  dice = [];
}

const setOpacity = (k) => dice.forEach(d => d.mats.forEach(m => { m.opacity = k; }));
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qs = new THREE.Quaternion();

// Lage zur Zeit t: Position linear, Drehung slerp zwischen zwei Bildern, danach die Drehung S im Würfel
function pose(t) {
  const a = anim, x = Math.min(a.frames.length - 1, t * a.fps), i = Math.floor(x), k = x - i, j = Math.min(i + 1, a.frames.length - 1);
  dice.forEach((d, n) => {
    const f0 = a.frames[i][n], f1 = a.frames[j][n];
    d.group.position.set(f0[0] + (f1[0] - f0[0]) * k, f0[1] + (f1[1] - f0[1]) * k, f0[2] + (f1[2] - f0[2]) * k);
    qa.set(...qNorm(f0.slice(3))); qb.set(...qNorm(f1.slice(3)));
    qa.slerp(qb, k);
    qs.set(...a.S[n]);
    d.group.quaternion.copy(qa).multiply(qs);
  });
}

function tick(now) {
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
  last = now;
  let more = false;
  if (anim) {
    const a = anim;
    if (!a.landed) {
      a.t = Math.min(a.duration, a.t + dt);
      pose(a.t);
      setOpacity(Math.min(1, a.t / FADE_IN));
      if (a.t >= a.duration) { a.landed = true; setOpacity(1); play("wuerfel_landen"); }
      more = true;
    } else {
      a.holdLeft -= dt;
      if (a.holdLeft <= 0) { anim = null; a.resolve(); } else more = true;
    }
  }
  if (fading) {
    fading.t += dt;
    setOpacity(Math.max(0, 1 - fading.t / FADE_OUT));
    if (fading.t >= FADE_OUT) { clearDice(); const f = fading; fading = null; f.resolve(); } else more = true;
  }
  renderer.render(scene, camera);
  raf = more ? requestAnimationFrame(tick) : 0;
}

function kick() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

// Klick in den Raum oder eine Taste: sofort auf die Endlage
function skip(e) {
  if (!anim || anim.landed) return;
  anim.t = anim.duration;
  if (e && e.type === "keydown") { e.preventDefault(); e.stopPropagation(); }
}
window.addEventListener("pointerdown", (e) => { if (anim && !anim.landed) { skip(e); e.stopPropagation(); } }, true);
window.addEventListener("keydown", (e) => { if (anim && !anim.landed) skip(e); }, true);

export const isRolling = () => !!anim;

/**
 * Würfel ausblenden (in 0,2 Sekunden); bei der nächsten Auswahl und beim Schließen des Textfensters.
 * Ergebnis: Promise, das nach dem Ausblenden erfüllt ist.
 */
export function hideDice() {
  if (fading) return fading.promise;
  if (!dice.length || anim) return Promise.resolve();
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  fading = { t: 0, resolve, promise };
  if (reduceMotion) fading.t = FADE_OUT;
  kick();
  return promise;
}

/**
 * Würfelsatz spec (etwa "W20", "2W4+2") mit den Werten values rollen lassen. Ergebnis: Promise, erfüllt 0,4 Sekunden
 * nach der Landung. Ohne Aufnahme, ohne Würfel (feste Zahl) oder ohne WebGL sofort.
 */
export async function showRoll(spec, values) {
  const key = rollKey(spec);
  const set = key && DATA && DATA.diceRolls && DATA.diceRolls.sets[key];
  if (!set || !set.length || !values || !values.length || !init()) return;
  await hideDice();
  if (anim) return;
  const n = sidesOf(key);
  const rec = set[Math.floor(Math.random() * set.length)];
  const end = rec.frames[rec.frames.length - 1];
  const S = values.map((v, i) => targetRotation(n, end[i].slice(3), rec.faces[i], v) || [0, 0, 0, 1]);
  dice = values.map(() => buildDie(n));
  const fps = DATA.diceRolls.fps || 30;
  return new Promise(resolve => {
    anim = { frames: rec.frames, fps, S, t: 0, duration: (rec.frames.length - 1) / fps, landed: false, holdLeft: HOLD, resolve };
    if (reduceMotion) anim.t = anim.duration; // ohne Flug gleich in der Endlage
    else play("wuerfel_rollen");
    pose(anim.t);
    setOpacity(reduceMotion ? 1 : 0);
    kick();
  });
}

// Eine Auswahl im Textfenster und das Schließen blenden die Würfel aus (ohne Import-Kreis: dialog.js ruft zurück)
setDialogHooks({ pick: () => { hideDice(); }, close: () => { hideDice(); } });

// Zum Prüfen im Browser: Anzahl, Zustand und Lage der Würfel
export const diceDebug = () => ({ count: dice.length, rolling: !!anim, landed: !!(anim && anim.landed), q: dice.map(d => d.group.quaternion.toArray()) });

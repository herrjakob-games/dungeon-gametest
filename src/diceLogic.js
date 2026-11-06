// Würfelanzeige (docs/GDD.md, „Würfelanzeige“): Körper der Würfel, Werte der Seiten, Symmetrie-Drehungen und die
// Drehung, die eine Aufnahme auf einen gewünschten Wert landen lässt. Rein logisch, ohne Three.js; tools/record-dice.mjs
// nimmt mit denselben Körpern die Flugbahnen auf, src/diceView.js spielt sie ab.
// Quaternionen sind [x, y, z, w], Vektoren [x, y, z]. Oben ist +y; die Kamera der Anzeige steht auf der +z-Seite, oben
// auf dem Bildschirm ist auf dem Tisch also -z.

export const SIDES = [4, 6, 8, 10, 12, 20];
export const RADIUS = 0.5;                       // Würfelradius (W4 ×1,25, W6 ×0,95)
export const SCALE = { 4: 1.25, 6: 0.95 };
export const MAX_SECONDS = 1.8;                  // längste Aufnahme
// Plätze der Endlage (x, z) für 1, 2 und 4 Würfel
export const SLOTS = { 1: [[0, 0]], 2: [[-0.75, -0.1], [0.75, 0.1]], 4: [[-0.72, -1.15], [0.72, -1.05], [-0.72, 0.25], [0.72, 0.35]] };
// Würfelsätze mit Aufnahme
export const SETS = ["W20x1", "W4x1", "W6x1", "W8x1", "W10x1", "W12x1", "W4x2", "W4x4", "W6x4"];

const PHI = (1 + Math.sqrt(5)) / 2, IPHI = 1 / PHI;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a); return a.map(x => x / l); };
const scale = (a, k) => a.map(x => x * k);

// Ecken der Grundkörper (vor dem Skalieren)
function verts(n) {
  if (n === 4) return [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
  if (n === 6) { const v = []; for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]); return v; }
  if (n === 8) return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  if (n === 10) {
    // Fünfeck-Trapezoeder: Ring mit Radius 1 auf Höhe ±b im Wechsel, Spitzen so hoch, dass die Seiten eben sind
    const c = Math.cos(Math.PI / 5), b = 0.105, h = b * (1 + c) / (1 - c), v = [[0, 0, h], [0, 0, -h]];
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; v.push([Math.cos(a), Math.sin(a), k % 2 ? b : -b]); }
    return v;
  }
  if (n === 12) {
    const v = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) v.push([0, a * IPHI, b * PHI], [a * IPHI, b * PHI, 0], [a * PHI, 0, b * IPHI]);
    return v;
  }
  if (n === 20) { const v = []; for (const a of [-1, 1]) for (const b of [-1, 1]) v.push([0, a, b * PHI], [a, b * PHI, 0], [a * PHI, 0, b]); return v; }
  throw new Error("Kein Würfel mit " + n + " Seiten");
}

// Konvexe Hülle: Ecken (skaliert) und Seiten (Ecken gegen den Uhrzeigersinn von außen gesehen, Normale nach außen)
function poly(n) {
  let v = verts(n);
  const R = Math.max(...v.map(x => Math.hypot(...x)));
  const s = RADIUS / R * (SCALE[n] || 1);
  v = v.map(x => x.map(y => y * s));
  const seen = new Map();
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) for (let k = j + 1; k < v.length; k++) {
    let m = cross(sub(v[j], v[i]), sub(v[k], v[i]));
    if (Math.hypot(...m) < 1e-9) continue;
    m = norm(m);
    let d = dot(m, v[i]);
    if (d < 0) { m = m.map(x => -x); d = -d; }
    if (v.some(q => dot(m, q) > d + 1e-7)) continue;
    const key = m.map(x => (Math.round(x * 1e4) + 0) || 0).join();
    if (seen.has(key)) continue;
    const idx = v.map((q, t) => (Math.abs(dot(m, q) - d) < 1e-7 ? t : -1)).filter(t => t >= 0);
    const c = idx.reduce((a, t) => a.map((x, u) => x + v[t][u] / idx.length), [0, 0, 0]);
    const e1 = norm(sub(v[idx[0]], c)), e2 = cross(m, e1);
    idx.sort((a, b) => Math.atan2(dot(sub(v[a], c), e2), dot(sub(v[a], c), e1)) - Math.atan2(dot(sub(v[b], c), e2), dot(sub(v[b], c), e1)));
    seen.set(key, { idx, normal: m });
  }
  return { v, faces: [...seen.values()] };
}

// Werte der Seiten: gegenüberliegende Seiten ergeben zusammen n+1; beim W4 zählt die Ecke gegenüber der unteren Seite
function values(n, P) {
  const val = new Array(P.faces.length);
  if (n === 4) { P.faces.forEach((f, i) => { val[i] = [0, 1, 2, 3].find(x => !f.idx.includes(x)) + 1; }); return val; }
  let lo = 1;
  const used = new Set();
  P.faces.forEach((f, i) => {
    if (used.has(i)) return;
    const j = P.faces.findIndex(g => dot(f.normal, g.normal) < -0.999);
    val[i] = lo; val[j] = n + 1 - lo; lo++;
    used.add(i); used.add(j);
  });
  return val;
}

const cache = {};
/**
 * Würfelkörper: { n, v, faces: [{ idx, normal, center, value, up }], radius }. up: Richtung „oben“ für die Ziffer auf
 * der Seite (zur Ecke bei Dreiecken und Fünfecken, zur Spitze beim W10, zur Kante beim W6). Beim W4 ist value der Wert,
 * wenn die Seite unten liegt (die Zahl an der oberen Spitze), und jede Ecke k trägt die Zahl k+1.
 */
export function dieShape(n) {
  if (cache[n]) return cache[n];
  const P = poly(n), val = values(n, P);
  const faces = P.faces.map((f, i) => {
    const center = f.idx.reduce((a, t) => a.map((x, u) => x + P.v[t][u] / f.idx.length), [0, 0, 0]);
    let toward;
    if (n === 6) toward = scale([0, 1, 2].map(u => P.v[f.idx[0]][u] + P.v[f.idx[1]][u]), 0.5);
    else if (n === 10) toward = P.v[f.idx.reduce((b, t) => (Math.hypot(...sub(P.v[t], center)) > Math.hypot(...sub(P.v[b], center)) ? t : b), f.idx[0])];
    else toward = P.v[f.idx[0]];
    const d = sub(toward, center);
    const up = norm(sub(d, scale(f.normal, dot(d, f.normal))));
    return { idx: f.idx, normal: f.normal, center, value: val[i], up };
  });
  cache[n] = { n, v: P.v, faces, radius: RADIUS * (SCALE[n] || 1) };
  return cache[n];
}

// ---------- Quaternionen ----------
export const qMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
];
// Auf Länge 1 bringen (die Aufnahme speichert gerundete Werte)
export const qNorm = (q) => { const l = Math.hypot(...q) || 1; return q.map(x => x / l); };
export function qRot(q, v) {
  q = qNorm(q);
  const u = [q[0], q[1], q[2]], s = q[3];
  const t = scale(cross(u, v), 2);
  return [0, 1, 2].map(i => v[i] + s * t[i] + cross(u, t)[i]);
}
// Drehmatrix (Spalten x, y, z) → Quaternion
function qFromBasis(x, y, z) {
  const m00 = x[0], m01 = y[0], m02 = z[0], m10 = x[1], m11 = y[1], m12 = z[1], m20 = x[2], m21 = y[2], m22 = z[2];
  const tr = m00 + m11 + m22;
  let q;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4]; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s]; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s]; }
  const l = Math.hypot(...q);
  return q.map(x => x / l);
}

const symCache = {};
/**
 * Symmetrie-Drehungen des Würfels: alle Drehungen, die den Körper auf sich selbst abbilden (als Quaternionen).
 * Eine Drehung ist durch das Bild von Seite 0 und einer ihrer Ecken festgelegt.
 */
export function symmetries(n) {
  if (symCache[n]) return symCache[n];
  const S = dieShape(n);
  const frame = (f, corner) => { const x = norm(sub(S.v[corner], f.center)); return [x, cross(f.normal, x), f.normal]; };
  const fa = S.faces[0], Fa = frame(fa, fa.idx[0]);
  const out = [];
  for (const fb of S.faces) for (const t of fb.idx) {
    const Fb = frame(fb, t);
    // R = Fb · Faᵀ: bildet die Achsen von Fa auf die von Fb ab
    const col = (k) => [0, 1, 2].map(u => Fb[0][u] * Fa[0][k] + Fb[1][u] * Fa[1][k] + Fb[2][u] * Fa[2][k]);
    const x = col(0), y = col(1), z = col(2);
    const ap = (p) => [0, 1, 2].map(u => x[u] * p[0] + y[u] * p[1] + z[u] * p[2]);
    if (S.v.every(p => { const m = ap(p); return S.v.some(w => Math.hypot(...sub(w, m)) < 1e-6); })) out.push(qFromBasis(x, y, z));
  }
  symCache[n] = out;
  return out;
}

/**
 * Drehung im Würfel, damit eine Aufnahme auf value landet: endQuat ist die Lage im letzten Bild, endFace die Seite, die
 * dort oben liegt (beim W4 unten). Ergebnis: Quaternion S; abgespielt wird jedes Bild als q · S. Von mehreren passenden
 * Drehungen gilt die, bei der die Ziffer am aufrechtesten liegt (oben auf dem Bildschirm ist -z).
 */
export function targetRotation(n, endQuat, endFace, value) {
  const S = dieShape(n);
  endQuat = qNorm(endQuat);
  const target = S.faces[endFace].normal;
  let best = null, bestScore = -Infinity;
  for (const g of S.faces) {
    if (g.value !== value) continue;
    for (const q of symmetries(n)) {
      if (Math.hypot(...sub(qRot(q, g.normal), target)) > 1e-5) continue;
      const score = -qRot(endQuat, qRot(q, g.up))[2];
      if (score > bestScore) { bestScore = score; best = q; }
    }
  }
  return best;
}

// Welche Seite liegt bei Lage q oben (beim W4 unten)? Für Tests und die Aufnahme
export function topFace(n, q) {
  const S = dieShape(n);
  let best = -2, face = -1;
  S.faces.forEach((f, i) => { const w = qRot(q, f.normal); const d = n === 4 ? -w[1] : w[1]; if (d > best) { best = d; face = i; } });
  return { face, angle: Math.acos(Math.min(1, best)) * 180 / Math.PI };
}

// ---------- Würfelangaben ----------
const SPEC = /^(\d*)W(\d+)([+-]\d+)?$/;
// Würfelsatz einer Angabe, etwa "2W4+2" → "W4x2"; feste Zahlen haben keinen (null)
export function rollKey(spec) {
  const m = typeof spec === "string" && SPEC.exec(spec);
  if (!m) return null;
  return "W" + m[2] + "x" + (m[1] ? parseInt(m[1], 10) : 1);
}
export const sidesOf = (key) => parseInt(/^W(\d+)x/.exec(key)[1], 10);

/**
 * Datenprüfung: Jede Würfelangabe aus damage und use in data/items.json hat eine Aufnahme in data/dice-rolls.json,
 * der W20 für Proben ebenso. err(where, text)
 */
export function checkDiceRolls(rolls, items, err) {
  const sets = (rolls && rolls.sets) || {};
  const need = new Map([["W20x1", "Proben"]]);
  for (const it of Object.values(items || {})) {
    const specs = [it.damage].concat(Object.values(it.use || {}));
    specs.forEach(s => { const k = rollKey(s); if (k && !need.has(k)) need.set(k, it.id); });
  }
  for (const [k, who] of need) if (!(sets[k] && sets[k].length)) err("dice-rolls", "keine Aufnahme für " + k + " (" + who + ")");
}

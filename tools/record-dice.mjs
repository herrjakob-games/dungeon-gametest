// Nimmt die Flugbahnen der Würfelanzeige auf (docs/GDD.md, „Würfelanzeige“) und schreibt data/dice-rolls.json.
// Physik mit cannon-es (nur hier, nicht im Spiel). Die Körper kommen aus src/diceLogic.js, der Zufall aus mulberry32 mit
// festem Seed: Die Datei ist bei jedem Lauf gleich.
// Aufruf: npm run build:dice   (braucht einmal npm install)
// Format: { fps, sets: { "W4x2": [ { faces: [Seite oben je Würfel, beim W4 unten], frames: [ [ [x, y, z, qx, qy, qz, qw], … je Würfel ], … ] } ] } }
import fs from "node:fs";
import * as C from "cannon-es";
import { dieShape, topFace, SLOTS, SETS, MAX_SECONDS, sidesOf } from "../src/diceLogic.js";
import { mulberry32 } from "../src/rng.js";

const OUT = new URL("../data/dice-rolls.json", import.meta.url);
const FPS = 30;                 // gespeicherte Bilder pro Sekunde (jedes zweite von 60)
const PER_SET = 8;              // Aufnahmen pro Würfelsatz
const MAX_TILT = 2;             // höchstens so viel Neigung (Grad) zur flachen Seite
const r3 = (x) => +x.toFixed(3);

// Ein Würfel allein, Start rechts oben, rollt nach links; die Endlage wird auf (0, 0) geschoben
function simulate(n, seed) {
  const r = mulberry32(seed), S = dieShape(n);
  const world = new C.World({ gravity: new C.Vec3(0, -60, 0) });
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.35;
  world.defaultContactMaterial.restitution = 0.3;
  // Nur ein Boden, keine Wände: das Würfelfeld ist unsichtbar
  const floor = new C.Body({ mass: 0, shape: new C.Plane() });
  floor.quaternion.setFromAxisAngle(new C.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(floor);
  const b = new C.Body({
    mass: 1, shape: new C.ConvexPolyhedron({ vertices: S.v.map(x => new C.Vec3(...x)), faces: S.faces.map(f => f.idx) }),
    sleepSpeedLimit: 0.15, sleepTimeLimit: 0.15, angularDamping: 0.15, linearDamping: 0.05
  });
  b.position.set(0, 1.0, 0);
  b.quaternion.setFromEuler(r() * 6.28, r() * 6.28, r() * 6.28);
  const v = 11 + r() * 10;
  b.velocity.set(-v, -1, (r() - 0.5) * 1.5);
  b.angularVelocity.set((r() - 0.5) * 14, (r() - 0.5) * 14, v * (1.2 + r() * 0.8));
  world.addBody(b);
  const raw = [];
  let step = 0;
  // Nicht world.fixedStep: das rechnet mit echter Zeit
  while (step < 60 * 4) {
    world.step(1 / 60);
    step++;
    if (step % 2 === 0) raw.push([...b.position.toArray(), ...b.quaternion.toArray()]);
    if (b.sleepState === C.Body.SLEEPING) break;
  }
  const end = raw[raw.length - 1];
  const frames = raw.map(d => [d[0] - end[0], d[1], d[2] - end[2], d[3], d[4], d[5], d[6]].map(r3));
  const last = frames[frames.length - 1];
  const res = topFace(n, last.slice(3));
  return { settled: step < 60 * 4, sec: frames.length / FPS, frames, face: res.face, angle: res.angle, travel: frames[0][0], driftZ: Math.abs(frames[0][2]) };
}

// Gültig: in Ruhe, flach, kurz genug, Start mindestens 4 Einheiten rechts der Endlage, höchstens 1,5 seitlich
const valid = (o) => o.settled && o.sec <= MAX_SECONDS && o.angle <= MAX_TILT && o.travel >= 4 && o.driftZ <= 1.5;

const pools = {};
function pool(n, need) {
  const p = pools[n] || (pools[n] = { list: [], seed: 1, tries: 0 });
  while (p.list.length < need && p.tries < 20000) {
    p.tries++;
    const o = simulate(n, (p.seed++) * 97 + n * 1000);
    if (valid(o)) p.list.push(o);
  }
  if (p.list.length < need) throw new Error("W" + n + ": nur " + p.list.length + " gültige Aufnahmen");
  return p.list;
}

const out = { fps: FPS, sets: {} };
for (const key of SETS) {
  const n = sidesOf(key), c = parseInt(key.split("x")[1], 10), slots = SLOTS[c];
  const L = pool(n, c === 1 ? PER_SET : 40), rad = dieShape(n).radius;
  const keep = [];
  if (c === 1) {
    for (const o of L.slice(0, PER_SET)) keep.push({ faces: [o.face], frames: o.frames.map(f => [f]) });
  } else {
    // Mehrere Würfel: einzelne Aufnahmen auf die Plätze schieben; kein Würfel kommt einem anderen näher als 2,1 Radien
    const rnd = mulberry32(n * c * 7 + 11);
    let tries = 0;
    while (keep.length < PER_SET && tries < 4000) {
      tries++;
      const pick = Array.from({ length: c }, () => L[Math.floor(rnd() * L.length)]);
      if (new Set(pick).size < c) continue;
      const len = Math.max(...pick.map(o => o.frames.length));
      const frames = Array.from({ length: len }, (_, t) => pick.map((o, i) => {
        const f = o.frames[Math.min(t, o.frames.length - 1)];
        return [r3(f[0] + slots[i][0]), f[1], r3(f[2] + slots[i][1]), f[3], f[4], f[5], f[6]];
      }));
      const close = frames.some(f => f.some((a, i) => f.some((b, j) => j > i && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < rad * 2.1)));
      if (!close) keep.push({ faces: pick.map(o => o.face), frames });
    }
  }
  if (keep.length < PER_SET) throw new Error(key + ": nur " + keep.length + " Aufnahmen");
  out.sets[key] = keep;
  const secs = keep.map(k => k.frames.length / FPS);
  console.log(key.padEnd(6), keep.length, "Aufnahmen,", Math.min(...secs).toFixed(2), "bis", Math.max(...secs).toFixed(2), "s,",
    (JSON.stringify(keep).length / 1024).toFixed(0), "KB", c === 1 ? "(" + pools[n].tries + " Versuche)" : "");
}
fs.writeFileSync(OUT, JSON.stringify(out) + "\n");
console.log("geschrieben: data/dice-rolls.json,", (fs.statSync(OUT).size / 1024).toFixed(0), "KB");

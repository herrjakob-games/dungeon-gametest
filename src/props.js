// Requisiten aus Grundformen (Platzhalter bis Meilenstein 6, siehe docs/GDD.md, Requisitentabelle).
// Jedes Requisit steht mit dem Mittelpunkt seiner Kacheln im Ursprung und zeigt mit der Vorderseite nach +z.
// Wand-Requisiten lehnen mit der Rückseite an -z (die Wand). Die Größen stehen in decor.js (PROPS).
import { rnd } from "./rng.js";
import { mat, box, stone, WOOD } from "./materials.js";
import { makeModel } from "./models.js";
const THREE = window.THREE;

const cyl = (rt, rb, h, seg, material, x, y, z) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x || 0, y, z || 0);
  m.castShadow = true; m.receiveShadow = true;
  return m;
};
const flameMesh = (r, color) => new THREE.Mesh(new THREE.OctahedronGeometry(r), new THREE.MeshBasicMaterial({ color }));

/**
 * Licht eines Requisits; flackert wie die Fackeln, wenn es in ctx.flicker landet.
 * ctx: { flicker: [] } aus roomBuilder
 */
function addLight(g, ctx, color, intensity, dist, x, y, z, flame) {
  const light = new THREE.PointLight(color, intensity, dist, 2);
  light.position.set(x, y, z);
  g.add(light);
  if (flame) ctx.flicker.push({ light, flame, phase: rnd() * 10, base: intensity });
  return light;
}

// ---------- bisherige Requisiten ----------
export function saeule() {
  const g = new THREE.Group();
  g.add(box(0.85, 0.25, 0.85, stone(), 0, 0.12, 0));
  g.add(cyl(0.3, 0.34, 2.6, 7, stone(), 0, 1.5, 0));
  g.add(box(0.8, 0.2, 0.8, stone(), 0, 2.9, 0));
  return g;
}

function barrelMesh(scale) {
  const g = new THREE.Group();
  g.add(cyl(0.3 * scale, 0.3 * scale, 0.8 * scale, 9, mat(0x8a5a32), 0, 0.4 * scale, 0));
  [0.18, 0.62].forEach(y => g.add(cyl(0.315 * scale, 0.315 * scale, 0.06, 9, mat(0x3a3330), 0, y * scale, 0)));
  g.rotation.y = rnd() * Math.PI;
  return g;
}

// Fass; "gruppe": drei Fässer in L-Form (Kacheln aus der Planung), "gross": ein dickes Fass
export function fass(pl) {
  const g = new THREE.Group();
  if (pl.variant === "gruppe") {
    pl.tiles.forEach(([x, z]) => {
      const b = barrelMesh(1);
      b.position.set(x - pl.cx + (rnd() - 0.5) * 0.15, 0, z - pl.cz + (rnd() - 0.5) * 0.15);
      g.add(b);
    });
    return g;
  }
  const b = barrelMesh(pl.variant === "gross" ? 1.3 : 1);
  b.position.set((rnd() - 0.5) * 0.1, 0, (rnd() - 0.5) * 0.1);
  g.add(b);
  return g;
}

// Kiste; "angenagt": eine Ecke fehlt, Holzspäne daneben
export function kiste(pl) {
  const g = new THREE.Group();
  const s = 0.7 + rnd() * 0.1;
  g.add(box(s, s, s, mat(0x9a7044), 0, s / 2, 0));
  g.add(box(s + 0.02, 0.08, s + 0.02, mat(0x5e3d22), 0, s * 0.25, 0));
  g.add(box(s + 0.02, 0.08, s + 0.02, mat(0x5e3d22), 0, s * 0.75, 0));
  if (pl && pl.variant === "angenagt") {
    g.add(box(0.26, 0.26, 0.26, mat(0x2a1f18), s / 2 - 0.1, s - 0.1, s / 2 - 0.1)); // dunkles Loch an der Ecke
    for (let k = 0; k < 5; k++) g.add(box(0.08, 0.02, 0.03, mat(0xc9a06a), s / 2 + 0.15 + rnd() * 0.25, 0.01, (rnd() - 0.3) * 0.6));
  }
  g.rotation.y = (rnd() - 0.5) * 0.4;
  return g;
}

export function sarkophag() {
  const g = new THREE.Group();
  g.add(box(0.85, 0.55, 1.8, mat(0x6d6a5c), 0, 0.28, 0));
  const lid = box(0.92, 0.14, 1.88, mat(0x85816f), 0.04, 0.62, -0.06);
  lid.rotation.y = (rnd() - 0.5) * 0.12;
  g.add(lid);
  g.add(box(0.4, 0.06, 0.4, mat(0x9c977f), 0, 0.72, -0.5));
  return g;
}

// Tisch über drei Kacheln; "kueche": Töpfe und Messerblock statt Becher und Würfel
export function tisch(pl) {
  const g = new THREE.Group();
  const len = 2.9;
  g.add(box(len, 0.12, 0.9, mat(0x8b5e34), 0, 0.75, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(box(0.1, 0.7, 0.1, mat(0x5e3d22), sx * (len / 2 - 0.1), 0.35, sz * 0.35)));
  if (pl && pl.variant === "kueche") {
    const pot = mat(0x4a4f55, { metalness: 0.4, roughness: 0.6 });
    g.add(cyl(0.2, 0.17, 0.25, 10, pot, -0.8, 0.94, 0.05));
    g.add(cyl(0.15, 0.13, 0.18, 10, pot, -0.3, 0.9, -0.15));
    g.add(box(0.22, 0.25, 0.16, mat(0x6e4728), 0.7, 0.94, 0));
    [-0.06, 0, 0.06].forEach(x => g.add(box(0.03, 0.14, 0.08, mat(0x2a2422), 0.7 + x, 1.12, 0)));
    g.add(box(0.5, 0.04, 0.3, mat(0xb98a55), 0.15, 0.83, 0.15)); // Schneidebrett
  } else {
    g.add(box(0.14, 0.22, 0.14, mat(0xb9b2a4), -0.6, 0.92, 0.1));
    g.add(cyl(0.18, 0.18, 0.03, 10, mat(0xcfc6b2), 0.3, 0.83, -0.1));
    g.add(box(0.08, 0.08, 0.08, mat(0xf0e5d3), 0.9, 0.85, 0.15));
  }
  return g;
}

export function hocker() {
  const g = new THREE.Group();
  g.add(cyl(0.22, 0.2, 0.45, 8, mat(0x6e4728), 0, 0.23, 0));
  return g;
}

// Waffenständer an der Wand, blockiert nichts
export function waffenstaender() {
  const g = new THREE.Group();
  g.add(box(1.6, 0.08, 0.1, mat(0x5e3d22), 0, 1.6, -0.45));
  [-0.5, 0, 0.5].forEach(x => {
    g.add(box(0.04, 1.3, 0.04, mat(0x7a4a26), x, 1.1, -0.39));
    g.add(box(0.12, 0.22, 0.03, mat(0x9aa1a8, { metalness: 0.5, roughness: 0.5 }), x, 1.75, -0.39));
  });
  return g;
}

export function goldhaufen() {
  const g = new THREE.Group();
  const gm = mat(0xe3b341, { metalness: 0.6, roughness: 0.35, emissive: 0x3a2a00, emissiveIntensity: 0.4 });
  for (let k = 0; k < 5; k++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8), gm);
    coin.position.set((rnd() - 0.5) * 0.5, 0.01 + k * 0.02, (rnd() - 0.5) * 0.5);
    g.add(coin);
  }
  return g;
}

export function geroell() {
  const g = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 + rnd() * 0.1), stone());
    r.position.set((rnd() - 0.5) * 0.7, 0.05, (rnd() - 0.5) * 0.7);
    r.castShadow = true;
    g.add(r);
  }
  return g;
}

// ---------- neue Requisiten ----------
export function saeule_liegend() {
  const g = new THREE.Group();
  const a = cyl(0.3, 0.32, 1.2, 7, stone(), -0.35, 0.3, 0);
  a.rotation.z = Math.PI / 2;
  const b = cyl(0.3, 0.3, 0.6, 7, stone(), 0.65, 0.3, 0.05);
  b.rotation.set(0.15, 0.3, Math.PI / 2);
  g.add(a, b);
  g.add(box(0.8, 0.2, 0.8, stone(), -1.05, 0.4, 0)); // Kopfstück
  g.rotation.y += (rnd() - 0.5) * 0.15;
  return g;
}

export function sack() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3), mat(0xb09468));
  body.scale.set(1, 1.15, 0.85); body.position.y = 0.32; body.castShadow = true;
  g.add(body);
  g.add(cyl(0.08, 0.1, 0.12, 6, mat(0x8a7350), 0, 0.68, 0));
  g.position.set((rnd() - 0.5) * 0.3, 0, (rnd() - 0.5) * 0.3);
  g.rotation.y = rnd() * Math.PI;
  const outer = new THREE.Group(); outer.add(g);
  return outer;
}

// Regal an der Wand mit Krügen
export function regal() {
  const g = new THREE.Group();
  const wood = mat(0x6e4728);
  [-0.85, 0.85].forEach(x => g.add(box(0.08, 2, 0.4, wood, x, 1, -0.28)));
  [0.35, 0.95, 1.55].forEach(y => g.add(box(1.8, 0.06, 0.4, wood, 0, y, -0.28)));
  const jug = [0xa0663c, 0x7c8a6a, 0xc9b28a];
  [0.42, 1.02, 1.62].forEach(y => {
    for (let x = -0.65; x <= 0.65; x += 0.32 + rnd() * 0.12) {
      if (rnd() < 0.25) continue;
      g.add(cyl(0.08, 0.1, 0.2 + rnd() * 0.08, 7, mat(jug[Math.floor(rnd() * jug.length)]), x, y + 0.12, -0.28));
    }
  });
  return g;
}

// Herd mit Kessel und Glut, eigenes Licht
export function herd(pl, ctx) {
  const g = new THREE.Group();
  g.add(box(1.8, 0.9, 0.8, stone(), 0, 0.45, -0.1));
  g.add(box(0.8, 0.45, 0.1, mat(0x120c0a), 0, 0.35, 0.31)); // Öffnung
  const glow = flameMesh(0.16, 0xff7a20);
  glow.position.set(0, 0.25, 0.2); glow.scale.set(1.6, 0.6, 0.8);
  g.add(glow);
  g.add(box(1.9, 0.12, 0.85, stone(), 0, 0.95, -0.1));
  g.add(cyl(0.3, 0.24, 0.35, 10, mat(0x2f3236, { metalness: 0.5, roughness: 0.5 }), 0.35, 1.18, -0.1));
  g.add(box(0.7, 1.6, 0.5, stone(), -0.45, 1.8, -0.25)); // Rauchabzug
  addLight(g, ctx, 0xff7a30, 1.0, 5, 0, 0.5, 0.6, glow);
  return g;
}

// Tafel über fünf Kacheln mit Tischtuch, Tellern und Kerzen
export function tafel(pl, ctx) {
  const g = new THREE.Group();
  const len = 4.8;
  g.add(box(len, 0.12, 0.95, mat(0x7a4a26), 0, 0.75, 0));
  g.add(box(len - 0.4, 0.02, 0.6, mat(0xd8cfbf), 0, 0.82, 0));
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => g.add(box(0.12, 0.72, 0.12, mat(0x4e331d), sx * (len / 2 - 0.15), 0.36, sz * 0.36))));
  for (let x = -2; x <= 2; x++) {
    g.add(cyl(0.16, 0.16, 0.03, 10, mat(0xcfc6b2), x, 0.84, 0.25));
    g.add(cyl(0.16, 0.16, 0.03, 10, mat(0xcfc6b2), x, 0.84, -0.25));
  }
  [-1.5, 0, 1.5].forEach(x => {
    g.add(cyl(0.04, 0.04, 0.22, 6, mat(0xf0e8d6), x, 0.95, 0));
    const f = flameMesh(0.04, 0xffc060); f.position.set(x, 1.1, 0); g.add(f);
  });
  return g;
}

// Stuhl mit Lehne; "umgekippt": liegt auf dem Rücken
export function stuhl(pl) {
  const g = new THREE.Group();
  const wood = mat(0x6e4728);
  const c = new THREE.Group();
  c.add(box(0.45, 0.06, 0.45, wood, 0, 0.45, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => c.add(box(0.05, 0.45, 0.05, mat(0x4e331d), sx * 0.19, 0.22, sz * 0.19)));
  c.add(box(0.45, 0.5, 0.05, wood, 0, 0.72, -0.2)); // Lehne zeigt weg vom Tisch
  if (pl && pl.variant === "umgekippt") {
    c.rotation.x = -Math.PI / 2; c.position.set(0, 0.22, 0.2);
    c.rotation.z = (rnd() - 0.5) * 0.6;
  }
  g.add(c);
  // Die Vorderseite (+z) zeigt zur Tafel, die Lehne nach außen
  return g;
}

// Kronleuchter, hängt über der Tafel, eigenes Licht
export function kronleuchter(pl, ctx) {
  const g = new THREE.Group();
  const iron = mat(0x2f2a26, { metalness: 0.5, roughness: 0.6 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 6, 16), iron);
  ring.rotation.x = Math.PI / 2; ring.position.y = 2.6;
  g.add(ring);
  g.add(box(0.04, 1.2, 0.04, iron, 0, 3.2, 0));
  let first = null;
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3;
    g.add(cyl(0.04, 0.04, 0.16, 6, mat(0xf0e8d6), Math.cos(a) * 0.7, 2.72, Math.sin(a) * 0.7));
    const f = flameMesh(0.05, 0xffc060); f.position.set(Math.cos(a) * 0.7, 2.86, Math.sin(a) * 0.7); g.add(f);
    if (!first) first = f;
  }
  addLight(g, ctx, 0xffc070, 1.3, 7, 0, 2.4, 0, first);
  return g;
}

// Anrichte an der Wand mit Schubladen und Geschirr
export function anrichte() {
  const g = new THREE.Group();
  g.add(box(1.8, 0.85, 0.55, mat(0x6a4225), 0, 0.43, -0.2));
  [-0.45, 0.45].forEach(x => g.add(box(0.8, 0.3, 0.02, mat(0x7e5230), x, 0.6, 0.08)));
  [-0.45, 0.45].forEach(x => g.add(box(0.12, 0.04, 0.03, mat(0xd8b56a), x, 0.6, 0.1)));
  g.add(box(1.9, 0.06, 0.6, mat(0x4e331d), 0, 0.88, -0.2));
  for (let k = 0; k < 4; k++) g.add(cyl(0.15, 0.15, 0.03, 10, mat(0xcfc6b2), -0.6, 0.93 + k * 0.035, -0.2));
  g.add(cyl(0.1, 0.12, 0.3, 8, mat(0xa0663c), 0.5, 1.06, -0.25));
  return g;
}

// Brunnen mit Kurbel und Eimer
export function brunnen() {
  const g = new THREE.Group();
  g.add(cyl(0.45, 0.48, 0.6, 10, stone(), 0, 0.3, 0));
  g.add(cyl(0.34, 0.34, 0.02, 10, mat(0x1d3a4a, { emissive: 0x0a2030, emissiveIntensity: 0.4 }), 0, 0.6, 0));
  [-0.4, 0.4].forEach(x => g.add(box(0.08, 1.1, 0.08, mat(0x5e3d22), x, 1.0, 0)));
  const axle = cyl(0.04, 0.04, 0.9, 6, mat(0x4e331d), 0, 1.4, 0); axle.rotation.z = Math.PI / 2; g.add(axle);
  g.add(box(0.06, 0.2, 0.06, mat(0x4e331d), 0.48, 1.32, 0)); // Kurbel
  g.add(box(0.02, 0.5, 0.02, mat(0xb09468), 0, 1.15, 0)); // Seil
  g.add(cyl(0.11, 0.09, 0.16, 8, mat(0x7a5a3a), 0, 0.85, 0)); // Eimer
  return g;
}

export function moos() {
  const g = new THREE.Group();
  const m = mat(0x4f6b34);
  for (let k = 0; k < 3; k++) {
    const blob = new THREE.Mesh(new THREE.CylinderGeometry(0.15 + rnd() * 0.15, 0.2 + rnd() * 0.15, 0.04, 7), m);
    blob.position.set((rnd() - 0.5) * 0.5, 0.02, (rnd() - 0.5) * 0.5);
    blob.receiveShadow = true;
    g.add(blob);
  }
  return g;
}

export function pfuetze() {
  const g = new THREE.Group();
  const water = mat(0x2a4a5c, { roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.8 });
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.015, 12), water);
  p.scale.set(1, 1, 0.7 + rnd() * 0.3); p.position.y = 0.01;
  g.add(p);
  return g;
}

// Kerzengruppe mit eigenem Licht
export function kerzen(pl, ctx) {
  const g = new THREE.Group();
  let first = null;
  [[0, 0, 0.32], [0.15, 0.1, 0.22], [-0.12, 0.12, 0.18]].forEach(([x, z, h]) => {
    g.add(cyl(0.05, 0.055, h, 7, mat(0xefe6d2), x, h / 2, z));
    const f = flameMesh(0.045, 0xffc060); f.position.set(x, h + 0.06, z); g.add(f);
    if (!first) first = f;
  });
  addLight(g, ctx, 0xffb860, 0.6, 3.5, 0, 0.5, 0, first);
  return g;
}

export function knochen() {
  const g = new THREE.Group();
  const bone = mat(0xe3dcc8);
  for (let k = 0; k < 3; k++) {
    const b = cyl(0.025, 0.025, 0.35, 5, bone, (rnd() - 0.5) * 0.5, 0.03, (rnd() - 0.5) * 0.5);
    b.rotation.set(Math.PI / 2, 0, rnd() * Math.PI);
    g.add(b);
  }
  if (rnd() < 0.6) {
    const skull = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11), bone);
    skull.position.set((rnd() - 0.5) * 0.4, 0.1, (rnd() - 0.5) * 0.4); skull.castShadow = true;
    g.add(skull);
  }
  return g;
}

// Pult mit Gästebuch
export function pult() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.08, 0.4, mat(0x4e331d), 0, 0.04, 0));
  g.add(box(0.12, 0.9, 0.12, mat(0x6e4728), 0, 0.5, 0));
  const top = box(0.6, 0.06, 0.45, mat(0x7a4a26), 0, 1.0, 0); top.rotation.x = 0.35; g.add(top);
  const book = box(0.46, 0.05, 0.32, mat(0xefe6d2), 0, 1.05, 0.02); book.rotation.x = 0.35; g.add(book);
  const spine = box(0.03, 0.06, 0.33, mat(0x7a2a2a), 0, 1.07, 0.02); spine.rotation.x = 0.35; g.add(spine);
  return g;
}

// Wegweiser mit Pfeilschildern
export function wegweiser() {
  const g = new THREE.Group();
  g.add(box(0.1, 1.8, 0.1, mat(0x5e3d22), 0, 0.9, 0));
  [[1.5, 0.35], [1.2, -0.4], [0.9, 0.9]].forEach(([y, a]) => {
    const s = new THREE.Group();
    s.add(box(0.6, 0.16, 0.04, mat(0x9a7044), 0.25, 0, 0));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 3), mat(0x9a7044));
    tip.rotation.z = -Math.PI / 2; tip.position.x = 0.62; s.add(tip);
    s.position.y = y; s.rotation.y = a;
    g.add(s);
  });
  return g;
}

// Zettelbrett an der Wand, blockiert nichts
export function zettelbrett() {
  const g = new THREE.Group();
  g.add(box(0.8, 0.6, 0.05, mat(0x8b5e34), 0, 1.4, -0.45));
  for (let k = 0; k < 5; k++) {
    const n = box(0.15, 0.18, 0.01, mat([0xefe6d2, 0xe8d9a0, 0xd8e0c8][k % 3]), (rnd() - 0.5) * 0.55, 1.4 + (rnd() - 0.5) * 0.35, -0.42);
    n.rotation.z = (rnd() - 0.5) * 0.4;
    g.add(n);
  }
  return g;
}

// Bank über zwei Kacheln
export function bank() {
  const g = new THREE.Group();
  g.add(box(1.7, 0.1, 0.4, mat(0x7a4a26), 0, 0.45, 0));
  [-0.7, 0.7].forEach(x => g.add(box(0.1, 0.42, 0.34, mat(0x4e331d), x, 0.21, 0)));
  return g;
}

// Kiste mit bunten Andenken und Preisschild
export function souvenirkiste() {
  const g = kiste();
  [0xd04a32, 0x3f7cc0, 0xe9c040, 0x5aa050].forEach((c, k) => {
    const s = box(0.12, 0.25, 0.12, mat(c), -0.2 + k * 0.13, 0.85, (rnd() - 0.5) * 0.3);
    s.rotation.z = (rnd() - 0.5) * 0.5;
    g.add(s);
  });
  g.add(box(0.3, 0.2, 0.02, mat(0xefe6d2), 0, 0.5, 0.42)); // Preisschild
  return g;
}

// Thron aus Knochen (Bossraum Katakomben), Rückfall ohne Modell: hoher Stuhl in Knochenfarbe, Lehne zur Wand
export function knochenthron() {
  const g = new THREE.Group();
  const bone = mat(0xe0d4b8);
  g.add(box(0.7, 0.1, 0.6, bone, 0, 0.55, 0));
  g.add(box(0.7, 1.1, 0.1, bone, 0, 1.05, -0.28));
  [-1, 1].forEach(s => g.add(box(0.1, 0.5, 0.6, bone, s * 0.32, 0.3, 0)));
  return g;
}

// Käseberg mit Thron (Bossraum Keller), eigenes Licht
export function kaeseberg(pl, ctx) {
  const g = new THREE.Group();
  const cheese = [0xe8c040, 0xd9a830, 0xf0d060];
  for (let k = 0; k < 22; k++) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 3), mat(cheese[k % 3]));
    const layer = Math.floor(k / 7), r = 1.7 - layer * 0.45;
    w.position.set((rnd() - 0.5) * r, 0.15 + layer * 0.3, -0.1 + (rnd() - 0.5) * r * 0.9);
    w.rotation.set(rnd() * 0.3, rnd() * Math.PI, 0);
    w.castShadow = true;
    g.add(w);
  }
  const throne = new THREE.Group();
  throne.add(box(0.8, 0.12, 0.6, mat(0x7a2a2a), 0, 0.9, 0));
  throne.add(box(0.8, 1.0, 0.12, mat(0x7a2a2a), 0, 1.4, -0.3));
  [-0.4, 0.4].forEach(x => throne.add(box(0.1, 0.3, 0.6, mat(0xc9a24f), x, 1.05, 0)));
  throne.position.set(0, 0.2, -0.45);
  g.add(throne);
  addLight(g, ctx, 0xffd060, 0.8, 5, 0, 1.6, 0.6, null);
  return g;
}

// ---------- Schmiede der Zwergenminen (docs/GDD.md, Requisitenliste) ----------
// Esse: Schmiedeofen auf Zwergenhöhe, 3×1 an der Wand (Rückseite an -z). Sockel und Feuerkasten auf den ersten zwei Kacheln,
// Blasebalg auf der dritten; die Glut liegt auf etwa 0,5 Kacheln (Hüfthöhe des Zwergs). Hauptlicht des Raums, flackert mit den Flammen.
export function esse(pl, ctx) {
  const g = new THREE.Group();
  const st = mat(0x6a625b), stDark = mat(0x4a433e);
  const iron = mat(0x34363b, { metalness: 0.35, roughness: 0.6 }), copper = mat(0xb06a3a, { metalness: 0.3, roughness: 0.5 });
  // Sockel mit abgesetzter Kante
  g.add(box(2.0, 0.36, 0.9, st, 0, 0.18, -0.05));
  g.add(box(2.1, 0.1, 1.0, stDark, 0, 0.41, -0.05));
  // Feuerkasten: Rückwand und niedrige Seitenwangen
  g.add(box(1.7, 0.4, 0.14, stDark, 0, 0.66, -0.42));
  [-0.82, 0.82].forEach(x => g.add(box(0.16, 0.22, 0.55, st, x, 0.57, -0.22)));
  // Glutbett mit Glutstücken, die selbst leuchten (ohne Licht berechnet), und drei kleinen Flammen
  g.add(box(1.45, 0.05, 0.62, mat(0x1a1210), 0, 0.48, -0.08));
  const hot = [0xff4a10, 0xff7a20, 0xffb040];
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 + rnd() * 0.05), new THREE.MeshBasicMaterial({ color: hot[i % 3] }));
    c.position.set((rnd() - 0.5) * 1.3, 0.52 + rnd() * 0.04, -0.08 + (rnd() - 0.5) * 0.5);
    c.rotation.set(rnd() * 3, rnd() * 3, 0);
    g.add(c);
  }
  const flames = [];
  [-0.4, 0.05, 0.45].forEach((x, i) => {
    const f = flameMesh(0.13 + i * 0.02, i === 1 ? 0xffc060 : 0xff8a30);
    f.position.set(x, 0.64, 0.0); f.scale.set(1, 1.6, 1);
    g.add(f); flames.push(f);
  });
  // Haube (flache vierseitige Pyramide aus Eisen), Kupferband am unteren Rand, Kamin bis zur Wandoberkante
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.15, 0.4, 4, 1), iron);
  hood.rotation.y = Math.PI / 4; hood.scale.set(1, 1, 0.55); hood.position.set(0, 1.12, -0.25);
  hood.castShadow = true; g.add(hood);
  g.add(box(1.66, 0.07, 0.9, copper, 0, 0.92, -0.25));
  g.add(box(0.56, 0.75, 0.42, iron, 0, 1.68, -0.29));
  g.add(box(0.62, 0.06, 0.48, copper, 0, 1.42, -0.29));
  // Blasebalg aus Holz und Leder neben dem Sockel
  const bel = new THREE.Group();
  bel.add(box(0.4, 0.05, 0.65, mat(WOOD), 0, 0.06, 0));
  bel.add(box(0.4, 0.05, 0.65, mat(WOOD), 0, 0.3, 0.02));
  bel.add(box(0.36, 0.2, 0.55, mat(0x5a3a28), 0, 0.18, 0));
  bel.add(box(0.06, 0.06, 0.3, mat(0x2a2a2a), -0.22, 0.18, -0.2));
  bel.rotation.y = -0.2;
  bel.position.set(1.25, 0, -0.02);
  g.add(bel);
  // Licht: warmes Hauptlicht vor der Glut, schwaches Bodenlicht
  addLight(g, ctx, 0xff7a30, 5, 13, 0, 0.9, 0.6, flames[1]);
  addLight(g, ctx, 0xff9a40, 1.5, 4, 0, 0.35, 1.0, flames[0]);
  return g;
}

// Oberkante eines Teils (für Gegenstände, die auf einem anderen liegen)
const topOf = (o) => new THREE.Box3().setFromObject(o).max.y;
// Gegenstand flach hinlegen (längste Achse waagerecht) und auf Länge len bringen; Ursprung mittig am Boden
function lay(o, len) {
  const b = new THREE.Box3().setFromObject(o), sz = b.getSize(new THREE.Vector3());
  if (sz.y >= sz.x && sz.y >= sz.z) o.rotation.x = Math.PI / 2;
  const w = new THREE.Group(); w.add(o);
  const s2 = new THREE.Box3().setFromObject(w).getSize(new THREE.Vector3());
  const k = len / Math.max(s2.x, s2.z); w.scale.setScalar(k);
  const b3 = new THREE.Box3().setFromObject(w), c = b3.getCenter(new THREE.Vector3());
  o.position.x -= c.x / k; o.position.z -= c.z / k; o.position.y -= b3.min.y / k;
  return w;
}

// Kohlekiste: Holzkiste, oben ein Kohlehaufen (leicht in den Deckel gesenkt)
export function kohlekiste(pl) {
  const g = new THREE.Group();
  const k = makeModel("kiste");
  if (!k) return kiste(pl);
  k.rotation.y = (rnd() - 0.5) * 0.3; g.add(k);
  const c = makeModel("kohle");
  if (c) { c.position.y = topOf(k) - 0.05; c.rotation.y = rnd() * 6; g.add(c); }
  return g;
}

// Zangentisch: kleiner Holztisch (1,2-fach) mit einer schräg liegenden Eisenzange
export function zangentisch() {
  const g = new THREE.Group();
  const t = makeModel("tisch_klein");
  if (!t) { g.add(box(0.7, 0.5, 0.7, mat(WOOD), 0, 0.25, 0)); return g; }
  t.scale.multiplyScalar(1.2); g.add(t);
  const zm = makeModel("zange");
  if (zm) { const z = lay(zm, 0.55); z.position.y = topOf(t); z.rotation.y = 0.5 + rnd() * 0.6; g.add(z); }
  return g;
}

// Waffentisch: mittlerer Tisch (2×1) mit 2 bis 3 flach liegenden Waffen nach Raum-Seed, quer zur Tischlänge nebeneinander
export function waffentisch() {
  const g = new THREE.Group();
  const t = makeModel("tisch_mittel");
  if (!t) { g.add(box(1.6, 0.5, 0.8, mat(WOOD), 0, 0.25, 0)); return g; }
  g.add(t);
  const all = ["deko_streitaxt", "deko_kriegshammer", "deko_kurzschwert", "deko_kriegsaxt"].sort(() => rnd() - 0.5);
  const n = 2 + (rnd() < 0.5 ? 1 : 0), y = topOf(t);
  for (let i = 0; i < n; i++) {
    const w = makeModel(all[i]);
    if (!w) continue;
    const l = lay(w, 0.62);
    l.position.set(-0.45 + i * (0.9 / Math.max(1, n - 1)), y, (rnd() - 0.5) * 0.12);
    l.rotation.y = (rnd() - 0.5) * 0.4; // lay legt die Klinge entlang z, quer zur Tischlänge (x)
    g.add(l);
  }
  return g;
}

// ---------- Bibliothek der Zwergenminen ----------
const BOOK_COLORS = [0x8a3a2e, 0x4e6b3a, 0x3e5a7a, 0xb08a3a, 0x6a4a30, 0x5a4060, 0x9a5a2a, 0x2f4a4a];
// Lesetisch: kleiner Holztisch (1,25-fach), brennende dünne Kerze und nach Raum-Seed Karte, Bücher oder Schriftrollen;
// warmes Leselicht über dem Tisch (ohne Schatten), flackert mit
export function lesetisch(pl, ctx) {
  const g = new THREE.Group();
  const t = makeModel("tisch_klein");
  if (t) { t.scale.multiplyScalar(1.25); g.add(t); } else g.add(box(0.8, 0.6, 0.8, mat(WOOD), 0, 0.3, 0));
  const y = t ? topOf(t) : 0.6;
  const candle = makeModel("kerze_duenn", "an");
  if (candle) { candle.position.set(0.24, y, -0.22); g.add(candle); }
  else { g.add(cyl(0.03, 0.03, 0.2, 6, mat(0xe8dcc0), 0.24, y + 0.1, -0.22)); const f = flameMesh(0.03, 0xffc060); f.position.set(0.24, y + 0.24, -0.22); g.add(f); }
  const item = new THREE.Group();
  const kind = Math.floor(rnd() * 3);
  if (kind === 0) {
    // Karte: Pergament mit eingerollten Enden, ein paar Linien und ein rotes Kreuz
    const paper = mat(0xd9c49a);
    item.add(box(0.46, 0.006, 0.34, paper, 0, 0.003, 0));
    [-0.24, 0.24].forEach(x => { const r = cyl(0.025, 0.025, 0.36, 8, paper, x, 0.025, 0); r.rotation.x = Math.PI / 2; item.add(r); });
    const ink = mat(0x6a4a30);
    [[-0.1, -0.06, 0.2, 0.3], [0.05, 0.04, 0.16, -0.5], [-0.02, 0.09, 0.22, 0.1]].forEach(([x, z, l, a]) => { const ln = box(l, 0.002, 0.012, ink, x, 0.008, z); ln.rotation.y = a; item.add(ln); });
    const red = mat(0xb03a2a);
    [0.7, -0.7].forEach(a => { const c = box(0.07, 0.003, 0.014, red, 0.1, 0.009, -0.06); c.rotation.y = a; item.add(c); });
  } else if (kind === 1) {
    // offenes Buch und ein geschlossenes daneben
    const cover = mat(BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)]), pages = mat(0xe2d3ac);
    item.add(box(0.36, 0.015, 0.25, cover, -0.06, 0.008, 0.02));
    [-1, 1].forEach(s => { const p = box(0.16, 0.025, 0.22, pages, -0.06 + s * 0.085, 0.025, 0.02); p.rotation.z = -s * 0.08; item.add(p); });
    item.add(box(0.2, 0.06, 0.26, mat(BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)]), 0.2, 0.03, 0.12));
    item.add(box(0.18, 0.05, 0.24, pages, 0.2, 0.03, 0.12));
  } else {
    // 2 bis 3 Schriftrollen
    const n = 2 + (rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const r = new THREE.Group();
      const body = cyl(0.04, 0.04, 0.3, 8, mat(0xe2d3ac), 0, 0, 0); body.rotation.z = Math.PI / 2; r.add(body);
      [-0.17, 0.17].forEach(x => { const s = cyl(0.015, 0.015, 0.06, 6, mat(0x5a3a24), x, 0, 0); s.rotation.z = Math.PI / 2; r.add(s); });
      const band = cyl(0.043, 0.043, 0.04, 8, mat(0x8a3a2e), 0, 0, 0); band.rotation.z = Math.PI / 2; r.add(band);
      r.position.set(-0.05 + (rnd() - 0.5) * 0.1, 0.04 + (i === 2 ? 0.07 : 0), -0.08 + i * 0.1);
      r.rotation.y = (rnd() - 0.5) * 0.6;
      item.add(r);
    }
  }
  item.position.set(-0.08, y, 0.06);
  item.rotation.y = (rnd() - 0.5) * 0.4;
  g.add(item);
  // Leselicht auf Kerzenhöhe, flackert mit (eigenes Objekt statt einer Flamme, wie die Lichter der vorderen Fackeln)
  addLight(g, ctx, 0xffb060, 1.5, 5, 0.1, y + 0.55, 0, new THREE.Object3D());
  return g;
}

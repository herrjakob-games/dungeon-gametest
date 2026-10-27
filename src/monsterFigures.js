// Figuren der Monster und Figuren ohne Kampfwerte aus Grundformen (Platzhalter bis Meilenstein 6).
// Figurenliste im GDD; jede Monster-id hat eine Figur mit derselben id. Füße auf y = 0, Blick nach +z.
import { mat } from "./materials.js";
const THREE = window.THREE;

function maker(g) {
  return (geo, m, x, y, z) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    g.add(o);
    return o;
  };
}
const sph = (r) => new THREE.SphereGeometry(r, 8, 6);
const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cylG = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s || 6);
const eyeMat = () => new THREE.MeshBasicMaterial({ color: 0xff3020 });

// Ratte auf vier Beinen: grauer Körper, Ohren, rote Augen, langer Schwanz
function ratBody(g, fur, scale) {
  const part = maker(g);
  const s = scale || 1;
  const body = part(sph(0.22 * s), fur, 0, 0.2 * s, -0.02 * s);
  body.scale.set(1, 0.8, 1.45);
  const head = part(new THREE.ConeGeometry(0.13 * s, 0.3 * s, 7), fur, 0, 0.22 * s, 0.36 * s);
  head.rotation.x = Math.PI / 2;
  part(sph(0.03 * s), mat(0xd08a8a), 0, 0.22 * s, 0.51 * s); // Nase
  [-1, 1].forEach(k => {
    const ear = part(cylG(0.07 * s, 0.07 * s, 0.02 * s, 8), mat(0xc79a9a), k * 0.09 * s, 0.33 * s, 0.27 * s);
    ear.rotation.x = Math.PI / 2;
    part(sph(0.025 * s), eyeMat(), k * 0.06 * s, 0.27 * s, 0.38 * s);
    part(boxG(0.05 * s, 0.1 * s, 0.05 * s), fur, k * 0.12 * s, 0.05 * s, 0.18 * s);
    part(boxG(0.05 * s, 0.1 * s, 0.05 * s), fur, k * 0.12 * s, 0.05 * s, -0.22 * s);
  });
  // Schwanz aus mehreren Gliedern
  for (let i = 0; i < (s > 1 ? 4 : 6); i++) {
    const t = part(cylG(0.02 * s, 0.025 * s, 0.14 * s, 5), mat(0xc79a9a), Math.sin(i * 0.6) * 0.06 * s, 0.1 * s, (-0.36 - i * 0.12) * s);
    t.rotation.x = Math.PI / 2;
  }
}

export function rat() {
  const g = new THREE.Group();
  ratBody(g, mat(0x7a7470));
  return g;
}

// Skelett mit rostigem Schwert; "sitzend": Beine angewinkelt, Hüfte auf Sitzhöhe
export function skeleton(variant) {
  const g = new THREE.Group();
  const part = maker(g);
  const bone = mat(0xe6dfcc);
  const sit = variant === "sitzend";
  const hip = sit ? 0.45 : 0.5;
  // Beine
  [-1, 1].forEach(k => {
    if (sit) {
      const thigh = part(cylG(0.035, 0.035, 0.4), bone, k * 0.1, hip, 0.2);
      thigh.rotation.x = Math.PI / 2;
      part(cylG(0.03, 0.03, 0.45), bone, k * 0.1, hip / 2, 0.4);
    } else {
      part(cylG(0.035, 0.035, 0.5), bone, k * 0.1, 0.25, 0);
    }
  });
  part(boxG(0.28, 0.08, 0.14), bone, 0, hip, 0); // Becken
  part(cylG(0.03, 0.03, 0.4), bone, 0, hip + 0.2, 0); // Wirbelsäule
  for (let i = 0; i < 3; i++) part(boxG(0.3 - i * 0.04, 0.03, 0.18), bone, 0, hip + 0.18 + i * 0.09, 0.02); // Rippen
  [-1, 1].forEach(k => part(cylG(0.03, 0.03, 0.42), bone, k * 0.2, hip + 0.18, 0.04)); // Arme
  const skull = part(sph(0.13), bone, 0, hip + 0.53, 0.02);
  skull.scale.set(1, 1.05, 1.1);
  [-1, 1].forEach(k => part(sph(0.03), mat(0x1a1410), k * 0.05, hip + 0.55, 0.13));
  // Rostiges Schwert in der rechten Hand
  const sword = part(boxG(0.05, 0.6, 0.02), mat(0x8a5a3a, { metalness: 0.3, roughness: 0.7 }), 0.22, hip + 0.1, 0.22);
  sword.rotation.x = sit ? 1.2 : 0.2;
  return g;
}

// Goblin-Wache: kleine grüne Figur mit Helm und Speer
export function goblin() {
  const g = new THREE.Group();
  const part = maker(g);
  const skin = mat(0x6f9a3a);
  [-1, 1].forEach(k => part(boxG(0.09, 0.22, 0.1), mat(0x4a3424), k * 0.08, 0.11, 0));
  part(cylG(0.15, 0.18, 0.32, 7), mat(0x7a5a3a), 0, 0.38, 0);
  part(sph(0.15), skin, 0, 0.66, 0.02);
  [-1, 1].forEach(k => {
    const ear = part(new THREE.ConeGeometry(0.05, 0.2, 5), skin, k * 0.17, 0.68, 0);
    ear.rotation.z = -k * 1.3;
    part(sph(0.025), mat(0xfff060), k * 0.06, 0.68, 0.14);
    part(cylG(0.04, 0.04, 0.26), skin, k * 0.2, 0.4, 0.04);
  });
  part(new THREE.SphereGeometry(0.17, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x6e7480, { metalness: 0.4 }), 0, 0.7, 0.01);
  part(cylG(0.02, 0.02, 1.2), mat(0x6e4728), 0.22, 0.6, 0.08);
  part(new THREE.ConeGeometry(0.05, 0.15, 5), mat(0xb0b4ba, { metalness: 0.5 }), 0.22, 1.27, 0.08);
  return g;
}

// Mimik: sieht aus wie eine Truhe, der Deckel steht offen, darin Zähne und Zunge
export function mimic() {
  const g = new THREE.Group();
  const part = maker(g);
  const wood = mat(0x7a4a26);
  part(boxG(0.8, 0.45, 0.55), wood, 0, 0.23, 0);
  const lid = new THREE.Group();
  lid.position.set(0, 0.45, -0.27);
  lid.add(Object.assign(new THREE.Mesh(boxG(0.82, 0.2, 0.57), mat(0x6a3e20)), { castShadow: true }));
  lid.children[0].position.set(0, 0.1, 0.27);
  lid.rotation.x = -0.7;
  g.add(lid);
  for (let i = 0; i < 6; i++) {
    const t = part(new THREE.ConeGeometry(0.04, 0.12, 4), mat(0xf4efe2), -0.3 + i * 0.12, 0.5, 0.24);
    t.rotation.x = Math.PI;
  }
  const tongue = part(boxG(0.18, 0.04, 0.4), mat(0xc0405a), 0, 0.47, 0.35);
  tongue.rotation.x = 0.3;
  [-1, 1].forEach(k => part(sph(0.04), eyeMat(), k * 0.2, 0.58, 0.05));
  return g;
}

// Der Küchenchef: Ratte auf zwei Beinen mit weißer Kochmütze und Fleischerbeil
export function kuechenratte() {
  const g = new THREE.Group();
  const part = maker(g);
  const fur = mat(0x8a8078);
  [-1, 1].forEach(k => part(boxG(0.08, 0.2, 0.12), fur, k * 0.09, 0.1, 0.02));
  const body = part(sph(0.2), fur, 0, 0.4, 0);
  body.scale.set(1, 1.35, 0.9);
  part(cylG(0.21, 0.21, 0.25, 8), mat(0xf2f0ea), 0, 0.38, 0.03); // Schürze
  const head = part(new THREE.ConeGeometry(0.13, 0.3, 7), fur, 0, 0.72, 0.12);
  head.rotation.x = Math.PI / 2 - 0.3;
  [-1, 1].forEach(k => {
    part(sph(0.025), eyeMat(), k * 0.06, 0.76, 0.18);
    const ear = part(cylG(0.06, 0.06, 0.02, 8), mat(0xc79a9a), k * 0.1, 0.84, 0.04);
    ear.rotation.x = Math.PI / 2;
  });
  part(cylG(0.13, 0.12, 0.08, 10), mat(0xffffff), 0, 0.88, 0.02); // Mützenband
  part(sph(0.17), mat(0xffffff), 0, 1.02, 0.02).scale.set(1, 0.8, 1); // Mütze
  part(boxG(0.03, 0.3, 0.03), mat(0x5e3d22), 0.24, 0.45, 0.12); // Griff
  part(boxG(0.03, 0.14, 0.2), mat(0xb0b4ba, { metalness: 0.5 }), 0.24, 0.62, 0.2); // Beil
  for (let i = 0; i < 5; i++) {
    const t = part(cylG(0.02, 0.025, 0.12, 5), mat(0xc79a9a), 0, 0.12, -0.22 - i * 0.1);
    t.rotation.x = Math.PI / 2;
  }
  return g;
}

// Die Monsterratte: ponygroß (2×2 Kacheln) mit Krone aus verbogenen Gabeln
export function monsterratte() {
  const g = new THREE.Group();
  ratBody(g, mat(0x5e5852), 2.4);
  const part = maker(g);
  const fork = mat(0xb8bcc2, { metalness: 0.6, roughness: 0.4 });
  part(cylG(0.2, 0.22, 0.06, 10), fork, 0, 0.88, 0.75);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const f = part(boxG(0.03, 0.22, 0.03), fork, Math.cos(a) * 0.18, 1.0, 0.75 + Math.sin(a) * 0.18);
    f.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3 + (i % 2 ? 0.25 : -0.15)); // verbogen
  }
  return g;
}

// Die Kröte mit kleiner goldener Krone (ohne Kampfwerte)
export function kroete() {
  const g = new THREE.Group();
  const part = maker(g);
  const skin = mat(0x5d7a32);
  const body = part(new THREE.DodecahedronGeometry(0.24), skin, 0, 0.2, 0);
  body.scale.set(1.2, 0.8, 1.1);
  part(sph(0.12), mat(0xa8b870), 0, 0.15, 0.14).scale.set(1.3, 0.8, 1);
  [-1, 1].forEach(k => {
    part(sph(0.06), skin, k * 0.11, 0.36, 0.14);
    part(sph(0.03), mat(0x1a1410), k * 0.11, 0.38, 0.19);
    part(boxG(0.1, 0.05, 0.16), skin, k * 0.2, 0.03, 0.12);
  });
  const gold = mat(0xe3b341, { metalness: 0.6, roughness: 0.35 });
  part(cylG(0.08, 0.08, 0.05, 8), gold, 0, 0.4, 0.02);
  for (let i = 0; i < 4; i++) part(new THREE.ConeGeometry(0.02, 0.06, 4), gold, Math.cos(i * 1.57) * 0.07, 0.45, 0.02 + Math.sin(i * 1.57) * 0.07);
  return g;
}

// Ersatzfigur für Monster ohne eigene Figur (Platzhalter der späteren Themen): Kegel mit Kopf, Farbe aus der id
function fallback(id) {
  const g = new THREE.Group();
  const part = maker(g);
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const color = new THREE.Color().setHSL((h % 360) / 360, 0.4, 0.4);
  part(new THREE.ConeGeometry(0.28, 0.75, 7), mat(color.getHex()), 0, 0.38, 0);
  part(sph(0.15), mat(color.getHex()), 0, 0.85, 0);
  [-1, 1].forEach(k => part(sph(0.03), eyeMat(), k * 0.06, 0.88, 0.13));
  return g;
}

const BUILDERS = { rat, skeleton, goblin, mimic, kuechenratte, monsterratte, kroete };

export function buildMonsterFigure(id, variant) {
  return BUILDERS[id] ? BUILDERS[id](variant) : fallback(id);
}

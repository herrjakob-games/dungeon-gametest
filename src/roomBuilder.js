// Baut den aktuellen Raum als 3D-Szene: Boden, Wände, Türen, Fackeln, Einrichtung.
// Regel für die Einrichtung: Das Kreuz aus Reihe und Spalte 6 bis 8 bleibt immer frei,
// damit alle Türen miteinander verbunden sind.
import { N, MID, E, DIR, DIRKEYS, key, inBounds, tw } from "./config.js";
import { setRoomSeed, rnd, pickOne, shuffled } from "./rng.js";
import { mat, box, stone, WOOD } from "./materials.js";
import { TYPES } from "./roomTypes.js";
import { scene } from "./scene.js";
import { state } from "./state.js";
const THREE = window.THREE;

let roomGroup = null;
let add = null; // fügt ein Objekt zum aktuellen Raum hinzu

const free = (x, z) => inBounds(x, z) && !state.blocked.has(key(x, z));
const block = (x, z) => state.blocked.add(key(x, z));

export function buildRoom(id) {
  if (roomGroup) {
    scene.remove(roomGroup);
    roomGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  const room = state.dungeon.rooms[id];
  const type = TYPES[room.type];
  roomGroup = new THREE.Group();
  scene.add(roomGroup);
  add = (o) => { roomGroup.add(o); return o; };

  state.blocked = new Set();
  state.interactables = [];
  state.torches = [];
  state.lidPivot = null;
  state.openLid = false;
  state.hovered = null;
  if (!state.roomState[id]) state.roomState[id] = {};
  setRoomSeed(room.seed);

  buildFloor(type);
  buildWalls(room);
  DIRKEYS.forEach(d => { if (room.doors & DIR[d].bit) makeDoor(d); });
  [[tw(3), true], [tw(11), true], [tw(3), false], [tw(11), false]].forEach(([p, north]) => makeTorch(p, north, type.torch));
  furnish(room.type, id);
  scatterRubble();
}

// ---------- Boden und Wände ----------
function buildFloor(type) {
  add(box(N + 1, 0.4, N + 1, mat(0x1e1814), 0, -0.4, 0));
  const floor = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.2, 0.95), mat(0xffffff), N * N);
  floor.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  let i = 0;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    dummy.position.set(tw(x), -0.1 - rnd() * 0.03, tw(z));
    dummy.updateMatrix();
    floor.setMatrixAt(i, dummy.matrix);
    c.setHSL(type.floor.h, type.floor.s, ((x + z) % 2 ? 0.30 : 0.33) + rnd() * 0.05);
    floor.setColorAt(i, c);
    i++;
  }
  add(floor);
}

// Hinten (Norden, Westen) hohe Wände, vorne (Süden, Osten) nur Sockel
function buildWalls(room) {
  const has = (d) => (room.doors & DIR[d].bit) !== 0;
  for (let t = 0; t < N; t++) {
    if (t !== MID || !has("N")) add(box(1, 3, 0.5, stone(), tw(t), 1.5, -E));
    if (t !== MID || !has("W")) add(box(0.5, 3, 1, stone(), -E, 1.5, tw(t)));
    if (t !== MID || !has("S")) add(box(1, 0.4, 0.5, stone(), tw(t), 0.2, E));
    if (t !== MID || !has("E")) add(box(0.5, 0.4, 1, stone(), E, 0.2, tw(t)));
  }
  add(box(0.5, 3, 0.5, stone(), -E, 1.5, -E));
  add(box(0.5, 3, 0.5, stone(), E, 1.5, -E));
  add(box(0.5, 3, 0.5, stone(), -E, 1.5, E));
  add(box(0.5, 0.4, 0.5, stone(), E, 0.2, E));
}

function makeDoor(d) {
  const info = DIR[d];
  const g = new THREE.Group();
  const tall = d === "N" || d === "W";
  const glowMat = mat(0xe9a640, { emissive: 0xe9a640, emissiveIntensity: 0.25 });
  const hoverMats = [glowMat];
  const frame = mat(0x3d342e);
  if (tall) {
    g.add(box(0.18, 2.5, 0.6, frame, -0.41, 1.25, 0));
    g.add(box(0.18, 2.5, 0.6, frame, 0.41, 1.25, 0));
    g.add(box(1, 0.5, 0.6, frame, 0, 2.75, 0));
    const slabMat = mat(WOOD, { emissive: 0xe9a640, emissiveIntensity: 0 });
    hoverMats.push(slabMat);
    g.add(box(0.64, 2.3, 0.12, slabMat, 0, 1.15, -0.12));
    g.add(box(0.08, 0.08, 0.06, mat(0xd8b56a), 0.2, 1.1, -0.04));
  } else {
    g.add(box(0.18, 0.7, 0.6, frame, -0.41, 0.35, 0));
    g.add(box(0.18, 0.7, 0.6, frame, 0.41, 0.35, 0));
  }
  g.add(box(0.7, 0.05, 0.55, glowMat, 0, 0.03, 0));
  if (d === "N") g.position.set(0, 0, -E);
  if (d === "S") g.position.set(0, 0, E);
  if (d === "W") { g.position.set(-E, 0, 0); g.rotation.y = Math.PI / 2; }
  if (d === "E") { g.position.set(E, 0, 0); g.rotation.y = Math.PI / 2; }
  g.userData = { kind: "door", dir: d, name: info.name, approach: info.approach, hoverMats, baseGlow: glowMat };
  add(g);
  state.interactables.push(g);
}

function makeTorch(p, alongNorth, color) {
  const g = new THREE.Group();
  g.add(box(0.1, 0.5, 0.1, mat(0x4a3424), 0, 0, 0));
  const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color }));
  flame.position.y = 0.35;
  g.add(flame);
  const light = new THREE.PointLight(color, 1.2, 8, 2);
  light.position.y = 0.4;
  g.add(light);
  if (alongNorth) g.position.set(p, 1.9, -E + 0.32);
  else g.position.set(-E + 0.32, 1.9, p);
  add(g);
  state.torches.push({ light, flame, phase: rnd() * 10 });
}

function scatterRubble() {
  for (let k = 0; k < 14; k++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 + rnd() * 0.08), stone());
    r.position.set(tw(Math.floor(rnd() * N)) + (rnd() - 0.5) * 0.7, 0.04, tw(Math.floor(rnd() * N)) + (rnd() - 0.5) * 0.7);
    r.castShadow = true;
    add(r);
  }
}

// ---------- Einrichtung je Raumtyp ----------
const CORNERS = [[1, 1], [13, 1], [1, 13], [13, 13]];
const QUADS = [[3, 3], [11, 3], [3, 11], [11, 11]];
const FOUR_PILLARS = [[4, 4], [10, 4], [4, 10], [10, 10]];

function furnish(t, id) {
  if (t === "start") {
    FOUR_PILLARS.forEach(p => pillar(...p));
    barrelCluster(pickOne(CORNERS));
  } else if (t === "halle") {
    const pts = rnd() < 0.5
      ? [[2, 3], [5, 3], [9, 3], [12, 3], [2, 11], [5, 11], [9, 11], [12, 11]]
      : [[3, 2], [3, 5], [3, 9], [3, 12], [11, 2], [11, 5], [11, 9], [11, 12]];
    pts.forEach(p => pillar(...p));
    if (rnd() < 0.5) barrelCluster(pickOne(CORNERS));
  } else if (t === "gruft") {
    [[4, 3], [10, 3], [4, 10], [10, 10]].forEach(p => sarcophagus(...p));
    shuffled([[2, 2], [12, 2], [2, 12], [12, 12]]).slice(0, 2).forEach(p => pillar(...p));
  } else if (t === "wache") {
    const order = shuffled([0, 1, 2, 3]);
    const q = [[2, 3], [10, 3], [2, 11], [10, 11]][order[0]];
    table([[q[0], q[1]], [q[0] + 1, q[1]], [q[0] + 2, q[1]]]);
    [[q[0], q[1] - 1], [q[0] + 2, q[1] - 1], [q[0] + 1, q[1] + 1]].forEach(p => stool(...p));
    barrelCluster(CORNERS[order[1]]);
    weaponRack();
  } else if (t === "vorrat") {
    shuffled(CORNERS).slice(0, 2 + Math.floor(rnd() * 2)).forEach(c => {
      barrelCluster(c);
      const sx = c[0] < MID ? 1 : -1, sz = c[1] < MID ? 1 : -1;
      crate(c[0] + 2 * sx, c[1]); crate(c[0], c[1] + 2 * sz); crate(c[0] + sx, c[1] + sz);
    });
  } else if (t === "schatz") {
    const q = pickOne(QUADS);
    makeChest(q, id);
    for (let k = 0; k < 4; k++) goldPile(q[0] + (rnd() < 0.5 ? -1 : 1), q[1] + (rnd() < 0.5 ? -1 : 1));
    FOUR_PILLARS.filter(p => !(Math.abs(p[0] - q[0]) <= 1 && Math.abs(p[1] - q[1]) <= 1)).forEach(p => pillar(...p));
  } else if (t === "exit") {
    FOUR_PILLARS.forEach(p => pillar(...p));
    makeExit();
  }
}

function pillar(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  const g = new THREE.Group();
  g.add(box(0.85, 0.25, 0.85, stone(), 0, 0.12, 0));
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 2.6, 7), stone());
  col.position.y = 1.5; col.castShadow = true; col.receiveShadow = true;
  g.add(col);
  g.add(box(0.8, 0.2, 0.8, stone(), 0, 2.9, 0));
  g.position.set(tw(x), 0, tw(z));
  add(g);
}

function barrel(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 9), mat(0x8a5a32));
  b.position.y = 0.4; b.castShadow = true; g.add(b);
  [0.18, 0.62].forEach(y => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.06, 9), mat(0x3a3330));
    r.position.y = y; g.add(r);
  });
  g.position.set(tw(x) + (rnd() - 0.5) * 0.15, 0, tw(z) + (rnd() - 0.5) * 0.15);
  g.rotation.y = rnd() * Math.PI;
  add(g);
}

function barrelCluster(c) {
  const sx = c[0] < MID ? 1 : -1, sz = c[1] < MID ? 1 : -1;
  barrel(c[0], c[1]); barrel(c[0] + sx, c[1]); barrel(c[0], c[1] + sz);
}

function crate(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  const g = new THREE.Group();
  const s = 0.7 + rnd() * 0.1;
  g.add(box(s, s, s, mat(0x9a7044), 0, s / 2, 0));
  g.add(box(s + 0.02, 0.08, s + 0.02, mat(0x5e3d22), 0, s * 0.25, 0));
  g.add(box(s + 0.02, 0.08, s + 0.02, mat(0x5e3d22), 0, s * 0.75, 0));
  g.position.set(tw(x), 0, tw(z));
  g.rotation.y = (rnd() - 0.5) * 0.4;
  add(g);
}

function sarcophagus(x, z) {
  if (!free(x, z) || !free(x, z + 1)) return;
  block(x, z); block(x, z + 1);
  const g = new THREE.Group();
  g.add(box(0.85, 0.55, 1.8, mat(0x6d6a5c), 0, 0.28, 0));
  const lid = box(0.92, 0.14, 1.88, mat(0x85816f), 0.04, 0.62, -0.06);
  lid.rotation.y = (rnd() - 0.5) * 0.12;
  g.add(lid);
  g.add(box(0.4, 0.06, 0.4, mat(0x9c977f), 0, 0.72, -0.5));
  g.position.set(tw(x), 0, tw(z) + 0.5);
  add(g);
}

function table(tiles) {
  tiles.forEach(t => block(t[0], t[1]));
  const xs = tiles.map(t => tw(t[0]));
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const len = Math.max(...xs) - Math.min(...xs) + 0.9;
  const g = new THREE.Group();
  g.add(box(len, 0.12, 0.9, mat(0x8b5e34), 0, 0.75, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
    g.add(box(0.1, 0.7, 0.1, mat(0x5e3d22), sx * (len / 2 - 0.1), 0.35, sz * 0.35)));
  g.add(box(0.14, 0.22, 0.14, mat(0xb9b2a4), -0.6, 0.92, 0.1));
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 10), mat(0xcfc6b2));
  plate.position.set(0.3, 0.83, -0.1); g.add(plate);
  g.add(box(0.08, 0.08, 0.08, mat(0xf0e5d3), 0.9, 0.85, 0.15));
  g.position.set(cx, 0, tw(tiles[0][1]));
  add(g);
}

function stool(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.45, 8), mat(0x6e4728));
  s.position.set(tw(x), 0.23, tw(z));
  s.castShadow = true;
  add(s);
}

// Deko an der Nordwand, blockiert nichts
function weaponRack() {
  const g = new THREE.Group();
  g.add(box(1.6, 0.08, 0.1, mat(0x5e3d22), 0, 1.6, 0));
  [-0.5, 0, 0.5].forEach(x => {
    g.add(box(0.04, 1.3, 0.04, mat(0x7a4a26), x, 1.1, 0.06));
    g.add(box(0.12, 0.22, 0.03, mat(0x9aa1a8, { metalness: 0.5, roughness: 0.5 }), x, 1.75, 0.06));
  });
  g.position.set(tw(5), 0, -E + 0.3);
  add(g);
}

// Deko, blockiert nichts
function goldPile(x, z) {
  if (!inBounds(x, z)) return;
  const gm = mat(0xe3b341, { metalness: 0.6, roughness: 0.35, emissive: 0x3a2a00, emissiveIntensity: 0.4 });
  for (let k = 0; k < 4; k++) {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8), gm);
    coin.position.set(tw(x) + (rnd() - 0.5) * 0.5, 0.01 + k * 0.02, tw(z) + (rnd() - 0.5) * 0.5);
    add(coin);
  }
}

function makeChest(pos, id) {
  if (!free(pos[0], pos[1])) return;
  block(pos[0], pos[1]);
  const bodyMat = mat(WOOD, { emissive: 0xe9a640, emissiveIntensity: 0 });
  const lidMat = mat(0x6a3e20, { emissive: 0xe9a640, emissiveIntensity: 0 });
  const chest = new THREE.Group();
  chest.add(box(0.8, 0.45, 0.55, bodyMat, 0, 0.23, 0));
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.45, -0.27);
  lidPivot.add(box(0.82, 0.2, 0.57, lidMat, 0, 0.1, 0.27));
  lidPivot.add(box(0.84, 0.06, 0.08, mat(0xc9a24f), 0, 0.12, 0.5));
  chest.add(lidPivot);
  chest.add(box(0.12, 0.14, 0.04, mat(0xd8b56a), 0, 0.42, 0.29));
  chest.position.set(tw(pos[0]), 0, tw(pos[1]));
  chest.rotation.y = (rnd() - 0.5) * 0.4;
  chest.userData = { kind: "chest", tile: pos, hoverMats: [bodyMat, lidMat] };
  if (state.roomState[id].chestOpened) lidPivot.rotation.x = -1.9;
  state.lidPivot = lidPivot;
  add(chest);
  state.interactables.push(chest);
}

// Der Abstieg: Torbogen in der Raummitte
function makeExit() {
  block(MID, MID);
  const g = new THREE.Group();
  const frameMat = mat(0x6e7480, { emissive: 0x9fd0ff, emissiveIntensity: 0 });
  g.add(box(1.1, 0.15, 1.1, mat(0x3a3f47), 0, 0.075, 0));
  g.add(box(0.2, 1.9, 0.3, frameMat, -0.45, 1.1, 0));
  g.add(box(0.2, 1.9, 0.3, frameMat, 0.45, 1.1, 0));
  g.add(box(1.1, 0.3, 0.34, frameMat, 0, 2.15, 0));
  const portal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 1.85),
    new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  portal.position.y = 1.08;
  g.add(portal);
  const light = new THREE.PointLight(0x9fd0ff, 1.6, 6, 2);
  light.position.set(0, 1.2, 0.5);
  g.add(light);
  g.rotation.y = Math.PI / 4;
  g.userData = { kind: "exit", tile: [MID, MID], hoverMats: [frameMat], portal };
  add(g);
  state.interactables.push(g);
}

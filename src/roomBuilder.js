// Baut den aktuellen Raum als 3D-Szene: Boden, Wände, Türen, Fackeln, Wendeltreppen, Einrichtung.
// Einrichtung aus den Daten (decor/themeDecor in data/room-types.json) plant decor.js; dort gelten die Regeln
// aus dem GDD (Türkacheln frei, alles erreichbar). Raumtypen ohne Eintrag bekommen das bisherige Muster aus
// furnish(); dort bleibt das Kreuz aus Reihe und Spalte 4 bis 6 frei.
import { N, MID, E, DIR, DIRKEYS, key, inBounds, tw } from "./config.js";
import { setRoomSeed, rnd, pickOne, shuffled } from "./rng.js";
import { mat, box, stone, WOOD } from "./materials.js";
import { TYPES } from "./roomTypes.js";
import { scene } from "./scene.js";
import { state } from "./state.js";
import { buildFigure } from "./figures.js";
import * as P from "./props.js";
import { PROPS, planDecor, decorFor, centerFeature, STAIRS_TILES } from "./decor.js";
import { syncRoom } from "./roomFigures.js";
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
  state.doorLocks = {};
  if (!state.roomState[id]) state.roomState[id] = {};
  setRoomSeed(room.seed);

  // Wendeltreppen setzt der Code: nach oben in der Vorkammer, nach unten im Abstieg und im Bossraum nach dem Sieg
  const feature = centerFeature(room.type, !!state.roomState[id].bossDefeated);
  const spec = decorFor(type, state.theme ? state.theme.id : null);
  const torch = spec && spec.torchColor ? parseInt(spec.torchColor.slice(1), 16) : type.torch;

  buildFloor(type);
  buildWalls(room);
  DIRKEYS.forEach(d => { if (room.doors & DIR[d].bit) makeDoor(d); });
  [[tw(1), true], [tw(9), true], [tw(1), false], [tw(9), false]].forEach(([p, north]) => makeTorch(p, north, torch));
  if (feature === "up" || feature === "down") makeStairs(feature);
  state.decorPlan = null;
  if (spec) placeDecor(spec, room, feature, id);
  else furnish(type.layout, id);
  scatterRubble(feature === "up" || feature === "down");
  refreshLocks();
  syncRoom(id); // Figuren im Raum (roomFigures.js)
}

// Schloss und Riegel an verschlossenen Türen zeigen (Zustand aus state.roomState[...].locked)
export function refreshLocks() {
  const locked = (state.roomState[state.current] || {}).locked;
  Object.entries(state.doorLocks).forEach(([d, g]) => {
    const on = !!(locked && locked.has(d));
    g.visible = on;
    g.userData.glow.color.setHex(on ? 0xd04a32 : 0xe9a640);
    g.userData.glow.emissive.setHex(on ? 0xd04a32 : 0xe9a640);
  });
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
  g.add(makeLock(d, tall, glowMat));
  if (d === "N") g.position.set(0, 0, -E);
  if (d === "S") g.position.set(0, 0, E);
  if (d === "W") { g.position.set(-E, 0, 0); g.rotation.y = Math.PI / 2; }
  if (d === "E") { g.position.set(E, 0, 0); g.rotation.y = Math.PI / 2; }
  g.userData = { kind: "door", dir: d, name: info.name, approach: info.approach, hoverMats, baseGlow: glowMat };
  add(g);
  state.interactables.push(g);
}

// Riegel mit Vorhängeschloss auf der Raumseite der Tür, zunächst unsichtbar
function makeLock(d, tall, glow) {
  const lock = new THREE.Group();
  const metal = mat(0xc9c2b4, { metalness: 0.5, roughness: 0.45 });
  const y = tall ? 1.2 : 0.55;
  lock.add(box(0.95, 0.18, 0.14, mat(0x5a3820), 0, y, 0));
  lock.add(box(0.4, 0.34, 0.14, metal, 0, y - 0.22, 0.08));
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 6, 10, Math.PI), metal);
  shackle.position.set(0, y - 0.06, 0.08);
  lock.add(shackle);
  // Bei Nord- und Westtür zeigt die lokale z-Achse in den Raum, bei Süd und Ost nach außen
  lock.position.z = d === "N" || d === "W" ? 0.05 : -0.32;
  if (d === "S" || d === "E") lock.rotation.y = Math.PI;
  lock.visible = false;
  lock.userData.glow = glow;
  state.doorLocks[d] = lock;
  return lock;
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
  state.torches.push({ light, flame, phase: rnd() * 10, base: 1.2 });
}

// Geröll in jedem Raum, nicht auf der Wendeltreppe
function scatterRubble(skipCenter) {
  for (let k = 0; k < 9; k++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 + rnd() * 0.08), stone());
    const x = Math.floor(rnd() * N), z = Math.floor(rnd() * N);
    if (skipCenter && Math.abs(x - MID) <= 2 && Math.abs(z - MID) <= 2) continue;
    r.position.set(tw(x) + (rnd() - 0.5) * 0.7, 0.04, tw(z) + (rnd() - 0.5) * 0.7);
    r.castShadow = true;
    add(r);
  }
}

// ---------- Wendeltreppen ----------
// Auf Gruppen aus props.js: Mittelpunkt (in Kacheln) und Drehung setzen
function at(g, cx, cz, rot) {
  const outer = new THREE.Group();
  outer.add(g);
  outer.position.set(tw(cx), 0, tw(cz));
  outer.rotation.y = rot || 0;
  return add(outer);
}
const lightCtx = () => ({ flicker: state.torches });

function makeStairs(dir) {
  STAIRS_TILES.forEach(t => block(t[0], t[1]));
  if (dir === "up") { at(P.wendeltreppe_hoch(null, lightCtx()), MID, MID); return; }
  const g = at(P.wendeltreppe_runter(null, lightCtx()), MID, MID);
  const inner = g.children[0];
  g.userData = { kind: "exit", tiles: STAIRS_TILES, hoverMats: inner.userData.hoverMats, baseGlow: inner.userData.baseGlow };
  state.interactables.push(g);
}

// ---------- Einrichtung aus den Daten ----------
function placeDecor(spec, room, feature, id) {
  const plan = planDecor(spec, { seed: room.seed, doors: room.doors, feature });
  state.decorPlan = plan; // für Figuren mit near:<prop>
  for (const pl of plan.placements) {
    if (pl.prop === "truhe") { makeChest(pl.tiles[0], id, pl.rot); continue; }
    if (pl.prop === "lagerfeuer") { makeCampfire(pl.tiles[0], id); continue; }
    if (pl.prop === "haendlerfigur") { makeMerchant(pl.tiles[0]); continue; }
    if (PROPS[pl.prop].blocks) pl.tiles.forEach(t => block(t[0], t[1]));
    at(P[pl.prop](pl, lightCtx()), pl.cx, pl.cz, pl.rot);
  }
}

// ---------- Bisheriges Einrichtungsmuster (Raumtypen ohne decor) ----------
const CORNERS = [[1, 1], [9, 1], [1, 9], [9, 9]];
const QUADS = [[2, 2], [8, 2], [2, 8], [8, 8]];
const FOUR_PILLARS = [[3, 3], [7, 3], [3, 7], [7, 7]];

// t: Einrichtung ("layout") des Raumtyps aus data/room-types.json
function furnish(t, id) {
  if (t === "pillars") {
    FOUR_PILLARS.forEach(p => pillar(...p));
  } else if (t === "boss") {
    CORNERS.forEach(p => pillar(...p)); // die Mitte bleibt als Arena frei, nach dem Sieg steht dort die Treppe
  } else if (t === "rast") {
    makeCampfire(pickOne(QUADS), id);
    barrelCluster(pickOne(CORNERS));
  } else if (t === "haendler") {
    const q = pickOne(QUADS);
    makeMerchant(q);
    const sx = q[0] < MID ? 1 : -1;
    crate(q[0] + sx, q[1]); crate(q[0] - sx, q[1]);
    barrelCluster(pickOne(CORNERS.filter(c => Math.abs(c[0] - q[0]) > 2 || Math.abs(c[1] - q[1]) > 2)));
  } else if (t === "start") {
    FOUR_PILLARS.forEach(p => pillar(...p)); // in der Vorkammer steht dort die Treppe, die Säulen entfallen dann
    barrelCluster(pickOne(CORNERS));
  } else if (t === "halle") {
    const pts = rnd() < 0.5
      ? [[1, 2], [3, 2], [7, 2], [9, 2], [1, 8], [3, 8], [7, 8], [9, 8]]
      : [[2, 1], [2, 3], [2, 7], [2, 9], [8, 1], [8, 3], [8, 7], [8, 9]];
    pts.forEach(p => pillar(...p));
    if (rnd() < 0.5) barrelCluster(pickOne(CORNERS));
  } else if (t === "gruft") {
    [[3, 2], [7, 2], [3, 7], [7, 7]].forEach(p => sarcophagus(...p));
    shuffled(CORNERS).slice(0, 2).forEach(p => pillar(...p));
  } else if (t === "wache") {
    const order = shuffled([0, 1, 2, 3]);
    const q = [[1, 2], [7, 2], [1, 8], [7, 8]][order[0]];
    table([[q[0], q[1]], [q[0] + 1, q[1]], [q[0] + 2, q[1]]]);
    [[q[0], q[1] - 1], [q[0] + 2, q[1] - 1], [q[0] + 1, q[1] + 1]].forEach(p => stool(...p));
    barrelCluster(CORNERS[order[1]]);
    at(P.waffenstaender(), 3, 0); // Deko an der Nordwand, blockiert nichts
  } else if (t === "vorrat") {
    shuffled(CORNERS).slice(0, 2 + Math.floor(rnd() * 2)).forEach(c => {
      barrelCluster(c);
      const sx = c[0] < MID ? 1 : -1, sz = c[1] < MID ? 1 : -1;
      crate(c[0] + 2 * sx, c[1]); crate(c[0], c[1] + 2 * sz); crate(c[0] + sx, c[1] + sz);
    });
  } else if (t === "schatz") {
    const q = pickOne(QUADS);
    makeChest(q, id);
    for (let k = 0; k < 4; k++) {
      const x = q[0] + (rnd() < 0.5 ? -1 : 1), z = q[1] + (rnd() < 0.5 ? -1 : 1);
      if (inBounds(x, z)) at(P.goldhaufen(), x, z);
    }
    FOUR_PILLARS.filter(p => !(Math.abs(p[0] - q[0]) <= 1 && Math.abs(p[1] - q[1]) <= 1)).forEach(p => pillar(...p));
  }
}

function pillar(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  at(P.saeule(), x, z);
}

function barrel(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  at(P.fass({ variant: null }), x, z);
}

function barrelCluster(c) {
  const sx = c[0] < MID ? 1 : -1, sz = c[1] < MID ? 1 : -1;
  barrel(c[0], c[1]); barrel(c[0] + sx, c[1]); barrel(c[0], c[1] + sz);
}

function crate(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  at(P.kiste(), x, z);
}

function sarcophagus(x, z) {
  if (!free(x, z) || !free(x, z + 1)) return;
  block(x, z); block(x, z + 1);
  at(P.sarkophag(), x, z + 0.5);
}

function table(tiles) {
  tiles.forEach(t => block(t[0], t[1]));
  at(P.tisch(), (tiles[0][0] + tiles[tiles.length - 1][0]) / 2, tiles[0][1]);
}

function stool(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  at(P.hocker(), x, z);
}

// ---------- Anklickbare Requisiten ----------
function makeChest(pos, id, rot) {
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
  chest.rotation.y = (rot || 0) + (rnd() - 0.5) * 0.4;
  chest.userData = { kind: "chest", tile: pos, hoverMats: [bodyMat, lidMat] };
  if (state.roomState[id].chestOpened) lidPivot.rotation.x = -1.9;
  state.lidPivot = lidPivot;
  add(chest);
  state.interactables.push(chest);
}

// Rastplatz: Lagerfeuer, einmal benutzbar
function makeCampfire(pos, id) {
  if (!free(pos[0], pos[1])) return;
  block(pos[0], pos[1]);
  const g = new THREE.Group();
  const logMat = mat(0x5e3d22, { emissive: 0xe9a640, emissiveIntensity: 0 });
  [0, 1, 2].forEach(i => {
    const log = box(0.8, 0.14, 0.14, logMat, 0, 0.08, 0);
    log.rotation.y = i * Math.PI / 3;
    g.add(log);
  });
  const lit = !state.roomState[id].rested;
  const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
  flame.position.y = 0.4;
  flame.visible = lit;
  g.add(flame);
  const light = new THREE.PointLight(0xffa040, lit ? 1.4 : 0, 6, 2);
  light.position.y = 0.7;
  g.add(light);
  g.position.set(tw(pos[0]), 0, tw(pos[1]));
  g.userData = { kind: "campfire", tile: pos, hoverMats: [logMat], flame, light };
  add(g);
  state.interactables.push(g);
}

// Lagerfeuer nach dem Rasten löschen
export function douseCampfire() {
  const fire = state.interactables.find(o => o.userData.kind === "campfire");
  if (fire) { fire.userData.flame.visible = false; fire.userData.light.intensity = 0; }
}

// Händler: Figur aus Grundformen, schaut zur Raummitte
function makeMerchant(pos) {
  if (!free(pos[0], pos[1])) return;
  block(pos[0], pos[1]);
  const g = new THREE.Group();
  const fig = buildFigure("mensch");
  const hoverMats = [];
  fig.traverse(o => { if (o.material && o.material.emissive) { o.material = o.material.clone(); hoverMats.push(o.material); } });
  g.add(fig);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 8), mat(0x6a3a8a));
  hat.position.y = 1.25; hat.castShadow = true;
  g.add(hat);
  g.position.set(tw(pos[0]), 0, tw(pos[1]));
  g.rotation.y = Math.atan2(tw(MID) - tw(pos[0]), tw(MID) - tw(pos[1]));
  g.userData = { kind: "merchant", tile: pos, hoverMats };
  add(g);
  state.interactables.push(g);
}

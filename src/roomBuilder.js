// Baut den aktuellen Raum als 3D-Szene: Boden, Wände, Türen, Fackeln, Wendeltreppen, Einrichtung, Licht.
// Teile mit Modell (data/models.json, models.js) kommen als Modell, alle anderen als Platzhalter aus Grundformen.
// Einrichtung aus den Daten (decor/themeDecor in data/room-types.json) plant decor.js; dort gelten die Regeln
// aus dem GDD (Türkacheln frei, alles erreichbar). Raumtypen ohne Eintrag bekommen das bisherige Muster aus
// furnish(); dort bleibt das Kreuz aus Reihe und Spalte 3 bis 5 frei.
import { N, MID, E, DIR, DIRKEYS, key, inBounds, tw } from "./config.js";
import { setRoomSeed, rnd, pickOne, shuffled } from "./rng.js";
import { mat, box, stone, WOOD } from "./materials.js";
import { TYPES } from "./roomTypes.js";
import { scene, setAmbient } from "./scene.js";
import { makeModel, hasModel, setModelTheme, findPart, makeFigureModel } from "./models.js";
import { state } from "./state.js";
import { buildFigure } from "./figures.js";
import * as P from "./props.js";
import { PROPS, planDecor, decorFor, centerFeature, STAIRS_TILES, STAIRS_SIZE, STAIRS_CENTER, torchSlots } from "./decor.js";
import { syncRoom } from "./roomFigures.js";
import { setMood } from "./sound.js";
import { roomSound } from "./soundLogic.js";
const THREE = window.THREE;

let roomGroup = null;
let add = null; // fügt ein Objekt zum aktuellen Raum hinzu

const free = (x, z) => inBounds(x, z) && !state.blocked.has(key(x, z));
const block = (x, z) => state.blocked.add(key(x, z));

export function buildRoom(id) {
  if (roomGroup) {
    scene.remove(roomGroup);
    roomGroup.traverse(o => { if (o.geometry && !o.userData.sharedGeometry) o.geometry.dispose(); });
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
  state.merchantAnim = null;
  state.openLid = false;
  state.hovered = null;
  state.doorLocks = {};
  if (!state.roomState[id]) state.roomState[id] = {};
  setRoomSeed(room.seed);

  // Wendeltreppen setzt der Code: nach oben in der Vorkammer, nach unten im Abstieg und im Bossraum nach dem Sieg
  const feature = centerFeature(room.type, !!state.roomState[id].bossDefeated);
  state.stairsFeature = feature; // für Figuren-Anker an der Wendeltreppe (roomFigures.js)
  // Raum-Sound (GDD, Sound): Stimmung mit Überblendung, Boden für die Schritte; ohne Eintrag still
  const snd = roomSound(type, state.theme ? state.theme.id : null);
  setMood(snd ? snd.mood : null);
  state.floorSound = snd ? snd.floor : null;
  const spec = decorFor(type, state.theme ? state.theme.id : null);
  // Licht nach Stilguide: Palette des Themas, für düstere Räume (Gruft, Brunnen) eine eigene; torchColor der Einrichtung gewinnt
  const pal = roomPalette(room.type);
  const torch = spec && spec.torchColor ? spec.torchColor : (pal && pal.torch) || "#" + type.torch.toString(16).padStart(6, "0");
  setAmbient(pal && pal.ambient, pal && pal.brightness);
  setModelTheme(state.theme ? state.theme.id : null);

  buildFloor(type);
  buildWalls(room);
  DIRKEYS.forEach(d => { if (room.doors & DIR[d].bit) makeDoor(d); });
  placeTorches(room, torch);
  if (feature === "up" || feature === "down") makeStairs(feature);
  state.decorPlan = null;
  if (spec) placeDecor(spec, room, feature, id);
  else furnish(type.layout, id);
  scatterRubble(feature === "up" || feature === "down");
  refreshLocks();
  syncRoom(id); // Figuren im Raum (roomFigures.js)
}

// Palette des Themas (data/themes.json), mit Abwandlung für einzelne Raumtypen (roomPalettes)
function roomPalette(typeId) {
  const th = state.theme;
  if (!th || !th.palette) return null;
  return Object.assign({}, th.palette, (th.roomPalettes || {})[typeId] || {});
}

// Schloss und Riegel an verschlossenen Türen zeigen (Zustand aus state.roomState[...].locked)
export function refreshLocks() {
  const locked = (state.roomState[state.current] || {}).locked;
  Object.entries(state.doorLocks).forEach(([d, g]) => {
    const on = !!(locked && locked.has(d));
    g.visible = on;
    g.userData.glow.color.setHex(on ? DANGER : 0xe9a640);
    g.userData.glow.emissive.setHex(on ? DANGER : 0xe9a640);
  });
}

// ---------- Boden und Wände ----------
// Modelle aus data/models.json, sonst Grundformen. Hohe Wände 2 Kacheln, Sockel vorne 0,25 (GDD, Asset-Spezifikation).
export const WALL_H = 2, PLINTH_H = 0.25;
const DANGER = 0xc8432f; // Gefahr-Rot der Palette: Gegner, Fallen, verschlossene Türen

// Modell oder Platzhalter an eine Weltposition setzen
function placeAt(g, x, z, rotY, y) {
  g.position.set(x, y || 0, z);
  g.rotation.y = rotY || 0;
  return add(g);
}

function buildFloor(type) {
  add(box(N + 1, 0.4, N + 1, mat(0x1e1814), 0, -0.25, 0));
  if (hasModel("boden")) {
    // Bodenplatten, zur Abwechslung mit Rissen und selten mit Dekor (über den Raum-Seed)
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const r = rnd();
      const variant = r < 0.07 ? "bruch_a" : r < 0.14 ? "bruch_b" : r < 0.17 ? "deko" : null;
      placeAt(makeModel("boden", variant), tw(x), tw(z), Math.floor(rnd() * 4) * Math.PI / 2);
    }
    return;
  }
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

// Hinten (Norden, Westen) hohe Wände, vorne (Süden, Osten) nur Sockel. Türen hinten bekommen einen Türrahmen
// über drei Kacheln (Tür mittig), vorne bleibt die Türkachel offen.
function buildWalls(room) {
  const has = (d) => (room.doors & DIR[d].bit) !== 0;
  const frame = hasModel("tuerrahmen");
  const skipBack = (d, t) => has(d) && (frame ? Math.abs(t - MID) <= 1 : t === MID);
  if (hasModel("wand") && hasModel("sockel")) {
    for (let t = 0; t < N; t++) {
      if (!skipBack("N", t)) placeAt(makeModel("wand"), tw(t), -E, 0);
      if (!skipBack("W", t)) placeAt(makeModel("wand"), -E, tw(t), Math.PI / 2);
      if (t !== MID || !has("S")) placeAt(makeModel("sockel"), tw(t), E, 0);
      if (t !== MID || !has("E")) placeAt(makeModel("sockel"), E, tw(t), Math.PI / 2);
    }
    // Ecken: Endstücke, deren abgerundete Seite nach außen zeigt
    const corner = (id, x, z, rot) => { const m = makeModel(id) || makeModel(id === "wand_ecke" ? "wand" : "sockel"); placeAt(m, x, z, rot); };
    corner("wand_ecke", -E, -E, Math.PI);
    corner("wand_ecke", E, -E, 0);
    corner("wand_ecke", -E, E, -Math.PI / 2);
    corner("sockel_ecke", E, E, 0);
    return;
  }
  for (let t = 0; t < N; t++) {
    if (!skipBack("N", t)) add(box(1, WALL_H, 0.5, stone(), tw(t), WALL_H / 2, -E));
    if (!skipBack("W", t)) add(box(0.5, WALL_H, 1, stone(), -E, WALL_H / 2, tw(t)));
    if (t !== MID || !has("S")) add(box(1, PLINTH_H, 0.5, stone(), tw(t), PLINTH_H / 2, E));
    if (t !== MID || !has("E")) add(box(0.5, PLINTH_H, 1, stone(), E, PLINTH_H / 2, tw(t)));
  }
  add(box(0.5, WALL_H, 0.5, stone(), -E, WALL_H / 2, -E));
  add(box(0.5, WALL_H, 0.5, stone(), E, WALL_H / 2, -E));
  add(box(0.5, WALL_H, 0.5, stone(), -E, WALL_H / 2, E));
  add(box(0.5, PLINTH_H, 0.5, stone(), E, PLINTH_H / 2, E));
}

function makeDoor(d) {
  const info = DIR[d];
  const g = new THREE.Group();
  const tall = d === "N" || d === "W";
  const glowMat = mat(0xe9a640, { emissive: 0xe9a640, emissiveIntensity: 0.25 });
  const hoverMats = [glowMat];
  const frameMat = mat(0x8a7562); // Türrahmen eine Stufe heller als die Wand
  const model = tall ? makeModel("tuerrahmen", null, { unique: true }) : null;
  if (model) {
    model.traverse(n => {
      if (!n.isMesh) return;
      n.material.color.setScalar(1.18);
      n.material.emissive.setHex(0xe9a640);
      n.material.emissiveIntensity = 0;
      hoverMats.push(n.material);
    });
    g.add(model);
  } else if (tall) {
    g.add(box(0.18, 1.7, 0.6, frameMat, -0.41, 0.85, 0));
    g.add(box(0.18, 1.7, 0.6, frameMat, 0.41, 0.85, 0));
    g.add(box(1, 0.3, 0.6, frameMat, 0, 1.85, 0));
    const slabMat = mat(WOOD, { emissive: 0xe9a640, emissiveIntensity: 0 });
    hoverMats.push(slabMat);
    g.add(box(0.64, 1.55, 0.12, slabMat, 0, 0.78, -0.12));
    g.add(box(0.08, 0.08, 0.06, mat(0xd8b56a), 0.2, 0.75, -0.04));
  } else {
    g.add(box(0.18, 0.55, 0.6, frameMat, -0.41, 0.28, 0));
    g.add(box(0.18, 0.55, 0.6, frameMat, 0.41, 0.28, 0));
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

// Riegel mit rotem Vorhängeschloss auf der Raumseite der Tür, zunächst unsichtbar
function makeLock(d, tall, glow) {
  const lock = new THREE.Group();
  const red = mat(DANGER, { emissive: DANGER, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.5 });
  const y = tall ? 0.8 : 0.45;
  lock.add(box(0.95, 0.16, 0.14, mat(0x5a3820), 0, y, 0));
  lock.add(box(0.36, 0.3, 0.14, red, 0, y - 0.2, 0.08));
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 10, Math.PI), red);
  shackle.position.set(0, y - 0.06, 0.08);
  lock.add(shackle);
  // Bei Nord- und Westtür zeigt die lokale z-Achse in den Raum, bei Süd und Ost nach außen
  lock.position.z = d === "N" || d === "W" ? 0.3 : -0.32;
  if (d === "S" || d === "E") lock.rotation.y = Math.PI;
  lock.visible = false;
  lock.userData.glow = glow;
  state.doorLocks[d] = lock;
  return lock;
}

// Fackeln nach Stilguide: neben jeder Tür eine; Wände ohne Tür bekommen zwei, damit kein Raum dunkel bleibt.
// Vorne (Sockel) steht die Fackel auf einem Pfosten.
function placeTorches(room, color) {
  const has = (d) => (room.doors & DIR[d].bit) !== 0;
  const inner = -E + 0.25; // Innenseite der hohen Wände
  // Plätze an Nord- und Westwand aus decor.js (dieselben, die Wandrequisiten freilassen)
  torchSlots(room.doors).forEach(({ wall, t }) => (wall === "N" ? makeTorch(tw(t), inner, 0, color, false) : makeTorch(inner, tw(t), Math.PI / 2, color, false)));
  if (has("S")) makeTorch(tw(MID + 1), E, Math.PI, color, true);
  if (has("E")) makeTorch(E, tw(MID + 1), -Math.PI / 2, color, true);
}

function makeTorch(x, z, rot, color, onPost) {
  const g = new THREE.Group();
  const c = new THREE.Color(color);
  const y = onPost ? 0.95 : 1.25;
  if (onPost) g.add(box(0.18, y + 0.1, 0.18, mat(0x7a6552), 0, (y + 0.1) / 2 - y, 0)); // Pfosten in Wandfarbe auf dem Sockel
  const model = makeModel("fackel");
  let flame;
  if (model) {
    model.traverse(n => { if (n.isLight) n.parent.remove(n); }); // Licht setzt die Fackel selbst (Farbe des Raums)
    g.add(model);
    flame = new THREE.Object3D(); // die Flamme gehört zum Modell; geflackert wird nur das Licht
  } else {
    g.add(box(0.1, 0.5, 0.1, mat(0x4a3424), 0, 0, 0.1));
    flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: c }));
    flame.position.set(0, 0.35, 0.1);
  }
  g.add(flame);
  const light = new THREE.PointLight(c, 1.8, 6, 2);
  light.position.set(0, 0.4, 0.3);
  g.add(light);
  placeAt(g, x, z, rot, y);
  state.torches.push({ light, flame, phase: rnd() * 10, base: 1.8 });
}

// Geröll in jedem Raum, nicht auf der Wendeltreppe
function scatterRubble(skipCenter) {
  for (let k = 0; k < 9; k++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 + rnd() * 0.08), stone());
    const x = Math.floor(rnd() * N), z = Math.floor(rnd() * N);
    if (skipCenter && x < STAIRS_SIZE && z < STAIRS_SIZE) continue;
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
  if (dir === "up") { at(P.wendeltreppe_hoch(null, lightCtx()), ...STAIRS_CENTER); return; }
  const g = at(P.wendeltreppe_runter(null, lightCtx()), ...STAIRS_CENTER);
  const inner = g.children[0];
  g.userData = { kind: "exit", tiles: STAIRS_TILES, hoverMats: inner.userData.hoverMats, baseGlow: inner.userData.baseGlow };
  state.interactables.push(g);
}

// Requisit als Modell (data/models.json), sonst aus Grundformen (props.js)
function propMesh(id, pl) {
  pl = pl || { variant: null, tiles: [[0, 0]], cx: 0, cz: 0 };
  if (id === "fass" && pl.variant === "gruppe" && hasModel("fass")) {
    // Fass-Gruppe: ein Fass pro Kachel der L-Form
    const g = new THREE.Group();
    pl.tiles.forEach(([x, z]) => {
      const f = makeModel("fass");
      f.position.set(x - pl.cx, 0, z - pl.cz);
      f.rotation.y = rnd() * Math.PI * 2;
      g.add(f);
    });
    return g;
  }
  const model = makeModel(id, pl.variant);
  if (model) return model;
  if (P[id]) return P[id](pl, lightCtx());
  // Requisit ohne Platzhalter (nur als Modell gedacht): einfache Kiste in Holzfarbe, damit nichts fehlt
  const d = PROPS[id] || { w: 1, d: 1 };
  return box(Math.max(0.3, d.w * 0.8), 0.5, Math.max(0.3, d.d * 0.8), mat(0x7a5a3a), 0, 0.25, 0);
}

// ---------- Einrichtung aus den Daten ----------
function placeDecor(spec, room, feature, id) {
  const plan = planDecor(spec, { seed: room.seed, doors: room.doors, feature });
  state.decorPlan = plan; // für Figuren mit near:<prop>
  for (const pl of plan.placements) {
    if (pl.prop === "truhe") { makeChest(pl.tiles[0], id, pl.rot); continue; }
    if (pl.prop === "lagerfeuer") { makeCampfire(pl.tiles[0], id); continue; }
    if (pl.prop === "haendlerfigur") {
      // Kacheln von der Wand aus: Regal, Händler, Tisch
      const [shelf, pos, front] = pl.tiles;
      block(shelf[0], shelf[1]);
      const reg = makeModel("haendlerregal");
      if (reg) at(reg, shelf[0], shelf[1], pl.rot);
      makeMerchant(pos, front, pl.rot);
      continue;
    }
    if (PROPS[pl.prop].blocks) pl.tiles.forEach(t => block(t[0], t[1]));
    at(propMesh(pl.prop, pl), pl.cx, pl.cz, pl.rot);
  }
}

// ---------- Bisheriges Einrichtungsmuster (Raumtypen ohne decor) ----------
// Plätze für einen 9×9-Raum, alle außerhalb des Kreuzes aus Reihe und Spalte 3 bis 5 (gezählt ab 0)
const CORNERS = [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]];
const QUADS = [[1, 1], [N - 2, 1], [1, N - 2], [N - 2, N - 2]];
const FOUR_PILLARS = [[2, 2], [N - 3, 2], [2, N - 3], [N - 3, N - 3]];

// t: Einrichtung ("layout") des Raumtyps aus data/room-types.json
function furnish(t, id) {
  if (t === "pillars") {
    FOUR_PILLARS.forEach(p => pillar(...p));
  } else if (t === "boss") {
    CORNERS.slice(1).forEach(p => pillar(...p)); // die Nordwest-Ecke bleibt frei, nach dem Sieg steht dort die Treppe
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
    FOUR_PILLARS.forEach(p => pillar(...p)); // in der Nordwest-Ecke steht die Treppe, die Säule dort entfällt
    barrelCluster(pickOne(CORNERS.slice(1)));
  } else if (t === "halle") {
    const pts = rnd() < 0.5
      ? [[0, 2], [2, 2], [6, 2], [8, 2], [0, 6], [2, 6], [6, 6], [8, 6]]
      : [[2, 0], [2, 2], [2, 6], [2, 8], [6, 0], [6, 2], [6, 6], [6, 8]];
    pts.forEach(p => pillar(...p));
    if (rnd() < 0.5) barrelCluster(pickOne(CORNERS));
  } else if (t === "gruft") {
    [[2, 1], [6, 1], [2, 6], [6, 6]].forEach(p => sarcophagus(...p));
    shuffled(CORNERS).slice(0, 2).forEach(p => pillar(...p));
  } else if (t === "wache") {
    const order = shuffled([0, 1, 2, 3]);
    const q = [[0, 1], [6, 1], [0, 7], [6, 7]][order[0]];
    table([[q[0], q[1]], [q[0] + 1, q[1]], [q[0] + 2, q[1]]]);
    [[q[0], q[1] - 1], [q[0] + 2, q[1] - 1], [q[0] + 1, q[1] + 1]].forEach(p => stool(...p));
    barrelCluster(CORNERS[order[1]]);
    at(propMesh("waffenstaender"), 3, 0); // Deko an der Nordwand, blockiert nichts
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
      if (inBounds(x, z)) at(propMesh("goldhaufen"), x, z);
    }
    FOUR_PILLARS.filter(p => !(Math.abs(p[0] - q[0]) <= 1 && Math.abs(p[1] - q[1]) <= 1)).forEach(p => pillar(...p));
  }
}

function pillar(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  at(propMesh("saeule"), x, z);
}

function barrel(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  at(propMesh("fass"), x, z);
}

function barrelCluster(c) {
  const sx = c[0] < MID ? 1 : -1, sz = c[1] < MID ? 1 : -1;
  barrel(c[0], c[1]); barrel(c[0] + sx, c[1]); barrel(c[0], c[1] + sz);
}

function crate(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  at(propMesh("kiste"), x, z);
}

function sarcophagus(x, z) {
  if (!free(x, z) || !free(x, z + 1)) return;
  block(x, z); block(x, z + 1);
  at(propMesh("sarkophag"), x, z + 0.5);
}

function table(tiles) {
  tiles.forEach(t => block(t[0], t[1]));
  at(propMesh("tisch"), (tiles[0][0] + tiles[tiles.length - 1][0]) / 2, tiles[0][1]);
}

function stool(x, z) {
  if (!free(x, z)) return;
  block(x, z);
  at(propMesh("hocker"), x, z);
}

// ---------- Anklickbare Requisiten ----------
function makeChest(pos, id, rot) {
  if (!free(pos[0], pos[1])) return;
  block(pos[0], pos[1]);
  const model = makeModel("truhe", null, { unique: true });
  if (model) {
    // Truhe aus dem Modell: der Deckel (chest_lid) klappt beim Öffnen per Code auf
    const hoverMats = [];
    model.traverse(n => { if (n.isMesh) { n.material.emissive.setHex(0xe9a640); n.material.emissiveIntensity = 0; hoverMats.push(n.material); } });
    const lid = findPart(model, "chest_lid");
    model.position.set(tw(pos[0]), 0, tw(pos[1]));
    model.rotation.y = (rot || 0) + (rnd() - 0.5) * 0.4;
    model.userData = { kind: "chest", tile: pos, hoverMats };
    if (lid && state.roomState[id].chestOpened) lid.rotation.x = -1.9;
    state.lidPivot = lid;
    add(model);
    state.interactables.push(model);
    return;
  }
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

// Händler (GDD: Händler aus KayKit Rogue): steht mit dem Rücken zur Nord- oder Westwand und schaut zur Raummitte,
// vor ihm sein Tisch mit brennender Kerze. pos: Kachel des Händlers, front: Kachel des Tisches (oder null), rot: Ausrichtung der Wand
function makeMerchant(pos, front, rot) {
  if (!free(pos[0], pos[1])) return;
  block(pos[0], pos[1]);
  const g = new THREE.Group();
  const anim = makeFigureModel("haendlerfigur");
  const fig = anim ? anim.object : buildFigure("mensch");
  state.merchantAnim = anim && anim.animated ? anim : null;
  const hoverMats = [];
  fig.traverse(o => { if (o.material && o.material.emissive) { o.material = o.material.clone(); hoverMats.push(o.material); } });
  g.add(fig);
  if (!anim) {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 8), mat(0x6a3a8a));
    hat.position.y = 1.25; hat.castShadow = true;
    g.add(hat);
  }
  g.position.set(tw(pos[0]), 0, tw(pos[1]));
  g.rotation.y = Math.atan2(tw(MID) - tw(pos[0]), tw(MID) - tw(pos[1])); // schaut zur Raummitte
  // Angesprochen wird er über den Tisch: die Spielfigur läuft auf eine Kachel neben dem Tisch
  g.userData = { kind: "merchant", tile: front || pos, hoverMats };
  add(g);
  state.interactables.push(g);
  if (front && free(front[0], front[1])) {
    block(front[0], front[1]);
    const lights = [];
    const table = makeModel("verkaufstisch", null, { lights }) || box(0.5, 0.5, 0.5, mat(0x7a4a26), 0, 0.25, 0);
    lights.forEach(l => { l.castShadow = false; });
    at(table, front[0], front[1], rot !== undefined ? rot : g.rotation.y); // Tisch gerade vor der Wand
  }
}

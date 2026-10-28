// Figuren im Raum: erscheinen beim Event-Start oder im Kampf, laufen, zucken bei Treffern, sinken beim Tod in den
// Boden (Regeln: docs/GDD.md, „Gegner im Raum“, „Figuren in Events“, „Figuren nach dem Event“).
// Wo eine Figur stehen darf, plant figurePlan.js; die Formen stehen in monsterFigures.js.
import { N, MID, tw, key, reduceMotion } from "./config.js";
import { state, walkable } from "./state.js";
import { scene } from "./scene.js";
import { mulberry32 } from "./rng.js";
import { planFigures, combatSpot, figureInfo } from "./figurePlan.js";
import { buildMonsterFigure } from "./monsterFigures.js";
import { findPath } from "./pathfinding.js";
import { moveTo } from "./movement.js";
const THREE = window.THREE;

const group = new THREE.Group(); // eigene Gruppe: Figuren überleben den Neuaufbau des Raums (etwa nach dem Bosssieg)
scene.add(group);
let figs = [];
let roomKey = null;
let fighter = null; // Figur des aktuellen Gegners

const SPEED = 2.6; // Kacheln pro Sekunde
const tilesOf = (list) => new Set(list.flatMap(f => f.tiles.map(t => key(...t))));
const alive = () => figs.filter(f => !f.sink);

function make(pl, eventId, popIn) {
  const outer = new THREE.Group();
  const mid = new THREE.Group();
  mid.add(buildMonsterFigure(pl.figure, pl.variant));
  outer.add(mid);
  outer.position.set(tw(pl.cx), pl.y || 0, tw(pl.cz));
  outer.rotation.y = pl.rot || 0;
  if (popIn && !reduceMotion) outer.scale.setScalar(0.01);
  group.add(outer);
  const f = { id: pl.figure, variant: pl.variant, tiles: pl.tiles, stay: !!pl.stay, blocks: pl.blocks !== false && pl.tiles.length > 0,
    outer, mid, eventId, phase: Math.random() * 6, path: [], twitch: 0, sink: 0, scurry: false, grow: popIn && !reduceMotion };
  figs.push(f);
  if (f.blocks) f.tiles.forEach(t => state.blocked.add(key(...t)));
  return f;
}

function unblock(f) {
  if (f.blocks) f.tiles.forEach(t => state.blocked.delete(key(...t)));
}

function remove(f) {
  group.remove(f.outer);
  f.outer.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  figs = figs.filter(x => x !== f);
  if (fighter === f) fighter = null;
}

// Gemerkte Figuren mit stay aus dem Raumzustand entfernen (nach ihrem Tod)
function forgetStay(f) {
  const rs = state.roomState[state.current];
  if (rs && rs.stayFigures) rs.stayFigures = rs.stayFigures.filter(p => p !== f.saved);
}

/**
 * Nach dem Aufbau eines Raums (roomBuilder): Raumwechsel räumt alle Figuren weg und stellt die Figuren mit stay
 * wieder auf. Wird derselbe Raum neu gebaut, bleiben die Figuren stehen.
 */
export function syncRoom(id) {
  const where = state.depth + ":" + state.dungeon.seed + ":" + id; // neuer Dungeon zählt auch als Raumwechsel
  if (where !== roomKey) {
    figs.slice().forEach(remove);
    fighter = null;
    roomKey = where;
    ((state.roomState[id] || {}).stayFigures || []).forEach(p => { make(p, null, false).saved = p; });
  }
  alive().forEach(f => { if (f.blocks) f.tiles.forEach(t => state.blocked.add(key(...t))); });
}

// Event-Start: Figuren aus dem Feld "figures" aufstellen
export function showEventFigures(ev) {
  if (!ev.figures || !roomKey) return;
  const room = state.dungeon.rooms[state.current];
  let h = room.seed;
  for (const c of ev.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const plan = planFigures(ev.figures, {
    placements: state.decorPlan ? state.decorPlan.placements : [],
    blocked: state.blocked, doors: room.doors, player: state.pTile, occupied: tilesOf(alive()), rand: mulberry32(h)
  });
  plan.forEach(pl => {
    const f = make(pl, ev.id, true);
    if (pl.stay) {
      const rs = state.roomState[state.current];
      rs.stayFigures = (rs.stayFigures || []).concat([pl]);
      f.saved = pl;
    }
  });
}

// Event friedlich (oder nach einem Sieg) zu Ende: Figuren ohne stay verschwinden
export function endEventFigures() {
  alive().filter(f => !f.stay && f !== fighter).forEach(f => { unblock(f); f.sink = 0.001; });
}

// Gerader Weg in Weltkoordinaten; für Figuren aus einer Kachel ein Weg um Hindernisse herum
function walkTo(f, spot) {
  const from = [Math.round(f.outer.position.x + MID), Math.round(f.outer.position.z + MID)];
  const own = new Set(f.tiles.map(t => key(...t)));
  let pts = null;
  if (f.tiles.length === 1 && spot.tiles.length === 1 && !f.onProp) {
    const p = findPath(from[0], from[1], spot.tiles[0][0], spot.tiles[0][1], (x, z) => own.has(key(x, z)) || walkable(x, z));
    if (p) pts = p.slice(1).map(([x, z]) => [tw(x), 0, tw(z)]);
  }
  if (!pts || !pts.length) pts = [[tw(spot.cx), 0, tw(spot.cz)]];
  f.path = pts;
}

/**
 * Kampfstart: Die Figur des Gegners stellt sich neben die Spielfigur, im Bossraum in die Raummitte.
 * Zeigt das Event sie schon, läuft sie hin; gleiche Figuren huschen davon.
 */
export function combatFigure(monsterId) {
  const room = state.dungeon.rooms[state.current];
  const boss = room.type === "boss";
  const same = alive().filter(f => f.id === monsterId && !f.scurry);
  const existing = same[0] || null;
  same.slice(1).forEach(f => { unblock(f); f.scurry = true; walkTo(f, scurrySpot(f)); });
  if (existing) unblock(existing);
  const others = alive().filter(f => f !== existing && !f.scurry);
  const spot = combatSpot(monsterId, { blocked: state.blocked, doors: room.doors, player: state.pTile, boss, occupied: tilesOf(others) });
  let f = existing;
  if (f) {
    f.onProp = f.tiles.length === 0;
    walkTo(f, spot);
    f.tiles = spot.tiles;
    f.blocks = figureInfo(monsterId).blocks;
    if (f.blocks) f.tiles.forEach(t => state.blocked.add(key(...t)));
  } else {
    f = make({ figure: monsterId, tiles: spot.tiles, cx: spot.cx, cz: spot.cz, rot: 0, blocks: figureInfo(monsterId).blocks }, null, true);
  }
  f.faceTo = boss && spot.meet ? spot.meet : state.pTile;
  fighter = f;
  // Lesbarkeit (Stilguide): Gegner im Kampf mit rotem Bodenring
  if (!f.ring) {
    const size = figureInfo(monsterId).size;
    f.ring = new THREE.Mesh(new THREE.RingGeometry(0.34 * size, 0.42 * size, 24),
      new THREE.MeshBasicMaterial({ color: 0xc8432f, transparent: true, opacity: 0.8, depthWrite: false }));
    f.ring.rotation.x = -Math.PI / 2;
    f.ring.position.y = 0.025;
    f.outer.add(f.ring);
  }
  // Im Bossraum läuft auch die Spielfigur in die Mitte
  if (boss && spot.meet) moveTo(spot.meet[0], spot.meet[1]);
}

// Davonhuschen: zur entferntesten Ecke, dann verschwinden
function scurrySpot(f) {
  const p = state.pTile;
  const corners = [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]].sort((a, b) => Math.hypot(b[0] - p[0], b[1] - p[1]) - Math.hypot(a[0] - p[0], a[1] - p[1]));
  return { tiles: [corners[0]], cx: corners[0][0], cz: corners[0][1] };
}

// Treffer: kurzes Zucken
export function hitCombatFigure() {
  if (fighter) fighter.twitch = 0.35;
}

// Tod des Gegners: Figur sinkt in den Boden und verschwindet
export function killCombatFigure() {
  if (!fighter) return;
  unblock(fighter);
  forgetStay(fighter);
  if (fighter.ring) fighter.ring.visible = false;
  fighter.sink = 0.001;
  fighter = null;
}

// Für Tests und den Testmodus: Figuren im aktuellen Raum
export const roomFigureList = () => alive().map(f => ({ id: f.id, variant: f.variant, tiles: f.tiles, stay: f.stay }));

// Pro Frame aus der Spielschleife
export function updateFigures(dt, t) {
  for (const f of figs.slice()) {
    if (f.grow) {
      const s = Math.min(1, f.outer.scale.x + dt * 4);
      f.outer.scale.setScalar(s);
      if (s >= 1) f.grow = false;
    }
    if (f.path.length) {
      const [x, y, z] = f.path[0];
      const p = f.outer.position;
      const dx = x - p.x, dz = z - p.z, dy = y - p.y;
      const d = Math.hypot(dx, dz, dy);
      const step = (f.scurry ? SPEED * 2 : SPEED) * dt;
      if (d <= step) { p.set(x, y, z); f.path.shift(); }
      else {
        p.x += dx / d * step; p.z += dz / d * step; p.y += dy / d * step;
        if (Math.hypot(dx, dz) > 0.01) f.outer.rotation.y = Math.atan2(dx, dz);
      }
      if (!f.path.length && f.scurry) f.sink = 0.001;
    } else if (f.faceTo) {
      f.outer.rotation.y = Math.atan2(tw(f.faceTo[0]) - f.outer.position.x, tw(f.faceTo[1]) - f.outer.position.z);
    }
    if (f.sink) {
      f.sink += dt;
      f.mid.position.y = -f.sink * 1.2;
      if (f.sink > 1.1) { remove(f); continue; }
    } else if (!reduceMotion) {
      f.mid.position.y = Math.sin(t * 3 + f.phase) * 0.025; // im Stand leicht wippen
    }
    if (f.twitch > 0) {
      f.twitch -= dt;
      f.mid.position.x = f.twitch > 0 ? Math.sin(t * 70) * 0.07 : 0;
      f.mid.rotation.z = f.twitch > 0 ? Math.sin(t * 50) * 0.12 : 0;
    }
  }
}

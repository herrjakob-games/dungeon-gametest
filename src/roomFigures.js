// Figuren im Raum (Regeln: docs/GDD.md, „Gegner im Raum“, „Figuren in Events“, „Figuren nach dem Event“,
// „Inszenierung der Figuren“). Wo eine Figur steht und was sie tut, planen staging.js und figurePlan.js aus
// data/staging.json. Figuren mit Modell (data/models.json) kommen aus models.js und spielen ihre Animationen; alle
// anderen baut monsterFigures.js aus Grundformen.
import { MID, DIR, tw, key, reduceMotion } from "./config.js";
import { state, walkable } from "./state.js";
import { scene } from "./scene.js";
import { DATA } from "./data.js";
import { mulberry32 } from "./rng.js";
import { planFigures, combatSpot, figureInfo } from "./figurePlan.js";
import { eventFigures } from "./staging.js";
import { buildMonsterFigure } from "./monsterFigures.js";
import { makeFigureModel, hasAnimation } from "./models.js";
import { findPath } from "./pathfinding.js";
import { moveTo } from "./movement.js";
import { player, turnToward } from "./player.js";
const THREE = window.THREE;

const group = new THREE.Group(); // eigene Gruppe: Figuren überleben den Neuaufbau des Raums (etwa nach dem Bosssieg)
scene.add(group);
let figs = [];
let roomKey = null;
let fighter = null;   // Gegner, der gerade dran ist
let fighters = [];    // alle Gegner des Kampfs (laufen gemeinsam an, sterben gemeinsam)
let turn = 0;         // reihum, wer angreift

const SPEED = 2.6;        // Kacheln pro Sekunde
const MAX_ANIMATED = 6;   // höchstens so viele animierte Figuren pro Raum, der Rest steht still
const TURN = 12;          // Drehgeschwindigkeit: nach etwa 0,25 Sekunden ist die Drehung fertig
const tilesOf = (list) => new Set(list.flatMap(f => f.tiles.map(t => key(...t))));
const alive = () => figs.filter(f => !f.sink && !f.dead && !f.leaving);

// Kürzester Weg zwischen zwei Winkeln
const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const toward = (f, x, z) => Math.atan2(x - f.outer.position.x, z - f.outer.position.z);

function make(pl, eventId, popIn, dead) {
  const outer = new THREE.Group();
  const mid = new THREE.Group();
  const animated = figs.filter(f => f.anim).length < MAX_ANIMATED;
  const anim = makeFigureModel(pl.figure, pl.variant);
  mid.add(anim ? anim.object : buildMonsterFigure(pl.figure, pl.variant));
  outer.add(mid);
  outer.position.set(tw(pl.cx), pl.y || 0, tw(pl.cz));
  outer.rotation.y = pl.rot || 0;
  if (popIn && !reduceMotion) outer.scale.setScalar(0.01);
  group.add(outer);
  const f = { id: pl.figure, variant: pl.variant, tiles: pl.tiles, stay: !!pl.stay, blocks: !dead && pl.blocks !== false && pl.tiles.length > 0,
    outer, mid, eventId, phase: Math.random() * 6, path: [], twitch: 0, sink: 0, grow: popIn && !reduceMotion,
    anim: anim && anim.animated ? anim : null, pose: null, rot: pl.rot || 0, dead: false, dying: 0, leaving: false, pl };
  if (f.anim) {
    if (dead) {
      f.anim.once("death");
      f.anim.update(f.anim.duration("death") + 0.1); // gleich in der Endhaltung
    } else if (pl.anim === "awaken") f.anim.once("awaken"); // Skelett steht beim Event-Start auf
    else if (pl.anim && pl.anim !== "idle") { f.pose = pl.anim; f.anim.loop(pl.anim); }
    if (!animated) { f.anim.update(0.3); f.frozen = true; } // zu viele animierte Figuren: diese steht still
  } else if (dead) {
    mid.rotation.z = Math.PI / 2; // Platzhalter liegen auf der Seite
    mid.position.y = 0.15;
  }
  if (!dead && pl.anim === "flat") layFlat(f, true);
  f.dead = !!dead;
  figs.push(f);
  if (f.blocks) f.tiles.forEach(t => state.blocked.add(key(...t)));
  return f;
}

// Figur ohne Liege-Animation (etwa der Goblin) liegt starr auf dem Rücken, Füße auf der Kachelmitte, Kopf nach hinten;
// steht beim Kampfbeginn oder beim Gehen wieder auf
function layFlat(f, on) {
  f.flat = on;
  f.mid.rotation.x = on ? -Math.PI / 2 : 0;
  f.mid.position.set(0, on ? 0.12 : 0, on ? 0.4 : 0);
}

function unblock(f) {
  if (f.blocks) f.tiles.forEach(t => state.blocked.delete(key(...t)));
  f.blocks = false;
}

function remove(f) {
  group.remove(f.outer);
  f.outer.traverse(o => { if (o.geometry && !o.isSkinnedMesh) o.geometry.dispose(); });
  figs = figs.filter(x => x !== f);
  if (fighter === f) fighter = null;
}

const roomState = () => state.roomState[state.current];

// Gemerkte Figuren mit stay aus dem Raumzustand entfernen (nach ihrem Tod)
function forgetStay(f) {
  const rs = roomState();
  if (rs && rs.stayFigures) rs.stayFigures = rs.stayFigures.filter(p => p !== f.saved);
}

/**
 * Nach dem Aufbau eines Raums (roomBuilder): Raumwechsel räumt alle Figuren weg und stellt die Figuren mit stay
 * und die Besiegten (in der Sterbe-Haltung) wieder auf. Wird derselbe Raum neu gebaut, bleiben die Figuren stehen.
 */
export function syncRoom(id) {
  const where = state.depth + ":" + state.dungeon.seed + ":" + id; // neuer Dungeon zählt auch als Raumwechsel
  if (where !== roomKey) {
    figs.slice().forEach(remove);
    fighter = null;
    fighters = [];
    roomKey = where;
    const rs = state.roomState[id] || {};
    (rs.deadFigures || []).forEach(p => make(p, null, false, true));
    (rs.stayFigures || []).forEach(p => { make(p, null, false).saved = p; });
  }
  alive().forEach(f => { if (f.blocks) f.tiles.forEach(t => state.blocked.add(key(...t))); });
}

/**
 * Event-Start: Figuren nach der Inszenierung (data/staging.json) aufstellen. Ergebnis: Anzahl neuer Figuren
 * (der Event-Ablauf wartet dann kurz, damit man sie sieht, bevor das Fenster aufgeht).
 */
export function showEventFigures(ev) {
  if (!roomKey || alive().some(f => f.eventId === ev.id)) return 0;
  const room = state.dungeon.rooms[state.current];
  const list = eventFigures(ev, DATA.staging, room.seed);
  if (!list.length) return 0;
  let h = room.seed;
  for (const c of ev.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const plan = planFigures(list, {
    placements: state.decorPlan ? state.decorPlan.placements : [],
    blocked: state.blocked, doors: room.doors, player: state.pTile, occupied: tilesOf(figs.filter(f => !f.sink)), rand: mulberry32(h),
    anchors: (DATA.staging || {}).anchors, canPose: (id, variant, name) => hasAnimation(id, variant, name),
    stairsDown: state.stairsFeature === "down" || state.stairsFeature === "arena"
  });
  plan.forEach(pl => {
    const f = make(pl, ev.id, true);
    if (pl.stay) saveStay(f);
  });
  return plan.length;
}

function saveStay(f) {
  if (f.saved) return;
  const rs = roomState();
  f.stay = true;
  f.saved = Object.assign({}, f.pl, { stay: true, rot: f.outer.rotation.y });
  rs.stayFigures = (rs.stayFigures || []).concat([f.saved]);
}

// Nächste Kachel einer Tür (innen) und die Kachel dahinter (außerhalb des Raums)
function doorExit(from) {
  const doors = state.dungeon.rooms[state.current].doors;
  let best = null;
  Object.values(DIR).forEach(d => {
    if (!(doors & d.bit)) return;
    const dist = Math.hypot(d.approach[0] - from[0], d.approach[1] - from[1]);
    if (!best || dist < best.dist) best = { dist, tile: d.approach, out: [d.approach[0] + d.dx, d.approach[1] + d.dz] };
  });
  return best;
}

/**
 * Event zu Ende (friedlich oder nach einem Sieg): Figuren mit stay (data/staging.json, etwa Kröte und Händler) bleiben
 * an ihrem Platz, solange der Spieler auf dieser Ebene ist. Alle anderen gehen zur nächsten Tür und verschwinden.
 */
export function endEventFigures() {
  if (!roomState()) return;
  alive().filter(f => !fighters.includes(f)).forEach(f => {
    if (f.stay) { saveStay(f); return; }
    leave(f);
  });
}

function leave(f) {
  unblock(f);
  f.leaving = true;
  f.pose = null;
  if (f.flat) layFlat(f, false);
  const from = [Math.round(f.outer.position.x + MID), Math.round(f.outer.position.z + MID)];
  const exit = doorExit(from);
  if (!exit) { f.sink = 0.001; return; }
  walkTo(f, { tiles: [exit.tile], cx: exit.tile[0], cz: exit.tile[1] });
  f.path.push([tw(exit.out[0]), 0, tw(exit.out[1])]); // durch die Tür hinaus
}

// Weg in Weltkoordinaten; für Figuren aus einer Kachel ein Weg um Hindernisse herum
function walkTo(f, spot) {
  const from = [Math.round(f.outer.position.x + MID), Math.round(f.outer.position.z + MID)];
  const own = new Set(f.tiles.map(t => key(...t)));
  let pts = null;
  if (f.tiles.length === 1 && spot.tiles.length === 1 && !f.onProp) {
    const ok = (x, z) => own.has(key(x, z)) || walkable(x, z) || (x === spot.tiles[0][0] && z === spot.tiles[0][1]);
    const p = findPath(from[0], from[1], spot.tiles[0][0], spot.tiles[0][1], ok);
    if (p) pts = p.slice(1).map(([x, z]) => [tw(x), 0, tw(z)]);
  }
  if (!pts || !pts.length) pts = [[tw(spot.cx), 0, tw(spot.cz)]];
  f.path = pts;
}

function addRing(f) {
  if (f.ring) { f.ring.visible = true; return; }
  // Lesbarkeit (Stilguide): Gegner im Kampf mit rotem Bodenring
  const size = figureInfo(f.id).size;
  f.ring = new THREE.Mesh(new THREE.RingGeometry(0.34 * size, 0.42 * size, 24),
    new THREE.MeshBasicMaterial({ color: 0xc8432f, transparent: true, opacity: 0.8, depthWrite: false }));
  f.ring.rotation.x = -Math.PI / 2;
  f.ring.position.y = 0.025 - (f.outer.position.y || 0);
  f.outer.add(f.ring);
}

/**
 * Kampfstart: Alle Figuren dieses Gegners laufen mit Walk auf freie Nachbarkacheln der Spielfigur (im Bossraum
 * trifft man sich in der Raummitte). Gekämpft wird gegen einen Gegner; die Gruppe greift reihum an und stirbt gemeinsam.
 */
export function combatFigure(monsterId) {
  const room = state.dungeon.rooms[state.current];
  const boss = room.type === "boss";
  let list = alive().filter(f => f.id === monsterId);
  if (!list.length) {
    // Kein Event zeigt den Gegner (Testmodus, Boss ohne Event): er erscheint direkt neben der Spielfigur
    const spot = combatSpot(monsterId, { blocked: state.blocked, doors: room.doors, player: state.pTile, boss, occupied: tilesOf(alive()) });
    list = [make({ figure: monsterId, tiles: spot.tiles, cx: spot.cx, cz: spot.cz, rot: 0, blocks: figureInfo(monsterId).blocks }, null, true)];
  }
  fighters = list;
  turn = 0;
  list.forEach(unblock);
  const taken = new Set();
  let meet = null;
  list.forEach(f => {
    const others = alive().filter(o => !list.includes(o));
    const occupied = new Set([...tilesOf(others), ...taken]);
    const spot = combatSpot(monsterId, { blocked: state.blocked, doors: room.doors, player: state.pTile, boss, occupied });
    spot.tiles.forEach(t => taken.add(key(...t)));
    f.onProp = f.tiles.length === 0;
    f.pose = null;
    if (f.flat) layFlat(f, false);
    walkTo(f, spot);
    f.tiles = spot.tiles;
    f.blocks = figureInfo(monsterId).blocks;
    if (f.blocks) f.tiles.forEach(t => state.blocked.add(key(...t)));
    f.fighting = true;
    if (spot.meet) meet = spot.meet;
    addRing(f);
  });
  fighter = list[0];
  // Im Bossraum läuft auch die Spielfigur in die Mitte
  if (boss && meet) moveTo(meet[0], meet[1]);
}

const nextFighter = () => {
  const live = fighters.filter(f => !f.dead && !f.sink);
  if (!live.length) return null;
  turn = (turn + 1) % live.length;
  return live[turn];
};

// Eigener Zug der Spielfigur: Blick zum Gegner, der dran ist
export function focusCombatFigure() {
  if (fighter) turnToward(fighter.outer.position.x, fighter.outer.position.z);
}

// Treffer: kurzes Zucken, mit Modell die Treffer-Animation (falls das Paket eine hat)
export function hitCombatFigure() {
  if (!fighter) return;
  fighter.twitch = 0.35;
  if (fighter.anim) fighter.anim.once("hit");
}

// Zug des Gegners: der nächste aus der Gruppe greift an, die Spielfigur dreht sich zu ihm
export function attackCombatFigure() {
  const f = nextFighter();
  if (!f) return;
  fighter = f;
  if (f.anim) f.anim.once("attack");
  focusCombatFigure();
}

/**
 * Sieg: Alle Gegner der Gruppe spielen Death und bleiben liegen, auch beim erneuten Betreten (Raumzustand
 * deadFigures). Figuren ohne Death-Animation kippen um.
 */
export function killCombatFigure() {
  const rs = roomState();
  fighters.forEach(f => {
    unblock(f);
    forgetStay(f);
    f.stay = false;
    f.fighting = false;
    f.path = [];
    if (f.ring) f.ring.visible = false;
    f.dead = true;
    if (f.anim) f.anim.once("death");
    else f.dying = 0.5;
    rs.deadFigures = (rs.deadFigures || []).concat([{ figure: f.id, variant: f.variant, tiles: f.tiles, cx: f.outer.position.x + MID,
      cz: f.outer.position.z + MID, y: f.outer.position.y, rot: f.outer.rotation.y, blocks: false }]);
  });
  fighters = [];
  fighter = null;
}

// Für Tests und den Testmodus: Figuren im aktuellen Raum
export const roomFigureList = () => alive().map(f => ({ id: f.id, variant: f.variant, tiles: f.tiles, stay: f.stay, pose: f.pose }));
export const deadFigureList = () => figs.filter(f => f.dead).map(f => ({ id: f.id, variant: f.variant }));

// Pro Frame aus der Spielschleife
export function updateFigures(dt, t) {
  let nearest = null;
  for (const f of figs.slice()) {
    if (f.grow) {
      const s = Math.min(1, f.outer.scale.x + dt * 4);
      f.outer.scale.setScalar(s);
      if (s >= 1) f.grow = false;
    }
    // Laufen; die Blickrichtung folgt dem Weg, im Stand schaut die Figur zur Spielfigur (Kampf) oder bleibt
    let want = f.rot;
    if (f.path.length) {
      const [x, y, z] = f.path[0];
      const p = f.outer.position;
      const dx = x - p.x, dz = z - p.z, dy = y - p.y;
      const d = Math.hypot(dx, dz, dy);
      const step = SPEED * dt;
      if (d <= step) { p.set(x, y, z); f.path.shift(); }
      else { p.x += dx / d * step; p.z += dz / d * step; p.y += dy / d * step; }
      if (Math.hypot(dx, dz) > 0.01) want = Math.atan2(dx, dz);
      if (!f.path.length && f.leaving) f.sink = 0.001; // durch die Tür verschwunden
      if (f.fighting) {
        const dist = Math.hypot(p.x - player.position.x, p.z - player.position.z);
        if (!nearest || dist < nearest.dist) nearest = { f, dist };
      }
    } else if (f.fighting) {
      want = toward(f, player.position.x, player.position.z);
    }
    if (!f.dead) {
      if (f.path.length || f.fighting) f.rot = want;
      f.outer.rotation.y += angleDiff(f.outer.rotation.y, want) * Math.min(1, dt * TURN);
    }
    if (f.anim && !f.frozen) {
      if (!f.dead && !f.sink) f.anim.loop(f.path.length ? "walk" : (f.pose || "idle"));
      f.anim.update(dt);
    }
    if (f.dying) {
      // Platzhalter ohne Death-Animation kippen um
      f.dying = Math.max(0, f.dying - dt);
      f.mid.rotation.z = (1 - f.dying / 0.5) * Math.PI / 2;
      f.mid.position.y = (1 - f.dying / 0.5) * 0.15;
    }
    if (f.sink) {
      f.sink += dt;
      f.mid.position.y = -f.sink * 1.2;
      if (f.sink > 1.1) { remove(f); continue; }
    } else if (!reduceMotion && !f.anim && !f.dead) {
      f.mid.scale.y = 1 + Math.sin(t * 3 + f.phase) * 0.02; // im Stand leicht atmen, Füße bleiben am Boden (Figuren ohne Animation)
    }
    if (f.twitch > 0) {
      f.twitch -= dt;
      f.mid.position.x = f.twitch > 0 ? Math.sin(t * 70) * 0.07 : 0;
      f.mid.rotation.z = f.twitch > 0 ? Math.sin(t * 50) * 0.12 : 0;
    }
  }
  // Kampfstart: die Spielfigur dreht sich fortlaufend zum nächsten laufenden Gegner
  if (nearest) turnToward(nearest.f.outer.position.x, nearest.f.outer.position.z);
}

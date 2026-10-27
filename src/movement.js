// Laufbewegung der Figur entlang eines A*-Weges.
import { tw } from "./config.js";
import { findPath } from "./pathfinding.js";
import { state, walkable } from "./state.js";
import { player, figure, faceTile } from "./player.js";
import { drawDots, clearDots, removeDot } from "./markers.js";
import { setSteps, updatePos } from "./hud.js";

const SPEED = 3.6; // Kacheln pro Sekunde
let walkT = 0;

// Startpunkt für einen neuen Weg: die Kachel, auf die die Figur gerade zuläuft
const pathStart = () => (state.path.length ? state.path[0] : state.pTile);

export function moveTo(tx, tz, onArrive) {
  const from = pathStart();
  const p = findPath(from[0], from[1], tx, tz, walkable);
  if (!p) return false;
  state.path = state.path.length ? [state.path[0]].concat(p.slice(1)) : p.slice(1);
  state.onArrive = onArrive || null;
  drawDots(state.path);
  setSteps(state.path.length);
  if (!state.path.length) arrive();
  return true;
}

export function stopMoving() {
  state.path = [];
  state.onArrive = null;
  clearDots();
  setSteps(0);
}

// Zu einem Objekt laufen: nächstgelegenes freies Nachbarfeld wählen, dann zum Objekt drehen.
// tile: eine Kachel [x, z] oder alle Kacheln eines großen Objekts [[x, z], …] (etwa die Wendeltreppe)
export function approachTile(tile, onArrive) {
  const tiles = Array.isArray(tile[0]) ? tile : [tile];
  const from = pathStart();
  let best = null;
  const tried = new Set();
  for (const t of tiles) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    const nx = t[0] + dx, nz = t[1] + dz, k = nx + "," + nz;
    if ((!dx && !dz) || tried.has(k) || !walkable(nx, nz)) continue;
    tried.add(k);
    const p = findPath(from[0], from[1], nx, nz, walkable);
    if (p && (!best || p.length < best.p.length)) best = { p, x: nx, z: nz, t };
  }
  if (best) moveTo(best.x, best.z, () => { faceTile(best.t); onArrive(); });
}

function arrive() {
  if (!state.onArrive) return;
  const f = state.onArrive;
  state.onArrive = null;
  f();
}

// Pro Frame aufrufen
export function updateMovement(dt, t) {
  if (state.path.length) {
    const [nx, nz] = state.path[0];
    const tx = tw(nx), tz = tw(nz);
    const dx = tx - player.position.x, dz = tz - player.position.z;
    const dist = Math.hypot(dx, dz);
    const stepLen = SPEED * dt;
    if (dist > 0.001) player.rotation.y = Math.atan2(dx, dz);
    if (dist <= stepLen) {
      player.position.x = tx;
      player.position.z = tz;
      state.pTile = [nx, nz];
      state.path.shift();
      removeDot(nx, nz);
      updatePos();
      setSteps(state.path.length);
      if (!state.path.length) arrive();
    } else {
      player.position.x += (dx / dist) * stepLen;
      player.position.z += (dz / dist) * stepLen;
    }
    // Wippen beim Laufen
    walkT += dt;
    figure.position.y = Math.abs(Math.sin(walkT * 11)) * 0.08;
    figure.rotation.z = Math.sin(walkT * 11) * 0.06;
  } else {
    // Ruhiges Atmen im Stand
    figure.position.y *= 0.8;
    figure.rotation.z *= 0.8;
    figure.scale.y = 1 + Math.sin(t * 2.4) * 0.015;
  }
}

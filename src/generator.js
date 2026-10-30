// Dungeon-Generator. Reine Logik ohne Grafik, damit er in tests/ geprüft werden kann.
import { GRID, DIR, DIRKEYS, key } from "./config.js";
import { mulberry32 } from "./rng.js";
import { ratingFor } from "./eventLogic.js";
import { themeFor, levelInTheme, levelSize, hostileShare, isBossLevel, isRestLevel, bossFor } from "./world.js";

export const doorCount = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);

/**
 * Erzeugt eine Ebene aus einem Seed (docs/GDD.md, Abschnitte Raster und Raumtypen und Ebenen).
 * world: { themes: Liste aus data/themes.json, roomTypes: Raumtypen nach id aus data/room-types.json }
 * Ergebnis: { seed, depth, theme, boss, rooms: { "x,z": { x, z, doors, type, seed, dist } }, start, exit, count }
 */
export function generate(dSeed, depth, world) {
  const R = mulberry32(dSeed);
  const target = levelSize(depth, R);
  const rooms = {}, list = [];
  const addRoom = (x, z) => { const k = key(x, z); rooms[k] = { x, z, doors: 0 }; list.push(k); return k; };
  addRoom(2 + Math.floor(R() * 4), 2 + Math.floor(R() * 4));

  // Random Walk: zufälligen bestehenden Raum wählen, in zufällige Richtung erweitern
  let guard = 0;
  while (list.length < target && guard++ < 20000) {
    const r = rooms[list[Math.floor(R() * list.length)]];
    const d = DIR[DIRKEYS[Math.floor(R() * 4)]];
    const nx = r.x + d.dx, nz = r.z + d.dz;
    if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID || rooms[key(nx, nz)]) continue;
    addRoom(nx, nz);
    r.doors |= d.bit; // Tür beidseitig setzen
    rooms[key(nx, nz)].doors |= DIR[d.opp].bit;
  }

  // Einige zusätzliche Verbindungen, damit nicht alles in Sackgassen endet
  list.forEach(k => {
    const r = rooms[k];
    ["E", "S"].forEach(dk => {
      const d = DIR[dk], nk = key(r.x + d.dx, r.z + d.dz);
      if (rooms[nk] && !(r.doors & d.bit) && R() < 0.12) {
        r.doors |= d.bit;
        rooms[nk].doors |= DIR[d.opp].bit;
      }
    });
  });

  // Abstand vom Start (Breitensuche über Türen)
  const start = list[0];
  const dist = { [start]: 0 }, queue = [start];
  while (queue.length) {
    const k = queue.shift(), r = rooms[k];
    DIRKEYS.forEach(dk => {
      const d = DIR[dk];
      if (!(r.doors & d.bit)) return;
      const nk = key(r.x + d.dx, r.z + d.dz);
      if (dist[nk] === undefined) { dist[nk] = dist[k] + 1; queue.push(nk); }
    });
  }
  let exit = start;
  list.forEach(k => { if (dist[k] > dist[exit]) exit = k; });

  // Raumtypen verteilen
  const theme = themeFor(world.themes, depth);
  const boss = isBossLevel(depth) ? bossFor(world.themes, depth, R) : null;
  const types = world.roomTypes;
  // Regeln eines Raumtyps, mit den Ausnahmen des Themas (overrides; null hebt eine Regel auf)
  const rule = (t) => Object.assign({}, types[t], (theme.overrides || {})[t]);
  const counts = {};
  const set = (k, t) => { rooms[k].type = t; counts[t] = (counts[t] || 0) + 1; };
  const isDead = (k) => doorCount(rooms[k].doors) === 1;
  const neighbors = (k) => DIRKEYS.filter(dk => rooms[k].doors & DIR[dk].bit)
    .map(dk => key(rooms[k].x + DIR[dk].dx, rooms[k].z + DIR[dk].dz));
  const free = () => list.filter(k => !rooms[k].type);
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  const nextToStart = new Set(neighbors(start));

  set(start, "start");
  set(exit, boss ? "boss" : "exit"); // auf Boss-Ebenen öffnet sich der Abstieg erst nach dem Sieg im Bossraum

  // Fester Nachbar des Starts je Thema (Wachstube, Kerker, Goblin-Lager, Ork-Lager)
  const startSlots = free().filter(k => nextToStart.has(k));
  if (startSlots.length) set(pick(startSlots), theme.startNeighbor);

  // Schatzkammer: nur in Sackgassen, höchstens eine, und nur auf ihrer Ebene im Thema (themeLevel, heute die mittlere)
  const deadEnds = free().filter(isDead);
  const lvl = rule("schatz").themeLevel;
  if (deadEnds.length && (!lvl || lvl === levelInTheme(depth))) set(pick(deadEnds), "schatz");

  // Rastplatz auf geraden Ebenen, möglichst auf halber Strecke zwischen Start und Abstieg
  if (isRestLevel(depth) && free().length) {
    const half = dist[exit] / 2;
    const best = Math.min(...free().map(k => Math.abs(dist[k] - half)));
    set(pick(free().filter(k => Math.abs(dist[k] - half) === best)), "rast");
  }

  // Händler: genau einer, Lage beliebig
  if (free().length) set(pick(free()), "haendler");

  // Feste Regeln (nur, nie, Höchstzahl) und Vorlieben (bevorzugt, neben X) für die übrigen Räume
  const hardOk = (k, t) => {
    const def = rule(t);
    if (def.deadEnd === "only" && !isDead(k)) return false;
    if (def.deadEnd === "never" && isDead(k)) return false;
    if (def.nextToStart === "never" && nextToStart.has(k)) return false;
    return true;
  };
  const allowed = (k, t) => hardOk(k, t) && !(rule(t).max && (counts[t] || 0) >= rule(t).max);
  const score = (k, t) => {
    const def = rule(t);
    let s = 1;
    if (def.deadEnd === "prefer" && isDead(k)) s += 4;
    if (def.crossroads === "prefer" && doorCount(rooms[k].doors) >= 3) s += 4;
    if (def.near && neighbors(k).some(n => def.near.includes(rooms[n].type))) s += 4;
    return s;
  };
  const weighted = (k, cands) => {
    let r = R() * cands.reduce((sum, t) => sum + score(k, t), 0);
    for (const t of cands) { if ((r -= score(k, t)) < 0) return t; }
    return cands[cands.length - 1];
  };

  // Anteil feindlicher Räume; gemischte Räume zählen nicht als feindlich. Bewertung im Thema (themeRating)
  const isHostile = (t) => ratingFor(types[t], theme.id) === "hostile";
  const hostileTarget = Math.round(hostileShare(depth) * list.length);
  let hostile = list.filter(k => rooms[k].type && isHostile(rooms[k].type)).length;
  // Sackgassen zuerst, damit Raumtypen mit Vorliebe für Sackgassen dort landen
  const rest = free();
  const order = rest.filter(isDead).concat(rest.filter(k => !isDead(k)));
  order.forEach((k, i) => {
    const left = order.length - i;
    const want = R() < (hostileTarget - hostile) / left ? "hostile" : "mixed";
    const other = want === "hostile" ? "mixed" : "hostile";
    const kind = (t) => (isHostile(t) ? "hostile" : "mixed"); // neutral im Thema zählt wie gemischt: nicht feindlich
    let cands = theme.roomTypes.filter(t => kind(t) === want && allowed(k, t));
    if (!cands.length) cands = theme.roomTypes.filter(t => kind(t) === other && allowed(k, t));
    let t;
    if (cands.length) t = weighted(k, cands);
    else {
      // Alle erlaubten Raumtypen sind voll: den am wenigsten überzähligen nehmen
      const fill = (x) => ((counts[x] || 0) + 1) / (rule(x).max || Infinity);
      t = theme.roomTypes.filter(x => hardOk(k, x)).sort((x, y) => fill(x) - fill(y))[0];
    }
    set(k, t);
    if (isHostile(t)) hostile++;
  });

  list.forEach(k => {
    const r = rooms[k];
    r.seed = (((dSeed * 73856093) ^ ((r.x + 16) * 19349663) ^ ((r.z + 16) * 83492791)) >>> 0) % 2147483646 + 1;
    r.dist = dist[k];
  });

  return { seed: dSeed, depth, theme: theme.id, boss, rooms, start, exit, count: list.length };
}

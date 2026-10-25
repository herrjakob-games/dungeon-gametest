// Dungeon-Generator. Reine Logik ohne Grafik, damit er in tests/ geprüft werden kann.
import { GRID, DIR, DIRKEYS, key } from "./config.js";
import { mulberry32 } from "./rng.js";

export const doorCount = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);

// Gewichtung der Raumtypen für Räume mit 2+ Türen
const WEIGHTED = [["halle", 4], ["gruft", 3], ["wache", 3], ["vorrat", 1]];

/**
 * Erzeugt einen Dungeon aus einem Seed.
 * Ergebnis: { seed, rooms: { "x,z": { x, z, doors, type, seed, dist } }, start, exit, count }
 */
export function generate(dSeed) {
  const R = mulberry32(dSeed);
  const target = 12 + Math.floor(R() * 9); // 12 bis 20 Räume
  const rooms = {}, list = [];
  const addRoom = (x, z) => { const k = key(x, z); rooms[k] = { x, z, doors: 0 }; list.push(k); return k; };
  addRoom(2 + Math.floor(R() * 4), 2 + Math.floor(R() * 4));

  // Random Walk: zufälligen bestehenden Raum wählen, in zufällige Richtung erweitern
  let guard = 0;
  while (list.length < target && guard++ < 5000) {
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
  const pickWeighted = () => {
    let r = R() * WEIGHTED.reduce((s, w) => s + w[1], 0);
    for (const [t, w] of WEIGHTED) { if ((r -= w) < 0) return t; }
    return "halle";
  };
  list.forEach(k => {
    const r = rooms[k];
    if (k === start) r.type = "start";
    else if (k === exit) r.type = "exit";
    else if (doorCount(r.doors) === 1) r.type = R() < 0.6 ? "schatz" : "vorrat"; // Sackgassen
    else r.type = pickWeighted();
    r.seed = (((dSeed * 73856093) ^ ((r.x + 16) * 19349663) ^ ((r.z + 16) * 83492791)) >>> 0) % 2147483646 + 1;
    r.dist = dist[k];
  });

  return { seed: dSeed, rooms, start, exit, count: list.length };
}

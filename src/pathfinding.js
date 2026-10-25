// A*-Wegfindung auf dem Kachelraster: 8 Richtungen, Ecken werden nicht geschnitten.
import { key } from "./config.js";

/**
 * @param {(x:number,z:number)=>boolean} walkable
 * @returns {Array<[number,number]>|null} Weg inklusive Start und Ziel, oder null
 */
export function findPath(sx, sz, tx, tz, walkable) {
  if (!walkable(tx, tz)) return null;
  const open = [{ x: sx, z: sz, g: 0, f: 0 }];
  const came = {}, gScore = { [key(sx, sz)]: 0 };
  const h = (x, z) => {
    const dx = Math.abs(x - tx), dz = Math.abs(z - tz);
    return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
  };
  const closed = new Set();
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    const ck = key(cur.x, cur.z);
    if (cur.x === tx && cur.z === tz) {
      const out = [[tx, tz]];
      let k = ck;
      while (came[k]) { k = came[k]; out.unshift(k.split(",").map(Number)); }
      return out;
    }
    if (closed.has(ck)) continue;
    closed.add(ck);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const nx = cur.x + dx, nz = cur.z + dz;
      if (!walkable(nx, nz)) continue;
      if (dx && dz && (!walkable(cur.x + dx, cur.z) || !walkable(cur.x, cur.z + dz))) continue;
      const nk = key(nx, nz);
      const g = cur.g + (dx && dz ? 1.414 : 1);
      if (gScore[nk] === undefined || g < gScore[nk]) {
        gScore[nk] = g;
        came[nk] = ck;
        open.push({ x: nx, z: nz, g, f: g + h(nx, nz) });
      }
    }
  }
  return null;
}

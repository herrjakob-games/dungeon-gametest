// Figuren im Raum (docs/GDD.md: „Gegner im Raum“, „Figuren in Events“, Figurenliste). Reine Logik, testbar.
// Hier steht, wo eine Figur stehen darf. Gebaut werden die Figuren in monsterFigures.js, bewegt in roomFigures.js.
import { N, MID, key, inBounds } from "./config.js";
import { PLACES, reachable, doorTiles } from "./decor.js";

/**
 * Figurenliste aus dem GDD. size: Kacheln je Seite (2 = 2×2), blocks: steht im Weg, variants: erlaubte Varianten.
 * Jede Monster-id hat eine Figur; Monster ohne eigenen Eintrag bekommen eine Ersatzfigur (1 Kachel).
 */
export const FIGURE_INFO = {
  rat: { size: 1, blocks: true, variants: [] },
  skeleton: { size: 1, blocks: true, variants: ["sitzend"] },
  goblin: { size: 1, blocks: true, variants: [] },
  mimic: { size: 1, blocks: true, variants: [] },
  kuechenratte: { size: 1, blocks: true, variants: [] },
  monsterratte: { size: 2, blocks: true, variants: [] },
  kroete: { size: 1, blocks: false, variants: [], noCombat: true } // Figur ohne Kampfwerte, Deko
};
const FALLBACK = { size: 1, blocks: true, variants: [] };

export const figureInfo = (id) => FIGURE_INFO[id] || FALLBACK;
// Gibt es diese Figur? Monster-ids und Figuren ohne Kampfwerte aus der Figurenliste
export const isFigure = (id, monsters) => !!(FIGURE_INFO[id] || (monsters && monsters[id]));

const footprint = (x, z, size) => {
  const t = [];
  for (let dz = 0; dz < size; dz++) for (let dx = 0; dx < size; dx++) t.push([x + dx, z + dz]);
  return t;
};
const centerOf = (tiles) => [
  tiles.reduce((s, t) => s + t[0], 0) / tiles.length,
  tiles.reduce((s, t) => s + t[1], 0) / tiles.length
];
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

/**
 * Plant Figuren eines Events.
 * list: Feld "figures" ({ figure, place, count, variant, stay })
 * ctx: { placements (Einrichtung aus planDecor, sonst []), blocked (Set "x,z"), doors, player [x,z],
 *        occupied (Set "x,z" weiterer Figuren), rand }
 * Ergebnis: [{ figure, variant, tiles, cx, cz, y, rot, stay, blocks, onProp }]
 * Passt eine Figur nirgends hin, fehlt sie im Ergebnis.
 */
export function planFigures(list, ctx) {
  const R = ctx.rand || Math.random;
  const blocked = new Set(ctx.blocked);
  const used = new Set(ctx.occupied || []);
  const reserved = new Set(doorTiles(ctx.doors).map(t => key(...t)));
  if (ctx.player) reserved.add(key(...ctx.player));
  const placements = ctx.placements || [];
  const out = [];
  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const allTiles = [];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) allTiles.push([x, z]);

  // Freie Kachel(n) für eine Figur der Größe size, deren Ecke (x, z) ist
  function fits(x, z, info) {
    const tiles = footprint(x, z, info.size);
    if (!tiles.every(t => inBounds(...t) && !blocked.has(key(...t)) && !reserved.has(key(...t)) && !used.has(key(...t)))) return null;
    if (info.blocks) {
      const test = new Set(blocked);
      tiles.forEach(t => test.add(key(...t)));
      if (!reachable(test, ctx.doors, [], ctx.player ? [ctx.player] : [])) return null;
    }
    return tiles;
  }

  // Kandidaten-Kacheln je Platzierung (Ecke der Figur)
  function spots(place) {
    const m = /^(near|around|above):(\w+)$/.exec(place || "");
    if (m) {
      const target = placements.find(p => p.prop === m[2]);
      if (!target) return { tiles: shuffle(allTiles) }; // Requisit fehlt: irgendeine freie Kachel
      if (m[1] === "above") return { above: target };
      const own = new Set(target.tiles.map(t => key(...t)));
      const near = [];
      target.tiles.forEach(([x, z]) => N8.forEach(([dx, dz], i) => {
        const nx = x + dx, nz = z + dz;
        if (!own.has(key(nx, nz))) near.push({ t: [nx, nz], d: i < 4 ? 0 : 1 }); // erst gerade, dann schräg daneben
      }));
      return { tiles: shuffle(near).sort((a, b) => a.d - b.d).map(n => n.t), face: [target.cx, target.cz] };
    }
    if (place === "center") return { tiles: allTiles.slice().sort((a, b) => Math.hypot(a[0] - MID, a[1] - MID) - Math.hypot(b[0] - MID, b[1] - MID)) };
    if (place === "wall-back") return { tiles: shuffle(allTiles.filter(([x, z]) => x === 0 || z === 0)) };
    if (place === "corner") return { tiles: shuffle([[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]]).concat(shuffle(allTiles)) };
    return { tiles: shuffle(allTiles) };
  }

  for (const f of list || []) {
    const info = figureInfo(f.figure);
    for (let i = 0; i < (f.count || 1); i++) {
      const s = spots(f.place);
      if (s.above) {
        // Auf einem Requisit (etwa die Monsterratte auf dem Käseberg): belegt keine Bodenkachel
        out.push({ figure: f.figure, variant: f.variant || null, tiles: [], cx: s.above.cx, cz: s.above.cz, y: 0.9,
          rot: s.above.rot, stay: !!f.stay, blocks: false, onProp: true });
        continue;
      }
      let tiles = null;
      for (const [x, z] of s.tiles) {
        // Bei 2×2-Figuren auch die Ecken links und oberhalb der Kachel versuchen
        for (const [ox, oz] of info.size > 1 ? [[0, 0], [-1, 0], [0, -1], [-1, -1]] : [[0, 0]]) {
          tiles = fits(x + ox, z + oz, info);
          if (tiles) break;
        }
        if (tiles) break;
      }
      if (!tiles) continue;
      tiles.forEach(t => { used.add(key(...t)); if (info.blocks) blocked.add(key(...t)); });
      const [cx, cz] = centerOf(tiles);
      const look = s.face || ctx.player || [MID, MID];
      out.push({ figure: f.figure, variant: f.variant || null, tiles, cx, cz, y: 0,
        rot: Math.atan2(look[0] - cx, look[1] - cz), stay: !!f.stay, blocks: info.blocks, onProp: false });
    }
  }
  return out;
}

/**
 * Wo steht der Gegner im Kampf? Neben der Spielfigur, im Bossraum in der Raummitte.
 * ctx: { blocked, doors, player, boss (true im Bossraum), occupied }
 * Ergebnis: { tiles, cx, cz, meet } – meet: Kachel, auf die die Spielfigur im Bossraum läuft (sonst null)
 */
export function combatSpot(figure, ctx) {
  const info = figureInfo(figure);
  const blocked = new Set(ctx.blocked);
  const used = new Set(ctx.occupied || []);
  const free = (t) => inBounds(...t) && !blocked.has(key(...t)) && !used.has(key(...t));
  if (ctx.boss) {
    // Raummitte: Gegner in der Mitte, die Spielfigur direkt davor (zur Kamera hin)
    const tiles = info.size > 1 ? footprint(MID, MID - 1, 2) : [[MID, MID]];
    const [cx, cz] = centerOf(tiles);
    return { tiles, cx, cz, meet: [MID, MID + 1] };
  }
  const p = ctx.player;
  const cands = [];
  N8.forEach(([dx, dz], i) => {
    for (const [ox, oz] of info.size > 1 ? [[0, 0], [-1, 0], [0, -1], [-1, -1]] : [[0, 0]]) {
      const tiles = footprint(p[0] + dx + ox, p[1] + dz + oz, info.size);
      if (tiles.some(t => t[0] === p[0] && t[1] === p[1])) continue;
      cands.push({ tiles, d: i < 4 ? 0 : 1 });
    }
  });
  let best = cands.sort((a, b) => a.d - b.d).find(c => c.tiles.every(free));
  if (!best) {
    // Kein Platz direkt daneben: die nächste freie Kachel
    let bd = Infinity;
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const tiles = footprint(x, z, info.size);
      if (!tiles.every(free) || tiles.some(t => t[0] === p[0] && t[1] === p[1])) continue;
      const d = Math.hypot(x - p[0], z - p[1]);
      if (d < bd) { bd = d; best = { tiles }; }
    }
  }
  if (!best) return { tiles: [[p[0], p[1]]], cx: p[0], cz: p[1], meet: null };
  const [cx, cz] = centerOf(best.tiles);
  return { tiles: best.tiles, cx, cz, meet: null };
}

// Datenprüfung des Felds "figures" eines Events
export function checkFigures(ev, data, err) {
  if (ev.figures === undefined) return;
  const w = "Event " + ev.id;
  if (!Array.isArray(ev.figures) || !ev.figures.length) { err(w, "figures muss eine Liste sein"); return; }
  ev.figures.forEach(f => {
    if (!isFigure(f.figure, data.monsters)) { err(w, "unbekannte Figur " + f.figure); return; }
    const m = /^(near|around|above):(\w+)$/.exec(f.place || "");
    if (f.place !== undefined && !PLACES.includes(f.place) && !m) err(w, f.figure + ": unbekannte Platzierung " + f.place);
    if (f.count !== undefined && !(Number.isInteger(f.count) && f.count > 0)) err(w, f.figure + ": count muss eine positive Zahl sein");
    if (f.variant !== undefined && !figureInfo(f.figure).variants.includes(f.variant)) err(w, f.figure + ": unbekannte Variante " + f.variant);
    if (f.stay !== undefined && typeof f.stay !== "boolean") err(w, f.figure + ": stay muss true oder false sein");
  });
}

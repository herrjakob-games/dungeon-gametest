// Figuren im Raum (docs/GDD.md: „Gegner im Raum“, „Figuren in Events“, Figurenliste). Reine Logik, testbar.
// Hier steht, wo eine Figur stehen darf. Gebaut werden die Figuren in monsterFigures.js, bewegt in roomFigures.js.
import { N, MID, key, inBounds } from "./config.js";
import { PLACES, reachable, doorTiles, STAIRS_FOOT, stepOpen } from "./decor.js";
import { findPath } from "./pathfinding.js";

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
 * list: Feld "figures" ({ figure, place, count, variant, stay }) oder Inszenierung aus staging.js (zusätzlich anchor)
 * ctx: { placements (Einrichtung aus planDecor, sonst []), blocked (Set "x,z"), edges (gesperrte Kanten), doors, player [x,z],
 *        occupied (Set "x,z" weiterer Figuren), rand,
 *        anchors (Anker aus data/staging.json), canPose(figure, variant, anim) (hat das Modell die Animation?),
 *        stairsDown (true, wenn im Raum eine Treppe nach unten steht),
 *        awayFrom [x, z] und awayDist: Figuren ohne Anker stehen mindestens awayDist Kacheln davon entfernt (Begegnungen) }
 * Ergebnis: [{ figure, variant, tiles, cx, cz, y, rot, stay, blocks, onProp, anim, seat }]
 * anim "flat": die Figur hat keine Liege-Animation und liegt starr auf dem Rücken (Anker mit flat).
 * Passt eine Figur nirgends hin, fehlt sie im Ergebnis. Fehlt der Anker oder die Animation, steht die Figur
 * mit idle auf einer freien Kachel daneben (nie in Wänden, Türen oder auf Requisiten).
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
    if (ctx.awayFrom && tiles.some(([tx, tz]) => Math.max(Math.abs(tx - ctx.awayFrom[0]), Math.abs(tz - ctx.awayFrom[1])) < ctx.awayDist)) return null;
    if (info.blocks) {
      const test = new Set(blocked);
      tiles.forEach(t => test.add(key(...t)));
      if (!reachable(test, ctx.doors, [], ctx.player ? [ctx.player] : [], ctx.edges)) return null;
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

  // Anker: Kandidaten an den passenden Requisiten (Sitz, Kachel mit Versatz, auf dem Requisit), sonst null
  const seatsUsed = new Set();
  function atAnchor(f, info) {
    const a = (ctx.anchors || {})[f.anchor];
    if (!a) return null;
    const pose = a.animation || "idle";
    const can = !ctx.canPose || ctx.canPose(f.figure, f.variant, pose);
    const targets = shuffle(placements.filter(p => a.props.includes(p.prop)));
    if (a.props.includes("treppe_runter") && ctx.stairsDown) targets.push({ prop: "treppe_runter", tiles: [STAIRS_FOOT], cx: STAIRS_FOOT[0], cz: STAIRS_FOOT[1], rot: 0, foot: true });
    const off = a.offset || [0, 0, 0];
    const lookAt = (t) => {
      if (a.face === "random") return R() * Math.PI * 2;
      if (a.face === "forward") return t.rot || 0; // Blick wie das Requisit (sitzt auf dem Thron, Blick in den Raum)
      let p = ctx.player || [MID, MID];
      if (a.face === "prop") p = [t.cx, t.cz];
      if (a.face === "target") { const tt = t.target && placements.find(q => q.prop === t.target); p = tt ? [tt.cx, tt.cz] : [t.cx, t.cz]; }
      return p;
    };
    const result = (tiles, cx, cz, y, t, extra) => {
      const look = lookAt(t);
      const rot = typeof look === "number" ? look : Math.atan2(look[0] - cx, look[1] - cz);
      return Object.assign({ figure: f.figure, variant: f.variant || null, tiles, cx, cz, y, rot, stay: !!f.stay,
        blocks: info.blocks, onProp: false, anim: can ? pose : (a.flat ? "flat" : "idle"), seat: false }, extra);
    };
    for (const t of targets) {
      // world: Versatz ohne Drehung des Requisits (etwa der Brunnenrand auf der Seite zur Kamera)
      const r = a.world ? 0 : (t.rot || 0), c = Math.cos(r), sn = Math.sin(r);
      // Auf dem Requisit (Monsterratte auf dem Käseberg, Kröte auf dem Brunnenrand): belegt keine Bodenkachel
      if (a.onProp) return result([], t.cx + off[0] * c + off[2] * sn, t.cz - off[0] * sn + off[2] * c, off[1], t, { blocks: false, onProp: true });
      // Sitzen auf Hocker oder Stuhl: die Figur steht auf der Kachel des Sitzes, die das Requisit schon belegt
      if (a.seat && can && info.size === 1 && t.tiles.length === 1) {
        const k = key(...t.tiles[0]);
        if (seatsUsed.has(k) || used.has(k)) continue;
        seatsUsed.add(k);
        used.add(k);
        return result([t.tiles[0]], t.tiles[0][0], t.tiles[0][1], 0, t, { blocks: false, seat: true });
      }
      // Kachel mit Versatz, gedreht wie das Requisit; sonst eine freie Kachel direkt daneben
      const first = t.foot ? t.tiles[0] : [Math.round(t.cx + off[0] * c + off[2] * sn), Math.round(t.cz - off[0] * sn + off[2] * c)];
      const own = new Set(t.tiles.map(q => key(...q)));
      const near = [first];
      t.tiles.forEach(([x, z]) => N8.forEach(([dx, dz]) => { if (!own.has(key(x + dx, z + dz))) near.push([x + dx, z + dz]); }));
      // front: zuerst die Seite zur Kamera (größeres x + z), damit das Requisit die Figur nicht verdeckt
      if (a.front) near.sort((p, q) => (q[0] + q[1]) - (p[0] + p[1]));
      for (const [x, z] of near) {
        const tiles = fits(x, z, info);
        if (!tiles) continue;
        const [cx, cz] = centerOf(tiles);
        // Sitz ohne Sitz-Animation: stehend neben dem Anker
        const extra = a.seat ? { anim: "idle" } : {};
        return result(tiles, cx, cz, 0, t, extra);
      }
    }
    return null;
  }

  for (const f of list || []) {
    const info = figureInfo(f.figure);
    for (let i = 0; i < (f.count || 1); i++) {
      if (f.anchor) {
        const r = atAnchor(f, info);
        if (r) {
          r.tiles.forEach(t => { used.add(key(...t)); if (r.blocks) blocked.add(key(...t)); });
          out.push(r);
          continue;
        }
      }
      const s = spots(f.place);
      if (s.above) {
        // Auf einem Requisit (etwa die Monsterratte auf dem Käseberg): belegt keine Bodenkachel
        out.push({ figure: f.figure, variant: f.variant || null, tiles: [], cx: s.above.cx, cz: s.above.cz, y: 0.9,
          rot: s.above.rot, stay: !!f.stay, blocks: false, onProp: true, anim: "idle", seat: false });
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
        rot: Math.atan2(look[0] - cx, look[1] - cz), stay: !!f.stay, blocks: info.blocks, onProp: false, anim: "idle", seat: false });
    }
  }
  return out;
}

/**
 * Prozession (Inszenierung "procession"): Rundweg eine Kachel vor den Wänden (2|2, 8|2, 8|8, 2|8), um Hindernisse herum.
 * blocked: belegte Kacheln, edges: gesperrte Kanten. Ergebnis: geschlossene Liste von Kacheln [[x, z], …] (ohne
 * Wiederholung des Starts) oder null, wenn es keinen Rundweg gibt.
 */
export function processionRoute(blocked, edges) {
  const free = (x, z) => inBounds(x, z) && !blocked.has(key(x, z));
  const nearestFree = ([x, z]) => {
    for (let r = 0; r <= 2; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (free(x + dx, z + dz)) return [x + dx, z + dz];
    return null;
  };
  const corners = [[1, 1], [N - 2, 1], [N - 2, N - 2], [1, N - 2]].map(nearestFree);
  if (corners.some(c => !c)) return null;
  const route = [];
  for (let i = 0; i < 4; i++) {
    const p = findPath(...corners[i], ...corners[(i + 1) % 4], free, edges);
    if (!p) return null;
    route.push(...p.slice(0, -1));
  }
  return route.length >= 8 ? route : null;
}

/**
 * Wo steht der Gegner im Kampf? Neben der Spielfigur, im Bossraum in der Raummitte.
 * ctx: { blocked, doors, player, boss (true im Bossraum), occupied, edges (Zellwände: nicht durch eine Wand hindurch) }
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
      if (ctx.edges && ctx.edges.size && !stepOpen(ctx.edges, p[0], p[1], p[0] + dx, p[1] + dz)) continue;
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

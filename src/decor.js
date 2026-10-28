// Einrichtung pro Raumtyp als Daten (docs/GDD.md, Abschnitt „Einrichtung pro Raumtyp“). Reine Logik, testbar.
// planDecor() legt fest, welches Requisit auf welchen Kacheln steht. Gebaut wird es in roomBuilder.js.
// Feste Regeln: Türkacheln und die Kachel davor bleiben frei, jede Tür und jedes anklickbare Objekt bleibt
// erreichbar. Passt ein Requisit nicht, wird es weggelassen.
import { N, MID, DIR, DIRKEYS, key, inBounds } from "./config.js";
import { mulberry32 } from "./rng.js";

/**
 * Requisiten: Größe in Kacheln (w entlang x, d entlang z, ungedreht), blockiert, anklickbar, eigenes Licht.
 * floor: false = hängt an der Wand oder in der Luft und belegt keine Bodenkachel.
 */
export const PROPS = {
  saeule: { w: 1, d: 1, blocks: true },
  saeule_liegend: { w: 2, d: 1, blocks: true },
  fass: { w: 1, d: 1, blocks: true },
  kiste: { w: 1, d: 1, blocks: true },
  sack: { w: 1, d: 1, blocks: false },
  regal: { w: 2, d: 1, blocks: true, wall: true },
  herd: { w: 2, d: 1, blocks: true, wall: true, light: true },
  tisch: { w: 3, d: 1, blocks: true },
  hocker: { w: 1, d: 1, blocks: true },
  tafel: { w: 5, d: 1, blocks: true },
  stuhl: { w: 1, d: 1, blocks: true },
  kronleuchter: { w: 0, d: 0, blocks: false, floor: false, light: true },
  anrichte: { w: 2, d: 1, blocks: true, wall: true },
  waffenstaender: { w: 2, d: 1, blocks: false, wall: true, floor: false },
  brunnen: { w: 1, d: 1, blocks: true },
  moos: { w: 1, d: 1, blocks: false },
  pfuetze: { w: 1, d: 1, blocks: false },
  sarkophag: { w: 1, d: 2, blocks: true },
  kerzen: { w: 1, d: 1, blocks: false, light: true },
  knochen: { w: 1, d: 1, blocks: false },
  geroell: { w: 1, d: 1, blocks: false },
  goldhaufen: { w: 1, d: 1, blocks: false },
  truhe: { w: 1, d: 1, blocks: true, click: true },
  lagerfeuer: { w: 1, d: 1, blocks: true, click: true, light: true },
  haendlerfigur: { w: 1, d: 1, blocks: true, click: true },
  pult: { w: 1, d: 1, blocks: true },
  wegweiser: { w: 1, d: 1, blocks: true },
  zettelbrett: { w: 1, d: 1, blocks: false, wall: true, floor: false },
  bank: { w: 2, d: 1, blocks: true },
  souvenirkiste: { w: 1, d: 1, blocks: true },
  kaeseberg: { w: 2, d: 2, blocks: true, wall: true, light: true }
};

// Abwandlungen, die es pro Requisit gibt
export const VARIANTS = {
  tisch: ["kueche"], fass: ["gruppe", "gross"], stuhl: ["umgekippt"], kiste: ["angenagt"], saeule: ["reihen"]
};

export const PLACES = ["center", "wall-back", "corner", "free"];
// Reihenfolge der Ersatz-Platzierungen beim Korrigieren (GDD: center → corner → wall-back → free)
export const CHAIN = ["center", "corner", "wall-back", "free"];

// Wendeltreppe in der Nordwest-Ecke: 3×3 Kacheln, im GDD 1|1 bis 3|3 (gezählt ab 0: 0 bis 2)
export const STAIRS_SIZE = 3;
export const STAIRS_TILES = [];
for (let z = 0; z < STAIRS_SIZE; z++) for (let x = 0; x < STAIRS_SIZE; x++) STAIRS_TILES.push([x, z]);
// Mittelpunkt der Treppe (in Kacheln) und Fuß der Treppe nach oben: Startkachel 4|4 (gezählt ab 0: 3,3)
export const STAIRS_CENTER = [(STAIRS_SIZE - 1) / 2, (STAIRS_SIZE - 1) / 2];
export const STAIRS_FOOT = [STAIRS_SIZE, STAIRS_SIZE];

/**
 * Was der Code in der Nordwest-Ecke setzt:
 * "up" Treppe nach oben (Vorkammer), "down" Treppe nach unten (Abstieg, Bossraum nach dem Sieg),
 * "arena" freie Nordwest-Ecke im Bossraum, bis der Boss besiegt ist; sonst null.
 */
export function centerFeature(typeId, bossDefeated) {
  if (typeId === "start") return "up";
  if (typeId === "exit") return "down";
  if (typeId === "boss") return bossDefeated ? "down" : "arena";
  return null;
}

// Einrichtung eines Raumtyps im Thema: themeDecor ersetzt decor; ohne beides null (altes Muster aus dem Code)
export const decorFor = (roomType, themeId) => ((roomType.themeDecor || {})[themeId]) || roomType.decor || null;

// Türkacheln und die Kachel davor
export function doorTiles(doors) {
  const out = [];
  DIRKEYS.forEach(d => {
    if (!(doors & DIR[d].bit)) return;
    const [x, z] = DIR[d].approach;
    out.push([x, z], [x - DIR[d].dx, z - DIR[d].dz]);
  });
  return out;
}

const rect = (x0, z0, w, d) => {
  const t = [];
  for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) t.push([x, z]);
  return t;
};
const centerOf = (tiles) => [
  tiles.reduce((s, t) => s + t[0], 0) / tiles.length,
  tiles.reduce((s, t) => s + t[1], 0) / tiles.length
];

/**
 * Prüft, ob alle Türen, die Startkachel und jedes anklickbare Objekt von einer Tür aus erreichbar sind.
 * blocked: Set "x,z"; doors: Bitmaske; clickables: Liste von Kachellisten; extra: Kacheln, die erreichbar sein müssen.
 * Erreichbar ist ein Objekt, wenn eine freie Nachbarkachel (auch schräg) erreichbar ist (wie movement.js).
 */
export function reachable(blocked, doors, clickables, extra) {
  const free = (x, z) => inBounds(x, z) && !blocked.has(key(x, z));
  let targets = DIRKEYS.filter(d => doors & DIR[d].bit).map(d => DIR[d].approach).concat(extra || []);
  if (!targets.length) {
    // Raum ohne Tür (nur in Tests): die anklickbaren Objekte müssen untereinander erreichbar sein
    const start = clickables.length && clickables[0].flatMap(([x, z]) => [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]).find(t => free(...t));
    if (!clickables.length) return true;
    if (!start) return false;
    targets = [start];
  }
  if (!targets.every(t => free(t[0], t[1]))) return false;
  const seen = new Set([key(...targets[0])]);
  const queue = [targets[0]];
  while (queue.length) {
    const [x, z] = queue.shift();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => {
      const nx = x + dx, nz = z + dz, k = key(nx, nz);
      if (free(nx, nz) && !seen.has(k)) { seen.add(k); queue.push([nx, nz]); }
    });
  }
  if (!targets.every(t => seen.has(key(...t)))) return false;
  return clickables.every(tiles => tiles.some(([x, z]) => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (seen.has(key(x + dx, z + dz))) return true;
    return false;
  }));
}

/**
 * Plant die Einrichtung eines Raums.
 * spec: decor-Eintrag ({ torchColor, layouts: [{ id, props: [{ prop, place, count, variant, required }] }] })
 * opts: { seed, doors (Bitmaske), feature (centerFeature), layoutIndex (nur für Tests) }
 * Pflichtstücke (required) kommen zuerst. Passt ein Requisit nicht, gilt der Korrekturablauf aus dem GDD:
 * andere Kachel derselben Platzierung, dann die nächste Platzierung in CHAIN, dann eine kleinere Anzahl, dann weglassen.
 * Ergebnis: { layout, placements: [{ prop, variant, tiles, cx, cz, rot, wall, target, place }], corrected: [{ prop, variant,
 *            from, to }], dropped: [{ prop, variant }], missingRequired: [{ prop, variant }], blocked (Set), torchColor }
 */
export function planDecor(spec, opts) {
  const R = mulberry32((opts.seed ^ 0x5bd1e995) >>> 0);
  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const idx = opts.layoutIndex !== undefined ? opts.layoutIndex : Math.floor(R() * spec.layouts.length);
  const layout = spec.layouts[idx];
  const doors = opts.doors, feature = opts.feature || null;

  const reserved = new Set(doorTiles(doors).map(t => key(...t)));
  const blocked = new Set(), occupied = new Set(), wallSlots = new Set();
  const clickables = [], extra = [];
  if (feature) STAIRS_TILES.forEach(t => { reserved.add(key(...t)); blocked.add(key(...t)); });
  if (feature === "up") { reserved.add(key(...STAIRS_FOOT)); extra.push(STAIRS_FOOT); }
  if (feature === "down" || feature === "arena") clickables.push(STAIRS_TILES); // die Treppe nach unten muss erreichbar sein

  const placements = [], dropped = [], corrected = [], missingRequired = [];

  // Form eines Requisits: Rechteck (o = "h" ungedreht, "v" um 90° gedreht) oder Fass-Gruppe in L-Form
  const shape = (p, variant, x0, z0, o, sx, sz) => {
    if (p === "fass" && variant === "gruppe") return [[x0, z0], [x0 + sx, z0], [x0, z0 + sz]];
    const def = PROPS[p];
    return o === "v" ? rect(x0, z0, def.d, def.w) : rect(x0, z0, def.w, def.d);
  };
  const dims = (p, o) => (o === "v" ? [PROPS[p].d, PROPS[p].w] : [PROPS[p].w, PROPS[p].d]);

  // Kandidaten: { tiles, rot, wall, corner }
  function candidates(item, used) {
    const p = item.prop, v = item.variant, out = [];
    const L = p === "fass" && v === "gruppe";
    const place = item.place;
    if (place === "center") {
      ["h", "v"].forEach(o => {
        const [w, d] = L ? [1, 1] : dims(p, o);
        for (let z0 = 0; z0 < N; z0++) for (let x0 = 0; x0 < N; x0++) {
          const c = [x0 + (w - 1) / 2, z0 + (d - 1) / 2];
          const dist = Math.hypot(c[0] - MID, c[1] - MID);
          if (dist > 1.6) continue;
          out.push({ tiles: shape(p, v, x0, z0, o, 1, 1), rot: o === "v" ? Math.PI / 2 : 0, dist: dist + R() * 0.01 });
        }
      });
      return out.sort((a, b) => a.dist - b.dist);
    }
    if (place === "wall-back") {
      // Nordwand: Vorderseite zeigt nach Süden; Westwand: Vorderseite zeigt nach Osten
      for (let x0 = 0; x0 < N; x0++) out.push({ tiles: shape(p, v, x0, 0, "h", 1, 1), rot: 0, wall: "N" });
      for (let z0 = 0; z0 < N; z0++) out.push({ tiles: shape(p, v, 0, z0, "v", 1, 1), rot: Math.PI / 2, wall: "W" });
      return shuffle(out);
    }
    if (place === "corner") {
      shuffle([[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]]).forEach(([cx, cz]) => {
        if (used.has(key(cx, cz))) return;
        const sx = cx === 0 ? 1 : -1, sz = cz === 0 ? 1 : -1;
        shuffle(["h", "v"]).forEach(o => {
          if (L) { out.push({ tiles: shape(p, v, cx, cz, o, sx, sz), rot: 0, corner: key(cx, cz) }); return; }
          const [w, d] = dims(p, o);
          const x0 = cx === 0 ? 0 : N - w, z0 = cz === 0 ? 0 : N - d;
          out.push({ tiles: shape(p, v, x0, z0, o), rot: (o === "v" ? Math.PI / 2 : 0), corner: key(cx, cz) });
        });
      });
      return out;
    }
    if (place === "free") {
      for (let z0 = 0; z0 < N; z0++) for (let x0 = 0; x0 < N; x0++) {
        if (L) { out.push({ tiles: shape(p, v, x0, z0, "h", R() < 0.5 ? 1 : -1, R() < 0.5 ? 1 : -1), rot: 0 }); continue; }
        ["h", "v"].forEach(o => out.push({ tiles: shape(p, v, x0, z0, o), rot: (o === "v" ? Math.PI / 2 : 0) + (R() < 0.5 ? 0 : Math.PI) }));
      }
      return shuffle(out);
    }
    const m = /^(around|above):(\w+)$/.exec(place || "");
    if (m) {
      const targets = placements.filter(t => t.prop === m[2]);
      if (m[1] === "above") return targets.map(t => ({ tiles: [], rot: t.rot, at: [t.cx, t.cz], target: m[2] }));
      targets.forEach(t => {
        const own = new Set(t.tiles.map(x => key(...x)));
        const seenN = new Set();
        t.tiles.forEach(([x, z]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => {
          const nx = x + dx, nz = z + dz, k = key(nx, nz);
          if (own.has(k) || seenN.has(k)) return;
          seenN.add(k);
          // Gesicht zum Ziel
          out.push({ tiles: shape(p, v, nx, nz, "h", 1, 1), rot: Math.atan2(t.cx - nx, t.cz - nz), target: m[2] });
        }));
      });
      return shuffle(out);
    }
    return out;
  }

  function fits(item, c) {
    const def = PROPS[item.prop];
    if (!c.tiles.every(([x, z]) => inBounds(x, z))) return false;
    if (def.floor === false) {
      if (c.at) return true; // hängt über einem anderen Requisit
      // Wandschmuck: Wandplatz frei und nicht über einer Tür
      return c.tiles.every(t => !wallSlots.has(c.wall + key(...t)) && !reserved.has(key(...t)));
    }
    if (c.tiles.some(t => reserved.has(key(...t)) || occupied.has(key(...t)))) return false;
    if (c.wall && c.tiles.some(t => wallSlots.has(c.wall + key(...t)))) return false;
    if (!def.blocks) return true;
    const test = new Set(blocked);
    c.tiles.forEach(t => test.add(key(...t)));
    return reachable(test, doors, def.click ? clickables.concat([c.tiles]) : clickables, extra);
  }

  function put(item, c) {
    const def = PROPS[item.prop];
    if (def.floor !== false) c.tiles.forEach(t => { occupied.add(key(...t)); if (def.blocks) blocked.add(key(...t)); });
    if (c.wall) c.tiles.forEach(t => wallSlots.add(c.wall + key(...t)));
    if (def.click) clickables.push(c.tiles);
    const [cx, cz] = c.at || centerOf(c.tiles);
    placements.push({ prop: item.prop, variant: item.variant || null, tiles: c.tiles, cx, cz, rot: c.rot, wall: c.wall || null,
      target: c.target || null, place: item.place });
  }

  // Säulen in zwei Reihen (Variante "reihen"): feste Plätze, wie in der bisherigen Säulenhalle
  function rows(item) {
    const count = item.count || 8;
    const along = [1, N - 2, 3, N - 4, 0, N - 1, 2, N - 3].filter(a => a !== MID); // nie in der Türspalte
    const perRow = Math.ceil(count / 2);
    const lines = [2, N - 3]; // zwei Reihen, je zwei Kacheln von der Wand
    const vertical = R() < 0.5;
    let left = count;
    for (const line of lines) {
      for (const a of along.slice(0, perRow)) {
        if (!left) break;
        left--;
        const [x, z] = vertical ? [line, a] : [a, line];
        const c = { tiles: [[x, z]], rot: 0 };
        if (fits(item, c)) put(item, c); else dropped.push({ prop: item.prop, variant: item.variant || null });
      }
    }
  }

  const tag = (item) => ({ prop: item.prop, variant: item.variant || null });
  // Pflichtstücke zuerst, sonst die Reihenfolge der Daten
  const order = layout.props.filter(p => p.required).concat(layout.props.filter(p => !p.required));
  for (const item of order) {
    if (!PROPS[item.prop]) { dropped.push(tag(item)); continue; }
    if (item.prop === "saeule" && item.variant === "reihen") { rows(item); continue; }
    // Korrekturablauf: erst die eigene Platzierung, dann die folgenden aus CHAIN (Wandschmuck, around und above nicht)
    const fixed = !PLACES.includes(item.place) || PROPS[item.prop].floor === false;
    const tries = fixed ? [item.place] : CHAIN.slice(Math.max(0, CHAIN.indexOf(item.place)));
    const used = new Set();
    for (let i = 0; i < (item.count || 1); i++) {
      let c = null, place = null;
      for (const pl of tries) {
        c = candidates(Object.assign({}, item, { place: pl }), used).find(cand => fits(item, cand));
        if (c) { place = pl; break; }
      }
      if (!c) { (item.required ? missingRequired : dropped).push(tag(item)); continue; }
      if (c.corner) used.add(c.corner);
      if (place !== item.place) corrected.push(Object.assign(tag(item), { from: item.place, to: place }));
      put(item, c);
    }
  }
  return { layout: layout.id, placements, corrected, dropped, missingRequired, blocked, torchColor: spec.torchColor || null, clickables, extra };
}

// Datenprüfung der Einrichtung (für validateData)
export function checkDecor(spec, where, err) {
  if (!spec || !Array.isArray(spec.layouts) || !spec.layouts.length) { err(where, "decor braucht mindestens eine Variante in layouts"); return; }
  if (spec.torchColor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(spec.torchColor)) err(where, "torchColor muss eine Farbe wie #ff8a30 sein");
  const ids = new Set();
  spec.layouts.forEach((l, i) => {
    const w = where + " Variante " + (l.id || i + 1);
    if (!l.id) err(w, "id fehlt");
    if (ids.has(l.id)) err(w, "doppelte id");
    ids.add(l.id);
    const before = new Set();
    (l.props || []).forEach(p => {
      if (!PROPS[p.prop]) err(w, "unbekanntes Requisit " + p.prop);
      const m = /^(around|above):(\w+)$/.exec(p.place || "");
      if (!PLACES.includes(p.place) && !m) err(w, p.prop + ": unbekannte Platzierung " + p.place);
      if (m && !before.has(m[2])) err(w, p.prop + ": " + m[2] + " muss vorher in der Liste stehen");
      if (m && m[1] === "above" && p.prop !== "kronleuchter") err(w, p.prop + ": above passt nur für hängende Requisiten");
      if (p.count !== undefined && !(Number.isInteger(p.count) && p.count > 0)) err(w, p.prop + ": count muss eine positive Zahl sein");
      if (p.required !== undefined && typeof p.required !== "boolean") err(w, p.prop + ": required muss true oder false sein");
      if (p.required && m) err(w, p.prop + ": ein Pflichtstück braucht eine eigene Platzierung, nicht " + m[1] + ":");
      if (p.variant !== undefined && !(VARIANTS[p.prop] || []).includes(p.variant)) err(w, p.prop + ": unbekannte Variante " + p.variant);
      if (PROPS[p.prop] && PROPS[p.prop].wall && PROPS[p.prop].floor === false && p.place !== "wall-back") err(w, p.prop + " hängt an der Wand und braucht wall-back");
      before.add(p.prop);
    });
  });
}

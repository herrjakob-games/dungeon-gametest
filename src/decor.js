// Einrichtung pro Raumtyp als Daten (docs/GDD.md, Abschnitt „Einrichtung pro Raumtyp“). Reine Logik, testbar.
// planDecor() legt fest, welches Requisit auf welchen Kacheln steht. Gebaut wird es in roomBuilder.js.
// Feste Regeln: Türkacheln und die Kachel davor bleiben frei, jede Tür und jedes anklickbare Objekt bleibt
// erreichbar. Passt ein Requisit nicht, wird es weggelassen.
import { N, MID, DIR, DIRKEYS, key, inBounds } from "./config.js";
import { mulberry32 } from "./rng.js";

/**
 * Requisiten: Größe in Kacheln (w entlang x, d entlang z, ungedreht), blockiert, anklickbar, eigenes Licht.
 * floor: false = hängt an der Wand oder in der Luft und belegt keine Bodenkachel.
 * wallGap: so viele Kacheln Abstand zur Wand (Sarkophage).
 * spread: gleicher Typ (Requisit und Variante) steht nicht noch einmal im Umkreis von so vielen Kacheln (Münzstapel).
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
  sarkophag: { w: 1, d: 2, blocks: true, spread: 1, wallGap: 1 },
  kerzen: { w: 1, d: 1, blocks: false, light: true },
  knochen: { w: 1, d: 1, blocks: false },
  geroell: { w: 1, d: 1, blocks: false },
  goldhaufen: { w: 1, d: 1, blocks: false, spread: 2 },
  truhe: { w: 1, d: 1, blocks: true, click: true },
  lagerfeuer: { w: 1, d: 1, blocks: true, click: true, light: true },
  // Händler: Regal an der Wand, davor der Händler, vor ihm sein Tisch mit Kerze; inset: nicht in der ersten oder letzten Reihe
  haendlerfigur: { w: 1, d: 3, blocks: true, click: true, wall: true, light: true, inset: true },
  pult: { w: 1, d: 1, blocks: true },
  wegweiser: { w: 1, d: 1, blocks: true },
  zettelbrett: { w: 1, d: 1, blocks: false, wall: true, floor: false },
  bank: { w: 2, d: 1, blocks: true },
  souvenirkiste: { w: 1, d: 1, blocks: true },
  kaeseberg: { w: 2, d: 2, blocks: true, wall: true, light: true },
  kistenstapel: { w: 2, d: 2, blocks: true },
  fassstapel: { w: 1, d: 1, blocks: true },
  flaschen: { w: 1, d: 1, blocks: false },
  fahne: { w: 1, d: 1, blocks: false, wall: true, floor: false },
  fahne_dreifach: { w: 2, d: 1, blocks: false, wall: true, floor: false },
  schluesselbund: { w: 1, d: 1, blocks: false, wall: true, floor: false },
  strohlager: { w: 1, d: 2, blocks: true },
  kerze_duenn: { w: 1, d: 1, blocks: false },
  zapffass: { w: 1, d: 1, blocks: true },
  zapffass_verziert: { w: 2, d: 1, blocks: true },
  kistenberg: { w: 1, d: 1, blocks: true },
  muenzen: { w: 1, d: 1, blocks: false, spread: 2 },
  saeule_verziert: { w: 1, d: 1, blocks: true },
  geroell_gross: { w: 2, d: 1, blocks: true },
  regal_gross: { w: 1, d: 1, blocks: false, wall: true, floor: false },
  regal_klein: { w: 1, d: 1, blocks: false, wall: true, floor: false },
  regal_kerzen: { w: 1, d: 1, blocks: false, wall: true, floor: false },
  wandregal: { w: 2, d: 1, blocks: true, wall: true }
};

// Abwandlungen, die es pro Requisit gibt
export const VARIANTS = {
  tisch: ["kueche"], fass: ["gruppe", "gross"], stuhl: ["umgekippt"], kiste: ["angenagt", "flaschen"], saeule: ["reihen"],
  flaschen: ["b"], fahne: ["blau", "gruen", "gelb", "wappen"], fahne_dreifach: ["blau", "gelb"], muenzen: ["klein", "einzeln"], kerze_duenn: ["an"]
};

/**
 * Fackeln an den hohen Wänden (Stilguide: neben jeder Tür eine, Wände ohne Tür zwei): Kachel entlang Nord- und Westwand.
 * Ergebnis: [{ wall: "N" | "W", t }]. Die vorderen Fackeln (Süd, Ost) sind wie die vorderen Wände ausgeblendet (nur ihr Licht
 * bleibt) und betreffen keine Wandrequisiten. torchCount in der Einrichtung begrenzt die Wandfackeln (Auswahl nach seed).
 * feature (centerFeature): in der Vorkammer ("up") hängt keine Fackel hinter oder neben der Treppe, also nicht auf den
 * Wandkacheln 1 bis 4 von Nord- und Westwand; die Fackel dort fällt weg.
 */
export function torchSlots(doors, spec, seed, feature) {
  let out = [];
  if (pillarTorches(spec)) return out; // Fackeln an den Säulen statt an den Wänden (Schatzkammer, Säulenhalle)
  ["N", "W"].forEach(w => ((doors & DIR[w].bit) ? [MID + 2] : [2, N - 3]).forEach(t => out.push({ wall: w, t })));
  if (feature === "up") out = out.filter(f => f.t > STAIRS_SIZE);
  if (spec && spec.torchCount !== undefined) {
    const R = mulberry32(((seed || 0) ^ 0x2c1b3c6d) >>> 0);
    const [lo, hi] = countRange(spec.torchCount);
    const n = lo + Math.floor(R() * (hi - lo + 1));
    out = out.map(f => [R(), f]).sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]);
  }
  return out;
}
// Nur mit torchCount: auch die (unsichtbaren) Lichter der vorderen Fackeln fallen weg, es zählen nur die Wandfackeln
export const frontTorchLights = (spec) => !(spec && spec.torchCount !== undefined);

// Einrichtung mit "torches": "saeulen": keine Fackeln an den Wänden, dafür an jeder Säule eine, die zur Raummitte zeigt
export const pillarTorches = (spec) => !!spec && spec.torches === "saeulen";

export const PLACES = ["center", "wall-back", "corner", "free"];
// Wandschmuck links und rechts jeder hinteren Tür (Nord, West), eine Kachel Abstand zum Türrahmen, überall dieselbe Variante
export const DOOR_SIDES = "door-sides";
// Truhen mit "mimics": true in der Einrichtung: eine Truhe ist echt (nach Raum-Seed), alle anderen sind Mimiken.
// Ergebnis: Liste mit true für jede Mimik, in der Reihenfolge der Truhen im Plan
export function mimicChests(spec, n, seed) {
  if (!spec || !spec.mimics || n < 2) return new Array(n).fill(false);
  const real = (seed >>> 0) % n;
  return Array.from({ length: n }, (_, i) => i !== real);
}

// Anzahl eines Requisits: Zahl oder Bereich [von, bis] (nach Seed)
export const countRange = (c) => (Array.isArray(c) ? c : [c || 1, c || 1]);

// Feste Kachel: "tile:x|y" wie im GDD (ab 1 gezählt), ohne Korrekturablauf
export const TILE_PLACE = /^tile:(\d+)\|(\d+)$/;
// Reihenfolge der Ersatz-Platzierungen beim Korrigieren (GDD: center → corner → wall-back → free)
export const CHAIN = ["center", "corner", "wall-back", "free"];

// Treppe in der Nordwest-Ecke: 3×3 Kacheln, im GDD 1|1 bis 3|3 (gezählt ab 0: 0 bis 2), läuft zur Nordwand
export const STAIRS_SIZE = 3;
export const STAIRS_TILES = [];
for (let z = 0; z < STAIRS_SIZE; z++) for (let x = 0; x < STAIRS_SIZE; x++) STAIRS_TILES.push([x, z]);
// Mittelpunkt der Treppe (in Kacheln) und Fuß der Treppe vor ihrer Südkante, mittig: Startkachel 2|4 (gezählt ab 0: 1,3).
// Auch die Treppe nach unten beginnt an der Südkante, ihr Fuß ist dieselbe Kachel.
export const STAIRS_CENTER = [(STAIRS_SIZE - 1) / 2, (STAIRS_SIZE - 1) / 2];
export const STAIRS_FOOT = [(STAIRS_SIZE - 1) / 2, STAIRS_SIZE];

/**
 * Was der Code in der Nordwest-Ecke setzt:
 * "up" Treppe nach oben (Vorkammer), "down" Treppe nach unten (Abstieg, Bossraum nach dem Sieg),
 * "arena" Nordwest-Ecke im Bossraum bis zum Sieg: Loch mit begehbarem Metallgitter; sonst null.
 */
export function centerFeature(typeId, bossDefeated) {
  if (typeId === "start") return "up";
  if (typeId === "exit") return "down";
  if (typeId === "boss") return bossDefeated ? "down" : "arena";
  return null;
}

// Bodenplatten (docs/GDD.md, Stilguide, Böden): Varianten mit Gewicht, nach Raum-Seed gemischt. Ohne Angabe nur boden.
export const DEFAULT_FLOOR = [{ tile: "boden", weight: 1 }];
// Reihenfolge: floorTiles der Einrichtung des Raumtyps (themeDecor vor decor), sonst des Themas, sonst DEFAULT_FLOOR
export const floorTilesFor = (spec, theme) => (spec && spec.floorTiles) || (theme && theme.floorTiles) || DEFAULT_FLOOR;
// Variante für eine Zufallszahl r (0 bis 1)
export function pickFloorTile(list, r) {
  const total = list.reduce((s, t) => s + t.weight, 0);
  let acc = 0;
  for (const t of list) { acc += t.weight; if (r * total < acc) return t.tile; }
  return list[list.length - 1].tile;
}
// Datenprüfung von floorTiles (Raumtyp oder Thema)
export function checkFloorTiles(list, where, err) {
  if (!Array.isArray(list) || !list.length) { err(where, "floorTiles muss eine Liste sein"); return; }
  list.forEach(t => {
    if (typeof t.tile !== "string" || !/^boden(_\w+)?$/.test(t.tile)) err(where, "floorTiles: " + t.tile + " ist keine Bodenvariante (boden oder boden_<name>)");
    if (!(t.weight > 0)) err(where, "floorTiles: Gewicht von " + t.tile + " muss größer als 0 sein");
  });
}

// Einrichtung eines Raumtyps im Thema: themeDecor ersetzt decor; ohne beides null (altes Muster aus dem Code)
// Varianten einer Einrichtung; Zellen ohne layouts haben eine leere Variante "zellen"
export const layoutsOf = (spec) => (spec.layouts && spec.layouts.length ? spec.layouts : [{ id: spec.cells ? "zellen" : "leer", props: [] }]);

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
 * blocked: Set "x,z"; doors: Bitmaske; clickables: Liste von Kachellisten; extra: Kacheln, die erreichbar sein müssen;
 * edges: gesperrte Kanten (Zellwände), die der Weg nicht kreuzen darf.
 * Erreichbar ist ein Objekt, wenn eine freie Nachbarkachel (auch schräg) erreichbar ist (wie movement.js).
 */
export function reachable(blocked, doors, clickables, extra, edges) {
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
      if (free(nx, nz) && !seen.has(k) && !(edges && edges.has(edgeKey(x, z, nx, nz)))) { seen.add(k); queue.push([nx, nz]); }
    });
  }
  if (!targets.every(t => seen.has(key(...t)))) return false;
  return clickables.every(tiles => tiles.some(([x, z]) => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (seen.has(key(x + dx, z + dz))) return true;
    return false;
  }));
}

// ---------- Zellen (Kerker der Katakomben, GDD „Einrichtung pro Raumtyp“, Zellen) ----------
// Zellwände stehen auf der Kante zwischen zwei Kacheln. Kanten heißen "x,z|x,z" (kleinere Kachel zuerst).
export const edgeKey = (ax, az, bx, bz) => (ax < bx || (ax === bx && az < bz) ? key(ax, az) + "|" + key(bx, bz) : key(bx, bz) + "|" + key(ax, az));

// Darf ein Schritt (auch schräg) von a nach b gehen? Schräg nur, wenn keine der vier Kanten um die Ecke gesperrt ist.
export function stepOpen(edges, ax, az, bx, bz) {
  if (ax === bx || az === bz) return !edges.has(edgeKey(ax, az, bx, bz));
  return !edges.has(edgeKey(ax, az, bx, az)) && !edges.has(edgeKey(ax, az, ax, bz)) &&
    !edges.has(edgeKey(bx, az, bx, bz)) && !edges.has(edgeKey(ax, bz, bx, bz));
}

// Drehung (Vielfaches von 90°) eines L-förmigen Eckteils, dessen Arme ungedreht nach -x und +z zeigen, so dass sie in
// die Richtungen a und b zeigen ([dx, dz]); Drehung um y wie in Three.js: x' = x cos + z sin, z' = -x sin + z cos
function cornerRot(a, b) {
  for (let k = 0; k < 4; k++) {
    const r = k * Math.PI / 2, c = Math.round(Math.cos(r)), sn = Math.round(Math.sin(r));
    const turn = ([x, z]) => [x * c + z * sn, -x * sn + z * c];
    const arms = [turn([-1, 0]), turn([0, 1])].map(v => v.join());
    if (arms.includes(a.join()) && arms.includes(b.join())) return r;
  }
  return 0;
}

/**
 * Eine Zellseite: läuft entlang axis ("x" oder "z") auf der Kachelkante at (etwa 2.5 zwischen Kachel 2 und 3) von a bis b
 * (Kachelkanten, b - a = Länge). Ergebnis: Kanten und die Kachelpaare quer zur Seite, nach Kachel entlang der Seite.
 */
function sideTiles(side) {
  const out = [];
  for (let t = side.a + 0.5; t < side.b; t++) {
    const lo = side.at - 0.5, hi = side.at + 0.5;
    out.push(side.axis === "x" ? { t, a: [t, lo], b: [t, hi] } : { t, a: [lo, t], b: [hi, t] });
  }
  return out;
}

// Teil auf einer Seite: Mittelpunkt in Kachelkoordinaten (Bruchteile erlaubt) und Drehung entlang der Seite
const onSide = (side, along, prop) => side.axis === "x"
  ? { prop, x: along, z: side.at, rot: 0 }
  : { prop, x: side.at, z: along, rot: Math.PI / 2 };

/**
 * Zellen nach Raum-Seed: Variante A (vier Eckzellen 3×3) oder B (große Zelle 5×5).
 * Ergebnis: { variant, cells: [{ tiles, inside (Kachel am Durchgang innen) }], pieces: [{ prop, x, z, rot }], edges (Set) }
 */
export function planCells(R) {
  const edges = new Set(), pieces = [], cells = [];
  const block = (side, open) => sideTiles(side).forEach(({ t, a, b }) => { if (t !== open) edges.add(edgeKey(...a, ...b)); });
  if (R() < 0.5) {
    // A: Seiten von der Außenwand (wall) bis zur Innenecke (corner); Torbogen laut GDD
    const L = -0.5, H = N - 0.5, i1 = 2.5, i2 = N - 3.5; // Raumkanten und Kanten der Eckzellen
    const defs = [
      { tiles: [0, 0], corner: [i1, i1], sides: [{ axis: "z", at: i1, wall: L, kind: "gitter" }, { axis: "x", at: i1, wall: L, kind: "tor" }] },
      { tiles: [N - 3, 0], corner: [i2, i1], sides: [{ axis: "z", at: i2, wall: L, kind: "gitter" }, { axis: "x", at: i1, wall: H, kind: "tor" }] },
      { tiles: [0, N - 3], corner: [i1, i2], sides: [{ axis: "x", at: i2, wall: L, kind: "gitter" }, { axis: "z", at: i1, wall: H, kind: "tor" }] },
      { tiles: [N - 3, N - 3], corner: [i2, i2], sides: [{ axis: "x", at: i2, wall: H, kind: "gitter" }, { axis: "z", at: i2, wall: H, kind: "tor" }] }
    ];
    defs.forEach(d => {
      const tiles = rect(d.tiles[0], d.tiles[1], 3, 3);
      let inside = null;
      const arms = [];
      d.sides.forEach(sd => {
        const end = sd.axis === "x" ? d.corner[0] : d.corner[1]; // Innenecke entlang der Seite
        const side = Object.assign({ a: Math.min(sd.wall, end), b: Math.max(sd.wall, end) }, sd);
        const dir = Math.sign(sd.wall - end); // von der Innenecke zur Außenwand
        const mid = (side.a + side.b) / 2;
        pieces.push(onSide(side, mid, sd.kind === "tor" ? "zelltor" : "zellgitter"));
        pieces.push(onSide(side, sd.wall - dir * 0.25, "wand_ecke")); // Endstück an der Außenwand
        arms.push(sd.axis === "x" ? [dir, 0] : [0, dir]);
        const open = sd.kind === "tor" ? mid : null;
        block(side, open);
        if (open !== null) {
          const pair = sideTiles(side).find(p => p.t === open);
          inside = [pair.a, pair.b].find(([x, z]) => tiles.some(t => t[0] === x && t[1] === z));
        }
      });
      pieces.push({ prop: "zellecke", x: d.corner[0], z: d.corner[1], rot: cornerRot(...arms) });
      cells.push({ tiles, inside });
    });
    return { variant: "A", cells, pieces, edges };
  }
  // B: große Zelle 3|3 bis 7|7; je Seite Gitter, Steinpfeiler, Gitter; an einer Seite fehlt der Pfeiler (Öffnung)
  const lo = 1.5, hi = N - 2.5, mid = MID;
  const sides = [
    { axis: "x", at: lo, a: lo, b: hi, inward: [0, 1] }, { axis: "z", at: hi, a: lo, b: hi, inward: [-1, 0] },
    { axis: "x", at: hi, a: lo, b: hi, inward: [0, -1] }, { axis: "z", at: lo, a: lo, b: hi, inward: [1, 0] }
  ];
  const openSide = Math.floor(R() * 4);
  const tiles = rect(2, 2, N - 4, N - 4);
  let inside = null;
  sides.forEach((side, i) => {
    pieces.push(onSide(side, side.a + 1, "zellgitter"), onSide(side, side.b - 1, "zellgitter"));
    if (i !== openSide) pieces.push(onSide(side, mid, "wand"));
    block(side, i === openSide ? mid : null);
    if (i === openSide) {
      const pair = sideTiles(side).find(p => p.t === mid);
      inside = [pair.a, pair.b].find(([x, z]) => x >= 2 && x <= N - 3 && z >= 2 && z <= N - 3);
    }
  });
  // Ecken: schmale Eckpfeiler schließen die Fuge zwischen zwei Gitterwänden
  [[lo, lo, [1, 0], [0, 1]], [hi, lo, [-1, 0], [0, 1]], [lo, hi, [1, 0], [0, -1]], [hi, hi, [-1, 0], [0, -1]]]
    .forEach(([x, z, a, b]) => pieces.push({ prop: "zellecke", x, z, rot: cornerRot(a, b) }));
  cells.push({ tiles, inside });
  return { variant: "B", cells, pieces, edges };
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
  // Zellen (cells): eigene Planung statt layouts, Einrichtung nur in den Zellen
  const layouts = layoutsOf(spec);
  const idx = opts.layoutIndex !== undefined ? opts.layoutIndex : Math.floor(R() * layouts.length);
  const layout = layouts[idx];
  const cellPlan = spec.cells ? planCells(R) : null;
  const edges = cellPlan ? cellPlan.edges : new Set();
  const doors = opts.doors, feature = opts.feature || null;

  const reserved = new Set(doorTiles(doors).map(t => key(...t)));
  const blocked = new Set(), occupied = new Set(), wallSlots = new Set();
  // Wandrequisiten (Regale, Fahnen, Herd …) verdecken keine Fackel: die Wandkachel einer Fackel bleibt für sie frei
  const torches = new Set(torchSlots(doors, spec, opts.seed, feature).map(f => f.wall + (f.wall === "N" ? key(f.t, 0) : key(0, f.t))));
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
      // inset: nicht direkt an der Querwand (etwa der Händler: Kacheln 2|2 bis 2|8 oder 2|2 bis 8|2)
      const lo = PROPS[p].inset ? 1 : 0, hi = PROPS[p].inset ? N - 1 : N;
      for (let x0 = lo; x0 < hi; x0++) out.push({ tiles: shape(p, v, x0, 0, "h", 1, 1), rot: 0, wall: "N" });
      for (let z0 = lo; z0 < hi; z0++) out.push({ tiles: shape(p, v, 0, z0, "v", 1, 1), rot: Math.PI / 2, wall: "W" });
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
    const ft = TILE_PLACE.exec(place || "");
    if (ft) return [{ tiles: shape(p, v, +ft[1] - 1, +ft[2] - 1, "h", 1, 1), rot: 0 }];
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

  // Gleicher Typ im Umkreis (Kacheln in jede Richtung, auch schräg)?
  function tooClose(item, tiles, r) {
    return placements.some(pl => pl.prop === item.prop && pl.variant === (item.variant || null) &&
      pl.tiles.some(([x, z]) => tiles.some(([tx, tz]) => Math.max(Math.abs(x - tx), Math.abs(z - tz)) <= r)));
  }

  // Abstand in Kacheln (auch schräg gezählt) zwischen zwei Kachellisten
  const gap = (a, b) => Math.min(...a.map(([x, z]) => Math.min(...b.map(([u, v]) => Math.max(Math.abs(x - u), Math.abs(z - v))))));
  const doorList = doorTiles(doors);
  const clearZones = []; // Freiräume um Requisiten mit "clear" (etwa das Lagerfeuer): dort liegt nichts anderes

  function fits(item, c) {
    const def = PROPS[item.prop];
    if (!c.tiles.every(([x, z]) => inBounds(x, z))) return false;
    if (def.floor !== false && c.tiles.length && clearZones.some(z => gap(c.tiles, z.tiles) <= z.r)) return false;
    if (item.clear && c.tiles.length && placements.some(p => PROPS[p.prop].floor !== false && p.tiles.length && gap(c.tiles, p.tiles) <= item.clear)) return false;
    if (item.doorGap && doorList.length && gap(c.tiles, doorList) <= item.doorGap) return false;
    if (def.wall && c.wall && c.tiles.some(t => torches.has(c.wall + key(...t)))) return false;
    if (def.spread && tooClose(item, c.tiles, def.spread)) return false;
    if (def.wallGap && !c.tiles.every(([x, z]) => x >= def.wallGap && z >= def.wallGap && x < N - def.wallGap && z < N - def.wallGap)) return false;
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
    return reachable(test, doors, def.click ? clickables.concat([c.tiles]) : clickables, extra, edges);
  }

  function put(item, c) {
    const def = PROPS[item.prop];
    if (item.clear) clearZones.push({ tiles: c.tiles, r: item.clear });
    if (def.floor !== false) c.tiles.forEach(t => { occupied.add(key(...t)); if (def.blocks) blocked.add(key(...t)); });
    if (c.wall) c.tiles.forEach(t => wallSlots.add(c.wall + key(...t)));
    if (def.click) clickables.push(c.tiles);
    const [cx, cz] = c.at || centerOf(c.tiles);
    placements.push({ prop: item.prop, variant: item.variant || null, tiles: c.tiles, cx, cz, rot: c.rot, wall: c.wall || null,
      target: c.target || null, place: item.place, face: c.face || null, clear: item.clear || 0 });
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
        const toMid = Math.sign(MID - line); // Seite zum Gang in der Raummitte
        const c = { tiles: [[x, z]], rot: 0, face: vertical ? [toMid, 0] : [0, toMid] };
        if (fits(item, c)) put(item, c); else dropped.push({ prop: item.prop, variant: item.variant || null });
      }
    }
  }

  // Wandschmuck neben den hinteren Türen (place "door-sides"): Türrahmen deckt MID-1 bis MID+1, eine Kachel Abstand
  function doorSides(item) {
    const vs = VARIANTS[item.prop] || [];
    const variant = item.variant || (vs.length ? vs[Math.floor(R() * vs.length)] : undefined);
    const one = Object.assign({}, item, { variant });
    ["N", "W"].filter(w => doors & DIR[w].bit).forEach(w => [MID - 2, MID + 2].forEach(t => {
      const c = w === "N" ? { tiles: [[t, 0]], rot: 0, wall: "N" } : { tiles: [[0, t]], rot: Math.PI / 2, wall: "W" };
      if (fits(one, c)) put(one, c); else dropped.push({ prop: item.prop, variant: variant || null });
    }));
  }

  const tag = (item) => ({ prop: item.prop, variant: item.variant || null });
  // Wandschmuck neben den Türen zuerst (feste Plätze), dann Pflichtstücke, sonst die Reihenfolge der Daten
  const sides = layout.props.filter(p => p.place === DOOR_SIDES), rest = layout.props.filter(p => p.place !== DOOR_SIDES);
  const order = sides.concat(rest.filter(p => p.required), rest.filter(p => !p.required));
  for (const item of order) {
    if (!PROPS[item.prop]) { dropped.push(tag(item)); continue; }
    if (item.prop === "saeule" && item.variant === "reihen") { rows(item); continue; }
    if (item.place === DOOR_SIDES) { doorSides(item); continue; }
    // Korrekturablauf: erst die eigene Platzierung, dann die folgenden aus CHAIN (Wandschmuck, around und above nicht)
    const fixed = !PLACES.includes(item.place) || PROPS[item.prop].floor === false;
    const tries = fixed ? [item.place] : CHAIN.slice(Math.max(0, CHAIN.indexOf(item.place)));
    const used = new Set();
    const [lo, hi] = countRange(item.count);
    const n = lo + Math.floor(R() * (hi - lo + 1));
    for (let i = 0; i < n; i++) {
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
  // Zelleinrichtung: je Zelle entweder ein Strohlager (eine Kachel Abstand zum Durchgang) oder Knochen, nie beides
  if (cellPlan) {
    cellPlan.cells.forEach(cell => {
      const inCell = (tiles) => tiles.every(([x, z]) => cell.tiles.some(t => t[0] === x && t[1] === z));
      const own = cell.tiles.filter(([x, z]) => !(cell.inside && x === cell.inside[0] && z === cell.inside[1]));
      if (R() < 0.5) {
        const item = { prop: "strohlager", place: "cell" };
        const cands = shuffle(own.flatMap(([x, z]) => ["h", "v"].map(o => ({ tiles: shape("strohlager", null, x, z, o), rot: (o === "v" ? Math.PI / 2 : 0) + (R() < 0.5 ? 0 : Math.PI) }))));
        const c = cands.find(cd => inCell(cd.tiles) && (!cell.inside || gap(cd.tiles, [cell.inside]) >= 2) && fits(item, cd));
        if (c) put(item, c); else dropped.push(tag(item));
      } else {
        const n = cell.tiles.length > 9 ? 2 + Math.floor(R() * 2) : 1; // Eckzelle: eine Gruppe, große Zelle: 2 bis 3
        const item = { prop: "knochen", place: "cell" };
        shuffle(own).slice(0, n).forEach(t => {
          const c = { tiles: [t], rot: R() * Math.PI * 2 };
          if (fits(item, c)) put(item, c); else dropped.push(tag(item));
        });
      }
    });
  }
  // Fackeln an Säulen: zur Raummitte (Säulen in Reihen: zum Gang in der Mitte); torchCount wählt, wie viele Säulen eine tragen
  let torchSpots = [];
  if (pillarTorches(spec)) {
    torchSpots = placements.filter(p => p.prop === "saeule").map(p => {
      const [dx, dz] = p.face || [MID - p.cx, MID - p.cz];
      const len = Math.hypot(dx, dz) || 1;
      return { cx: p.cx, cz: p.cz, dx: dx / len, dz: dz / len, rot: Math.atan2(dx, dz) };
    });
    if (spec.torchCount !== undefined) {
      const [lo, hi] = countRange(spec.torchCount);
      torchSpots = shuffle(torchSpots).slice(0, lo + Math.floor(R() * (hi - lo + 1)));
    }
  }
  return { layout: layout.id, placements, corrected, dropped, missingRequired, blocked, torchColor: spec.torchColor || null, torchSpots, clickables, extra,
    edges, cells: cellPlan };
}

// Datenprüfung der Einrichtung (für validateData)
export function checkDecor(spec, where, err) {
  if (spec && spec.cells !== undefined && spec.cells !== true) err(where, "cells muss true sein");
  if (spec && spec.cells && spec.layouts === undefined) return; // Zellen ohne weitere Einrichtung (Kerker der Katakomben)
  if (!spec || !Array.isArray(spec.layouts) || !spec.layouts.length) { err(where, "decor braucht mindestens eine Variante in layouts"); return; }
  if (spec.mimics !== undefined && typeof spec.mimics !== "boolean") err(where, "mimics muss true oder false sein");
  if (spec.torchFlame !== undefined && !/^#[0-9a-fA-F]{6}$/.test(spec.torchFlame)) err(where, "torchFlame muss eine Farbe wie #6f9bff sein");
  const okN = (c) => Number.isInteger(c) && c >= 0;
  if (spec.torchCount !== undefined && !(okN(spec.torchCount) || (Array.isArray(spec.torchCount) && spec.torchCount.length === 2 && spec.torchCount.every(okN))))
    err(where, "torchCount muss eine Zahl oder ein Bereich [von, bis] sein");
  if (spec.floorTiles !== undefined) checkFloorTiles(spec.floorTiles, where, err);
  if (spec.torches !== undefined && spec.torches !== "saeulen") err(where, "torches kennt nur \"saeulen\"");
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
      const ft = TILE_PLACE.exec(p.place || "");
      if (ft && !inBounds(+ft[1] - 1, +ft[2] - 1)) err(w, p.prop + ": Kachel " + p.place.slice(5) + " liegt außerhalb des Raums");
      if (p.place === DOOR_SIDES && !(PROPS[p.prop] && PROPS[p.prop].wall)) err(w, p.prop + ": door-sides passt nur für Wandrequisiten");
      if (!PLACES.includes(p.place) && !m && !ft && p.place !== DOOR_SIDES) err(w, p.prop + ": unbekannte Platzierung " + p.place);
      if (m && !before.has(m[2])) err(w, p.prop + ": " + m[2] + " muss vorher in der Liste stehen");
      if (m && m[1] === "above" && p.prop !== "kronleuchter") err(w, p.prop + ": above passt nur für hängende Requisiten");
      const okCount = (c) => Number.isInteger(c) && c > 0;
      if (p.count !== undefined && !(okCount(p.count) || (Array.isArray(p.count) && p.count.length === 2 && p.count.every(okCount) && p.count[0] <= p.count[1])))
        err(w, p.prop + ": count muss eine positive Zahl oder ein Bereich [von, bis] sein");
      ["clear", "doorGap"].forEach(f => { if (p[f] !== undefined && !(Number.isInteger(p[f]) && p[f] > 0)) err(w, p.prop + ": " + f + " muss eine positive Zahl sein"); });
      if (p.required !== undefined && typeof p.required !== "boolean") err(w, p.prop + ": required muss true oder false sein");
      if (p.required && m) err(w, p.prop + ": ein Pflichtstück braucht eine eigene Platzierung, nicht " + m[1] + ":");
      if (p.variant !== undefined && !(VARIANTS[p.prop] || []).includes(p.variant)) err(w, p.prop + ": unbekannte Variante " + p.variant);
      if (PROPS[p.prop] && PROPS[p.prop].wall && PROPS[p.prop].floor === false && p.place !== "wall-back" && p.place !== DOOR_SIDES) err(w, p.prop + " hängt an der Wand und braucht wall-back");
      before.add(p.prop);
    });
  });
}

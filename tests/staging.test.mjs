// Tests für die Inszenierung der Event-Figuren (docs/GDD.md, „Inszenierung der Figuren“, data/staging.json).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FakeThree } from "./fakeThree.mjs";

globalThis.window = { THREE: FakeThree };
const { planFigures } = await import("../src/figurePlan.js");
const { eventFigures, combatMonsterOf, checkStaging, CODE_PROPS, UNKNOWN_COUNT } = await import("../src/staging.js");
const { PROPS, planDecor, decorFor, centerFeature, doorTiles, STAIRS_TILES } = await import("../src/decor.js");
const { indexData } = await import("../src/eventLogic.js");
const { key, inBounds } = await import("../src/config.js");

const read = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const DATA = indexData({
  roomTypes: read("room-types.json"), events: read("events.json"), monsters: read("monsters.json"),
  items: read("items.json"), characters: read("characters.json"), texts: read("texts.json"), themes: read("themes.json")
});
const STAGING = read("staging.json");
const PROP_IDS = Object.keys(PROPS).concat(CODE_PROPS);

// Räume (Raumtyp und Thema), in denen ein Event vorkommt
function roomsFor(id) {
  const out = [];
  for (const rt of Object.values(DATA.roomTypes)) {
    if (rt.events.some(e => e.id === id)) {
      DATA.themes.filter(t => t.roomTypes.includes(rt.id) || t.startNeighbor === rt.id || ["start", "exit", "schatz", "rast", "haendler"].includes(rt.id))
        .forEach(t => out.push([rt, t.id]));
    }
    Object.entries(rt.themeEvents || {}).forEach(([th, table]) => { if (table.some(e => e.id === id)) out.push([rt, th]); });
  }
  return out;
}

test("data/staging.json ist gültig: Anker verweisen auf bestehende Requisiten, Events und Figuren gibt es", () => {
  const errors = [];
  checkStaging(STAGING, DATA, PROP_IDS, (w, t) => errors.push(w + ": " + t));
  assert.deepEqual(errors, []);
  for (const [id, a] of Object.entries(STAGING.anchors)) a.props.forEach(p => assert.ok(PROP_IDS.includes(p), id + ": " + p));
});

test("Jedes Figuren-Event hat eine gültige Inszenierung oder fällt auf den Standard zurück", () => {
  const figureEvents = Object.values(DATA.events).filter(e => e.figures || combatMonsterOf(e));
  assert.ok(figureEvents.length >= 20);
  for (const ev of figureEvents) {
    const list = eventFigures(ev, STAGING, 12345);
    assert.ok(list.length, ev.id + ": keine Figuren");
    list.forEach(f => assert.ok(!f.anchor || STAGING.anchors[f.anchor], ev.id + ": Anker " + f.anchor));
    if (!STAGING.events[ev.id] && !ev.figures) {
      // unbekannte Anzahl: 1 bis 3 nach Raum-Seed, gleich bei gleichem Seed
      const n = list.reduce((s, f) => s + (f.count || 1), 0);
      assert.ok(n >= UNKNOWN_COUNT[0] && n <= UNKNOWN_COUNT[1], ev.id + ": " + n + " Figuren");
      assert.deepEqual(eventFigures(ev, STAGING, 12345), list);
    }
  }
  // Kröte und Händler bleiben stehen, Skelette bekommen eine Modell-Variante
  assert.equal(eventFigures(DATA.events.brunnen_kroete, STAGING, 1)[0].stay, true);
  for (let seed = 1; seed <= 8; seed++) assert.equal(eventFigures(DATA.events.gruft_sarkophag, STAGING, seed)[0].variant, "minion");
  assert.equal(eventFigures(DATA.events.exit_tuersteher, STAGING, 1)[0].variant, "warrior");
  assert.deepEqual(eventFigures(DATA.events.wache_wuerfel, STAGING, 7).map(f => f.variant), ["warrior"]);
  assert.equal(eventFigures(DATA.events.gruft_ruecken, STAGING, 7)[0].variant, "minion");
  // Gastgeber und schlafender Goblin bleiben nach dem Event
  assert.equal(eventFigures(DATA.events.speisesaal_gastgeber, STAGING, 1)[0].stay, true);
  assert.equal(eventFigures(DATA.events.wache_goblin, STAGING, 1)[0].stay, true);
});

test("Figuren stehen nie auf blockierten Kacheln, in Türen oder auf der Spielfigur (außer Sitz und auf dem Requisit)", () => {
  const events = Object.values(DATA.events).filter(e => e.figures || combatMonsterOf(e));
  let seated = 0, anchored = 0;
  for (const ev of events) {
    for (const [rt, theme] of roomsFor(ev.id)) {
      const spec = decorFor(rt, theme);
      for (const doors of [1, 5, 10, 15]) for (let seed = 1; seed <= 6; seed++) for (const canPose of [true, false]) {
        const feature = centerFeature(rt.id, false);
        const plan = spec ? planDecor(spec, { seed: seed * 101, doors, feature }) : { placements: [], blocked: new Set() };
        const blocked = new Set(plan.blocked);
        if (rt.id === "boss") STAIRS_TILES.forEach(t => blocked.delete(key(...t)));
        const player = doorTiles(doors)[0];
        const doorSet = new Set(doorTiles(doors).map(t => key(...t)));
        const list = eventFigures(ev, STAGING, seed * 101);
        const figs = planFigures(list, { placements: plan.placements, blocked, doors, player, rand: () => (seed * 0.137) % 1,
          anchors: STAGING.anchors, canPose: () => canPose, stairsDown: feature === "down" || feature === "arena" });
        const where = ev.id + " in " + rt.id + "/" + theme + " Türen " + doors + " Seed " + seed + (canPose ? "" : " ohne Animation");
        assert.ok(figs.length >= 1, where + ": keine Figur");
        const seen = new Set();
        figs.forEach(f => {
          if (f.onProp) { assert.equal(f.tiles.length, 0, where); anchored++; return; }
          if (f.seat) { seated++; assert.ok(canPose, where + ": sitzt ohne Sitz-Animation"); }
          if (!canPose) assert.ok(["idle", "flat"].includes(f.anim), where + ": Animation ohne Modell");
          f.tiles.forEach(t => {
            assert.ok(inBounds(...t), where + ": außerhalb des Raums");
            if (!f.seat) assert.ok(!blocked.has(key(...t)), where + ": " + f.figure + " steht auf einem Requisit");
            assert.ok(!doorSet.has(key(...t)), where + ": " + f.figure + " steht in einer Tür");
            assert.notDeepEqual(t, player, where + ": " + f.figure + " steht auf der Spielfigur");
            assert.ok(!seen.has(key(...t)), where + ": zwei Figuren auf einer Kachel");
            seen.add(key(...t));
          });
        });
      }
    }
  }
  assert.ok(seated > 0, "keine Figur sitzt");
  assert.ok(anchored > 0, "keine Figur auf einem Requisit");
});

test("Sitz-Anker: mit Sitz-Animation auf dem Hocker, ohne daneben stehend", () => {
  const placements = [
    { prop: "tisch", tiles: [[4, 3], [4, 4], [4, 5]], cx: 4, cz: 4, rot: Math.PI / 2 },
    { prop: "hocker", tiles: [[3, 5]], cx: 3, cz: 5, rot: 0, target: "tisch" }
  ];
  const blocked = new Set(["4,3", "4,4", "4,5", "3,5"]);
  const ctx = { placements, blocked, doors: 15, player: [4, 8], rand: () => 0.3, anchors: STAGING.anchors };
  const sit = planFigures([{ figure: "skeleton", anchor: "am_tisch_sitzend" }], Object.assign({ canPose: () => true }, ctx))[0];
  assert.deepEqual([sit.tiles, sit.seat, sit.anim, sit.seatY], [[[3, 5]], true, "sit", 0.25]);
  assert.ok(Math.abs(sit.rot - Math.atan2(4 - 3, 4 - 5)) < 1e-9, "Blick zum Tisch");
  const stand = planFigures([{ figure: "goblin", anchor: "am_tisch_sitzend" }], Object.assign({ canPose: () => false }, ctx))[0];
  assert.equal(stand.seat, false);
  assert.equal(stand.anim, "idle");
  assert.ok(!blocked.has(key(...stand.tiles[0])));
  // Fehlt die Requisite, steht die Figur auf einer freien Kachel
  const free = planFigures([{ figure: "skeleton", anchor: "am_herd" }], Object.assign({ canPose: () => true }, ctx))[0];
  assert.ok(free && !blocked.has(key(...free.tiles[0])));
});

test("Prozession: Rundweg vor den Wänden, um Säulen herum, ohne gesperrte Kachel", async () => {
  const { processionRoute } = await import("../src/figurePlan.js");
  const free = processionRoute(new Set(), new Set());
  assert.ok(free && free.length >= 20, "Rundweg im leeren Raum");
  const pillars = new Set(["1,1", "3,1", "7,7", "4,7"]);
  const route = processionRoute(pillars, new Set());
  assert.ok(route, "Rundweg um Säulen herum");
  route.forEach(t => assert.ok(!pillars.has(t.join()), "Rundweg über eine Säule"));
  for (let i = 0; i < route.length; i++) {
    const [a, b] = [route[i], route[(i + 1) % route.length]];
    assert.ok(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1, "Schritte von Kachel zu Kachel");
  }
  assert.equal(STAGING.events.halle_prozession.procession, true);
});

test("Nach dem Event: Figuren bleiben (Standard), Enden leave, step_aside und collapse aus ends", async () => {
  const { endFor, END_ACTIONS } = await import("../src/staging.js");
  assert.deepEqual(END_ACTIONS, ["leave", "step_aside", "collapse"]);
  // Standard: ohne Eintrag bleibt die Figur
  assert.equal(endFor(STAGING, "wache_goblin", { option: "Schleichen", result: "success" }), "stay");
  assert.equal(endFor(STAGING, "exit_tuersteher", { option: "»Ich kenne den Boss.«", result: "failure" }), "stay", "Fehlschlag führt in den Kampf");
  assert.equal(endFor(STAGING, "exit_tuersteher", null), "stay");
  // Die drei Enden
  assert.equal(endFor(STAGING, "exit_tuersteher", { option: "»Ich kenne den Boss.«", result: "success" }), "step_aside");
  assert.equal(endFor(STAGING, "exit_tuersteher", { option: "Einfach vorbeigehen", result: "success" }), "collapse");
  assert.equal(endFor(STAGING, "halle_prozession", { option: "Mitlaufen", result: null }), "leave");
  assert.equal(endFor(STAGING, "schatz_mimik", { option: "Langsam rückwärts gehen", result: null }), "leave");
  assert.equal(endFor(STAGING, "schatz_mimik", { option: "Zurücklächeln", result: "success" }), "stay");
});

test("Verborgene Figuren (hidden) und Inszenierung ohne figures", async () => {
  const { isHidden } = await import("../src/staging.js");
  ["gruft_sarkophag", "kerker_zellentuer", "gruft_familiengrab"].forEach(id => assert.ok(isHidden(STAGING, id), id));
  assert.ok(!isHidden(STAGING, "exit_tuersteher"));
  assert.deepEqual(eventFigures(DATA.events.kerker_zellentuer, STAGING, 1).map(f => [f.figure, f.count || 1]), [["skelett_krieger", 1]]);
  assert.equal(eventFigures(DATA.events.gruft_familiengrab, STAGING, 1).reduce((n, f) => n + (f.count || 1), 0), 3);
  // Inszenierung ohne figures: es gilt die Figurenliste des Events
  const ev = DATA.events.kerker_mitgefangener;
  assert.deepEqual(eventFigures(ev, { events: { [ev.id]: { ends: [] } } }, 1).map(f => f.figure), ev.figures.map(f => f.figure));
});

test("checkStaging prüft ends: Option, Ergebnis, Aktion, kein Ende mit Kampf", () => {
  const errs = [];
  const st = { events: {
    exit_tuersteher: { ends: [
      { option: "Gibt es nicht", do: "leave" },
      { option: "»Ich kenne den Boss.«", do: "leave" },
      { option: "»Ich kenne den Boss.«", result: "failure", do: "leave" },
      { option: "Einfach vorbeigehen", result: "success", do: "tanzen" }
    ] },
    halle_prozession: { ends: [{ option: "Mitlaufen", result: "success", do: "leave" }] },
    gruft_sarkophag: { hidden: "ja" }
  } };
  checkStaging(st, DATA, PROP_IDS, (w, t) => errs.push(t));
  const has = (s) => assert.ok(errs.some(e => e.includes(s)), s + " fehlt in: " + errs.join(" / "));
  has("„Gibt es nicht“, die es im Event nicht gibt");
  has("result muss success oder failure sein");
  has("endet mit einem Kampf");
  has("do muss leave, step_aside oder collapse sein");
  has("die Option hat keine Probe, result fällt weg");
  has("hidden muss true oder false sein");
  const ok = [];
  checkStaging(STAGING, DATA, PROP_IDS, (w, t) => ok.push(t));
  assert.deepEqual(ok, []);
});

test("Zur Seite treten: freie Nachbarkachel, Türen, Treppe und Wege bleiben frei", async () => {
  const { stepAsideTile } = await import("../src/figurePlan.js");
  const { STAIRS_FOOT, reachable } = await import("../src/decor.js");
  for (const doors of [1, 5, 10, 15]) {
    for (const from of [[1, 3], [4, 4], [4, 1], [7, 4]]) {
      const ctx = { blocked: new Set(), doors, player: [4, 7], stairsTiles: STAIRS_TILES, edges: new Set() };
      STAIRS_TILES.forEach(t => ctx.blocked.add(key(...t)));
      const t = stepAsideTile(from, ctx);
      assert.ok(t, "Platz neben " + from);
      assert.equal(Math.max(Math.abs(t[0] - from[0]), Math.abs(t[1] - from[1])), 1, "Nachbarkachel");
      const k = key(...t);
      assert.ok(!doorTiles(doors).some(d => key(...d) === k), "nicht auf einer Tür");
      assert.ok(!STAIRS_TILES.some(s => key(...s) === k), "nicht auf der Treppe");
      const test = new Set(ctx.blocked); test.add(k);
      assert.ok(reachable(test, doors, [STAIRS_TILES], [ctx.player], ctx.edges), "versperrt keinen Weg");
    }
  }
  // Vorkammer: der Fuß der Treppe bleibt frei
  const t = stepAsideTile([STAIRS_FOOT[0] + 1, STAIRS_FOOT[1]], { blocked: new Set(STAIRS_TILES.map(s => key(...s))), doors: 15, stairsFoot: STAIRS_FOOT });
  assert.ok(t && key(...t) !== key(...STAIRS_FOOT));
});

test("Event-Requisiten: vor und neben der ersten Figur, belegte Kacheln und Wege", async () => {
  const { placeEventProps } = await import("../src/figurePlan.js");
  const { reachable } = await import("../src/decor.js");
  const blocks = (id) => !!(PROPS[id] && PROPS[id].blocks);
  const base = (extra) => Object.assign({ blocked: new Set(["4,4"]), occupied: new Set(), edges: new Set(), doors: 15, player: [4, 7], clickables: [], extra: [], blocks }, extra);
  // Figur auf 4|4 (gezählt ab 0), Blick nach Süden (+z): vor ihr 4,5, rechts von ihr 3,4
  const fig = { tiles: [[4, 4]], rot: 0 };
  let out = placeEventProps([{ prop: "tisch_klein", place: "vor_figur" }, { prop: "kistenberg", place: "neben_figur" }], fig, base());
  assert.deepEqual(out.map(p => p.tile), [[4, 5], [3, 4]]);
  // Blick nach Osten (+x): vor ihr 5,4
  out = placeEventProps([{ prop: "tisch_klein", place: "vor_figur" }], { tiles: [[4, 4]], rot: Math.PI / 2 }, base());
  assert.deepEqual(out[0].tile, [5, 4]);
  // Belegt (auch durch ein nicht blockierendes Requisit wie den Goldhaufen): nächste freie Nachbarkachel
  out = placeEventProps([{ prop: "tisch_klein", place: "vor_figur" }], fig, base({ occupied: new Set(["4,5"]) }));
  assert.equal(Math.max(Math.abs(out[0].tile[0] - 4), Math.abs(out[0].tile[1] - 5)), 1);
  assert.notEqual(key(...out[0].tile), "4,4");
  // Neben der Figur: rechts belegt, dann links
  out = placeEventProps([{ prop: "kistenberg", place: "neben_figur" }], fig, base({ blocked: new Set(["4,4", "3,4"]) }));
  assert.deepEqual(out[0].tile, [5, 4]);
  // Nie auf Türen, der Kachel davor, der Spielfigur oder reservierten Kacheln; kein Weg wird versperrt
  for (const doors of [1, 2, 4, 8, 5, 10, 15]) {
    for (const t of [[4, 0], [0, 4], [8, 4], [4, 8], [4, 2], [6, 6]]) {
      for (const rot of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const ctx = base({ blocked: new Set([key(...t)].concat(STAIRS_TILES.map(s => key(...s)))), doors, player: [7, 7], clickables: [STAIRS_TILES], reserved: STAIRS_TILES });
        if (!reachable(ctx.blocked, doors, [STAIRS_TILES], [[7, 7]], ctx.edges)) continue; // Figur steht selbst im Weg
        const res = placeEventProps([{ prop: "tisch_klein", place: "vor_figur" }, { prop: "kistenberg", place: "neben_figur" }], { tiles: [t], rot }, ctx);
        const test = new Set(ctx.blocked);
        res.forEach(p => {
          const k = key(...p.tile);
          assert.ok(inBounds(...p.tile), "im Raum");
          assert.ok(!doorTiles(doors).some(d => key(...d) === k), "nicht auf einer Tür: " + k);
          assert.ok(k !== "7,7" && !STAIRS_TILES.some(s => key(...s) === k), "nicht auf Spielfigur oder Treppe: " + k);
          assert.ok(!test.has(k), "nicht doppelt belegt: " + k);
          test.add(k);
        });
        assert.ok(reachable(test, doors, [STAIRS_TILES], [[7, 7]], ctx.edges), "alle Wege frei");
      }
    }
  }
  // Passt keine Kachel, fehlt das Requisit
  const full = new Set();
  for (let z = 0; z < 9; z++) for (let x = 0; x < 9; x++) full.add(key(x, z));
  assert.deepEqual(placeEventProps([{ prop: "tisch_klein", place: "vor_figur" }], fig, base({ occupied: full })), []);
});

test("Event-Requisiten: gleiche Lage bei gleichem Raum, gemerkte Requisiten belegen ihre Kachel", async () => {
  const { placeEventProps } = await import("../src/figurePlan.js");
  const { eventProps } = await import("../src/staging.js");
  const blocks = (id) => !!(PROPS[id] && PROPS[id].blocks);
  const list = eventProps(STAGING, "exit_souvenir");
  assert.deepEqual(list.map(p => p.prop), ["tisch_klein", "kistenberg"]);
  assert.deepEqual(eventProps(STAGING, "halle_saeule"), []);
  const ctx = () => ({ blocked: new Set(["2,5"]), occupied: new Set(), edges: new Set(), doors: 6, player: [5, 7], clickables: [], extra: [], blocks });
  const a = placeEventProps(list, { tiles: [[2, 5]], rot: 0 }, ctx());
  const b = placeEventProps(list, { tiles: [[2, 5]], rot: 0 }, ctx());
  assert.deepEqual(a, b);
  // Beim erneuten Betreten stehen die gemerkten Requisiten im Weg: eine neue Planung legt nichts darauf
  const again = ctx();
  a.forEach(p => again.blocked.add(key(...p.tile)));
  placeEventProps(list, { tiles: [[2, 5]], rot: 0 }, again).forEach(p => assert.ok(!a.some(q => key(...q.tile) === key(...p.tile))));
});

test("Datenprüfung der Event-Requisiten (props)", () => {
  const errs = [];
  const st = { anchors: {}, figures: {}, events: {
    halle_saeule: { props: "tisch_klein" },
    wache_karten: { props: [{ prop: "gibtsnicht", place: "vor_figur" }, { prop: "tisch_klein", place: "hinter_figur" }] }
  } };
  checkStaging(st, DATA, PROP_IDS, (w, t) => errs.push(t));
  const has = (s) => assert.ok(errs.some(e => e.includes(s)), s + " fehlt in: " + errs.join(" / "));
  has("halle_saeule: props muss eine Liste sein");
  has("unbekannte Requisite gibtsnicht");
  has("place muss vor_figur oder neben_figur sein");
});

test("Neue Figuren: Ritter und Kobold ohne Kampfwerte, der Kobold ist keine Goblin-Variante", async () => {
  const { FIGURE_INFO } = await import("../src/figurePlan.js");
  assert.ok(FIGURE_INFO.knight.noCombat && FIGURE_INFO.kobold.noCombat);
  assert.ok(!DATA.monsters.knight && !DATA.monsters.kobold);
  assert.ok(!(STAGING.figures.goblin && STAGING.figures.goblin.variants));
  const models = read("models.json");
  for (const id of ["knight", "kobold", "tisch_klein", "kiste_klein_verziert"]) assert.ok(models[id], "Modell " + id);
  assert.equal(models.kobold.file, models.goblin.file);
  assert.ok(models.kobold.texture);
});

test("Brunnenraum: die Kröte sitzt bei jeder Türkombination auf dem Brunnenrand (5|5)", () => {
  const rt = DATA.roomTypes.brunnen;
  const spec = decorFor(rt, "keller");
  for (let doors = 0; doors < 16; doors++) for (let seed = 1; seed <= 6; seed++) {
    const plan = planDecor(spec, { seed: seed * 101, doors });
    const list = eventFigures(DATA.events.brunnen_kroete, STAGING, seed * 101);
    const figs = planFigures(list, { placements: plan.placements, blocked: new Set(plan.blocked), doors, player: doorTiles(doors)[0] || [4, 8],
      rand: () => (seed * 0.137) % 1, anchors: STAGING.anchors, canPose: () => true });
    assert.equal(figs.length, 1);
    const k = figs[0];
    assert.equal(k.figure, "kroete");
    assert.ok(k.onProp, "Türen " + doors + ": nicht auf dem Brunnen");
    assert.ok(Math.abs(k.cx - 4) < 0.5 && Math.abs(k.cz - 4) < 0.5, "Türen " + doors + ": am Brunnen auf 5|5");
  }
});

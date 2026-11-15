// Tests für die Markierung unter dem Mauszeiger (docs/GDD.md, Stilguide, Lesbarkeit).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_MARKER, markerStyle, pulseScale, showMarker, checkHoverMarker } from "../src/hoverLogic.js";

const THEMES = JSON.parse(readFileSync(new URL("../data/themes.json", import.meta.url), "utf8"));
const src = (f) => readFileSync(new URL("../src/" + f, import.meta.url), "utf8");

test("Werte in data/themes.json: blassgelb #F7E08A, Deckkraft 0,8, 0,3 Kacheln, Puls 0,85 bis 1,0 in 1,2 s", () => {
  const want = { color: "#F7E08A", opacity: 0.8, size: 0.3, pulseMin: 0.85, pulseSeconds: 1.2 };
  assert.deepEqual(DEFAULT_MARKER, want);
  THEMES.forEach(t => assert.deepEqual(t.hoverMarker, want, t.id));
  const errs = [];
  checkHoverMarker(THEMES, (w, m) => errs.push(w + ": " + m));
  assert.deepEqual(errs, []);
  const bad = [];
  checkHoverMarker([{ id: "x", hoverMarker: { color: "gelb", opacity: 2, size: 0, pulseMin: 1.5, pulseSeconds: 0 } }], (w, m) => bad.push(m));
  assert.equal(bad.length, 5, bad.join(" / "));
  assert.deepEqual(markerStyle({ hoverMarker: { size: 0.4 } }).size, 0.4, "Thema überschreibt einzelne Werte");
});

test("Pulsieren per Sinus zwischen 0,85 und 1,0, eine Runde 1,2 s; bei reduzierter Bewegung fest 1,0", () => {
  const s = markerStyle(null);
  const vals = Array.from({ length: 121 }, (_, i) => pulseScale(i * 0.01, s, false));
  assert.ok(Math.abs(Math.min(...vals) - 0.85) < 1e-3 && Math.abs(Math.max(...vals) - 1) < 1e-3);
  assert.ok(Math.abs(pulseScale(0.37, s, false) - pulseScale(0.37 + 1.2, s, false)) < 1e-9, "Runde 1,2 s");
  [0, 0.3, 0.9].forEach(t => assert.equal(pulseScale(t, s, true), 1));
});

test("Kreis nur auf begehbaren, erreichbaren Kacheln; nie über Objekten, bei Events, im Kampf, beim Abblenden oder unter der Figur", () => {
  const base = { tile: [3, 3], player: [5, 5], walkable: true, reachable: true, overObject: false, eventActive: false, combat: false, transitioning: false };
  assert.equal(showMarker(base), true);
  assert.equal(showMarker({ ...base, walkable: false }), false, "blockiert: keine Markierung (auch keine rote)");
  assert.equal(showMarker({ ...base, reachable: false }), false, "kein Weg per A*");
  assert.equal(showMarker({ ...base, overObject: true }), false);
  assert.equal(showMarker({ ...base, eventActive: true }), false);
  assert.equal(showMarker({ ...base, combat: true }), false);
  assert.equal(showMarker({ ...base, transitioning: true }), false);
  assert.equal(showMarker({ ...base, tile: [5, 5] }), false, "Kachel der Figur");
  assert.equal(showMarker({ ...base, tile: null }), false);
});

test("Code: ein Mesh, Basic-Material ohne Tiefe und Schatten, 0,02 über dem Boden, keine rote Kachel mehr", () => {
  const m = src("markers.js"), main = src("main.js");
  assert.match(m, /MeshBasicMaterial\(\{ map: softDisc\(\), transparent: true, depthWrite: false \}\)/);
  assert.match(m, /hoverMesh\.position\.y = 0\.02/);
  assert.match(m, /castShadow = false/);
  assert.doesNotMatch(m + main, /0xe06a4f/, "rote Kachel entfernt");
  assert.doesNotMatch(main, /new THREE\.Mesh/, "kein neues Mesh bei Mausbewegung");
  assert.match(main, /setHover\("Kachel " \+ tileName/, "Feld „Maus über“ zeigt die Kachel weiter");
});

test("Alle Programmdateien in src/ sind gültiges JavaScript (etwa keine doppelt deklarierte Variable)", async () => {
  const { spawnSync } = await import("node:child_process");
  const { readdirSync } = await import("node:fs");
  const dir = new URL("../src/", import.meta.url);
  for (const f of readdirSync(dir).filter(n => n.endsWith(".js"))) {
    const r = spawnSync(process.execPath, ["--check", new URL(f, dir).pathname], { encoding: "utf8" });
    assert.equal(r.status, 0, f + ": " + (r.stderr || "").split("\n").slice(0, 5).join(" "));
  }
});

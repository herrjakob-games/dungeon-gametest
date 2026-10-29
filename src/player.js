// Spielfigur. Modelle der Völker aus data/models.json (KayKit Adventurers, mit Animationen); fehlt eins,
// baut figures.js den Platzhalter aus Grundformen.
// Die Gruppe "figure" schaut in Richtung +z.
import { tw } from "./config.js";
import { buildFigure } from "./figures.js";
import { makeFigureModel } from "./models.js";
import { scene } from "./scene.js";
import { state } from "./state.js";
const THREE = window.THREE;

export const player = new THREE.Group();
export const figure = new THREE.Group();

let anim = null; // Modell mit Animationen, null beim Platzhalter
figure.add(buildFigure("zwerg"));

// Figur auf ein anderes Volk umstellen ("zwerg", "elf", "mensch"), z. B. nach der Volkswahl
export function setFigure(volk) {
  while (figure.children.length) figure.remove(figure.children[0]);
  figure.position.set(0, 0, 0); figure.rotation.set(0, 0, 0); figure.scale.set(1, 1, 1);
  anim = makeFigureModel(volk);
  figure.add(anim ? anim.object : buildFigure(volk));
}

// Pro Frame: Laufen oder Stehen. true, wenn das Modell selbst animiert ist (dann kein Wippen der Grundformen)
export function animateFigure(dt, moving) {
  if (!anim) return false;
  anim.loop(moving ? "walk" : "idle");
  anim.update(dt);
  return true;
}

player.add(figure);
// Lesbarkeit (Stilguide): heller Bodenring und ein kleiner, schwacher Lichtschein um die Spielfigur
const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 24),
  new THREE.MeshBasicMaterial({ color: 0xf3e6c8, transparent: true, opacity: 0.55, depthWrite: false }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.02;
player.add(ring);
const glow = new THREE.PointLight(0xffe2b8, 0.8, 2.6, 2);
glow.position.y = 1.1;
player.add(glow);
scene.add(player);

export function placePlayer(tile, facing) {
  state.pTile = tile.slice();
  player.position.set(tw(tile[0]), 0, tw(tile[1]));
  player.rotation.y = facing;
  wantRot = null;
}

export function faceTile(tile) {
  wantRot = null;
  player.rotation.y = Math.atan2(tw(tile[0]) - player.position.x, tw(tile[1]) - player.position.z);
}

// Einmalige Animation der Spielfigur: "attack" beim eigenen Angriff, "hit" bei einem Treffer des Gegners
export function playerAction(name) {
  if (anim) anim.once(name);
}

// Weiche Drehung der Spielfigur (Stilguide: etwa 0,25 Sekunden, kürzerer Weg), etwa zum Gegner im Kampf.
// Die Blickrichtung bleibt danach, bis der Spieler die Figur bewegt.
let wantRot = null;
export function turnToward(x, z) {
  wantRot = Math.atan2(x - player.position.x, z - player.position.z);
}
export function updateTurn(dt, walking) {
  if (walking) { wantRot = null; return; }
  if (wantRot === null) return;
  const d = Math.atan2(Math.sin(wantRot - player.rotation.y), Math.cos(wantRot - player.rotation.y));
  player.rotation.y += d * Math.min(1, dt * 12);
  if (Math.abs(d) < 0.002) wantRot = null;
}

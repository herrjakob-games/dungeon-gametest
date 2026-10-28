// Spielfigur. Die Modelle der Völker stehen in figures.js (Platzhalter bis Meilenstein 6).
// Die Gruppe "figure" schaut in Richtung +z.
import { tw } from "./config.js";
import { buildFigure } from "./figures.js";
import { scene } from "./scene.js";
import { state } from "./state.js";
const THREE = window.THREE;

export const player = new THREE.Group();
export const figure = new THREE.Group();

figure.add(buildFigure("zwerg"));

// Figur auf ein anderes Volk umstellen ("zwerg", "elf", "mensch"), z. B. nach der Volkswahl
export function setFigure(volk) {
  while (figure.children.length) figure.remove(figure.children[0]);
  figure.add(buildFigure(volk));
}

player.add(figure);
// Lesbarkeit (Stilguide): heller Bodenring und ein kleiner, schwacher Lichtschein um die Spielfigur
const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 24),
  new THREE.MeshBasicMaterial({ color: 0xf3e6c8, transparent: true, opacity: 0.55, depthWrite: false }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.02;
player.add(ring);
const glow = new THREE.PointLight(0xffe2b8, 0.45, 2.8, 2);
glow.position.y = 1.1;
player.add(glow);
scene.add(player);

export function placePlayer(tile, facing) {
  state.pTile = tile.slice();
  player.position.set(tw(tile[0]), 0, tw(tile[1]));
  player.rotation.y = facing;
}

export function faceTile(tile) {
  player.rotation.y = Math.atan2(tw(tile[0]) - player.position.x, tw(tile[1]) - player.position.z);
}

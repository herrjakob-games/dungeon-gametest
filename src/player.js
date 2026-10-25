// Spielfigur: Zwergenkrieger aus Grundformen (Platzhalter bis Meilenstein 6).
// Die Gruppe "figure" schaut in Richtung +z.
import { tw } from "./config.js";
import { mat } from "./materials.js";
import { scene } from "./scene.js";
import { state } from "./state.js";
const THREE = window.THREE;

export const player = new THREE.Group();
export const figure = new THREE.Group();

(function buildDwarf() {
  const steel = mat(0x9aa1a8, { metalness: 0.55, roughness: 0.45 });
  const steelDark = mat(0x5e636a, { metalness: 0.5, roughness: 0.55 });
  const leather = mat(0x5a3a22);
  const beardMat = mat(0x6b4226);
  const skin = mat(0xd9a582);
  const part = (geo, m, x, y, z) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    figure.add(o);
    return o;
  };
  // Stiefel
  part(new THREE.BoxGeometry(0.16, 0.22, 0.22), leather, -0.11, 0.11, 0.03);
  part(new THREE.BoxGeometry(0.16, 0.22, 0.22), leather, 0.11, 0.11, 0.03);
  // Rumpf mit Kettenhemd und Brustplatte
  part(new THREE.CylinderGeometry(0.27, 0.33, 0.44, 8), steelDark, 0, 0.44, 0);
  part(new THREE.BoxGeometry(0.38, 0.26, 0.1), steel, 0, 0.52, 0.24);
  // Gürtel mit Schnalle
  part(new THREE.CylinderGeometry(0.335, 0.335, 0.07, 8), leather, 0, 0.27, 0);
  part(new THREE.BoxGeometry(0.12, 0.09, 0.04), mat(0xd8b56a), 0, 0.27, 0.33);
  // Schulterpanzer, Arme, Hände
  [-1, 1].forEach(s => {
    part(new THREE.SphereGeometry(0.13, 8, 6), steel, s * 0.32, 0.62, 0);
    part(new THREE.BoxGeometry(0.12, 0.3, 0.12), steelDark, s * 0.36, 0.45, 0.02);
    part(new THREE.IcosahedronGeometry(0.07, 0), skin, s * 0.36, 0.28, 0.05);
  });
  // Kopf und Nase
  part(new THREE.IcosahedronGeometry(0.17, 0), skin, 0, 0.8, 0.02);
  part(new THREE.BoxGeometry(0.07, 0.08, 0.07), mat(0xc98a68), 0, 0.79, 0.18);
  // Langer brauner Bart und Schnurrbart
  const beard = part(new THREE.ConeGeometry(0.17, 0.52, 7), beardMat, 0, 0.53, 0.17);
  beard.rotation.x = Math.PI - 0.15;
  part(new THREE.BoxGeometry(0.26, 0.05, 0.06), beardMat, 0, 0.74, 0.17);
  // Helm mit Rand, Nasenschutz und Hörnern
  part(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), steel, 0, 0.86, 0.01);
  part(new THREE.CylinderGeometry(0.215, 0.215, 0.05, 10), steelDark, 0, 0.87, 0.01);
  part(new THREE.BoxGeometry(0.04, 0.14, 0.03), steel, 0, 0.83, 0.21);
  [-1, 1].forEach(s => {
    const horn = part(new THREE.ConeGeometry(0.05, 0.22, 6), mat(0xe6dcc4), s * 0.22, 0.99, 0);
    horn.rotation.z = -s * 0.9;
  });
  // Axt in der rechten Hand
  part(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), mat(0x7a4a26), 0.36, 0.4, 0.12);
  part(new THREE.BoxGeometry(0.04, 0.2, 0.18), steel, 0.36, 0.67, 0.22);
})();

player.add(figure);
scene.add(player);

export function placePlayer(tile, facing) {
  state.pTile = tile.slice();
  player.position.set(tw(tile[0]), 0, tw(tile[1]));
  player.rotation.y = facing;
}

export function faceTile(tile) {
  player.rotation.y = Math.atan2(tw(tile[0]) - player.position.x, tw(tile[1]) - player.position.z);
}

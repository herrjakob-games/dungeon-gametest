// Markierungen auf dem Boden: Kachel unter der Maus und Wegpunkte.
import { key, tw } from "./config.js";
import { scene } from "./scene.js";
const THREE = window.THREE;

export const hoverMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(0.95, 0.95),
  new THREE.MeshBasicMaterial({ color: 0xe9a640, transparent: true, opacity: 0.35, depthWrite: false })
);
hoverMesh.rotation.x = -Math.PI / 2;
hoverMesh.position.y = 0.012;
hoverMesh.visible = false;
scene.add(hoverMesh);

export function showHoverTile(x, z, ok) {
  hoverMesh.position.x = tw(x);
  hoverMesh.position.z = tw(z);
  hoverMesh.material.color.set(ok ? 0xe9a640 : 0xe06a4f);
  hoverMesh.visible = true;
}

const dotGeo = new THREE.CircleGeometry(0.09, 10);
const dotMat = new THREE.MeshBasicMaterial({ color: 0xe9a640, transparent: true, opacity: 0.8 });
let dots = [];

export function clearDots() {
  dots.forEach(d => scene.remove(d));
  dots = [];
}

export function drawDots(path) {
  clearDots();
  path.forEach(([x, z]) => {
    const d = new THREE.Mesh(dotGeo, dotMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(tw(x), 0.015, tw(z));
    d.userData.tile = key(x, z);
    scene.add(d);
    dots.push(d);
  });
}

export function removeDot(x, z) {
  const d = dots.find(o => o.userData.tile === key(x, z));
  if (d) { scene.remove(d); dots = dots.filter(o => o !== d); }
}

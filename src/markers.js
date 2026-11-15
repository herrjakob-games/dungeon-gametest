// Markierungen auf dem Boden: Kreis unter der Maus und Wegpunkte.
// Kreis (docs/GDD.md, Stilguide, Lesbarkeit): blassgelb, weicher Rand, pulsiert leicht; nur auf begehbaren Kacheln. Ein Mesh
// für den ganzen Lauf, es wird nur verschoben. Werte aus hoverMarker des Themas (data/themes.json).
import { key, tw, reduceMotion } from "./config.js";
import { scene } from "./scene.js";
import { markerStyle, pulseScale } from "./hoverLogic.js";
const THREE = window.THREE;

// Kreis mit weichem Rand: Textur mit Verlauf (innen voll, am Rand ausblendend), Farbe kommt aus dem Material
function softDisc() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.62, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export const hoverMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: softDisc(), transparent: true, depthWrite: false })
);
hoverMesh.rotation.x = -Math.PI / 2;
hoverMesh.position.y = 0.02;
hoverMesh.castShadow = false;
hoverMesh.receiveShadow = false;
hoverMesh.renderOrder = 1;
hoverMesh.visible = false;
scene.add(hoverMesh);

let style = markerStyle(null), styleTheme;
// Werte des Themas übernehmen (Farbe, Deckkraft, Größe, Pulsieren); nur, wenn sich das Thema ändert
export function setHoverStyle(theme) {
  if (theme === styleTheme) return;
  styleTheme = theme;
  style = markerStyle(theme);
  hoverMesh.material.color.set(style.color);
  hoverMesh.material.opacity = style.opacity;
}
setHoverStyle(null);

export function showHoverTile(x, z) {
  hoverMesh.position.x = tw(x);
  hoverMesh.position.z = tw(z);
  hoverMesh.visible = true;
}
export function hideHoverTile() { hoverMesh.visible = false; }

// Pro Frame: Größe pulsiert per Sinus (bei reduzierter Bewegung fest)
export function updateHoverMarker(t) {
  if (!hoverMesh.visible) return;
  const k = style.size * pulseScale(t, style, reduceMotion);
  hoverMesh.scale.set(k, k, 1);
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

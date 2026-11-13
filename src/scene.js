// Renderer, Szene, isometrische Kamera und Grundbeleuchtung.
import { ZOOM_MIN, clampZoom, zoomTarget, easeZoom } from "./zoomLogic.js";
const THREE = window.THREE;

export const stage = document.getElementById("stage");

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15110e);

// Isometrische Kamera: orthografisch, 45° gedreht, ca. 35° geneigt
export const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
camera.position.set(40, 40, 40);
camera.lookAt(0, 0, 0);

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  const half = Math.max(5.4, 7.6 / aspect); // ganzer 9×9-Raum passt ins Bild
  camera.left = -half * aspect; camera.right = half * aspect;
  camera.top = half; camera.bottom = -half;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// Feste Beleuchtung (Fackeln kommen pro Raum dazu)
// Grundlicht nach Stilguide: Halbkugellicht, oben warmes Grau, unten das Grundlicht des Themas (setAmbient)
const HEMI = 0.32;
const hemi = new THREE.HemisphereLight(0x9c8c80, 0x3a3048, HEMI);
scene.add(hemi);
// Schwaches Licht von oben: der einzige Schattenwerfer neben höchstens einem weiteren (Stilguide: höchstens zwei)
const sun = new THREE.DirectionalLight(0xffe0bc, 0.12);
sun.position.set(8, 16, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
scene.add(sun);

// Zoom (zoomLogic.js): Start ganz herausgezoomt, das Mausrad ändert die gewählte Stufe, im Kampf geht die Kamera 30 % näher
let baseZoom = ZOOM_MIN;
camera.zoom = ZOOM_MIN;
camera.updateProjectionMatrix();
export function zoomBy(deltaY) { baseZoom = clampZoom(baseZoom * (1 - deltaY * 0.0012)); }
export function updateZoom(dt, inCombat, instant) {
  const target = zoomTarget(baseZoom, inCombat);
  const z = instant ? target : easeZoom(camera.zoom, target, dt);
  if (z === camera.zoom) return;
  camera.zoom = z;
  camera.updateProjectionMatrix();
}

// Grundlicht des Themas oder Raums (Farbe als "#rrggbb")
// brightness: Faktor für hellere Räume (roomPalettes, etwa der Händler), Standard 1
export function setAmbient(ground, brightness) {
  hemi.groundColor.set(ground || "#3a3048");
  hemi.intensity = HEMI * (brightness || 1);
}

// Renderer, Szene, isometrische Kamera und Grundbeleuchtung.
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
const hemi = new THREE.HemisphereLight(0x9c8c80, 0x3a3048, 0.62);
scene.add(hemi);
// Schwaches Licht von oben: der einzige Schattenwerfer neben höchstens einem weiteren (Stilguide: höchstens zwei)
const sun = new THREE.DirectionalLight(0xffe0bc, 0.3);
sun.position.set(8, 16, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
scene.add(sun);

export function zoomBy(deltaY) {
  camera.zoom = Math.min(2.2, Math.max(0.7, camera.zoom * (1 - deltaY * 0.0012)));
  camera.updateProjectionMatrix();
}

// Grundlicht des Themas oder Raums (Farbe als "#rrggbb")
export function setAmbient(ground) {
  hemi.groundColor.set(ground || "#3a3048");
}

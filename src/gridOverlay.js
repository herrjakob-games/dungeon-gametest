// Testhilfe (?grid=1): zeigt auf jeder Kachel ihren Namen x|y wie im GDD, damit Positionen benannt werden können.
// Alle Räume sind gleich groß, deshalb liegt das Raster einmal fest über dem Boden.
import { N, tileName } from "./config.js";
import { scene } from "./scene.js";
const THREE = window.THREE;

export function showGrid() {
  const px = 96; // Pixel je Kachel
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = N * px;
  const g = canvas.getContext("2d");
  g.strokeStyle = "rgba(255, 230, 160, 0.55)";
  g.lineWidth = 2;
  g.font = "bold 30px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    g.strokeRect(x * px + 1, z * px + 1, px - 2, px - 2);
    g.fillStyle = "rgba(0, 0, 0, 0.55)";
    g.fillRect(x * px + 14, z * px + 30, px - 28, 36);
    g.fillStyle = "#ffe6a0";
    g.fillText(tileName(x, z), x * px + px / 2, z * px + px / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(N, N),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  plane.rotation.x = -Math.PI / 2; // flach auf den Boden, Norden (Kachel y = 1) hinten
  plane.position.y = 0.02;
  plane.renderOrder = 1;
  scene.add(plane);
}

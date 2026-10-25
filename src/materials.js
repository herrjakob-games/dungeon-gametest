// Material- und Geometrie-Helfer für den Platzhalter-Stil (Low-Poly, Flat Shading).
import { rnd } from "./rng.js";
const THREE = window.THREE;

export const WOOD = 0x7a4a26;

export const mat = (color, extra) =>
  new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.92, metalness: 0 }, extra || {}));

export function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Stein mit leichter Helligkeitsvariation (abhängig vom Raum-Seed)
export function stone() {
  const m = mat(0x5a4f47);
  m.color.offsetHSL(0, 0, (rnd() - 0.5) * 0.06);
  return m;
}

// Durchblick (docs/GDD.md, Grafik und Animation): Innenwände (Zellwände) und Säulen, die die Spielfigur oder einen Gegner
// verdecken, werden nur in einem Kreis um die Figur durchsichtig (etwa 0,7 Kacheln Radius, weicher Rand, Deckkraft
// seeThroughOpacity des Themas). Nur Teile vor der Figur werden durchsichtig; der Übergang dauert etwa 0,2 Sekunden.
// Gitter, Requisiten, Raumwände und friedliche Figuren lösen keinen Durchblick aus.
import { camera, renderer } from "./scene.js";
const THREE = window.THREE;

const MAX = 4;            // höchstens so viele Figuren gleichzeitig (Spielfigur und Gegner)
const RADIUS = 0.7;       // Kreis in Kacheln
const FADE = 0.2;         // Sekunden für den Übergang
const CHEST = 0.55;       // Höhe der Kreismitte an der Figur (Kacheln)
export const DEFAULT_OPACITY = 0.4;

// Gemeinsame Werte für alle durchsichtigen Materialien: je Figur Bildschirmlage (Pixel), Tiefe und Stärke
const uniforms = {
  uSee: { value: Array.from({ length: MAX }, () => new THREE.Vector4(0, 0, 0, 0)) },
  uSeeR: { value: 40 },
  uSeeOpacity: { value: DEFAULT_OPACITY }
};

let occluders = [];       // Meshes der Innenwände und Säulen im aktuellen Raum
const strength = new Map(); // Figur → Stärke 0 bis 1 (für den weichen Übergang)

// Material so ändern, dass es im Kreis um eine verdeckte Figur durchsichtig wird
function patch(material) {
  const m = material.clone();
  m.transparent = true;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec4 uSee[" + MAX + "];\nuniform float uSeeR;\nuniform float uSeeOpacity;")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\n" +
        "float seeA = 1.0;\n" +
        "for (int i = 0; i < " + MAX + "; i++) {\n" +
        "  vec4 s = uSee[i];\n" +
        "  if (s.w <= 0.0 || gl_FragCoord.z >= s.z) continue;\n" +   // nur Teile vor der Figur
        "  float k = 1.0 - smoothstep(uSeeR * 0.7, uSeeR, distance(gl_FragCoord.xy, s.xy));\n" +
        "  seeA = min(seeA, mix(1.0, uSeeOpacity, k * s.w));\n" +
        "}\n" +
        "gl_FragColor.a *= seeA;");
  };
  m.customProgramCacheKey = () => "seeThrough";
  return m;
}

// Objekt (Modell oder Grundform) als Innenwand oder Säule anmelden
export function addOccluder(obj) {
  obj.traverse(n => {
    if (!n.isMesh) return;
    n.material = Array.isArray(n.material) ? n.material.map(patch) : patch(n.material);
    occluders.push(n);
  });
}

// Beim Raumwechsel; opacity: seeThroughOpacity des Themas
export function resetOccluders(opacity) {
  occluders = [];
  strength.clear();
  uniforms.uSeeOpacity.value = typeof opacity === "number" ? opacity : DEFAULT_OPACITY;
}

const ray = new THREE.Raycaster();
const v = new THREE.Vector3(), ndc = new THREE.Vector3(), size = new THREE.Vector2();

// Verdeckt eine Innenwand oder Säule den Punkt p (Welt)? Strahl von der Kamera durch p
function hidden(p) {
  ndc.copy(p).project(camera);
  ray.setFromCamera({ x: ndc.x, y: ndc.y }, camera);
  const d = ray.ray.origin.distanceTo(p);
  const hit = ray.intersectObjects(occluders, false)[0];
  return !!hit && hit.distance < d - 0.05;
}

/**
 * Pro Frame: targets = Objekte der Spielfigur und der Gegner (Ursprung am Boden).
 */
export function updateSeeThrough(dt, targets) {
  const slots = uniforms.uSee.value;
  slots.forEach(s => s.set(0, 0, 0, 0));
  if (!occluders.length) return;
  renderer.getDrawingBufferSize(size);
  // Radius in Pixeln: 0,7 Kacheln quer zur Blickrichtung
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const a = new THREE.Vector3(0, 0, 0).project(camera), b = right.multiplyScalar(RADIUS).project(camera);
  uniforms.uSeeR.value = Math.hypot((b.x - a.x) * size.x / 2, (b.y - a.y) * size.y / 2);
  targets.slice(0, MAX).forEach((obj, i) => {
    obj.getWorldPosition(v);
    const base = v.clone();
    const occluded = [0.15, CHEST, 0.95].some(h => hidden(v.copy(base).setY(base.y + h)));
    const k = Math.min(1, Math.max(0, (strength.get(obj) || 0) + (occluded ? dt : -dt) / FADE));
    strength.set(obj, k);
    if (k <= 0) return;
    ndc.copy(base).setY(base.y + CHEST).project(camera);
    slots[i].set((ndc.x + 1) / 2 * size.x, (ndc.y + 1) / 2 * size.y, ndc.z * 0.5 + 0.5, k);
  });
}

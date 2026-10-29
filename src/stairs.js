// Treppen in der Nordwest-Ecke (docs/GDD.md, Raumtypen und Ebenen, „Treppen“): gerade Steintreppe aus KayKit `stairs`
// (data/models.json: treppe_hoch, treppe_runter), 3×3 Kacheln, läuft zur Nordwand. Nach oben (Vorkammer) steigt sie bis
// zur Wandoberkante und läuft oben in die Schattenfarbe aus. Nach unten (Abstieg, Bossraum nach dem Sieg) führt sie in ein
// Loch im Boden mit Steinkante, dunklen Innenwänden und kühlem Schimmer von unten. Im Bossraum liegt bis zum Sieg ein
// Metallgitter über dem Loch. Fehlt das Modell, entsteht die Treppe aus Grundformen.
import { mat, box, stone } from "./materials.js";
import { makeModel } from "./models.js";
const THREE = window.THREE;

export const SHADOW = 0x2a2230;  // Schattenfarbe aus dem Stilguide
const HALF = 1.5;                // halbe Breite der 3×3-Fläche (Kacheln)
const DEPTH = 2.5;               // Tiefe des Lochs
const GLOW = 0x6a8ea0;           // kühler Schimmer von unten (zwischen #4E6670 und #7FA6B8)
const HOVER = 0xe9a640;          // Aufhellen beim Überfahren (wie Truhe und Türen)

/**
 * Material, das je nach Höhe in der Welt in die Schattenfarbe übergeht: bei y = from noch unverändert, bei y = to ganz
 * Schattenfarbe (from > to: nach unten dunkler, from < to: nach oben dunkler).
 */
function fadeToShadow(m, from, to) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uShadow = { value: new THREE.Color(SHADOW) };
    sh.uniforms.uFade = { value: new THREE.Vector2(from, to) };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vWorldY;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vWorldY;\nuniform vec3 uShadow;\nuniform vec2 uFade;")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\n" +
        "float fadeF = smoothstep(0.0, 1.0, (vWorldY - uFade.x) / (uFade.y - uFade.x));\n" +
        "gl_FragColor.rgb = mix(gl_FragColor.rgb, uShadow, fadeF);");
  };
  m.customProgramCacheKey = () => "fadeToShadow";
  return m;
}

// Stufen aus Grundformen (Rückfall ohne Modell): wie das Modell, unterste Stufe an der Südkante, oberste an der Nordwand
function stepsFallback(down) {
  const g = new THREE.Group();
  const n = 10, d = 2 * HALF / n, rise = 2 / n;
  for (let i = 0; i < n; i++) {
    const top = down ? -i * rise : (i + 1) * rise;          // Oberkante der Stufe
    const bottom = down ? -2.2 : 0;
    g.add(box(2 * HALF, top - bottom, d, stone(), 0, (top + bottom) / 2, HALF - d / 2 - i * d));
  }
  return g;
}

// Treppe als Modell (oder Grundformen); jedes Material eigen, mit Verlauf zur Schattenfarbe
function stairsMesh(id, down, fade) {
  const g = makeModel(id, null, { unique: true }) || stepsFallback(down);
  const mats = [];
  g.traverse(n => {
    if (!n.isMesh) return;
    n.material = fadeToShadow(n.material.clone(), fade[0], fade[1]);
    n.material.emissive = new THREE.Color(HOVER);
    n.material.emissiveIntensity = 0;
    mats.push(n.material);
  });
  return { g, mats };
}

// Loch 3×3: Innenwände in der Schattenfarbe, Grund mit Verlauf, Steinkante an Süd- und Ostrand, kühles Licht unten
function hole(g, lightOn) {
  // Innenwände nur von innen sichtbar, sonst verdecken Süd- und Ostwand den Blick von oben in das Loch
  const wallMat = fadeToShadow(mat(0x4a4148), -0.2, -2.0);
  const plane = (w, x, z, rotY) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, DEPTH), wallMat);
    p.position.set(x, -DEPTH / 2, z);
    p.rotation.y = rotY;
    p.receiveShadow = true;
    p.userData.noOutline = true;
    g.add(p);
  };
  plane(2 * HALF, 0, -HALF, 0);             // Norden, zeigt nach Süden
  plane(2 * HALF, 0, HALF, Math.PI);        // Süden, zeigt nach Norden
  plane(2 * HALF, -HALF, 0, Math.PI / 2);   // Westen, zeigt nach Osten
  plane(2 * HALF, HALF, 0, -Math.PI / 2);   // Osten, zeigt nach Westen
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF, 2 * HALF), new THREE.MeshBasicMaterial({ color: SHADOW }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -DEPTH;
  floor.userData.noOutline = true;
  g.add(floor);
  // Steinkante an den offenen Rändern zum Raum (Süden, Osten); Nord- und Westrand liegen unter den Wänden
  const rimMat = stone();
  rimMat.emissive = new THREE.Color(HOVER);
  rimMat.emissiveIntensity = 0;
  g.add(box(2 * HALF + 0.2, 0.12, 0.2, rimMat, 0.1, 0.04, HALF));
  g.add(box(0.2, 0.12, 2 * HALF, rimMat, HALF, 0.04, 0));
  if (lightOn) {
    const light = new THREE.PointLight(GLOW, 2.2, 3, 2);
    light.position.set(0, -1.7, 0);
    g.add(light);
  }
  return rimMat;
}

// Metallgitter über dem Loch (Bossraum vor dem Sieg), begehbar
function grate(g) {
  const metal = mat(0x3a3836, { metalness: 0.5, roughness: 0.5 });
  const bars = 9, step = 2 * HALF / bars;
  for (let i = 0; i <= bars; i++) {
    const t = -HALF + i * step;
    g.add(box(2 * HALF, 0.05, 0.06, metal, 0, -0.01, t));
    g.add(box(0.06, 0.05, 2 * HALF, metal, t, -0.01, 0));
  }
  g.add(box(2 * HALF + 0.12, 0.08, 0.14, metal, 0.06, 0, HALF)); // Rahmen an den offenen Rändern
  g.add(box(0.14, 0.08, 2 * HALF, metal, HALF, 0, 0));
}

/**
 * Treppe bauen, Mittelpunkt der 3×3-Fläche im Ursprung.
 * kind: "up" (Vorkammer), "down" (Abstieg, Bossraum nach dem Sieg), "arena" (Bossraum vor dem Sieg: Loch mit Gitter)
 * Ergebnis: { group, hoverMats } (hoverMats nur bei "down")
 */
export function buildStairs(kind) {
  const group = new THREE.Group();
  if (kind === "up") {
    const s = stairsMesh("treppe_hoch", false, [1.5, 2.0]); // die obersten ein bis zwei Stufen laufen in den Schatten aus
    group.add(s.g);
    return { group, hoverMats: [] };
  }
  const s = stairsMesh("treppe_runter", true, [-0.6, -2.4]);
  group.add(s.g);
  const rim = hole(group, true);
  if (kind === "arena") grate(group);
  return { group, hoverMats: s.mats.concat([rim]) };
}

// Treppe nach unten im Raum? Dann fehlt auf der 3×3-Fläche der Boden
export const hasHole = (kind) => kind === "down" || kind === "arena";

// Modell-Lader (docs/GDD.md, Asset-Spezifikation): lädt die Modelle aus data/models.json einmal beim Start,
// setzt die Paletten-Textur des Themas und liefert pro Instanz einen Klon.
// Fehlt eine Datei oder schlägt das Laden fehl, gibt es kein Modell: Der Aufrufer baut das Teil wie bisher aus
// Grundformen. Die id wird dann einmal in der Konsole gemeldet.
const THREE = window.THREE;

let MODELS = {};
const scenes = new Map();   // Datei → geladene Szene
const missing = new Set();  // gemeldete ids
const materials = new Map(); // Thema → Material mit Paletten-Textur
let themeId = "keller";

const PALETTE_THEMES = ["keller"]; // Themen mit eigener Paletten-Textur; die anderen nutzen vorerst die des Kellers

const textures = new Map();
// Material mit der Paletten-Textur des Themas; tint ("#rrggbb") färbt ein Modell zusätzlich ein (etwa Holz für Kisten)
function paletteMaterial(theme, tint) {
  const t = PALETTE_THEMES.includes(theme) ? theme : "keller";
  const k = t + (tint || "");
  if (!materials.has(k)) {
    if (!textures.has(t)) {
      const tex = new THREE.TextureLoader().load("assets/textures/" + t + "/dungeon_texture.png");
      tex.flipY = false; // glTF-Koordinaten
      textures.set(t, tex);
    }
    materials.set(k, new THREE.MeshStandardMaterial({ map: textures.get(t), color: new THREE.Color(tint || "#ffffff"), roughness: 0.9, metalness: 0 }));
  }
  return materials.get(k);
}

// Beim Start: Zuordnung laden und alle Dateien vorladen. Fehler stoppen das Spiel nicht.
export async function loadModels() {
  try {
    const res = await fetch("data/models.json");
    MODELS = await res.json();
    delete MODELS._info;
  } catch (e) {
    console.warn("data/models.json fehlt, alle Teile bleiben Platzhalter");
    return;
  }
  if (!THREE.GLTFLoader) { console.warn("GLTFLoader fehlt, alle Teile bleiben Platzhalter"); return; }
  const loader = new THREE.GLTFLoader();
  const files = [...new Set(Object.values(MODELS).map(m => m.file))];
  await Promise.all(files.map(f => new Promise(resolve => {
    loader.load(f, (gltf) => { scenes.set(f, gltf.scene); resolve(); }, undefined, () => resolve());
  })));
  paletteMaterial(themeId);
}

export function setModelTheme(theme) { themeId = theme || "keller"; }

// Zuordnung einer id, mit Variante: zuerst <id>_<variante>, sonst die Grunddatei
export function modelEntry(id, variant) {
  if (variant && MODELS[id + "_" + variant] && scenes.has(MODELS[id + "_" + variant].file)) return MODELS[id + "_" + variant];
  const m = MODELS[id];
  if (m && scenes.has(m.file)) return m;
  if (!missing.has(id)) { missing.add(id); console.info("Platzhalter für " + id + (m ? " (Datei lädt nicht: " + m.file + ")" : "")); }
  return null;
}

export const hasModel = (id, variant) => !!modelEntry(id, variant);

const vec = (v, d) => (Array.isArray(v) ? v : [v === undefined ? d : v, v === undefined ? d : v, v === undefined ? d : v]);

/**
 * Klon eines Modells als Gruppe mit Ursprung am Boden; null, wenn es kein Modell gibt (dann Platzhalter bauen).
 * entry.tint färbt das Modell ein. opts.unique: eigene Materialien (für Hervorheben beim Überfahren). opts.lights: Liste, in die Lichter kommen.
 */
export function makeModel(id, variant, opts) {
  const entry = modelEntry(id, variant);
  if (!entry) return null;
  opts = opts || {};
  const inner = scenes.get(entry.file).clone(true);
  const s = vec(entry.scale, 1), r = vec(entry.rotation, 0), o = entry.offset || [0, 0, 0];
  inner.scale.set(s[0], s[1], s[2]);
  inner.rotation.set(r[0] * Math.PI / 180, r[1] * Math.PI / 180, r[2] * Math.PI / 180);
  inner.position.set(o[0], o[1], o[2]);
  const mat = entry.palette !== false ? paletteMaterial(themeId, entry.tint) : null;
  inner.traverse(n => {
    if (!n.isMesh) return;
    if (mat) n.material = opts.unique ? mat.clone() : mat;
    else if (opts.unique) n.material = n.material.clone();
    n.castShadow = true;
    n.receiveShadow = true;
  });
  const g = new THREE.Group();
  g.add(inner);
  (entry.lights || []).forEach(l => {
    const light = new THREE.PointLight(new THREE.Color(l.color), l.intensity, l.distance, 2);
    light.position.set(...l.offset);
    g.add(light);
    if (opts.lights) opts.lights.push(light);
  });
  return g;
}

// Teilknoten eines Modells finden (etwa den Deckel der Truhe)
export function findPart(group, name) {
  let found = null;
  group.traverse(n => { if (!found && n.name === name) found = n; });
  return found;
}

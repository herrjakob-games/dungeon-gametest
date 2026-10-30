// Modell-Lader (docs/GDD.md, Asset-Spezifikation): lädt die Modelle aus data/models.json einmal beim Start,
// setzt die Paletten-Textur des Themas und liefert pro Instanz einen Klon.
// Fehlt eine Datei oder schlägt das Laden fehl, gibt es kein Modell: Der Aufrufer baut das Teil wie bisher aus
// Grundformen. Die id wird dann einmal in der Konsole gemeldet.
import { ACCESSORIES } from "./monsterFigures.js";
const THREE = window.THREE;

let MODELS = {};
const scenes = new Map();   // Datei → geladene Szene
const clips = new Map();    // Datei → Animationen
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

// Einfarbiges Material (entry.color), einmal pro Farbe
const solids = new Map();
function solidMaterial(color) {
  if (!solids.has(color)) solids.set(color, new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.85, metalness: 0 }));
  return solids.get(color);
}

// Material einer Figur mit eigener, angepasster Textur (entry.texture), einmal pro Ausgangsmaterial und Datei
const textured = new Map();
function textureMaterial(base, file) {
  const k = base.uuid + file;
  if (!textured.has(k)) {
    if (!textures.has(file)) {
      const tex = new THREE.TextureLoader().load(file);
      tex.flipY = false; // glTF-Koordinaten
      tex.encoding = THREE.sRGBEncoding; // wie Texturen aus dem GLTFLoader
      textures.set(file, tex);
    }
    const m = base.clone();
    m.map = textures.get(file);
    m.color.set("#ffffff");
    m.needsUpdate = true;
    textured.set(k, m);
  }
  return textured.get(k);
}

// Beim Start: Zuordnung laden und alle Dateien vorladen. Fehler stoppen das Spiel nicht.
export async function loadModels() {
  try {
    const res = await fetch("data/models.json", { cache: "no-cache" });
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
    loader.load(f, (gltf) => { scenes.set(f, gltf.scene); clips.set(f, gltf.animations || []); resolve(); }, undefined, () => resolve());
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

// Hat das Modell einer Figur diese Animation (Name im Spiel, etwa "sit")? Ohne Modell: nein
export function hasAnimation(id, variant, name) {
  const v = variant && MODELS[id + "_" + variant] ? MODELS[id + "_" + variant] : MODELS[id];
  if (!v || !scenes.has(v.file) || !(v.animations || {})[name]) return false;
  return (clips.get(v.file) || []).some(c => c.name === v.animations[name]);
}

// Zubehör aus Grundformen an einen Knochen hängen (Kochmütze, Krone, Augen): offset und size in Kacheln, gemessen in
// der Grundhaltung der Figur; der Knochen trägt es beim Animieren mit.
function attachAccessories(g, inner, list) {
  g.updateMatrixWorld(true);
  list.forEach(a => {
    const name = THREE.PropertyBinding.sanitizeNodeName(a.bone);
    let bone = null;
    inner.traverse(n => { if (!bone && n.name === name) bone = n; });
    const build = ACCESSORIES[a.shape];
    if (!bone || !build) { console.warn("Zubehör " + a.shape + " an " + a.bone + " fehlt"); return; }
    // Lage in der Welt (am Knochen plus offset, ungedreht, Größe size) in den Raum des Knochens umrechnen; so stimmt
    // das Zubehör auch bei ungleichem Maßstab der Figur (etwa der breitere Zwerg)
    const o = build(a);
    const at = bone.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(...(a.offset || [0, 0, 0])));
    const world = new THREE.Matrix4().compose(at, new THREE.Quaternion(), new THREE.Vector3().setScalar(a.size || 1));
    new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(world).decompose(o.position, o.quaternion, o.scale);
    o.traverse(n => { if (n.isMesh) n.castShadow = true; });
    bone.add(o);
  });
}

const vec = (v, d) => (Array.isArray(v) ? v : [v === undefined ? d : v, v === undefined ? d : v, v === undefined ? d : v]);

/**
 * Klon eines Modells als Gruppe mit Ursprung am Boden; null, wenn es kein Modell gibt (dann Platzhalter bauen).
 * entry.tint färbt das Modell ein. opts.unique: eigene Materialien (für Hervorheben beim Überfahren). opts.lights: Liste, in die Lichter kommen.
 */
export function makeModel(id, variant, opts) {
  const entry = modelEntry(id, variant);
  if (!entry) return null;
  opts = opts || {};
  const src = scenes.get(entry.file);
  // Figuren mit Skelett brauchen SkeletonUtils, sonst hängen die Klone am Skelett des Originals
  let skinned = false;
  src.traverse(n => { if (n.isSkinnedMesh) skinned = true; });
  const inner = skinned && THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(src) : src.clone(true);
  const s = vec(entry.scale, 1), r = vec(entry.rotation, 0), o = entry.offset || [0, 0, 0];
  inner.scale.set(s[0], s[1], s[2]);
  inner.rotation.set(r[0] * Math.PI / 180, r[1] * Math.PI / 180, r[2] * Math.PI / 180);
  inner.position.set(o[0], o[1], o[2]);
  // color: eine Farbe ohne Textur (etwa der Knochenthron), sonst Paletten-Textur des Themas
  const mat = entry.color ? solidMaterial(entry.color) : entry.palette !== false ? paletteMaterial(themeId, entry.tint) : null;
  inner.traverse(n => {
    if (!n.isMesh) return;
    if (mat) n.material = opts.unique ? mat.clone() : mat;
    else if (entry.texture) n.material = textureMaterial(n.material, entry.texture);
    else if (opts.unique) n.material = n.material.clone();
    n.castShadow = true;
    n.receiveShadow = true;
    if (n.isSkinnedMesh) n.frustumCulled = false; // Grenzen stammen aus der Grundhaltung, beim Laufen sonst Flackern
  });
  if (entry.opacity !== undefined && entry.opacity < 1) seeThrough(inner, entry.opacity);
  const g = new THREE.Group();
  g.add(inner);
  if (entry.accessories) attachAccessories(g, inner, entry.accessories);
  (entry.lights || []).forEach(l => {
    const light = new THREE.PointLight(new THREE.Color(l.color), l.intensity, l.distance, 2);
    light.position.set(...l.offset);
    g.add(light);
    if (opts.lights) opts.lights.push(light);
  });
  return g;
}

/**
 * Ganze Figur durchscheinend (entry.opacity, etwa Geister): Jedes Teil bekommt einen unsichtbaren Zwilling, der vorher nur die
 * Tiefe schreibt. So zeichnet sich nur die vorderste Fläche und innere Teile (Arm im Körper, Rückseite des Umhangs) bleiben verborgen.
 */
const glassy = new Map();
function seeThrough(root, opacity) {
  const meshes = [];
  root.traverse(n => { if (n.isMesh) meshes.push(n); });
  meshes.forEach(n => {
    const k = n.material.uuid + ":" + opacity;
    if (!glassy.has(k)) {
      const m = n.material.clone();
      m.transparent = true;
      m.opacity = opacity;
      const depth = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, side: m.side, skinning: !!n.isSkinnedMesh });
      glassy.set(k, { m, depth });
    }
    const { m, depth } = glassy.get(k);
    n.material = m;
    n.renderOrder = 2;
    const twin = n.isSkinnedMesh ? new THREE.SkinnedMesh(n.geometry, depth) : new THREE.Mesh(n.geometry, depth);
    if (n.isSkinnedMesh) twin.bind(n.skeleton, n.bindMatrix);
    twin.position.copy(n.position);
    twin.quaternion.copy(n.quaternion);
    twin.scale.copy(n.scale);
    twin.renderOrder = 1;
    twin.frustumCulled = n.frustumCulled;
    twin.userData.noOutline = true;
    n.parent.add(twin);
  });
}

// Teilknoten eines Modells finden (etwa den Deckel der Truhe)
export function findPart(group, name) {
  let found = null;
  group.traverse(n => { if (!found && n.name === name) found = n; });
  return found;
}

/**
 * Figur mit Animationen (docs/GDD.md, Asset-Spezifikation): Modell, Mixer und Steuerung mit den Namen im Spiel
 * (idle, walk, attack, hit, death, interact). Null, wenn es kein Modell gibt (dann Platzhalter aus Grundformen).
 * - loop(name): Dauerschleife (idle, walk); wird ignoriert, solange eine einmalige Animation läuft.
 * - once(name): spielt einmal (attack, hit), danach wieder die Dauerschleife; death bleibt am Ende stehen.
 * - has(name): gibt es die Animation? duration(name): Länge in Sekunden.
 * update(dt) pro Frame.
 */
export function makeFigureModel(id, variant) {
  const entry = modelEntry(id, variant);
  if (!entry || !THREE.AnimationMixer) return null;
  const object = makeModel(id, variant);
  const mixer = new THREE.AnimationMixer(object);
  const list = clips.get(entry.file) || [];
  const names = entry.animations || {};
  const clipOf = (name) => (names[name] ? THREE.AnimationClip.findByName(list, names[name]) : null);
  let current = null, loopName = null, busy = false, dead = false;
  function start(name, once) {
    const clip = clipOf(name);
    if (!clip) return false;
    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = once;
    action.play();
    if (current && current !== action) action.crossFadeFrom(current, 0.15, false);
    current = action;
    return true;
  }
  mixer.addEventListener("finished", () => {
    if (dead) return;
    busy = false;
    const back = loopName;
    loopName = null;
    loop(back || "idle");
  });
  function loop(name) {
    if (busy || dead || name === loopName) return;
    if (!clipOf(name)) name = "idle";
    if (name === loopName) return;
    if (start(name, false)) loopName = name;
  }
  function once(name) {
    if (dead) return false;
    if (!start(name, true)) return false;
    busy = true;
    if (name === "death") dead = true;
    return true;
  }
  loop("idle");
  // Stand der Dauerschleife von 0 bis 1 (für Schritte im Takt der Laufanimation), sonst null
  const phase = (name) => (loopName === name && !busy && current ? (current.time % current.getClip().duration) / current.getClip().duration : null);
  return {
    object, mixer, loop, once, phase,
    has: (name) => !!clipOf(name),
    duration: (name) => (clipOf(name) ? clipOf(name).duration : 0),
    animated: list.length > 0,
    update: (dt) => mixer.update(dt)
  };
}

// Goldene Umrisslinie für anklickbare Objekte beim Überfahren mit der Maus (Stilguide, Lesbarkeit).
// Jedes Teil bekommt eine etwas aufgeblähte Kopie, von der nur die Rückseite gezeichnet wird.
const THREE = window.THREE;

const GOLD = 0xf2c14e;
const outlineMat = new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color(GOLD) }, thickness: { value: 0.035 } },
  vertexShader: `
    uniform float thickness;
    void main() {
      vec3 p = position + normalize(normal) * thickness;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: `
    uniform vec3 color;
    void main() { gl_FragColor = vec4(color, 1.0); }`,
  side: THREE.BackSide
});

// Umriss ein- oder ausschalten; wird beim ersten Einschalten gebaut
export function setOutline(obj, on) {
  if (!obj) return;
  if (!obj.userData.outline) {
    if (!on) return;
    const parts = [];
    obj.traverse(n => {
      if (!n.isMesh || !n.geometry || !n.geometry.attributes.normal || n.userData.isOutline || n.userData.noOutline) return;
      if (n.material && (n.material.transparent || n.material.isMeshBasicMaterial)) return; // Flammen und Schimmer nicht
      const o = new THREE.Mesh(n.geometry, outlineMat);
      o.userData.isOutline = true;
      o.userData.sharedGeometry = true;
      o.raycast = () => {}; // der Umriss soll keine Klicks abfangen
      n.add(o);
      parts.push(o);
    });
    obj.userData.outline = parts;
  }
  obj.userData.outline.forEach(o => { o.visible = on; });
}

// Umrisslinie um die Silhouette eines Teils (docs/GDD.md, Lesbarkeit: Türen). OutlinePass aus three.js r128
// (vendor/three/OutlinePass.js): Kanten nur außen um das gewählte Teil, keine Linien über Flächen. Wo andere Teile
// (etwa der Türrahmen) es verdecken, bleibt die Linie unsichtbar (hiddenEdgeColor schwarz, additiv gemischt).
// Der Raum wird wie bisher direkt gezeichnet; die Linie kommt danach obendrauf (drawSilhouette in der Spielschleife).
let pass = null;
let silhouette = null;
const passSize = new THREE.Vector2();

export function setSilhouette(obj) { silhouette = obj || null; }

export function drawSilhouette(renderer, scene, camera) {
  if (!silhouette || !THREE.OutlinePass) return;
  renderer.getDrawingBufferSize(passSize);
  if (!pass) {
    pass = new THREE.OutlinePass(passSize.clone(), scene, camera);
    pass.visibleEdgeColor.setHex(GOLD);
    pass.hiddenEdgeColor.setHex(0x000000);
    pass.edgeStrength = 4;
    pass.edgeThickness = 1;
    pass.edgeGlow = 0;
    pass.pulsePeriod = 0;
    pass.size = passSize.clone();
  } else if (!pass.size.equals(passSize)) {
    pass.setSize(passSize.x, passSize.y);
    pass.size.copy(passSize);
  }
  pass.renderCamera = camera;
  pass.selectedObjects = [silhouette];
  // readBuffer null: die Linie wird additiv direkt auf das fertige Bild gezeichnet
  pass.render(renderer, null, null, 0, false);
  renderer.setRenderTarget(null);
}

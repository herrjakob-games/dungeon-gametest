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

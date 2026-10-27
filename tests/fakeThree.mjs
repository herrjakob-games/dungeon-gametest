// Einfacher Ersatz für Three.js in Node-Tests: zählt, was gebaut wird, ohne zu zeichnen.
class Vec {
  constructor() { this.x = 0; this.y = 0; this.z = 0; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(s) { return this.set(s, s, s); }
}
class Obj {
  constructor() { this.children = []; this.position = new Vec(); this.rotation = new Vec(); this.scale = new Vec().setScalar(1); this.userData = {}; }
  add(...o) { this.children.push(...o); return this; }
  remove(o) { this.children = this.children.filter(c => c !== o); }
  traverse(fn) { fn(this); this.children.forEach(c => c.traverse ? c.traverse(fn) : fn(c)); }
}
class Mesh extends Obj { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
class Geometry { constructor(...args) { this.args = args; } dispose() {} }
class Color {
  constructor(c) { this.c = c || 0; }
  setHSL() { return this; } offsetHSL() { return this; } multiplyScalar() { return this; }
  getHex() { return this.c; } setHex(c) { this.c = c; return this; }
}
class Material { constructor(o) { Object.assign(this, o || {}); this.color = new Color(); this.emissive = new Color(); } clone() { return new Material(this); } }

const geos = ["BoxGeometry", "CylinderGeometry", "SphereGeometry", "ConeGeometry", "TorusGeometry", "OctahedronGeometry",
  "DodecahedronGeometry", "IcosahedronGeometry", "PlaneGeometry"];
export const FakeThree = { Group: Obj, Object3D: Obj, Mesh, Color, MeshStandardMaterial: Material, MeshBasicMaterial: Material,
  PointLight: Obj, DoubleSide: 2 };
geos.forEach(g => { FakeThree[g] = Geometry; });

// Zählt alle Teile einer Figur
export const countMeshes = (o) => { let n = 0; o.traverse(x => { if (x instanceof Mesh) n++; }); return n; };

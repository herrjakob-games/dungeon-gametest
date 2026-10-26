// Spielfiguren der drei Völker aus Grundformen (Platzhalter bis Meilenstein 6).
// Jede Figur steht mit den Füßen auf y = 0 und schaut in Richtung +z.
import { mat } from "./materials.js";
const THREE = window.THREE;

// Hilfsfunktion: Teil erzeugen, platzieren und zur Gruppe hinzufügen
function partMaker(group) {
  return (geo, m, x, y, z) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    group.add(o);
    return o;
  };
}

// Zwerg: stämmig, Kettenhemd mit Brustplatte, Hörnerhelm, langer brauner Bart, Axt
function buildDwarf() {
  const g = new THREE.Group();
  const part = partMaker(g);
  const steel = mat(0x9aa1a8, { metalness: 0.55, roughness: 0.45 });
  const steelDark = mat(0x5e636a, { metalness: 0.5, roughness: 0.55 });
  const leather = mat(0x5a3a22);
  const beardMat = mat(0x6b4226);
  const skin = mat(0xd9a582);
  // Stiefel
  part(new THREE.BoxGeometry(0.16, 0.22, 0.22), leather, -0.11, 0.11, 0.03);
  part(new THREE.BoxGeometry(0.16, 0.22, 0.22), leather, 0.11, 0.11, 0.03);
  // Rumpf mit Kettenhemd und Brustplatte, Gürtel mit Schnalle
  part(new THREE.CylinderGeometry(0.27, 0.33, 0.44, 8), steelDark, 0, 0.44, 0);
  part(new THREE.BoxGeometry(0.38, 0.26, 0.1), steel, 0, 0.52, 0.24);
  part(new THREE.CylinderGeometry(0.335, 0.335, 0.07, 8), leather, 0, 0.27, 0);
  part(new THREE.BoxGeometry(0.12, 0.09, 0.04), mat(0xd8b56a), 0, 0.27, 0.33);
  // Schulterpanzer, Arme, Hände
  [-1, 1].forEach(s => {
    part(new THREE.SphereGeometry(0.13, 8, 6), steel, s * 0.32, 0.62, 0);
    part(new THREE.BoxGeometry(0.12, 0.3, 0.12), steelDark, s * 0.36, 0.45, 0.02);
    part(new THREE.IcosahedronGeometry(0.07, 0), skin, s * 0.36, 0.28, 0.05);
  });
  // Kopf, Nase, Bart, Schnurrbart
  part(new THREE.IcosahedronGeometry(0.17, 0), skin, 0, 0.8, 0.02);
  part(new THREE.BoxGeometry(0.07, 0.08, 0.07), mat(0xc98a68), 0, 0.79, 0.18);
  const beard = part(new THREE.ConeGeometry(0.17, 0.52, 7), beardMat, 0, 0.53, 0.17);
  beard.rotation.x = Math.PI - 0.15;
  part(new THREE.BoxGeometry(0.26, 0.05, 0.06), beardMat, 0, 0.74, 0.17);
  // Helm mit Rand, Nasenschutz und Hörnern
  part(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), steel, 0, 0.86, 0.01);
  part(new THREE.CylinderGeometry(0.215, 0.215, 0.05, 10), steelDark, 0, 0.87, 0.01);
  part(new THREE.BoxGeometry(0.04, 0.14, 0.03), steel, 0, 0.83, 0.21);
  [-1, 1].forEach(s => {
    const horn = part(new THREE.ConeGeometry(0.05, 0.22, 6), mat(0xe6dcc4), s * 0.22, 0.99, 0);
    horn.rotation.z = -s * 0.9;
  });
  // Axt in der rechten Hand
  part(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), mat(0x7a4a26), 0.36, 0.4, 0.12);
  part(new THREE.BoxGeometry(0.04, 0.2, 0.18), steel, 0.36, 0.67, 0.22);
  return g;
}

// Elf: schlank und groß, grüne Kleidung mit Kapuzenumhang, helles langes Haar, spitze Ohren, Bogen und Köcher
function buildElf() {
  const g = new THREE.Group();
  const part = partMaker(g);
  const green = mat(0x3f7a3a);
  const greenDark = mat(0x2a5229);
  const leather = mat(0x6b4a2b);
  const skin = mat(0xf0cfb0);
  const hair = mat(0xe8d38a);
  const wood = mat(0x8a5a2e);
  // Stiefel und Beine
  [-1, 1].forEach(s => {
    part(new THREE.BoxGeometry(0.11, 0.2, 0.16), leather, s * 0.08, 0.1, 0.02);
    part(new THREE.BoxGeometry(0.1, 0.3, 0.1), greenDark, s * 0.08, 0.35, 0);
  });
  // Tunika mit Gürtel
  part(new THREE.CylinderGeometry(0.17, 0.24, 0.5, 8), green, 0, 0.72, 0);
  part(new THREE.CylinderGeometry(0.185, 0.185, 0.05, 8), leather, 0, 0.62, 0);
  part(new THREE.BoxGeometry(0.07, 0.07, 0.04), mat(0xd8b56a), 0, 0.62, 0.18);
  // Umhang am Rücken
  const cloak = part(new THREE.BoxGeometry(0.36, 0.62, 0.05), greenDark, 0, 0.72, -0.2);
  cloak.rotation.x = 0.08;
  // Arme und Hände
  [-1, 1].forEach(s => {
    part(new THREE.BoxGeometry(0.08, 0.38, 0.08), green, s * 0.23, 0.8, 0.01);
    part(new THREE.IcosahedronGeometry(0.05, 0), skin, s * 0.23, 0.58, 0.03);
  });
  // Hals, Kopf, Nase
  part(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 6), skin, 0, 1.01, 0);
  part(new THREE.IcosahedronGeometry(0.14, 0), skin, 0, 1.15, 0.01);
  part(new THREE.BoxGeometry(0.04, 0.06, 0.05), mat(0xe3b897), 0, 1.13, 0.14);
  // Spitze Ohren
  [-1, 1].forEach(s => {
    const ear = part(new THREE.ConeGeometry(0.035, 0.16, 5), skin, s * 0.15, 1.18, -0.01);
    ear.rotation.z = -s * 1.15;
  });
  // Langes Haar: Oberkopf und Strähne über den Rücken
  part(new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.17, -0.01);
  const braid = part(new THREE.ConeGeometry(0.11, 0.5, 6), hair, 0, 0.95, -0.12);
  braid.rotation.x = Math.PI + 0.12;
  // Kapuze, im Nacken zurückgeschlagen
  part(new THREE.IcosahedronGeometry(0.12, 0), greenDark, 0, 1.03, -0.17);
  // Köcher mit Pfeilen auf dem Rücken
  const quiver = part(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), leather, 0.1, 0.9, -0.25);
  quiver.rotation.z = -0.35;
  [-0.02, 0.02].forEach(o => {
    const arrow = part(new THREE.BoxGeometry(0.03, 0.08, 0.03), mat(0xf0e5d3), 0.19 + o, 1.12, -0.25);
    arrow.rotation.z = -0.35;
  });
  // Bogen in der linken Hand
  const bow = part(new THREE.TorusGeometry(0.36, 0.018, 4, 14, Math.PI), wood, -0.26, 0.6, 0.06);
  bow.rotation.set(0, -Math.PI / 2, -Math.PI / 2); // Bogen senkrecht, Wölbung nach vorne
  part(new THREE.CylinderGeometry(0.004, 0.004, 0.71, 3), mat(0xf0e5d3), -0.26, 0.6, 0.06);
  return g;
}

// Mensch: blaue Robe bis zum Boden, spitzer Hut mit Krempe, kurzer Bart, Stab mit leuchtendem Kristall
function buildHuman() {
  const g = new THREE.Group();
  const part = partMaker(g);
  const blue = mat(0x2f5aa8);
  const blueDark = mat(0x22417a);
  const skin = mat(0xe2b48c);
  const gold = mat(0xd8b56a);
  // Schuhspitzen unter der Robe
  [-1, 1].forEach(s => part(new THREE.BoxGeometry(0.1, 0.06, 0.14), mat(0x4a3424), s * 0.08, 0.03, 0.12));
  // Robe: weit nach unten, Saum und Kordelgürtel
  part(new THREE.CylinderGeometry(0.17, 0.3, 0.86, 9), blue, 0, 0.45, 0);
  part(new THREE.CylinderGeometry(0.305, 0.305, 0.05, 9), blueDark, 0, 0.04, 0);
  part(new THREE.CylinderGeometry(0.205, 0.205, 0.05, 9), gold, 0, 0.66, 0);
  // Schultern und weite Ärmel
  part(new THREE.SphereGeometry(0.2, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), blue, 0, 0.86, 0);
  [-1, 1].forEach(s => {
    const sleeve = part(new THREE.CylinderGeometry(0.06, 0.1, 0.38, 7), blue, s * 0.24, 0.72, 0.02);
    sleeve.rotation.z = s * 0.12;
    part(new THREE.IcosahedronGeometry(0.055, 0), skin, s * 0.27, 0.51, 0.04);
  });
  // Kopf, Nase, kurzer Bart
  part(new THREE.IcosahedronGeometry(0.15, 0), skin, 0, 1.03, 0.01);
  part(new THREE.BoxGeometry(0.05, 0.07, 0.06), mat(0xc98a68), 0, 1.01, 0.15);
  const beard = part(new THREE.ConeGeometry(0.11, 0.22, 7), mat(0x5a4632), 0, 0.89, 0.09);
  beard.rotation.x = Math.PI - 0.2;
  // Spitzer Hut mit Krempe, Spitze leicht geknickt
  part(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), blueDark, 0, 1.15, 0);
  part(new THREE.CylinderGeometry(0.155, 0.155, 0.05, 12), gold, 0, 1.19, 0);
  const crown = part(new THREE.ConeGeometry(0.16, 0.38, 10), blueDark, 0, 1.35, -0.01);
  crown.rotation.x = -0.06;
  const tip = part(new THREE.ConeGeometry(0.07, 0.2, 8), blueDark, 0.01, 1.58, -0.07);
  tip.rotation.x = -0.55;
  // Stab in der rechten Hand mit leuchtendem Kristall
  part(new THREE.CylinderGeometry(0.022, 0.026, 1.25, 6), mat(0x7a4a26), 0.27, 0.62, 0.06);
  const crystal = part(
    new THREE.OctahedronGeometry(0.08),
    mat(0x9fd0ff, { emissive: 0x6fb6ff, emissiveIntensity: 0.9, roughness: 0.3 }),
    0.27, 1.32, 0.06
  );
  crystal.castShadow = false;
  return g;
}

export const FIGURES = { zwerg: buildDwarf, elf: buildElf, mensch: buildHuman };

// Neue Figur für ein Volk ("zwerg", "elf", "mensch")
export function buildFigure(volk) {
  return (FIGURES[volk] || buildDwarf)();
}

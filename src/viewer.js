import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ellipse } from './pattern.js';

const segments = 64;
const rows = 64;
const inches = 0.0254;

function surface(material) {
  const geometry = new THREE.BufferGeometry();
  const vertices = new THREE.Float32BufferAttribute(new Float32Array((rows + 1) * segments * 3), 3);
  vertices.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', vertices);
  const indices = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < segments; column++) {
      const a = row * segments + column;
      const b = row * segments + (column + 1) % segments;
      indices.push(a, b, a + segments, b, b + segments, a + segments);
    }
  }
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

function shape(mesh, rings, motion = 0, fabricMotion = null) {
  const position = mesh.geometry.attributes.position;
  let section = 0;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    while (section < rings.length - 2 && t > rings[section + 1][0]) section++;
    const [start, ...from] = rings[section];
    const [end, ...to] = rings[section + 1];
    const u = (t - start) / (end - start);
    const [cx, y, cz, width, depth] = from.map((value, index) => THREE.MathUtils.lerp(value, to[index], u));
    const bend = Math.sin(Math.PI * t) * motion;
    for (let column = 0; column < segments; column++) {
      const angle = column / segments * Math.PI * 2;
      const folds = fabricMotion !== null
        ? (0.0007 + 0.003 * Math.abs(fabricMotion) * Math.exp(-((t - 0.53) ** 2) / 0.025))
          * (Math.sin(55 * t + 3 * Math.cos(angle)) + 0.25 * Math.cos(5 * angle + 16 * t))
        : 0;
      position.setXYZ(row * segments + column,
        cx + (width + folds) * Math.cos(angle),
        y - 0.035 * bend,
        cz + 0.17 * bend + (depth + folds) * Math.sin(angle));
    }
  }
  position.needsUpdate = true;
}

// Split the seat ring into two half-rings. A shared front-to-back curve
// completes both leg openings and gives the jeans a continuous crotch.
function joinJeans(seat, left, right, material) {
  const panels = [seat, left, right];
  const seatEnd = rows * segments;
  const half = segments / 2;
  const panelSize = (rows + 1) * segments;
  const crotchStart = panelSize;
  let next = panelSize + half - 1;
  const geometry = new THREE.BufferGeometry();
  const index = [];
  const maps = panels.map((panel, panelIndex) => {
    const start = panelIndex === 1 ? segments / 4 : 3 * segments / 4;
    return Array.from({ length: panelSize }, (_, vertex) => {
      if (panelIndex === 0) return vertex;
      if (vertex >= segments) return next++;
      const arc = (vertex - start + segments) % segments;
      if (arc <= half) return seatEnd + vertex;
      const bridge = arc - half;
      return crotchStart + (panelIndex === 1 ? bridge : half - bridge) - 1;
    });
  });
  panels.forEach((panel, i) => {
    for (const vertex of panel.geometry.index.array) index.push(maps[i][vertex]);
  });
  const positions = new THREE.BufferAttribute(new Float32Array(next * 3), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positions);
  geometry.setIndex(index);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  function update() {
    const seatPositions = seat.geometry.attributes.position;
    positions.array.set(seatPositions.array);
    const front = seatEnd + segments / 4;
    const back = seatEnd + 3 * segments / 4;
    for (let point = 1; point < half; point++) {
      const t = point / half;
      const blend = (1 - Math.cos(Math.PI * t)) / 2;
      positions.setXYZ(crotchStart + point - 1, 0,
        THREE.MathUtils.lerp(positions.getY(back), positions.getY(front), blend) - 0.045 * Math.sin(Math.PI * t),
        THREE.MathUtils.lerp(positions.getZ(back), positions.getZ(front), blend));
    }
    panels.slice(1).forEach((panel, i) => {
      const source = panel.geometry.attributes.position;
      const map = maps[i + 1];
      for (let vertex = segments; vertex < panelSize; vertex++) {
        const row = Math.floor(vertex / segments);
        const blend = THREE.MathUtils.smoothstep(row / rows, 0, 0.24);
        const join = map[vertex % segments];
        positions.setXYZ(map[vertex],
          THREE.MathUtils.lerp(positions.getX(join), source.getX(vertex), blend),
          THREE.MathUtils.lerp(positions.getY(join), source.getY(vertex), blend) - 0.16 * (row / rows) * (1 - blend),
          THREE.MathUtils.lerp(positions.getZ(join), source.getZ(vertex), blend));
      }
    });
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  return { mesh, update };
}

function ring(t, x, y, circumference, ratio, z = 0) {
  return [t, x, y, z, ...ellipse(circumference, ratio)];
}

export function createViewer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.03, 30);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 1.1;
  controls.maxDistance = 4;
  controls.maxPolarAngle = Math.PI * 0.56;
  function reset() {
    camera.position.set(1.02, 1.26, 2.22);
    controls.target.set(0, 0.74, 0);
    controls.update();
  }
  reset();

  scene.add(new THREE.HemisphereLight(0xffffff, 0xa7a998, 2.2));
  const key = new THREE.DirectionalLight(0xfff4dc, 2.7);
  key.position.set(3, 5, 4);
  scene.add(key);

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xb7a492, side: THREE.DoubleSide });
  const denimMaterial = new THREE.MeshStandardMaterial({ color: 0x26496b, roughness: 0.94, side: THREE.DoubleSide });
  // Render only the exposed body surfaces when clothing is selected.
  const waistCut = new THREE.Plane(new THREE.Vector3(0, 1, 0));
  const hemCut = new THREE.Plane(new THREE.Vector3(0, -1, 0));
  const torsoMaterial = bodyMaterial.clone();
  const legMaterial = bodyMaterial.clone();
  const torso = surface(torsoMaterial);
  const hips = surface(denimMaterial);
  const legs = [-1, 1].map(side => ({
    side,
    body: surface(legMaterial),
    denim: surface(denimMaterial),
    foot: new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), bodyMaterial),
  }));
  const jeans = joinJeans(hips, legs[0].denim, legs[1].denim, denimMaterial);
  scene.add(torso, jeans.mesh, ...legs.flatMap(({ body, foot }) => [body, foot]));

  let measurements;
  let pattern;
  let bent = false;
  let pose = 0;
  let velocity = 0;
  let fabric = 0;
  let dirty = true;

  function reshape() {
    const { waist, hip, thigh, inseam } = measurements;
    const crotch = inseam * inches + 0.07;
    const waistY = crotch + 0.24;
    const hemY = pattern
      ? THREE.MathUtils.clamp(crotch - pattern.inseam * inches, 0.045, crotch - 0.2)
      : 0;
    torsoMaterial.clippingPlanes = pattern ? [waistCut] : null;
    legMaterial.clippingPlanes = pattern ? [hemCut] : null;
    waistCut.constant = -waistY;
    hemCut.constant = hemY;
    const [hipRadius] = ellipse(hip, 0.69);
    const [thighRadius] = ellipse(thigh, 0.86);
    const legOffset = Math.max(hipRadius * 0.49, thighRadius * 0.91);
    shape(torso, [
      ring(0, 0, waistY + 0.31, 0.1, 0.73),
      ring(0.08, 0, waistY + 0.30, waist * 1.04, 0.73),
      ring(0.40, 0, waistY + 0.13, waist * 1.06, 0.73),
      ring(0.57, 0, waistY, waist, 0.73),
      ring(0.83, 0, crotch + 0.10, hip, 0.69),
      ring(1, 0, crotch - 0.02, hip * 0.69, 0.60),
    ]);
    torso.geometry.computeVertexNormals();
    jeans.mesh.visible = Boolean(pattern);
    const clearance = (garment, body) => Math.max(garment, body + 0.85);
    if (pattern) {
      shape(hips, [
        ring(0, 0, waistY, clearance(pattern.waist, waist), 0.73),
        ring(0.16, 0, waistY - 0.037, clearance(pattern.waist, waist) + 0.35, 0.73),
        ring(0.59, 0, crotch + 0.10, clearance(pattern.hip, hip), 0.69),
        ring(1, 0, crotch + 0.048, clearance(pattern.hip, hip) * 0.96, 0.69),
      ]);
    }

    for (const { side, body, denim, foot } of legs) {
      const x = side * legOffset;
      const knee = thigh * 0.66;
      const ankle = thigh * 0.39;
      const kneeY = crotch - inseam * inches * 0.49;
      shape(body, [
        ring(0, x, crotch + 0.065, thigh * 0.78, 0.86),
        ring(0.12, x, crotch - 0.025, thigh, 0.86),
        ring(0.52, x * 1.04, kneeY, knee, 0.86),
        ring(0.68, x * 1.06, kneeY - 0.12, thigh * 0.70, 0.86),
        ring(1, x * 1.1, 0.068, ankle, 0.86),
      ], pose);
      body.geometry.computeVertexNormals();
      foot.position.set(x * 1.1, 0.049, 0.042);
      foot.scale.set(thighRadius * 0.52, 0.047, 0.107);
      if (!pattern) continue;
      const [denimThighRadius] = ellipse(clearance(pattern.thigh, thigh), 0.86);
      const denimX = side * Math.max(legOffset, denimThighRadius);
      shape(denim, [
        ring(0, denimX, crotch + 0.048, clearance(pattern.thigh, thigh) * 0.79, 0.86),
        ring(0.12, denimX, crotch - 0.025, clearance(pattern.thigh, thigh), 0.86),
        ring(0.52, x * 1.04, kneeY, clearance(pattern.knee, knee), 0.86),
        ring(0.68, x * 1.06, THREE.MathUtils.lerp(kneeY, hemY, 0.35), clearance(pattern.knee, thigh * 0.70), 0.86),
        ring(1, x * 1.1, hemY, clearance(pattern.hem, ankle), 0.86),
      ], pose, fabric);
    }
    if (pattern) jeans.update();
  }

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  new ResizeObserver(resize).observe(container);
  resize();

  let previous = performance.now();
  renderer.setAnimationLoop(now => {
    const dt = Math.min((now - previous) / 1000, 1 / 30);
    previous = now;
    const target = bent ? 0.85 : 0;
    if (dirty || Math.abs(target - pose) + Math.abs(pose - fabric) + Math.abs(velocity) > 0.001) {
      pose = THREE.MathUtils.damp(pose, target, 7, dt);
      velocity += ((pose - fabric) * 92 - velocity * 12) * dt;
      fabric += velocity * dt;
      if (measurements) reshape();
      dirty = false;
    }
    renderer.render(scene, camera);
  });

  return {
    reset,
    update(body, garment) {
      measurements = body;
      pattern = garment;
      dirty = true;
    },
    setBent(value) { bent = value; },
  };
}

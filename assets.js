// assets.js — builds the 3D objects that live in the world.
// Three procedural asset types work with zero downloads (portal, crystal,
// beacon), plus type "model" which streams any glTF/GLB from a URL.
// Every asset returns a THREE.Group with an .update(dt, t) animation hook.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const gltfLoader = new GLTFLoader();

export function buildAsset(anchor) {
  switch (anchor.type) {
    case "portal":  return buildPortal(anchor);
    case "crystal": return buildCrystal(anchor);
    case "beacon":  return buildBeacon(anchor);
    case "model":   return buildModel(anchor);
    default:        return buildCrystal(anchor);
  }
}

function group() {
  const g = new THREE.Group();
  g.update = () => {};
  return g;
}

// A glowing ring you could step through — reads well even with GPS drift.
function buildPortal(anchor) {
  const g = group();
  const color = new THREE.Color(anchor.color ?? "#3ec6a8");

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.09, 16, 72),
    new THREE.MeshBasicMaterial({ color })
  );
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(1.32, 48),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    })
  );
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.22, 16, 72),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15 })
  );
  ring.position.y = inner.position.y = halo.position.y = 1.6;
  g.add(ring, inner, halo);

  g.update = (dt, t) => {
    ring.rotation.z += dt * 0.4;
    halo.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
    inner.material.opacity = 0.14 + Math.sin(t * 3) * 0.06;
  };
  return g;
}

// A floating, slowly tumbling gem.
function buildCrystal(anchor) {
  const g = group();
  const color = new THREE.Color(anchor.color ?? "#e8b44a");

  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6, 0),
    new THREE.MeshStandardMaterial({
      color, metalness: 0.3, roughness: 0.2,
      emissive: color, emissiveIntensity: 0.35,
    })
  );
  const wire = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.78, 0),
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.35 })
  );
  gem.position.y = wire.position.y = 1.8;
  g.add(gem, wire);

  g.update = (dt, t) => {
    gem.rotation.y += dt * 0.8;
    wire.rotation.y -= dt * 0.5;
    gem.position.y = wire.position.y = 1.8 + Math.sin(t * 1.6) * 0.15;
  };
  return g;
}

// A tall light column — visible from far away, great as a "come here" marker.
function buildBeacon(anchor) {
  const g = group();
  const color = new THREE.Color(anchor.color ?? "#7f77dd");

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.45, 12, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.35, side: THREE.DoubleSide,
    })
  );
  column.position.y = 6;
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.05, 12, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
    );
    r.rotation.x = Math.PI / 2;
    rings.push(r);
    g.add(r);
  }
  g.add(column);

  g.update = (dt, t) => {
    rings.forEach((r, i) => {
      const phase = (t * 0.7 + i / 3) % 1;
      r.position.y = phase * 10;
      r.material.opacity = 0.8 * (1 - phase);
      r.scale.setScalar(1 + phase * 0.6);
    });
  };
  return g;
}

// Streams a glTF/GLB model. Optional: anchor.scale, anchor.spin.
function buildModel(anchor) {
  const g = group();
  gltfLoader.load(anchor.url, (gltf) => {
    const model = gltf.scene;
    const s = anchor.scale ?? 1;
    model.scale.setScalar(s);
    g.add(model);

    let mixer = null;
    if (gltf.animations?.length) {
      mixer = new THREE.AnimationMixer(model);
      mixer.clipAction(gltf.animations[0]).play();
    }
    g.update = (dt) => {
      if (mixer) mixer.update(dt);
      if (anchor.spin) model.rotation.y += dt * anchor.spin;
    };
  });
  return g;
}

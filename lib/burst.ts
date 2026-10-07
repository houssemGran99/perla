import * as THREE from "three";
import { createEnvironment, createPearlMaterial, createRenderer, hasWebGL, prefersReducedMotion } from "./three-pearl";

type BurstOptions = { colors?: string[]; count?: number; spread?: number };

const DEFAULT_COLORS = ["#ffffff", "#f3cfe0", "#cfe0f3", "#e6cf9c", "#f6eef4"];
const GRAVITY = 1400; // px/s²
const LIFE = 1.6; // seconds

let active = 0;

/**
 * Throws a handful of 3D pearls out of a point on screen (in viewport pixels).
 * Uses a short-lived full-screen overlay that cleans itself up.
 */
export function burstPearls(x: number, y: number, { colors = DEFAULT_COLORS, count = 28, spread = 1 }: BurstOptions = {}) {
  if (typeof window === "undefined" || prefersReducedMotion() || !hasWebGL() || active >= 3) return;
  active++;

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "60",
  });
  document.body.appendChild(canvas);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const renderer = createRenderer(canvas);
  renderer.setSize(w, h, false);
  const scene = new THREE.Scene();
  const env = createEnvironment(renderer);
  scene.environment = env;
  scene.add(new THREE.DirectionalLight(0xffffff, 1.2).translateX(-1).translateY(2).translateZ(3));

  // Pixel-space orthographic camera: (0,0) top-left, y down — matches clientX/clientY.
  const camera = new THREE.OrthographicCamera(0, w, 0, -h, -500, 500);
  const geo = new THREE.SphereGeometry(1, 20, 14);
  const mat = createPearlMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  scene.add(mesh);

  const parts = Array.from({ length: count }, (_, i) => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
    const v = (280 + Math.random() * 520) * spread;
    mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    return {
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      r: 4 + Math.random() * 7,
      delay: Math.random() * 0.08,
    };
  });

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const t0 = performance.now();
  let last = t0;

  function tick(now: number) {
    const t = (now - t0) / 1000;
    const dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    parts.forEach((p, i) => {
      if (t > p.delay) {
        p.vy += GRAVITY * dt;
        p.vx *= 1 - dt * 0.8;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      const life = Math.max(0, 1 - Math.max(0, t - 1) / (LIFE - 1));
      const grow = Math.min(1, (t - p.delay) / 0.12);
      pos.set(p.x, -p.y, 0);
      scl.setScalar(Math.max(0.0001, p.r * grow * life));
      m.compose(pos, q, scl);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
    if (t < LIFE) requestAnimationFrame(tick);
    else cleanup();
  }

  function cleanup() {
    geo.dispose();
    mat.dispose();
    mesh.dispose();
    env.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    active--;
  }

  requestAnimationFrame(tick);
}

/** Bursts from the centre of an element. */
export function burstFrom(el: Element, opts?: BurstOptions) {
  const r = el.getBoundingClientRect();
  burstPearls(r.left + r.width / 2, r.top + r.height / 2, opts);
}

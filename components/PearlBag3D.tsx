"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  createEnvironment,
  createPearlMaterial,
  createRenderer,
  hasWebGL,
  prefersReducedMotion,
  runLoop,
} from "@/lib/three-pearl";

type Props = { color: string; label: string };

const R = 0.058; // pearl radius
const D = R * 2.08; // spacing between pearl centres

/** Half-width (x) and half-depth (z) of the purse body at t (0 = top, 1 = bottom). */
function section(t: number) {
  let rx = 1.0 + 0.18 * t;
  let rz = 0.16 + 0.2 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1));
  if (t > 0.86) {
    const k = 1 - Math.pow((t - 0.86) / 0.14, 2) * 0.12;
    rx *= k;
    rz *= k;
  }
  return { rx, rz };
}

/** Positions of every pearl: a hex-packed shell, a filled base and a handle arc. */
function buildPearls() {
  const pts: THREE.Vector3[] = [];
  const top = 0.75;
  const height = 1.5;
  const rows = Math.round(height / (D * 0.87));

  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const y = top - t * height;
    const { rx, rz } = section(t);
    // Ramanujan's approximation of the ellipse perimeter.
    const h = Math.pow(rx - rz, 2) / Math.pow(rx + rz, 2);
    const per = Math.PI * (rx + rz) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    const n = Math.floor(per / D);
    const off = (row % 2) * 0.5;
    for (let k = 0; k < n; k++) {
      const a = ((k + off) / n) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz));
    }
  }

  // Base: concentric rings filling the bottom ellipse.
  const { rx, rz } = section(1);
  const yb = top - height - D * 0.4;
  for (let s = 1 - D / Math.max(rx, rz); s > 0.05; s -= D / Math.max(rx, rz)) {
    const n = Math.max(3, Math.floor((Math.PI * 2 * Math.sqrt((rx * rx + rz * rz) / 2) * s) / D));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * rx * s, yb, Math.sin(a) * rz * s));
    }
  }

  // Handle: an arch of slightly larger pearls.
  const hx = 0.62;
  const hy = 0.85;
  const arc = Math.PI * Math.sqrt((hx * hx + hy * hy) / 2);
  const hn = Math.round(arc / (D * 1.1));
  for (let i = 0; i <= hn; i++) {
    const a = (Math.PI * i) / hn;
    pts.push(new THREE.Vector3(-Math.cos(a) * hx, top + Math.sin(a) * hy + R, 0));
  }
  return { pts, handleStart: pts.length - (hn + 1), top, height };
}

export default function PearlBag3D({ color, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef<(c: string) => void>(() => {});
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    if (!hasWebGL()) {
      setSupported(false);
      return;
    }
    const reduce = prefersReducedMotion();

    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    const env = createEnvironment(renderer);
    scene.environment = env;
    scene.environmentIntensity = 0.75;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-3, 4, 5);
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));

    const bag = new THREE.Group();
    scene.add(bag);

    const { pts, handleStart, top } = buildPearls();
    const geo = new THREE.SphereGeometry(R, 20, 14);
    const mat = createPearlMaterial();
    const mesh = new THREE.InstancedMesh(geo, mat, pts.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    // Deterministic per-pearl jitter so each bead catches light a little differently.
    const jitter = pts.map((_, i) => {
      const s = Math.sin(i * 12.9898) * 43758.5453;
      return s - Math.floor(s);
    });
    pts.forEach((p, i) => {
      const scale = (i >= handleStart ? 1.15 : 0.96) + jitter[i] * 0.06;
      m.compose(p, q, new THREE.Vector3(scale, scale, scale));
      mesh.setMatrixAt(i, m);
    });
    bag.add(mesh);

    // Gold name plate on the front.
    const plateY = top - 0.42;
    const plateZ = section(0.28).rz + R * 1.2;
    const gold = new THREE.MeshStandardMaterial({ color: "#e8c878", metalness: 1, roughness: 0.2 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.03), gold);
    plate.position.set(0, plateY, plateZ);
    bag.add(plate);

    // Frame the whole bag (plus room for the float and spin) whatever the canvas shape.
    const bounds = new THREE.Box3().setFromPoints(pts).expandByScalar(R * 1.5).getBoundingSphere(new THREE.Sphere());
    function frame() {
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const dist = (bounds.radius * 1.0) / Math.sin(Math.min(vFov, hFov) / 2);
      camera.position.set(bounds.center.x, bounds.center.y + dist * 0.12, bounds.center.z + dist);
      camera.lookAt(bounds.center);
    }

    const rose = new THREE.Color("#f3cfe0");
    const blue = new THREE.Color("#cfe0f3");
    const tmp = new THREE.Color();
    function applyColor(hex: string) {
      const base = new THREE.Color(hex);
      pts.forEach((_, i) => {
        const j = jitter[i];
        tmp.copy(base);
        if (j < 0.14) tmp.lerp(rose, 0.25);
        else if (j > 0.88) tmp.lerp(blue, 0.25);
        mesh.setColorAt(i, tmp);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      loop?.poke();
    }

    // Drag to spin; otherwise a slow turntable with a gentle float.
    let rotY = -0.5;
    let vel = reduce ? 0 : 0.35;
    let tiltX = 0;
    let targetTilt = 0;
    let dragging = false;
    let lastX = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      targetTilt = (((e.clientY - b.top) / b.height) * 2 - 1) * 0.18;
      if (dragging) {
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        rotY += dx * 0.012;
        vel = dx * 0.6;
      }
      loop?.poke();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    const onLeave = () => {
      targetTilt = 0;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    let loop: ReturnType<typeof runLoop> | null = null;
    loop = runLoop(
      wrap,
      (w, h) => {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        frame();
      },
      (t, dt) => {
        if (!dragging) {
          // Ease back towards the idle spin after a flick.
          const idleSpeed = reduce ? 0 : 0.35;
          vel += (idleSpeed - vel) * Math.min(1, dt * 1.5);
          rotY += vel * dt;
        }
        tiltX += (targetTilt - tiltX) * Math.min(1, dt * 4);
        bag.rotation.set(tiltX, rotY, reduce ? 0 : Math.sin(t * 0.8) * 0.03);
        bag.position.y = reduce ? 0 : Math.sin(t * 1.1) * 0.05;
        renderer.render(scene, camera);
      },
      !reduce,
    );
    colorRef.current = applyColor;
    applyColor(color);

    return () => {
      loop?.stop();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      geo.dispose();
      mat.dispose();
      gold.dispose();
      plate.geometry.dispose();
      mesh.dispose();
      env.dispose();
      renderer.dispose();
    };
    // The scene is built once; colour changes go through colorRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    colorRef.current(color);
  }, [color]);

  if (!supported) {
    return (
      <img
        className="arch"
        src="/img/01.jpg"
        alt="Sac à rabat PERLA en perles blanches, anse en perles et plaque dorée"
        width={720}
        height={960}
      />
    );
  }

  return (
    <div ref={wrapRef} className="bag3d">
      <canvas ref={canvasRef} role="img" aria-label={`Sac en perles en 3D, coloris ${label.toLowerCase()}`} />
    </div>
  );
}

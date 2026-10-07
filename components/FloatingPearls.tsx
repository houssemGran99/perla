"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  createEnvironment,
  createPearlMaterial,
  createRenderer,
  hasWebGL,
  prefersReducedMotion,
  runLoop,
} from "@/lib/three-pearl";

const TINTS = ["#ffffff", "#f6eef4", "#f3cfe0", "#cfe0f3", "#e6cf9c"];

/** Loose pearls drifting upward behind the hero, with pointer parallax. */
export default function FloatingPearls() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !hasWebGL()) return;
    const reduce = prefersReducedMotion();

    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    const env = createEnvironment(renderer);
    scene.environment = env;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.z = 12;

    const count = window.innerWidth < 700 ? 16 : 30;
    const geo = new THREE.SphereGeometry(1, 24, 16);
    const mat = createPearlMaterial();
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    scene.add(mesh);

    let span = { x: 10, y: 6 };
    const pearls = Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: -2 - Math.random() * 8,
      s: 0.08 + Math.random() * 0.2,
      speed: 0.04 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2,
      tint: new THREE.Color(TINTS[i % TINTS.length]),
      // Screen-space push from the pointer, springing back to rest.
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
    }));
    pearls.forEach((p, i) => mesh.setColorAt(i, p.tint));

    const pointer = new THREE.Vector2();
    const look = new THREE.Vector2();
    // Pointer in the hero's own normalised device coords (null when outside it).
    let local: THREE.Vector2 | null = null;
    let shock: { x: number; y: number; t: number } | null = null;
    let clock = 0;
    function toLocal(e: PointerEvent) {
      const b = wrap!.getBoundingClientRect();
      const x = ((e.clientX - b.left) / b.width) * 2 - 1;
      const y = -(((e.clientY - b.top) / b.height) * 2 - 1);
      return Math.abs(x) <= 1 && Math.abs(y) <= 1 ? new THREE.Vector2(x, y) : null;
    }
    const onMove = (e: PointerEvent) => {
      pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
      local = toLocal(e);
    };
    const onDown = (e: PointerEvent) => {
      const l = toLocal(e);
      if (l) shock = { x: l.x, y: l.y, t: clock };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    const ndc = new THREE.Vector3();

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();

    const loop = runLoop(
      wrap,
      (w, h) => {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
        span = { x: (vh * camera.aspect) / 2, y: vh / 2 };
      },
      (t, dt) => {
        clock = t;
        look.lerp(pointer, Math.min(1, dt * 2));
        camera.position.x = look.x * 0.6;
        camera.position.y = -look.y * 0.4;
        camera.lookAt(0, 0, 0);
        pearls.forEach((p, i) => {
          // Normalised y in [-1, 1]; wrap to the bottom once a pearl leaves the top.
          p.y += (p.speed * dt) / 2;
          if (p.y > 1.15) p.y = -1.15;
          const depth = 1 + -p.z / 12;
          pos.set(
            (p.x + Math.sin(t * 0.3 + p.phase) * 0.03) * span.x * depth,
            p.y * span.y * depth,
            p.z,
          );
          // Pointer repel + click shockwave, measured on screen, then a damped spring home.
          ndc.copy(pos).project(camera);
          let fx = 0;
          let fy = 0;
          if (local) {
            const dx = ndc.x - local.x;
            const dy = (ndc.y - local.y) / camera.aspect;
            const d = Math.hypot(dx, dy);
            if (d < 0.22 && d > 1e-4) {
              const f = (1 - d / 0.22) * 2.4;
              fx += (dx / d) * f;
              fy += (dy / d) * f;
            }
          }
          if (shock) {
            const age = t - shock.t;
            const dx = ndc.x - shock.x;
            const dy = (ndc.y - shock.y) / camera.aspect;
            const d = Math.hypot(dx, dy) || 1e-4;
            const front = age * 1.6; // the ring travels outward
            const hit = Math.exp(-(((d - front) / 0.12) ** 2)) * Math.max(0, 1 - age);
            fx += (dx / d) * hit * 12;
            fy += (dy / d) * hit * 12;
          }
          p.vx += (fx - p.ox * 14) * dt;
          p.vy += (fy - p.oy * 14) * dt;
          p.vx *= 1 - Math.min(1, dt * 3.5);
          p.vy *= 1 - Math.min(1, dt * 3.5);
          p.ox += p.vx * dt;
          p.oy += p.vy * dt;
          pos.x += p.ox * span.x * depth;
          pos.y += p.oy * span.y * depth;

          scl.setScalar(p.s * (1 + Math.sin(t * 0.8 + p.phase) * 0.04));
          m.compose(pos, q, scl);
          mesh.setMatrixAt(i, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (shock && t - shock.t > 1.2) shock = null;
        renderer.render(scene, camera);
      },
      !reduce,
    );

    return () => {
      loop.stop();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      geo.dispose();
      mat.dispose();
      mesh.dispose();
      env.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={wrapRef} className="floating-pearls" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

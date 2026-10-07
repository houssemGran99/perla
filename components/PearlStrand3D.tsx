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

type Props = {
  /**
   * "sway": a divider strand that swings with scroll speed and can be plucked.
   * "thread": pearls string themselves on, left to right, as the strand scrolls into view,
   * with three gold milestone pearls lined up with the ordering steps.
   */
  variant?: "sway" | "thread";
};

const GAP = 14.5; // px between pearl centres
const R = 6.6; // px pearl radius
const PALETTE = ["#ffffff", "#f6eef4", "#ffffff", "#f3cfe0", "#ffffff", "#cfe0f3"];
const GOLD = new THREE.Color("#e6c47c");

type Pluck = { x: number; amp: number; t0: number };

export default function PearlStrand3D({ variant = "sway" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    const thread = variant === "thread";

    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    const env = createEnvironment(renderer);
    scene.environment = env;
    scene.environmentIntensity = 0.8;
    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(-1, 2, 3);
    scene.add(light);

    // Pixel-space camera centred on the strip.
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    const geo = new THREE.SphereGeometry(1, 18, 12);
    const mat = createPearlMaterial();
    let mesh: THREE.InstancedMesh | null = null;

    let W = 0;
    let H = 0;
    let n = 0;
    let xs: number[] = [];
    let milestones = new Set<number>();
    let scale: number[] = []; // current visible scale per pearl (thread grows them in)
    let pulseAt: number[] = [];

    function build(w: number, h: number) {
      W = w;
      H = h;
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);

      n = Math.max(2, Math.floor((w - R * 2) / GAP) + 1);
      const span = (n - 1) * GAP;
      xs = Array.from({ length: n }, (_, i) => -span / 2 + i * GAP);

      milestones = new Set();
      if (thread) {
        // Line the gold pearls up with the step numbers on wide screens; spread evenly otherwise.
        const cols = window.innerWidth > 780;
        const targets = cols ? [0, 1, 2].map((k) => -w / 2 + (k * (w + 32)) / 3 + 16) : [-w / 3, 0, w / 3];
        targets.forEach((tx) => milestones.add(Math.max(0, Math.min(n - 1, Math.round((tx + span / 2) / GAP)))));
      }

      if (mesh) {
        scene.remove(mesh);
        mesh.dispose();
      }
      mesh = new THREE.InstancedMesh(geo, mat, n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      for (let i = 0; i < n; i++) {
        mesh.setColorAt(i, milestones.has(i) ? GOLD : new THREE.Color(PALETTE[(i * 7) % PALETTE.length]));
      }
      scene.add(mesh);
      scale = new Array(n).fill(thread && !reduce ? 0 : 1);
      pulseAt = new Array(n).fill(-Infinity);
    }

    // Interaction state
    const plucks: Pluck[] = [];
    let lastPluck = 0;
    let now = 0;
    let lastScroll = window.scrollY;
    let speed = 0;

    const onMove = (e: PointerEvent) => {
      if (reduce || now - lastPluck < 0.08) return;
      const b = canvas.getBoundingClientRect();
      const amp = Math.max(-1, Math.min(1, e.movementY / 6 || (Math.random() - 0.5))) * 10;
      plucks.push({ x: e.clientX - b.left - b.width / 2, amp, t0: now });
      if (plucks.length > 8) plucks.shift();
      lastPluck = now;
    };
    canvas.addEventListener("pointermove", onMove);

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();

    const loop = runLoop(
      wrap,
      (w, h) => build(w, h),
      (t, dt) => {
        if (!mesh) return;
        now = t;
        // Scroll speed drives how hard the strand swings.
        const y = window.scrollY;
        if (dt > 0) speed += (Math.abs(y - lastScroll) / dt - speed) * Math.min(1, dt * 4);
        lastScroll = y;
        const amp = reduce ? 0 : 1.2 + Math.min(thread ? 6 : 12, speed * 0.01);

        // Threading progress: 0 when the strip enters the bottom of the screen, 1 by mid-screen.
        let shown = n;
        if (thread && !reduce) {
          const top = wrap.getBoundingClientRect().top;
          const vh = window.innerHeight;
          const p = Math.max(0, Math.min(1, (vh * 0.95 - top) / (vh * 0.5)));
          shown = p * n;
        }

        for (let i = 0; i < n; i++) {
          const x = xs[i];
          let yy = amp * Math.sin(x * 0.018 - t * 2.1) * (thread ? 1 : Math.sin(((i + 0.5) / n) * Math.PI));
          if (thread) yy += Math.sin((x / W) * Math.PI * 2) * Math.min(14, H * 0.18);
          for (const p of plucks) {
            const age = t - p.t0;
            yy += p.amp * Math.exp(-(((x - p.x) / 46) ** 2)) * Math.exp(-age * 3) * Math.cos(age * 13);
          }

          // Grow pearls on (or off) as the thread advances.
          const target = i < shown ? 1 : 0;
          if (target === 1 && scale[i] < 0.01 && milestones.has(i)) pulseAt[i] = t;
          scale[i] += (target - scale[i]) * Math.min(1, dt * 12 || 1);
          const lead = thread && i === Math.floor(shown) - 1 && shown < n ? 1.25 : 1;
          const age = t - pulseAt[i];
          const pulse = age < 0.6 ? 1 + Math.sin((age / 0.6) * Math.PI) * 0.6 : 1;
          const big = milestones.has(i) ? 1.45 : 1;

          pos.set(x, yy, 0);
          scl.setScalar(Math.max(0.0001, R * scale[i] * lead * pulse * big));
          m.compose(pos, q, scl);
          mesh.setMatrixAt(i, m);
        }
        mesh.instanceMatrix.needsUpdate = true;
        while (plucks.length && t - plucks[0].t0 > 2) plucks.shift();
        renderer.render(scene, camera);
      },
      !reduce,
    );

    return () => {
      loop.stop();
      canvas.removeEventListener("pointermove", onMove);
      mesh?.dispose();
      geo.dispose();
      mat.dispose();
      env.dispose();
      renderer.dispose();
    };
  }, [variant]);

  if (!supported) return <div className="strand" aria-hidden="true" />;

  return (
    <div ref={wrapRef} className={`strand3d ${variant}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

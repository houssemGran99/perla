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

type Props = { color: string; label: string; plate?: string };

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

const PLATE_W = 0.6;
const PLATE_H = 0.17;

/** Paints the gold plate face with the name engraved on it, shrinking long names to fit. */
function drawPlate(ctx: CanvasRenderingContext2D, name: string) {
  const { width: w, height: h } = ctx.canvas;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#f6dfa0");
  g.addColorStop(0.5, "#e8c878");
  g.addColorStop(1, "#c9a453");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgb(120 86 30 / 0.55)";
  ctx.lineWidth = h * 0.05;
  ctx.strokeRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16);

  const text = (name.trim() || "PERLA").toUpperCase();
  const family = getComputedStyle(document.documentElement).getPropertyValue("--display").trim() || "Georgia, serif";
  const spacing = 0.12;
  let size = h * 0.62;
  const measure = () => {
    ctx.font = `600 ${size}px ${family}`;
    return ctx.measureText(text).width + Math.max(0, text.length - 1) * size * spacing;
  };
  const maxW = w - h * 0.5;
  while (measure() > maxW && size > h * 0.2) size *= 0.94;

  // Engraved: a light lip below, the dark cut on top.
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  let x = (w - measure()) / 2;
  for (const ch of text) {
    ctx.fillStyle = "rgb(255 244 210 / 0.8)";
    ctx.fillText(ch, x, h / 2 + size * 0.06);
    ctx.fillStyle = "#6b4a14";
    ctx.fillText(ch, x, h / 2);
    x += ctx.measureText(ch).width + size * spacing;
  }
}

export default function PearlBag3D({ color, label, plate: plateName = "" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef<(c: string) => void>(() => {});
  const nameRef = useRef<(n: string) => void>(() => {});
  const plateNameRef = useRef(plateName);
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
    const count = pts.length;
    const geo = new THREE.SphereGeometry(R, 20, 14);
    const mat = createPearlMaterial();
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bag.add(mesh);

    // Deterministic per-pearl jitter so each bead catches light a little differently.
    const jitter = pts.map((_, i) => {
      const s = Math.sin(i * 12.9898) * 43758.5453;
      return s - Math.floor(s);
    });
    const baseScale = pts.map((_, i) => (i >= handleStart ? 1.15 : 0.96) + jitter[i] * 0.06);
    let minY = Infinity;
    let maxY = -Infinity;
    pts.forEach((p) => {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    const height01 = pts.map((p) => (p.y - minY) / (maxY - minY)); // 0 = bottom, 1 = top of handle

    // Assembly: pearls swirl in from a loose cloud and settle from the base upward.
    const ASSEMBLE = 2.6;
    const assembleDelay = height01.map((h, i) => h * 1.7 + jitter[i] * 0.25);
    const startPos = pts.map((p, i) => {
      const a = jitter[i] * Math.PI * 2;
      return new THREE.Vector3(p.x * 2.4 + Math.cos(a) * 0.8, p.y + 1.4 + jitter[i], p.z * 2.4 + Math.sin(a) * 0.8 + 0.6);
    });
    let assembleT0: number | null = reduce ? -Infinity : null;

    // Colour wave: each pearl swaps colour (with a small pop) as a wave runs down the bag.
    const WAVE = 1.1;
    const fromCol = pts.map(() => new THREE.Color());
    const toCol = pts.map(() => new THREE.Color());
    let waveT0 = -Infinity;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const tmp = new THREE.Color();
    const easeOutBack = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
    const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

    const waveProgress = (i: number, t: number) => clamp01((t - waveT0 - (1 - height01[i]) * 0.7) / 0.35);

    /** Writes every pearl's transform and colour for time t. Returns true while still animating. */
    function updatePearls(t: number) {
      const aT = assembleT0 === null ? -1 : t - assembleT0;
      const wT = t - waveT0;
      for (let i = 0; i < count; i++) {
        // Assembly
        let a = assembleT0 === null ? 0 : clamp01((aT - assembleDelay[i]) / 0.7);
        if (assembleT0 === -Infinity) a = 1;
        const e = a >= 1 ? 1 : easeOutBack(a);
        pos.lerpVectors(startPos[i], pts[i], e);
        // Wave
        const w = waveProgress(i, t);
        const pop = w > 0 && w < 1 ? Math.sin(w * Math.PI) * 0.35 : 0;
        scl.setScalar(baseScale[i] * Math.min(1, a * 1.6) * (1 + pop));
        m.compose(pos, q, scl);
        mesh.setMatrixAt(i, m);
        tmp.copy(fromCol[i]).lerp(toCol[i], w);
        mesh.setColorAt(i, tmp);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      const plateIn = assembleT0 === -Infinity ? 1 : clamp01((aT - 1.9) / 0.5);
      plate.scale.setScalar(plateIn === 1 ? 1 : easeOutBack(plateIn) || 0.0001);
      return aT < ASSEMBLE + 0.8 || wT < WAVE;
    }

    // Gold name plate on the front.
    const plateY = top - 0.42;
    const plateZ = section(0.28).rz + R * 1.2;
    const gold = new THREE.MeshStandardMaterial({ color: "#e8c878", metalness: 1, roughness: 0.2 });
    const plateCanvas = document.createElement("canvas");
    plateCanvas.width = 512;
    plateCanvas.height = Math.round((512 * PLATE_H) / PLATE_W);
    const plateCtx = plateCanvas.getContext("2d")!;
    const plateTex = new THREE.CanvasTexture(plateCanvas);
    plateTex.colorSpace = THREE.SRGBColorSpace;
    plateTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const face = new THREE.MeshStandardMaterial({ map: plateTex, metalness: 0.75, roughness: 0.3 });
    // BoxGeometry face order: +x, -x, +y, -y, +z (front), -z.
    const plate = new THREE.Mesh(new THREE.BoxGeometry(PLATE_W, PLATE_H, 0.03), [gold, gold, gold, gold, face, gold]);
    function setName(n: string) {
      drawPlate(plateCtx, n);
      plateTex.needsUpdate = true;
      loop?.poke();
    }
    plate.position.set(0, plateY, plateZ);
    bag.add(plate);

    // Frame the whole bag (plus room for the float and spin) whatever the canvas shape.
    const bounds = new THREE.Box3().setFromPoints(pts).expandByScalar(R * 1.5).getBoundingSphere(new THREE.Sphere());
    function frame() {
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const dist = bounds.radius / Math.sin(Math.min(vFov, hFov) / 2);
      camera.position.set(bounds.center.x, bounds.center.y + dist * 0.12, bounds.center.z + dist);
      camera.lookAt(bounds.center);
    }

    const rose = new THREE.Color("#f3cfe0");
    const blue = new THREE.Color("#cfe0f3");
    let firstColor = true;
    function applyColor(hex: string) {
      const base = new THREE.Color(hex);
      for (let i = 0; i < count; i++) {
        const j = jitter[i];
        // Start the new wave from whatever colour the pearl shows right now.
        if (!firstColor) fromCol[i].lerp(toCol[i], waveProgress(i, performance.now() / 1000));
        toCol[i].copy(base);
        if (j < 0.14) toCol[i].lerp(rose, 0.25);
        else if (j > 0.88) toCol[i].lerp(blue, 0.25);
        if (firstColor) fromCol[i].copy(toCol[i]);
      }
      if (!firstColor && !reduce) waveT0 = performance.now() / 1000;
      if (reduce) fromCol.forEach((c, i) => c.copy(toCol[i]));
      firstColor = false;
      animating = true;
      loop?.poke();
    }
    let animating = true;

    // Start assembling once the bag is properly on screen.
    const startIO = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && assembleT0 === null) {
          assembleT0 = performance.now() / 1000 + 0.15;
          animating = true;
          startIO.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    if (!reduce) startIO.observe(wrap);

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
        if (animating) animating = updatePearls(t);
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
    nameRef.current = setName;
    setName(plateNameRef.current);
    // Redraw once the display font has loaded so the engraving uses it.
    document.fonts?.ready.then(() => nameRef.current === setName && setName(plateNameRef.current));

    return () => {
      loop?.stop();
      startIO.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      geo.dispose();
      mat.dispose();
      gold.dispose();
      face.dispose();
      plateTex.dispose();
      nameRef.current = () => {};
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

  useEffect(() => {
    plateNameRef.current = plateName;
    nameRef.current(plateName);
  }, [plateName]);

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

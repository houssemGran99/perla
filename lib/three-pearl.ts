import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** True when the browser can create a WebGL context. */
export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

/** Soft studio reflections so the pearls get their lustre. */
export function createEnvironment(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}

/** Nacre-like material: clearcoat for the glaze, iridescence for the orient. */
export function createPearlMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 0.55,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [180, 420],
    sheen: 0.3,
    sheenColor: new THREE.Color("#ffe9f4"),
    sheenRoughness: 0.4,
  });
}

/**
 * Runs `frame` on every animation frame while the canvas is on screen, and calls
 * `resize` whenever its container changes size. Returns a stop function.
 */
export function runLoop(
  container: HTMLElement,
  resize: (w: number, h: number) => void,
  frame: (t: number, dt: number) => void,
  animate: boolean,
) {
  let raf = 0;
  let visible = true;
  let last = performance.now();

  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width && height) {
      resize(width, height);
      if (!animate) frame(last / 1000, 0);
    }
  });
  ro.observe(container);

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && animate && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  });
  io.observe(container);

  function tick(now: number) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame(now / 1000, dt);
    raf = requestAnimationFrame(tick);
  }
  if (animate) raf = requestAnimationFrame(tick);

  return {
    /** Render one frame on demand (used when motion is reduced). */
    poke() {
      if (!animate) frame(performance.now() / 1000, 0);
    },
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    },
  };
}

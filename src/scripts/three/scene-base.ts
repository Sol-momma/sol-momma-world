import * as THREE from "three";
import { mulberry32 } from "./prng";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  rng: () => number;
  width: () => number;
  height: () => number;
}

export interface DemoHooks {
  setup: (ctx: SceneContext) => void;
  update?: (ctx: SceneContext, time: number, dt: number) => void;
  cleanup?: () => void;
}

export interface SceneOptions {
  seed?: number;
  cameraFov?: number;
  cameraZ?: number;
  background?: number | null;
}

export interface SceneHandle {
  dispose: () => void;
}

export function createScene(
  canvas: HTMLCanvasElement,
  hooks: DemoHooks,
  options: SceneOptions = {},
): SceneHandle {
  const seed = options.seed ?? 0xc0ffee;
  const rng = mulberry32(seed);
  const fov = options.cameraFov ?? 50;
  const camZ = options.cameraZ ?? 0;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background =
    options.background == null ? null : new THREE.Color(options.background);

  const camera = new THREE.PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, camZ);
  camera.lookAt(0, 0, camZ - 1);

  const ctx: SceneContext = {
    scene,
    camera,
    renderer,
    rng,
    width: () => window.innerWidth,
    height: () => window.innerHeight,
  };

  hooks.setup(ctx);

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);

  const motionMql = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = motionMql.matches;
  function onMotionChange(e: MediaQueryListEvent) {
    reduceMotion = e.matches;
  }
  motionMql.addEventListener("change", onMotionChange);

  let rafId = 0;
  let prevTime = performance.now();

  function animate(time: number) {
    const dt = (time - prevTime) / 1000;
    prevTime = time;

    if (!reduceMotion && hooks.update) {
      hooks.update(ctx, time, dt);
    }
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }
  rafId = requestAnimationFrame(animate);

  function dispose() {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    motionMql.removeEventListener("change", onMotionChange);
    hooks.cleanup?.();
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
    renderer.dispose();
  }

  return { dispose };
}

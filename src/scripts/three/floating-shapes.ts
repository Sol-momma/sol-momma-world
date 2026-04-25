import * as THREE from "three";
import { mulberry32, randRange, pickRandom } from "./prng";
import { observeTheme, type Theme } from "./theme-sync";

const PALETTE = [0xe8dcc4, 0xd4b896, 0xa89078, 0x8b9a82, 0xc9a57b];

interface ShapeInstance {
  mesh: THREE.Mesh;
  rotationAxis: THREE.Vector3;
  rotationSpeed: number;
  baseY: number;
  bobAmplitude: number;
  bobSpeed: number;
  bobPhase: number;
}

export type Mode = "matte" | "wire" | "glass" | "neon";

export interface InitOptions {
  seed?: number;
  initialMode?: Mode;
}

export interface FloatingShapesHandle {
  dispose: () => void;
  setMode: (mode: Mode) => void;
}

export function init(
  canvas: HTMLCanvasElement,
  _options: InitOptions = {},
): FloatingShapesHandle {
  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Scene + Camera
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);

  // Seeded PRNG
  const seed = _options.seed ?? 0xc0ffee;
  const rng = mulberry32(seed);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xa8c4e8, 0.3);
  pointLight.position.set(-3, 0, 2);
  scene.add(pointLight);

  // Shapes — 5 種類 × 3〜4 個ずつ計 15〜20 個
  const shapes: ShapeInstance[] = [];
  const geometryFactories: Array<() => THREE.BufferGeometry> = [
    () => new THREE.BoxGeometry(1, 1, 1),
    () => new THREE.SphereGeometry(0.6, 32, 16),
    () => new THREE.TorusGeometry(0.5, 0.2, 16, 32),
    () => new THREE.IcosahedronGeometry(0.6, 0),
    () => new THREE.ConeGeometry(0.5, 1, 32),
  ];

  for (const factory of geometryFactories) {
    const count = 3 + Math.floor(rng() * 2); // 3 or 4
    for (let i = 0; i < count; i++) {
      const geometry = factory();
      const material = new THREE.MeshStandardMaterial({
        color: pickRandom(rng, PALETTE),
        roughness: 0.7,
        metalness: 0.05,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.setScalar(randRange(rng, 0.4, 1.2));
      const x = randRange(rng, -6, 6);
      const y = randRange(rng, -4, 4);
      const z = randRange(rng, -8, -2);
      mesh.position.set(x, y, z);

      const axis = new THREE.Vector3(
        randRange(rng, -1, 1),
        randRange(rng, -1, 1),
        randRange(rng, -1, 1),
      ).normalize();

      shapes.push({
        mesh,
        rotationAxis: axis,
        rotationSpeed: randRange(rng, 0.1, 0.3),
        baseY: y,
        bobAmplitude: 0.2,
        bobSpeed: randRange(rng, (2 * Math.PI) / 5, (2 * Math.PI) / 3),
        bobPhase: randRange(rng, 0, 2 * Math.PI),
      });
      scene.add(mesh);
    }
  }

  // Resize handler
  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);

  // Interaction state
  const isHover = window.matchMedia("(hover: hover)").matches;
  const cameraTarget = new THREE.Vector3(0, 0, -1);
  let parallaxX = 0;
  let parallaxY = 0;
  let dragX = 0;
  let dragY = 0;
  let touchActive = false;
  let lastTouchX = 0;
  let lastTouchY = 0;

  const motionMql = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = motionMql.matches;
  function onMotionChange(e: MediaQueryListEvent) {
    reduceMotion = e.matches;
    if (reduceMotion) {
      parallaxX = 0;
      parallaxY = 0;
      dragX = 0;
      dragY = 0;
    }
  }
  motionMql.addEventListener("change", onMotionChange);

  // Theme sync — light/dark でライト強度・色を切替
  const stopThemeSync = observeTheme((theme: Theme) => {
    if (theme === "dark") {
      ambientLight.intensity = 0.25;
      directionalLight.intensity = 0.6;
      pointLight.color.set(0x7a9bd6);
    } else {
      ambientLight.intensity = 0.4;
      directionalLight.intensity = 0.8;
      pointLight.color.set(0xa8c4e8);
    }
  });

  function onMouseMove(e: MouseEvent) {
    if (reduceMotion) return;
    parallaxX = (e.clientX / window.innerWidth - 0.5) * 1.0;
    parallaxY = -(e.clientY / window.innerHeight - 0.5) * 0.6;
  }

  function onTouchStart(e: TouchEvent) {
    if (reduceMotion) return;
    if (e.touches.length === 0) return;
    touchActive = true;
    lastTouchX = e.touches[0]!.clientX;
    lastTouchY = e.touches[0]!.clientY;
  }
  function onTouchMove(e: TouchEvent) {
    if (reduceMotion) return;
    if (!touchActive || e.touches.length === 0) return;
    const t = e.touches[0]!;
    const dx = t.clientX - lastTouchX;
    const dy = t.clientY - lastTouchY;
    dragX = Math.max(-0.5, Math.min(0.5, dragX + dx * 0.002));
    dragY = Math.max(-0.3, Math.min(0.3, dragY - dy * 0.002));
    lastTouchX = t.clientX;
    lastTouchY = t.clientY;
  }
  function onTouchEnd() {
    touchActive = false;
  }

  if (isHover) {
    window.addEventListener("mousemove", onMouseMove);
  } else {
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
  }

  // Animation loop
  let rafId = 0;
  let prevTime = performance.now();

  function animate(time: number) {
    const dt = (time - prevTime) / 1000;
    prevTime = time;

    if (!reduceMotion) {
      for (const s of shapes) {
        s.mesh.rotateOnAxis(s.rotationAxis, s.rotationSpeed * dt);
        s.mesh.position.y =
          s.baseY +
          Math.sin(time * 0.001 * s.bobSpeed + s.bobPhase) * s.bobAmplitude;
      }

      const targetX = parallaxX + dragX;
      const targetY = parallaxY + dragY;
      cameraTarget.x += (targetX - cameraTarget.x) * 0.1;
      cameraTarget.y += (targetY - cameraTarget.y) * 0.1;
      camera.lookAt(cameraTarget);
    }

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }
  rafId = requestAnimationFrame(animate);

  // Dispose
  function dispose() {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    motionMql.removeEventListener("change", onMotionChange);
    stopThemeSync();
    if (isHover) {
      window.removeEventListener("mousemove", onMouseMove);
    } else {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    }
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

  function setMode(_mode: Mode) {
    // Phase 0: matte 固定。Phase 1 以降で実装。
  }

  return { dispose, setMode };
}

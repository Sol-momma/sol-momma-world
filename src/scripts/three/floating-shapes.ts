import * as THREE from "three";

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

  // Resize handler
  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);

  // Animation loop
  let rafId = 0;
  function animate() {
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }
  rafId = requestAnimationFrame(animate);

  // Dispose
  function dispose() {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
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

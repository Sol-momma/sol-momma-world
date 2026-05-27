import * as THREE from "three";
import { randRange, pickRandom } from "./prng";
import { observeTheme, type Theme } from "./theme-sync";
import {
  createScene,
  type DemoHooks,
  type SceneContext,
  type SceneHandle,
} from "./scene-base";

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

export function init(canvas: HTMLCanvasElement): SceneHandle {
  const shapes: ShapeInstance[] = [];
  let ambientLight: THREE.AmbientLight;
  let directionalLight: THREE.DirectionalLight;
  let pointLight: THREE.PointLight;
  const cameraTarget = new THREE.Vector3(0, 0, -1);
  let parallaxX = 0;
  let parallaxY = 0;
  let dragX = 0;
  let dragY = 0;
  let touchActive = false;
  let lastTouchX = 0;
  let lastTouchY = 0;
  const isHover = window.matchMedia("(hover: hover)").matches;
  let stopThemeSync: (() => void) | null = null;

  function onMouseMove(e: MouseEvent) {
    parallaxX = (e.clientX / window.innerWidth - 0.5) * 1.0;
    parallaxY = -(e.clientY / window.innerHeight - 0.5) * 0.6;
  }
  function onTouchStart(e: TouchEvent) {
    if (e.touches.length === 0) return;
    touchActive = true;
    lastTouchX = e.touches[0]!.clientX;
    lastTouchY = e.touches[0]!.clientY;
  }
  function onTouchMove(e: TouchEvent) {
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

  const hooks: DemoHooks = {
    setup(ctx: SceneContext) {
      ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      ctx.scene.add(ambientLight);

      directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      ctx.scene.add(directionalLight);

      pointLight = new THREE.PointLight(0xa8c4e8, 0.3);
      pointLight.position.set(-3, 0, 2);
      ctx.scene.add(pointLight);

      const factories: Array<() => THREE.BufferGeometry> = [
        () => new THREE.BoxGeometry(1, 1, 1),
        () => new THREE.SphereGeometry(0.6, 32, 16),
        () => new THREE.TorusGeometry(0.5, 0.2, 16, 32),
        () => new THREE.IcosahedronGeometry(0.6, 0),
        () => new THREE.ConeGeometry(0.5, 1, 32),
      ];
      for (const factory of factories) {
        const count = 3 + Math.floor(ctx.rng() * 2);
        for (let i = 0; i < count; i++) {
          const geometry = factory();
          const material = new THREE.MeshStandardMaterial({
            color: pickRandom(ctx.rng, PALETTE),
            roughness: 0.7,
            metalness: 0.05,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.scale.setScalar(randRange(ctx.rng, 0.4, 1.2));
          const x = randRange(ctx.rng, -6, 6);
          const y = randRange(ctx.rng, -4, 4);
          const z = randRange(ctx.rng, -8, -2);
          mesh.position.set(x, y, z);
          const axis = new THREE.Vector3(
            randRange(ctx.rng, -1, 1),
            randRange(ctx.rng, -1, 1),
            randRange(ctx.rng, -1, 1),
          ).normalize();
          shapes.push({
            mesh,
            rotationAxis: axis,
            rotationSpeed: randRange(ctx.rng, 0.1, 0.3),
            baseY: y,
            bobAmplitude: 0.2,
            bobSpeed: randRange(
              ctx.rng,
              (2 * Math.PI) / 5,
              (2 * Math.PI) / 3,
            ),
            bobPhase: randRange(ctx.rng, 0, 2 * Math.PI),
          });
          ctx.scene.add(mesh);
        }
      }

      if (isHover) {
        window.addEventListener("mousemove", onMouseMove);
      } else {
        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd, { passive: true });
      }

      stopThemeSync = observeTheme((theme: Theme) => {
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
    },

    update(ctx, time, dt) {
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
      ctx.camera.lookAt(cameraTarget);
    },

    cleanup() {
      if (isHover) {
        window.removeEventListener("mousemove", onMouseMove);
      } else {
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
      }
      stopThemeSync?.();
    },
  };

  return createScene(canvas, hooks);
}

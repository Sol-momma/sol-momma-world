import * as THREE from "three";
import { createScene, type DemoHooks, type SceneHandle } from "../scene-base";

interface Wave {
  amplitude: number;
  frequency: number;
  speed: number;
  direction: THREE.Vector2;
  phase: number;
}

export function init(canvas: HTMLCanvasElement): SceneHandle {
  let mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  let originalPositions: Float32Array;
  let waves: Wave[];

  const hooks: DemoHooks = {
    setup(ctx) {
      const geometry = new THREE.PlaneGeometry(10, 10, 80, 80);
      geometry.rotateX(-Math.PI / 2.5);
      originalPositions = new Float32Array(
        geometry.attributes.position!.array,
      );

      const material = new THREE.MeshStandardMaterial({
        color: 0x999b9d,
        metalness: 0.95,
        roughness: 0.15,
        side: THREE.DoubleSide,
      });
      mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = -1.5;
      ctx.scene.add(mesh);

      const env = new THREE.AmbientLight(0xffffff, 0.4);
      ctx.scene.add(env);
      const key = new THREE.DirectionalLight(0xffe8c8, 0.9);
      key.position.set(3, 5, 2);
      ctx.scene.add(key);
      const fill = new THREE.DirectionalLight(0x88a0c0, 0.5);
      fill.position.set(-3, 2, -2);
      ctx.scene.add(fill);

      waves = [
        {
          amplitude: 0.3,
          frequency: 0.8,
          speed: 0.7,
          direction: new THREE.Vector2(1, 0).normalize(),
          phase: 0,
        },
        {
          amplitude: 0.2,
          frequency: 1.4,
          speed: 1.2,
          direction: new THREE.Vector2(0.5, 0.8).normalize(),
          phase: 1.5,
        },
        {
          amplitude: 0.15,
          frequency: 2.1,
          speed: 1.8,
          direction: new THREE.Vector2(-0.6, 0.7).normalize(),
          phase: 3,
        },
      ];
    },
    update(_ctx, time) {
      const positions = mesh.geometry.attributes.position!;
      const t = time * 0.001;
      for (let i = 0; i < positions.count; i++) {
        const x = originalPositions[i * 3]!;
        const z = originalPositions[i * 3 + 2]!;
        let y = 0;
        for (const w of waves) {
          const dot = x * w.direction.x + z * w.direction.y;
          y +=
            w.amplitude *
            Math.sin(dot * w.frequency + t * w.speed + w.phase);
        }
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    },
  };

  return createScene(canvas, hooks, { cameraZ: 5, cameraFov: 55 });
}

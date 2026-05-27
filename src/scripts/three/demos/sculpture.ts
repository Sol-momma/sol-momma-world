import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createScene, type DemoHooks, type SceneHandle } from "../scene-base";

export function init(canvas: HTMLCanvasElement): SceneHandle {
  let controls: OrbitControls | null = null;

  const hooks: DemoHooks = {
    setup(ctx) {
      const geometry = new THREE.IcosahedronGeometry(1.4, 4);
      const colorAttr = new Float32Array(
        geometry.attributes.position!.count * 3,
      );
      const posAttr = geometry.attributes.position!;
      const colorA = new THREE.Color(0xc9a57b);
      const colorB = new THREE.Color(0x8b9a82);
      const tmp = new THREE.Color();
      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i);
        const t = (y + 1.4) / 2.8;
        tmp.copy(colorA).lerp(colorB, t);
        colorAttr[i * 3] = tmp.r;
        colorAttr[i * 3 + 1] = tmp.g;
        colorAttr[i * 3 + 2] = tmp.b;
      }
      geometry.setAttribute("color", new THREE.BufferAttribute(colorAttr, 3));

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.5,
        metalness: 0.2,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      ctx.scene.add(mesh);

      const key = new THREE.DirectionalLight(0xffffff, 0.9);
      key.position.set(3, 4, 5);
      ctx.scene.add(key);
      const fill = new THREE.AmbientLight(0xffffff, 0.4);
      ctx.scene.add(fill);

      ctx.camera.position.set(0, 0, 4);
      controls = new OrbitControls(ctx.camera, ctx.renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
    },
    update() {
      controls?.update();
    },
    cleanup() {
      controls?.dispose();
    },
  };

  return createScene(canvas, hooks, { cameraZ: 4 });
}

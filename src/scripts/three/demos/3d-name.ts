import * as THREE from "three";
import {
  FontLoader,
  type Font,
} from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { createScene, type DemoHooks, type SceneHandle } from "../scene-base";

const FONT_URL =
  "https://unpkg.com/three@0.184.0/examples/fonts/helvetiker_bold.typeface.json";

export function init(canvas: HTMLCanvasElement): SceneHandle {
  let textMesh: THREE.Mesh | null = null;
  let parallaxX = 0;

  function onMouseMove(e: MouseEvent) {
    parallaxX = (e.clientX / window.innerWidth - 0.5) * 0.4;
  }

  const hooks: DemoHooks = {
    setup(ctx) {
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      ctx.scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 0.7);
      dir.position.set(2, 3, 5);
      ctx.scene.add(dir);

      const loader = new FontLoader();
      loader.load(FONT_URL, (font: Font) => {
        const geometry = new TextGeometry("So Momma", {
          font,
          size: 0.8,
          depth: 0.25,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.04,
          bevelSize: 0.03,
          bevelSegments: 5,
        });
        geometry.center();
        const material = new THREE.MeshPhysicalMaterial({
          color: 0xe8dcc4,
          metalness: 0.3,
          roughness: 0.15,
          transmission: 0.6,
          thickness: 0.4,
          ior: 1.5,
        });
        textMesh = new THREE.Mesh(geometry, material);
        ctx.scene.add(textMesh);
      });

      window.addEventListener("mousemove", onMouseMove);
    },
    update(_ctx, time) {
      if (textMesh) {
        textMesh.rotation.y = Math.sin(time * 0.0003) * 0.5 + parallaxX;
        textMesh.rotation.x = Math.sin(time * 0.0005) * 0.1;
      }
    },
    cleanup() {
      window.removeEventListener("mousemove", onMouseMove);
    },
  };

  return createScene(canvas, hooks, { cameraZ: 5 });
}

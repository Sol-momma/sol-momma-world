import * as THREE from "three";
import { mulberry32, randRange } from "../prng";
import { createScene, type DemoHooks, type SceneHandle } from "../scene-base";

export function init(canvas: HTMLCanvasElement): SceneHandle {
  // 訪問時の時刻を seed に
  const now = new Date();
  const seed = now.getHours() * 60 + now.getMinutes();
  const localRng = mulberry32(seed);

  // 時刻によって色相が変わる: 朝=暖色、昼=明るい、夜=寒色
  const hour = now.getHours();
  const baseHue = ((hour / 24) * 360 + 30) % 360; // 朝6時起点でオレンジ寄り

  const shapesData: { mesh: THREE.Mesh; speed: number; axis: THREE.Vector3 }[] =
    [];

  const hooks: DemoHooks = {
    setup(ctx) {
      ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(3, 4, 5);
      ctx.scene.add(dir);

      const count = 3 + Math.floor(localRng() * 9); // 3〜11
      const baseSize = 0.5 + localRng() * 0.7;
      for (let i = 0; i < count; i++) {
        const geomChoice = Math.floor(localRng() * 4);
        let geom: THREE.BufferGeometry;
        if (geomChoice === 0)
          geom = new THREE.IcosahedronGeometry(baseSize, 1);
        else if (geomChoice === 1)
          geom = new THREE.OctahedronGeometry(baseSize, 0);
        else if (geomChoice === 2)
          geom = new THREE.TetrahedronGeometry(baseSize, 0);
        else geom = new THREE.DodecahedronGeometry(baseSize, 0);

        const hue = (baseHue + localRng() * 60) % 360;
        const sat = 0.4 + localRng() * 0.3;
        const lig = 0.55 + localRng() * 0.2;
        const color = new THREE.Color().setHSL(hue / 360, sat, lig);

        const mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.5,
          metalness: 0.1,
          flatShading: true,
        });
        const mesh = new THREE.Mesh(geom, mat);
        const r = 1.5 + localRng() * 1.5;
        const theta = (i / count) * Math.PI * 2;
        mesh.position.set(
          Math.cos(theta) * r,
          randRange(localRng, -1, 1),
          Math.sin(theta) * r,
        );
        const axis = new THREE.Vector3(
          localRng(),
          localRng(),
          localRng(),
        ).normalize();
        shapesData.push({
          mesh,
          speed: 0.2 + localRng() * 0.6,
          axis,
        });
        ctx.scene.add(mesh);
      }
    },
    update(_ctx, _time, dt) {
      for (const s of shapesData) {
        s.mesh.rotateOnAxis(s.axis, s.speed * dt);
      }
    },
  };

  return createScene(canvas, hooks, { cameraZ: 5, seed });
}

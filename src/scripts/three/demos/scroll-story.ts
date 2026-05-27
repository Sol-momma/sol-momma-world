import * as THREE from "three";
import { createScene, type DemoHooks, type SceneHandle } from "../scene-base";

interface KeyPose {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

export function init(canvas: HTMLCanvasElement): SceneHandle {
  let scrollProgress = 0;
  const keyPoses: KeyPose[] = [
    { position: new THREE.Vector3(0, 0, 5), lookAt: new THREE.Vector3(0, 0, 0) },
    { position: new THREE.Vector3(0, 6, 8), lookAt: new THREE.Vector3(0, 0, 0) },
    { position: new THREE.Vector3(8, 2, 3), lookAt: new THREE.Vector3(0, 0, 0) },
  ];

  const tmpPos = new THREE.Vector3();
  const tmpLookAt = new THREE.Vector3();

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress =
      max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  const hooks: DemoHooks = {
    setup(ctx) {
      ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(4, 5, 3);
      ctx.scene.add(dir);

      // Scene 1 中心: 1個の球
      const heroGeom = new THREE.SphereGeometry(1, 32, 16);
      const heroMat = new THREE.MeshStandardMaterial({
        color: 0xc9a57b,
        roughness: 0.4,
      });
      const hero = new THREE.Mesh(heroGeom, heroMat);
      ctx.scene.add(hero);

      // Scene 2 周辺: 群れ
      for (let i = 0; i < 12; i++) {
        const r = 2.5;
        const theta = (i / 12) * Math.PI * 2;
        const m = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.3, 0),
          new THREE.MeshStandardMaterial({
            color: 0x8b9a82,
            roughness: 0.5,
          }),
        );
        m.position.set(
          Math.cos(theta) * r,
          Math.sin(i * 0.5) * 0.5,
          Math.sin(theta) * r,
        );
        ctx.scene.add(m);
      }

      // Scene 3 渦: 螺旋
      for (let i = 0; i < 30; i++) {
        const t = i / 30;
        const r = 0.5 + t * 2;
        const m = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.15, 0),
          new THREE.MeshStandardMaterial({
            color: 0xd4b896,
            roughness: 0.4,
          }),
        );
        const theta = t * Math.PI * 6;
        m.position.set(Math.cos(theta) * r, t * 4 - 2, Math.sin(theta) * r);
        ctx.scene.add(m);
      }

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    },
    update(ctx) {
      // 0..1 を 2 区間に: 0..0.5 -> pose0->pose1、0.5..1 -> pose1->pose2
      const p = scrollProgress * 2;
      const segment = Math.min(1, Math.floor(p));
      const local = p - segment;
      const a = keyPoses[segment]!;
      const b = keyPoses[segment + 1] ?? keyPoses[segment]!;
      tmpPos.copy(a.position).lerp(b.position, local);
      tmpLookAt.copy(a.lookAt).lerp(b.lookAt, local);
      ctx.camera.position.copy(tmpPos);
      ctx.camera.lookAt(tmpLookAt);
    },
    cleanup() {
      window.removeEventListener("scroll", onScroll);
    },
  };

  return createScene(canvas, hooks, { cameraZ: 5 });
}

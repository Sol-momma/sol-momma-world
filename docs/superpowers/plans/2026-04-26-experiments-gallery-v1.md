# Experiments Gallery v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/experiments` を 6 種類の芸術的 three.js demo を並べた gallery に進化させる。共通基盤を抽出し、既存 floating-shapes を含む 7 demo を index ページで一覧。

**Architecture:** `scene-base.ts` + `CanvasFrame.astro` で renderer/loop/dispose を共通化。各 demo は専用 .ts ファイルでフックを実装し、専用 Astro ページで `<CanvasFrame demo="..." />` を貼る。

**Tech Stack:** Astro v6 / TypeScript strict / three.js 0.184 / カスタム GLSL（α のみ）

**Spec reference:** `docs/superpowers/specs/2026-04-26-experiments-gallery-v1.md`

---

## ファイル一覧

新規：
- `src/scripts/three/scene-base.ts` — 共通 renderer/loop/dispose
- `src/components/three/CanvasFrame.astro` — 汎用 canvas
- `src/scripts/three/demos/blob-hero.ts` — α
- `src/scripts/three/demos/3d-name.ts` — β
- `src/scripts/three/demos/liquid-metal.ts` — γ
- `src/scripts/three/demos/sculpture.ts` — δ
- `src/scripts/three/demos/generative.ts` — ε
- `src/scripts/three/demos/scroll-story.ts` — ζ
- `src/pages/experiments/index.astro` — gallery index
- `src/pages/experiments/floating-shapes.astro` — 移動先
- `src/pages/experiments/blob-hero.astro` — α ページ
- `src/pages/experiments/3d-name.astro` — β ページ
- `src/pages/experiments/liquid-metal.astro` — γ ページ
- `src/pages/experiments/sculpture.astro` — δ ページ
- `src/pages/experiments/generative.astro` — ε ページ
- `src/pages/experiments/scroll-story.astro` — ζ ページ

修正：
- `src/scripts/three/floating-shapes.ts` — scene-base 利用に refactor
- `src/components/three/FloatingShapes.astro` — CanvasFrame 利用に変更（または削除）
- `src/pages/experiments.astro` — 削除（index.astro へ役割移行）

---

## Task 1：scene-base 抽出

共通の renderer/animation loop/dispose 雛形を作る。各 demo がこれに乗ることでボイラープレート削減。

**Files:** Create `src/scripts/three/scene-base.ts`

- [ ] **Step 1: ファイル作成**

`src/scripts/three/scene-base.ts`：
```ts
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
  /** parallax / drag を camera にデフォルト適用するかどうか */
  defaultCameraParallax?: boolean;
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
```

- [ ] **Step 2: 型チェック**

```bash
pnpm astro check
```
Expected: 0 error

- [ ] **Step 3: Commit**

```bash
git add src/scripts/three/scene-base.ts
git commit -m "scene-base ユーティリティを抽出

renderer/camera/animation loop/resize/dispose/reduce-motion を共通化。
DemoHooks インタフェースで各 demo が setup/update/cleanup を実装する形。"
```

---

## Task 2：floating-shapes を scene-base に乗せ替え

既存挙動を維持しつつ scene-base を使う形に refactor。リグレッション防止のため一気に置換。

**Files:** Modify `src/scripts/three/floating-shapes.ts`

- [ ] **Step 1: ファイル全置換**

`src/scripts/three/floating-shapes.ts` を以下で完全置換：
```ts
import * as THREE from "three";
import { randRange, pickRandom } from "./prng";
import { observeTheme, type Theme } from "./theme-sync";
import { createScene, type DemoHooks, type SceneContext, type SceneHandle } from "./scene-base";

export type Mode = "matte" | "wire" | "glass" | "neon";

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
            bobSpeed: randRange(ctx.rng, (2 * Math.PI) / 5, (2 * Math.PI) / 3),
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
```

- [ ] **Step 2: 型チェック ＋ ビルド ＋ 動作確認**

```bash
pnpm astro check
pnpm dev
```
`http://localhost:4321/experiments` で前と同じ scene が動くこと。Ctrl+C で停止。

- [ ] **Step 3: Commit**

```bash
git add src/scripts/three/floating-shapes.ts
git commit -m "floating-shapes を scene-base 経由に refactor"
```

---

## Task 3：CanvasFrame コンポーネント

各 demo ページから使う汎用 fullscreen canvas wrapper。demo 名で対応モジュールを動的 import。

**Files:** Create `src/components/three/CanvasFrame.astro`

- [ ] **Step 1: ファイル作成**

`src/components/three/CanvasFrame.astro`：
```astro
---
interface Props {
  demo: string;
}
const { demo } = Astro.props;
---

<canvas data-three-canvas data-demo={demo}></canvas>

<style>
  canvas[data-three-canvas] {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    display: block;
    z-index: 0;
  }
</style>

<script>
  type DemoModule = {
    init: (canvas: HTMLCanvasElement) => { dispose: () => void };
  };

  const canvas = document.querySelector<HTMLCanvasElement>(
    "canvas[data-three-canvas]",
  );
  if (canvas) {
    const demoName = canvas.dataset.demo;
    const modules: Record<string, () => Promise<DemoModule>> = {
      "floating-shapes": () => import("../../scripts/three/floating-shapes"),
      "blob-hero": () => import("../../scripts/three/demos/blob-hero"),
      "3d-name": () => import("../../scripts/three/demos/3d-name"),
      "liquid-metal": () => import("../../scripts/three/demos/liquid-metal"),
      sculpture: () => import("../../scripts/three/demos/sculpture"),
      generative: () => import("../../scripts/three/demos/generative"),
      "scroll-story": () => import("../../scripts/three/demos/scroll-story"),
    };
    const loader = demoName ? modules[demoName] : undefined;
    if (loader) {
      loader().then((mod) => {
        const handle = mod.init(canvas);
        window.addEventListener("beforeunload", () => handle.dispose(), {
          once: true,
        });
      });
    }
  }
</script>
```

- [ ] **Step 2: Commit（ここではビルド失敗するが OK、まだ demo モジュールが無いため）**

実は無関係 import チェックは Vite の動的 import で実行時まで遅延する。`pnpm astro check` だけ通る。

```bash
pnpm astro check
```
Expected: 0 error（動的 import は静的解析されない）

```bash
git add src/components/three/CanvasFrame.astro
git commit -m "CanvasFrame 汎用 canvas コンポーネントを追加

demo 名から動的に対応モジュールを import。これで各 demo ページは
<CanvasFrame demo='blob-hero' /> 1行で起動できる。"
```

---

## Task 4：URL 再構成（floating-shapes 移動）＋ 旧 experiments.astro 削除

**Files:**
- Create: `src/pages/experiments/floating-shapes.astro`
- Delete: `src/pages/experiments.astro`
- Modify: 既存の `src/components/three/FloatingShapes.astro` は不要になる（CanvasFrame で代替）

- [ ] **Step 1: experiments ディレクトリ作成**

```bash
mkdir -p src/pages/experiments
```

- [ ] **Step 2: floating-shapes.astro を新パスに作成**

`src/pages/experiments/floating-shapes.astro`：
```astro
---
import BaseHead from "../../components/BaseHead.astro";
import CanvasFrame from "../../components/three/CanvasFrame.astro";
import { SITE_TITLE } from "../../consts";
---

<!doctype html>
<html lang="ja">
  <head>
    <BaseHead
      title={`Floating Shapes — Experiments — ${SITE_TITLE}`}
      description="ベージュ系幾何形状が浮遊する 3D scene。"
    />
  </head>
  <body>
    <a class="back glass" href="/experiments" aria-label="Back to experiments">← Experiments</a>
    <CanvasFrame demo="floating-shapes" />

    <style is:global>
      html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; background: var(--t-bg); }
    </style>
    <style>
      .back { position: fixed; top: 1.5rem; left: 1.5rem; z-index: 10; padding: 0.5rem 1rem; border-radius: 9999px; text-decoration: none; color: var(--t-text); font-family: inherit; font-size: 0.95rem; }
    </style>
  </body>
</html>
```

- [ ] **Step 3: 旧 `src/pages/experiments.astro` を削除**

```bash
rm src/pages/experiments.astro
```

- [ ] **Step 4: 旧 FloatingShapes.astro コンポーネントを削除**（CanvasFrame で置換済み）

```bash
rm src/components/three/FloatingShapes.astro
```

- [ ] **Step 5: 型チェック ＋ ビルド**

```bash
pnpm astro check
pnpm build
```
build で `/experiments/floating-shapes/index.html` が生成される。`/experiments` は次タスクで作るのでまだ存在しない（404）。

- [ ] **Step 6: Commit**

```bash
git add src/pages/experiments/floating-shapes.astro
git rm src/pages/experiments.astro src/components/three/FloatingShapes.astro
git commit -m "floating-shapes を /experiments/floating-shapes に移動

旧 /experiments と専用 FloatingShapes.astro を削除し、CanvasFrame
経由で起動する形式に統一。次タスクで /experiments を index ページとして再生成。"
```

---

## Task 5：Index ページ

7 枚カードグリッドの gallery 入口。

**Files:** Create `src/pages/experiments/index.astro`

- [ ] **Step 1: ファイル作成**

`src/pages/experiments/index.astro`：
```astro
---
import BaseHead from "../../components/BaseHead.astro";
import Header from "../../components/Header.astro";
import { SITE_TITLE } from "../../consts";

interface Demo {
  slug: string;
  title: string;
  description: string;
}
const demos: Demo[] = [
  { slug: "floating-shapes", title: "Floating Shapes", description: "ベージュ系幾何形状の浮遊と parallax" },
  { slug: "blob-hero", title: "Blob Hero", description: "vertex shader で歪むガラス球" },
  { slug: "3d-name", title: "3D Name", description: "立体タイポグラフィ \"So Momma\"" },
  { slug: "liquid-metal", title: "Liquid Metal", description: "メタリックな波打つ平面" },
  { slug: "sculpture", title: "Sculpture", description: "ローポリ彫刻、orbit で全方位" },
  { slug: "generative", title: "Generative", description: "時刻で変わる procedural scene" },
  { slug: "scroll-story", title: "Scroll Story", description: "scroll で 3 シーンを巡る" },
];
---

<!doctype html>
<html lang="ja">
  <head>
    <BaseHead
      title={`Experiments — ${SITE_TITLE}`}
      description="three.js で作った芸術系インタラクティブ実験集。"
    />
  </head>
  <body>
    <Header />
    <main class="px-6 py-12 mx-auto max-w-5xl">
      <h1 class="text-3xl font-serif italic mb-2">Experiments</h1>
      <p class="text-sm opacity-70 mb-10">three.js で作った芸術系インタラクティブ実験集。各カードをクリック。</p>

      <ul class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {demos.map((demo) => (
          <li>
            <a class="card glass block p-5 transition-transform" href={`/experiments/${demo.slug}`}>
              <h2 class="text-lg font-medium mb-1">{demo.title}</h2>
              <p class="text-xs opacity-60">{demo.description}</p>
              <span class="arrow text-xl mt-3 inline-block">→</span>
            </a>
          </li>
        ))}
      </ul>
    </main>

    <style>
      .card {
        border-radius: 1rem;
        color: var(--t-text);
        text-decoration: none;
        height: 100%;
      }
      .card:hover { transform: scale(1.02); }
      .arrow { transition: transform 0.2s ease; }
      .card:hover .arrow { transform: translateX(4px); }
    </style>
  </body>
</html>
```

- [ ] **Step 2: 型チェック ＋ ビルド**

```bash
pnpm astro check
pnpm build
pnpm dev
```
`http://localhost:4321/experiments` で 7 枚カード表示。`Floating Shapes` のみ実体動く（他は 404）。Ctrl+C で停止。

- [ ] **Step 3: Commit**

```bash
git add src/pages/experiments/index.astro
git commit -m "/experiments index ページを追加

7 枚（floating-shapes ＋ 6 demos）のカードグリッド。各カードは
.glass スタイル、hover で軽く scale。残り 6 demos は次タスク以降で実装。"
```

---

## Task 6：α blob-hero

vertex shader で simplex noise displacement したガラス球。

**Files:**
- Create: `src/scripts/three/demos/blob-hero.ts`
- Create: `src/pages/experiments/blob-hero.astro`

- [ ] **Step 1: demos ディレクトリ作成**

```bash
mkdir -p src/scripts/three/demos
```

- [ ] **Step 2: blob-hero.ts 作成**

`src/scripts/three/demos/blob-hero.ts`：
```ts
import * as THREE from "three";
import { createScene, type DemoHooks, type SceneHandle } from "../scene-base";

// 3D Simplex noise (Ashima/IQ implementation, common in shader art)
const NOISE_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const VERTEX_SHADER = `
${NOISE_GLSL}
uniform float uTime;
uniform float uAmplitude;
varying vec3 vNormal;
varying float vDisp;

void main() {
  float disp = snoise(normal * 1.2 + uTime * 0.3) * uAmplitude;
  vec3 newPos = position + normal * disp;
  vDisp = disp;
  vNormal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
`;

const FRAGMENT_SHADER = `
varying vec3 vNormal;
varying float vDisp;
uniform vec3 uColorA;
uniform vec3 uColorB;

void main() {
  float fres = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
  vec3 col = mix(uColorA, uColorB, vDisp * 0.5 + 0.5);
  col += fres * 0.4;
  gl_FragColor = vec4(col, 0.85);
}
`;

export function init(canvas: HTMLCanvasElement): SceneHandle {
  let mesh: THREE.Mesh<THREE.IcosahedronGeometry, THREE.ShaderMaterial>;

  const hooks: DemoHooks = {
    setup(ctx) {
      const geometry = new THREE.IcosahedronGeometry(1.5, 64);
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        uniforms: {
          uTime: { value: 0 },
          uAmplitude: { value: 0.25 },
          uColorA: { value: new THREE.Color(0xc9a57b) },
          uColorB: { value: new THREE.Color(0x8b9a82) },
        },
      });
      mesh = new THREE.Mesh(geometry, material);
      ctx.scene.add(mesh);

      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      ctx.scene.add(ambient);
    },
    update(_ctx, time) {
      mesh.material.uniforms.uTime!.value = time * 0.001;
      mesh.rotation.y = time * 0.0002;
    },
  };

  return createScene(canvas, hooks, { cameraZ: 4 });
}
```

- [ ] **Step 3: blob-hero.astro 作成**

`src/pages/experiments/blob-hero.astro`：
```astro
---
import BaseHead from "../../components/BaseHead.astro";
import CanvasFrame from "../../components/three/CanvasFrame.astro";
import { SITE_TITLE } from "../../consts";
---

<!doctype html>
<html lang="ja">
  <head>
    <BaseHead
      title={`Blob Hero — Experiments — ${SITE_TITLE}`}
      description="vertex shader で歪むガラス球。"
    />
  </head>
  <body>
    <a class="back glass" href="/experiments">← Experiments</a>
    <CanvasFrame demo="blob-hero" />

    <style is:global>
      html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; background: var(--t-bg); }
    </style>
    <style>
      .back { position: fixed; top: 1.5rem; left: 1.5rem; z-index: 10; padding: 0.5rem 1rem; border-radius: 9999px; text-decoration: none; color: var(--t-text); font-family: inherit; font-size: 0.95rem; }
    </style>
  </body>
</html>
```

- [ ] **Step 4: 動作確認 ＋ Commit**

```bash
pnpm astro check
pnpm dev
# /experiments → blob-hero クリック → 歪む球が表示
git add src/scripts/three/demos/blob-hero.ts src/pages/experiments/blob-hero.astro
git commit -m "α blob-hero demo を追加: simplex noise vertex shader でガラス球を歪ませる"
```

---

## Task 7：β 3d-name

`TextGeometry` で "So Momma" を立体化。FontLoader で helvetiker フォントを CDN から読み込む。

**Files:**
- Create: `src/scripts/three/demos/3d-name.ts`
- Create: `src/pages/experiments/3d-name.astro`

- [ ] **Step 1: 3d-name.ts 作成**

`src/scripts/three/demos/3d-name.ts`：
```ts
import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { createScene, type DemoHooks, type SceneHandle } from "../scene-base";

const FONT_URL = "https://unpkg.com/three@0.184.0/examples/fonts/helvetiker_bold.typeface.json";

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
```

- [ ] **Step 2: 3d-name.astro 作成**

`src/pages/experiments/3d-name.astro`：
```astro
---
import BaseHead from "../../components/BaseHead.astro";
import CanvasFrame from "../../components/three/CanvasFrame.astro";
import { SITE_TITLE } from "../../consts";
---

<!doctype html>
<html lang="ja">
  <head>
    <BaseHead title={`3D Name — Experiments — ${SITE_TITLE}`} description="立体タイポグラフィ。" />
  </head>
  <body>
    <a class="back glass" href="/experiments">← Experiments</a>
    <CanvasFrame demo="3d-name" />
    <style is:global>html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; background: var(--t-bg); }</style>
    <style>.back { position: fixed; top: 1.5rem; left: 1.5rem; z-index: 10; padding: 0.5rem 1rem; border-radius: 9999px; text-decoration: none; color: var(--t-text); font-family: inherit; font-size: 0.95rem; }</style>
  </body>
</html>
```

- [ ] **Step 3: 動作確認 ＋ Commit**

```bash
pnpm astro check
pnpm dev
# /experiments/3d-name で "So Momma" が立体表示される
git add src/scripts/three/demos/3d-name.ts src/pages/experiments/3d-name.astro
git commit -m "β 3d-name demo を追加: TextGeometry で立体 So Momma"
```

---

## Task 8：γ liquid-metal

CPU side で plane の頂点 Y を多重 sin 波で動かす。

**Files:**
- Create: `src/scripts/three/demos/liquid-metal.ts`
- Create: `src/pages/experiments/liquid-metal.astro`

- [ ] **Step 1: liquid-metal.ts 作成**

`src/scripts/three/demos/liquid-metal.ts`：
```ts
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
      originalPositions = new Float32Array(geometry.attributes.position!.array);

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
        { amplitude: 0.3, frequency: 0.8, speed: 0.7, direction: new THREE.Vector2(1, 0).normalize(), phase: 0 },
        { amplitude: 0.2, frequency: 1.4, speed: 1.2, direction: new THREE.Vector2(0.5, 0.8).normalize(), phase: 1.5 },
        { amplitude: 0.15, frequency: 2.1, speed: 1.8, direction: new THREE.Vector2(-0.6, 0.7).normalize(), phase: 3 },
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
          y += w.amplitude * Math.sin(dot * w.frequency + t * w.speed + w.phase);
        }
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    },
  };

  return createScene(canvas, hooks, { cameraZ: 5, cameraFov: 55 });
}
```

- [ ] **Step 2: liquid-metal.astro 作成**

`src/pages/experiments/liquid-metal.astro`：
```astro
---
import BaseHead from "../../components/BaseHead.astro";
import CanvasFrame from "../../components/three/CanvasFrame.astro";
import { SITE_TITLE } from "../../consts";
---

<!doctype html>
<html lang="ja">
  <head>
    <BaseHead title={`Liquid Metal — Experiments — ${SITE_TITLE}`} description="メタリック液体平面。" />
  </head>
  <body>
    <a class="back glass" href="/experiments">← Experiments</a>
    <CanvasFrame demo="liquid-metal" />
    <style is:global>html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; background: var(--t-bg); }</style>
    <style>.back { position: fixed; top: 1.5rem; left: 1.5rem; z-index: 10; padding: 0.5rem 1rem; border-radius: 9999px; text-decoration: none; color: var(--t-text); font-family: inherit; font-size: 0.95rem; }</style>
  </body>
</html>
```

- [ ] **Step 3: 動作確認 ＋ Commit**

```bash
pnpm astro check
pnpm dev
# /experiments/liquid-metal で metallic な波打つ平面
git add src/scripts/three/demos/liquid-metal.ts src/pages/experiments/liquid-metal.astro
git commit -m "γ liquid-metal demo を追加: 多重 sin 波で平面を動かすメタリック表現"
```

---

## Task 9：δ sculpture

OrbitControls で自由に観察できる subdivision icosahedron。

**Files:**
- Create: `src/scripts/three/demos/sculpture.ts`
- Create: `src/pages/experiments/sculpture.astro`

- [ ] **Step 1: sculpture.ts 作成**

`src/scripts/three/demos/sculpture.ts`：
```ts
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createScene, type DemoHooks, type SceneHandle } from "../scene-base";

export function init(canvas: HTMLCanvasElement): SceneHandle {
  let controls: OrbitControls | null = null;

  const hooks: DemoHooks = {
    setup(ctx) {
      const geometry = new THREE.IcosahedronGeometry(1.4, 4);
      // per-vertex tint by position
      const colorAttr = new Float32Array(geometry.attributes.position!.count * 3);
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
```

- [ ] **Step 2: sculpture.astro 作成**

`src/pages/experiments/sculpture.astro`：
```astro
---
import BaseHead from "../../components/BaseHead.astro";
import CanvasFrame from "../../components/three/CanvasFrame.astro";
import { SITE_TITLE } from "../../consts";
---

<!doctype html>
<html lang="ja">
  <head>
    <BaseHead title={`Sculpture — Experiments — ${SITE_TITLE}`} description="ローポリ彫刻、orbit で全方位観察。" />
  </head>
  <body>
    <a class="back glass" href="/experiments">← Experiments</a>
    <CanvasFrame demo="sculpture" />
    <style is:global>html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; background: var(--t-bg); }</style>
    <style>.back { position: fixed; top: 1.5rem; left: 1.5rem; z-index: 10; padding: 0.5rem 1rem; border-radius: 9999px; text-decoration: none; color: var(--t-text); font-family: inherit; font-size: 0.95rem; }</style>
  </body>
</html>
```

- [ ] **Step 3: 動作確認 ＋ Commit**

```bash
pnpm astro check
pnpm dev
# /experiments/sculpture でドラッグして回転、ホイールで zoom
git add src/scripts/three/demos/sculpture.ts src/pages/experiments/sculpture.astro
git commit -m "δ sculpture demo を追加: per-vertex 着色 icosahedron + OrbitControls"
```

---

## Task 10：ε generative

訪問時の時刻を seed にして shapes 数・色相・速度を決定。

**Files:**
- Create: `src/scripts/three/demos/generative.ts`
- Create: `src/pages/experiments/generative.astro`

- [ ] **Step 1: generative.ts 作成**

`src/scripts/three/demos/generative.ts`：
```ts
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

  const shapesData: { mesh: THREE.Mesh; speed: number; axis: THREE.Vector3 }[] = [];

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
        if (geomChoice === 0) geom = new THREE.IcosahedronGeometry(baseSize, 1);
        else if (geomChoice === 1) geom = new THREE.OctahedronGeometry(baseSize, 0);
        else if (geomChoice === 2) geom = new THREE.TetrahedronGeometry(baseSize, 0);
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
        mesh.position.set(Math.cos(theta) * r, randRange(localRng, -1, 1), Math.sin(theta) * r);
        const axis = new THREE.Vector3(localRng(), localRng(), localRng()).normalize();
        shapesData.push({ mesh, speed: 0.2 + localRng() * 0.6, axis });
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
```

- [ ] **Step 2: generative.astro 作成**

`src/pages/experiments/generative.astro`：
```astro
---
import BaseHead from "../../components/BaseHead.astro";
import CanvasFrame from "../../components/three/CanvasFrame.astro";
import { SITE_TITLE } from "../../consts";
---

<!doctype html>
<html lang="ja">
  <head>
    <BaseHead title={`Generative — Experiments — ${SITE_TITLE}`} description="訪問時刻で変わる procedural scene。" />
  </head>
  <body>
    <a class="back glass" href="/experiments">← Experiments</a>
    <CanvasFrame demo="generative" />
    <style is:global>html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; background: var(--t-bg); }</style>
    <style>.back { position: fixed; top: 1.5rem; left: 1.5rem; z-index: 10; padding: 0.5rem 1rem; border-radius: 9999px; text-decoration: none; color: var(--t-text); font-family: inherit; font-size: 0.95rem; }</style>
  </body>
</html>
```

- [ ] **Step 3: 動作確認 ＋ Commit**

```bash
pnpm astro check
pnpm dev
# /experiments/generative で時刻に応じた scene、リロードで毎分変わる
git add src/scripts/three/demos/generative.ts src/pages/experiments/generative.astro
git commit -m "ε generative demo を追加: 時刻ベース seed で shapes 数・色相・配置を生成"
```

---

## Task 11：ζ scroll-story

scroll position に応じて 3 つの key pose 間で camera を lerp。

**Files:**
- Create: `src/scripts/three/demos/scroll-story.ts`
- Create: `src/pages/experiments/scroll-story.astro`

- [ ] **Step 1: scroll-story.ts 作成**

`src/scripts/three/demos/scroll-story.ts`：
```ts
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
    scrollProgress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  const hooks: DemoHooks = {
    setup(ctx) {
      ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(4, 5, 3);
      ctx.scene.add(dir);

      // Scene 1 中心: 1個の球
      const heroGeom = new THREE.SphereGeometry(1, 32, 16);
      const heroMat = new THREE.MeshStandardMaterial({ color: 0xc9a57b, roughness: 0.4 });
      const hero = new THREE.Mesh(heroGeom, heroMat);
      ctx.scene.add(hero);

      // Scene 2 周辺: 群れ
      for (let i = 0; i < 12; i++) {
        const r = 2.5;
        const theta = (i / 12) * Math.PI * 2;
        const m = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.3, 0),
          new THREE.MeshStandardMaterial({ color: 0x8b9a82, roughness: 0.5 }),
        );
        m.position.set(Math.cos(theta) * r, Math.sin(i * 0.5) * 0.5, Math.sin(theta) * r);
        ctx.scene.add(m);
      }

      // Scene 3 渦: 螺旋
      for (let i = 0; i < 30; i++) {
        const t = i / 30;
        const r = 0.5 + t * 2;
        const m = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.15, 0),
          new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.4 }),
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
```

- [ ] **Step 2: scroll-story.astro 作成**

`src/pages/experiments/scroll-story.astro`：
```astro
---
import BaseHead from "../../components/BaseHead.astro";
import CanvasFrame from "../../components/three/CanvasFrame.astro";
import { SITE_TITLE } from "../../consts";
---

<!doctype html>
<html lang="ja">
  <head>
    <BaseHead title={`Scroll Story — Experiments — ${SITE_TITLE}`} description="scroll で 3 シーンを巡る。" />
  </head>
  <body>
    <a class="back glass" href="/experiments">← Experiments</a>
    <CanvasFrame demo="scroll-story" />
    <!-- スクロール領域確保 -->
    <div class="scroll-spacer" aria-hidden="true"></div>

    <style is:global>
      html, body { margin: 0; padding: 0; height: 100%; background: var(--t-bg); }
      body { overflow-y: scroll; }
    </style>
    <style>
      .back { position: fixed; top: 1.5rem; left: 1.5rem; z-index: 10; padding: 0.5rem 1rem; border-radius: 9999px; text-decoration: none; color: var(--t-text); font-family: inherit; font-size: 0.95rem; }
      .scroll-spacer { height: 300vh; pointer-events: none; }
    </style>
  </body>
</html>
```

- [ ] **Step 3: 動作確認 ＋ Commit**

```bash
pnpm astro check
pnpm dev
# /experiments/scroll-story でスクロールするとカメラ遷移
git add src/scripts/three/demos/scroll-story.ts src/pages/experiments/scroll-story.astro
git commit -m "ζ scroll-story demo を追加: scroll で 3 keypose 間を camera lerp"
```

---

## Task 12：最終 verification

**Files:** なし

- [ ] **Step 1: 型チェック**

```bash
pnpm astro check
```
Expected: 0 error

- [ ] **Step 2: production build**

```bash
rm -rf dist && pnpm build 2>&1 | tail -20
```
Expected:
- エラーなし
- 16 page(s) built

- [ ] **Step 3: bundle 構成確認**

```bash
du -sh dist/_astro/*.js | sort -h
```
Expected: three を含む chunk(s) は demo ページからのみ参照される。home/about/blog の HTML には引かれない。

```bash
grep -oE '_astro/[^"]+\.js' dist/index.html dist/about/index.html | sort -u
```
Expected: home / about の HTML には demo の JS が出ない（出ても極小の utility のみ）。

- [ ] **Step 4: 全 page を dev で巡回**

```bash
pnpm dev
```
- `/` （home）— 既存通り、ヘッダーに Experiments タブ
- `/experiments` — 7 枚カード、レイアウト崩れなし
- `/experiments/floating-shapes` — 既存挙動維持
- `/experiments/blob-hero` — 歪む球
- `/experiments/3d-name` — "So Momma" 立体（フォントロード待ち少し）
- `/experiments/liquid-metal` — 波打つ平面
- `/experiments/sculpture` — orbit で観察
- `/experiments/generative` — 時刻ベース scene
- `/experiments/scroll-story` — スクロールで camera 遷移
- 全ページで console エラー無し

- [ ] **Step 5: ユーザ報告**

完了報告し、user に dev サーバーで実機確認してもらう。問題があれば fix → 再 commit。OK が出たら main に merge する次フェーズへ。

---

## Self-Review

**1. Spec coverage：**

| Spec 項目 | Task |
|---|---|
| URL 再構成（§2） | Task 4, 5 |
| scene-base 抽出（§3.1） | Task 1 |
| CanvasFrame（§3.2） | Task 3 |
| floating-shapes 移行（§3.1 末尾） | Task 2, 4 |
| α blob-hero（§4） | Task 6 |
| β 3d-name | Task 7 |
| γ liquid-metal | Task 8 |
| δ sculpture | Task 9 |
| ε generative | Task 10 |
| ζ scroll-story | Task 11 |
| Index ページ（§5） | Task 5 |
| Verification（§7） | Task 12 |

**2. Placeholder scan：** TBD・TODO・「あとで実装」を含む step なし。各 step に実コードまたは具体的コマンド記載済み。

**3. Type consistency：**
- `SceneContext`、`DemoHooks`、`SceneHandle` は Task 1 で定義、Task 2, 6〜11 で使用、ブレなし
- `init(canvas): SceneHandle` シグネチャは全 demo で統一
- CanvasFrame の `modules` 辞書のキー名は各 demo の slug と一致（"floating-shapes", "blob-hero", "3d-name", "liquid-metal", "sculpture", "generative", "scroll-story"）、Index の `demos` 配列の slug と一致

**4. 注意点（実装時に発生しうる）：**
- TextGeometry / FontLoader / OrbitControls の import path は `three/examples/jsm/...`。three v0.184 で path 確認済み（仕様変更があれば調整）
- `3d-name` でフォントを CDN から取得するため、初回ロードに数百ミリ秒かかる
- `scroll-story` ではページ全体に `overflow-y: scroll` を再付与（他 demo は `overflow: hidden`）。共通スタイルではなく demo ごとに上書き

---

## Execution Handoff

実装計画完成、保存先：`docs/superpowers/plans/2026-04-26-experiments-gallery-v1.md`

実行方式：

**1. Inline Execution（推奨）** — 12 Task が共通基盤に依存し連続編集が多いので inline が効率的。同一セッションで `superpowers:executing-plans` を使い順次実装。

**2. Subagent-Driven** — Task 6〜11 は独立 demo なので並列化可能だが、Task 1〜5 を先に完了させる必要があり、parallel の旨味は demo 6 個分に限られる。

どちらで進めますか？

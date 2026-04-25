# Floating Shapes Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/experiments` ページに three.js の floating shapes（matte モード単独）を構築し、将来 home に転用できる Astro コンポーネント `<FloatingShapes />` として出荷する。

**Architecture:** ページ最上位（`experiments.astro`）→ Astro コンポーネント（`FloatingShapes.astro`、canvas + dynamic import）→ TypeScript モジュール（`floating-shapes.ts`、scene 構築・アニメーション・dispose）。テーマ連動と PRNG は独立ユーティリティに切り出し再利用可能にする。

**Tech Stack:** Astro v6 SSG / TypeScript strict / three.js 0.160 系 / Tailwind v4（既存 CSS 変数 `--t-*` を再利用）

**Spec reference:** `docs/superpowers/specs/2026-04-25-floating-shapes-design.md`

---

## ファイル一覧

| パス | 種別 | 役割 |
|---|---|---|
| `package.json` | 修正 | three / @types/three を依存に追加 |
| `src/scripts/three/prng.ts` | 新規 | mulberry32 seeded PRNG ＋ 補助関数 |
| `src/scripts/three/theme-sync.ts` | 新規 | `data-theme` 観測 → callback 呼び出し |
| `src/scripts/three/floating-shapes.ts` | 新規 | scene 構築・animate・dispose のメイン |
| `src/components/three/FloatingShapes.astro` | 新規 | canvas 要素 ＋ init 呼び出しの client script |
| `src/pages/experiments.astro` | 新規 | fullscreen ページ、Back リンク・モード切替 UI |

検証手段：このプロジェクトには Vitest 等のユニットテストランナーが未設定。spec の verification 方針に従い**手動確認 ＋ 型チェック ＋ console 警告ゼロ**で担保する。各タスクの最終ステップで dev サーバーから動作確認する。

---

## Task 1：three.js の依存追加

**Files:**
- Modify: `package.json`、`pnpm-lock.yaml`

- [ ] **Step 1: 依存追加**

```bash
pnpm add three
pnpm add -D @types/three
```

- [ ] **Step 2: 確認**

```bash
grep -E '"three"|"@types/three"' package.json
```
Expected: 両方が出力される（three は `dependencies`、@types/three は `devDependencies`）

- [ ] **Step 3: 型チェックが通ることを確認**

```bash
pnpm astro check
```
Expected: エラーなし（既存コードを壊していないこと）

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "three.js と型定義を依存に追加"
```

---

## Task 2：seeded PRNG ユーティリティ

**Files:**
- Create: `src/scripts/three/prng.ts`

- [ ] **Step 1: ディレクトリ作成**

```bash
mkdir -p src/scripts/three
```

- [ ] **Step 2: ファイル作成**

`src/scripts/three/prng.ts`：
```ts
// mulberry32 — 32bit seed から決定論的に [0, 1) を返す PRNG
// 配置の再現性を担保するため使う（リロードでもレイアウトが変わらない）
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function pickRandom<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}
```

- [ ] **Step 3: 型チェック**

```bash
pnpm astro check
```
Expected: エラーなし

- [ ] **Step 4: 簡易動作確認（dev サーバーは起動せずに）**

ブラウザ console から検証する用の確認用スクリプトを書かず、型と export だけで合格とする（次タスクで実利用するため）。

- [ ] **Step 5: Commit**

```bash
git add src/scripts/three/prng.ts
git commit -m "seeded PRNG ユーティリティ (mulberry32) を追加"
```

---

## Task 3：theme-sync ユーティリティ

**Files:**
- Create: `src/scripts/three/theme-sync.ts`

- [ ] **Step 1: ファイル作成**

`src/scripts/three/theme-sync.ts`：
```ts
// data-theme（<html> の属性）を観測し、変更のたびに callback を呼ぶ。
// 初回登録時にも現在値で callback を1回呼ぶ。
// 戻り値の関数で監視解除。
export type Theme = "light" | "dark";

function getTheme(): Theme {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "dark" ? "dark" : "light";
}

export function observeTheme(callback: (theme: Theme) => void): () => void {
  callback(getTheme());

  const observer = new MutationObserver(() => callback(getTheme()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => observer.disconnect();
}
```

- [ ] **Step 2: 型チェック**

```bash
pnpm astro check
```
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/scripts/three/theme-sync.ts
git commit -m "data-theme 観測ユーティリティを追加"
```

---

## Task 4：floating-shapes.ts のスケルトン（renderer ＋ scene ＋ camera ＋ dispose）

最初に「動く骨組み」を作り、その後の Task で肉付けする方針。Task 4 完了時点では空の透明 canvas が表示されればよい。

**Files:**
- Create: `src/scripts/three/floating-shapes.ts`

- [ ] **Step 1: ファイル作成**

`src/scripts/three/floating-shapes.ts`：
```ts
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

export function init(canvas: HTMLCanvasElement, _options: InitOptions = {}): FloatingShapesHandle {
  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
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
```

- [ ] **Step 2: 型チェック**

```bash
pnpm astro check
```
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/scripts/three/floating-shapes.ts
git commit -m "floating-shapes scene スケルトンを追加"
```

---

## Task 5：shapes ＋ matte マテリアル ＋ ライティング

スケルトンに 15〜20 個の shapes と 3 つのライトを足す。

**Files:**
- Modify: `src/scripts/three/floating-shapes.ts`

- [ ] **Step 1: import を更新**

ファイル先頭の import を以下に変更：
```ts
import * as THREE from "three";
import { mulberry32, randRange, pickRandom } from "./prng";
```

- [ ] **Step 2: 定数を追加**

`import` の直下に：
```ts
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
```

- [ ] **Step 3: `init` 関数本体を更新**

`init` の中で、`camera.lookAt(0, 0, -1);` の直後に以下を追加：

```ts
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
```

- [ ] **Step 4: `animate` を回転＋上下揺れに更新**

`animate` 関数を以下に置き換え：
```ts
  let rafId = 0;
  let prevTime = performance.now();

  function animate(time: number) {
    const dt = (time - prevTime) / 1000;
    prevTime = time;

    for (const s of shapes) {
      s.mesh.rotateOnAxis(s.rotationAxis, s.rotationSpeed * dt);
      s.mesh.position.y =
        s.baseY +
        Math.sin(time * 0.001 * s.bobSpeed + s.bobPhase) * s.bobAmplitude;
    }

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }
  rafId = requestAnimationFrame(animate);
```

- [ ] **Step 5: 型チェック**

```bash
pnpm astro check
```
Expected: エラーなし

- [ ] **Step 6: Commit**

```bash
git add src/scripts/three/floating-shapes.ts
git commit -m "floating-shapes に matte マテリアル shapes と lighting を追加"
```

---

## Task 6：FloatingShapes Astro コンポーネント

scene を Astro 側から呼び出す薄いラッパー。

**Files:**
- Create: `src/components/three/FloatingShapes.astro`

- [ ] **Step 1: ディレクトリ作成**

```bash
mkdir -p src/components/three
```

- [ ] **Step 2: ファイル作成**

`src/components/three/FloatingShapes.astro`：
```astro
---
// FloatingShapes — three.js floating shapes scene component
// 再利用可能。任意のページに <FloatingShapes /> を貼るだけで scene が起動する。
---

<canvas data-three-canvas></canvas>

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
  import { init } from "../../scripts/three/floating-shapes";

  const canvas = document.querySelector<HTMLCanvasElement>(
    "canvas[data-three-canvas]",
  );
  if (canvas) {
    const handle = init(canvas);
    window.addEventListener("beforeunload", () => handle.dispose(), {
      once: true,
    });
  }
</script>
```

- [ ] **Step 3: 型チェック**

```bash
pnpm astro check
```
Expected: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/components/three/FloatingShapes.astro
git commit -m "FloatingShapes Astro コンポーネントを追加"
```

---

## Task 7：experiments ページ

ページ自体を作成し、ここまでのコンポーネントが実際に動くことを確認する。

**Files:**
- Create: `src/pages/experiments.astro`

- [ ] **Step 1: ファイル作成**

`src/pages/experiments.astro`：
```astro
---
import BaseHead from "../components/BaseHead.astro";
import FloatingShapes from "../components/three/FloatingShapes.astro";
import { SITE_TITLE } from "../consts";
---

<!doctype html>
<html lang="ja">
  <head>
    <BaseHead
      title={`Experiments — ${SITE_TITLE}`}
      description="three.js による 3D 実験。"
    />
  </head>
  <body>
    <a class="back glass" href="/" aria-label="Back to home">← Back</a>

    <FloatingShapes />

    <div class="modes glass" role="radiogroup" aria-label="Visual mode">
      <button
        class="mode active"
        role="radio"
        aria-checked="true"
        data-mode="matte">matte</button
      >
      <button
        class="mode"
        role="radio"
        aria-checked="false"
        data-mode="wire"
        disabled
        aria-disabled="true"
        title="coming soon">wire</button
      >
      <button
        class="mode"
        role="radio"
        aria-checked="false"
        data-mode="glass"
        disabled
        aria-disabled="true"
        title="coming soon">glass</button
      >
      <button
        class="mode"
        role="radio"
        aria-checked="false"
        data-mode="neon"
        disabled
        aria-disabled="true"
        title="coming soon">neon</button
      >
    </div>

    <style is:global>
      html,
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        height: 100%;
        background: var(--t-bg);
      }
    </style>

    <style>
      .back {
        position: fixed;
        top: 1.5rem;
        left: 1.5rem;
        z-index: 10;
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        text-decoration: none;
        color: var(--t-text);
        font-family: inherit;
        font-size: 0.95rem;
      }
      .modes {
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        z-index: 10;
        display: flex;
        gap: 0.25rem;
        padding: 0.4rem;
        border-radius: 9999px;
      }
      .mode {
        background: none;
        border: 1px solid transparent;
        border-radius: 9999px;
        padding: 0.4rem 0.9rem;
        font-family: inherit;
        font-size: 0.85rem;
        color: var(--t-text);
        cursor: pointer;
        text-transform: lowercase;
      }
      .mode.active {
        background: var(--t-text);
        color: var(--t-bg);
      }
      .mode:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    </style>
  </body>
</html>
```

- [ ] **Step 2: dev サーバーで動作確認**

```bash
pnpm dev
```
ブラウザで `http://localhost:4321/experiments` を開く。確認：
- 15〜20 個の幾何形状が表示される
- 各 shape がゆっくり回転 ＋ 上下にふわふわ揺れる
- 左上に Back リンク、右下に4つのモードチップ（matte ハイライト、他は disabled）
- console にエラー・警告ゼロ

dev サーバーは Ctrl+C で停止。

- [ ] **Step 3: ビルドが通ることを確認**

```bash
pnpm build
```
Expected: エラーなし、`dist/experiments/index.html` が生成される

- [ ] **Step 4: Commit**

```bash
git add src/pages/experiments.astro
git commit -m "/experiments ページを追加し floating shapes を表示"
```

---

## Task 8：マウス parallax と タッチ drag

**Files:**
- Modify: `src/scripts/three/floating-shapes.ts`

- [ ] **Step 1: parallax / drag 用の状態変数を追加**

`init` 関数内、shapes ループの直後（`rafId = 0;` の前）に追加：

```ts
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

  if (isHover) {
    window.addEventListener("mousemove", onMouseMove);
  } else {
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
  }
```

- [ ] **Step 2: animate ループに camera lerp を追加**

`animate` の `for (const s of shapes)` ループの直後、`renderer.render` の直前に挿入：

```ts
    const targetX = parallaxX + dragX;
    const targetY = parallaxY + dragY;
    cameraTarget.x += (targetX - cameraTarget.x) * 0.1;
    cameraTarget.y += (targetY - cameraTarget.y) * 0.1;
    camera.lookAt(cameraTarget);
```

- [ ] **Step 3: dispose にイベントリスナー解除を追加**

`dispose` 関数の `window.removeEventListener("resize", onResize);` の直後に：

```ts
    if (isHover) {
      window.removeEventListener("mousemove", onMouseMove);
    } else {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    }
```

- [ ] **Step 4: 型チェックと動作確認**

```bash
pnpm astro check
pnpm dev
```
- `http://localhost:4321/experiments` でマウスを動かす → カメラがふわっと追従
- DevTools の Toggle device toolbar でモバイルエミュレート → ドラッグで視点移動

- [ ] **Step 5: Commit**

```bash
git add src/scripts/three/floating-shapes.ts
git commit -m "マウス parallax とタッチ drag によるカメラ追従を追加"
```

---

## Task 9：prefers-reduced-motion 対応

**Files:**
- Modify: `src/scripts/three/floating-shapes.ts`

- [ ] **Step 1: state と handler を追加**

Task 8 で追加した変数宣言群の最終行 `let lastTouchY = 0;` の直後（つまり `function onMouseMove` の直前）に挿入：

```ts
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
```

この位置に置くことで `parallaxX` などが宣言済みの状態で `onMotionChange` が参照できる。

- [ ] **Step 2: handler の早期 return を追加**

`onMouseMove` の先頭に `if (reduceMotion) return;` を、`onTouchStart` / `onTouchMove` の先頭にも `if (reduceMotion) return;` を追加。

- [ ] **Step 3: animate ループでアニメ停止条件を追加**

`animate` 関数を以下に置き換え：

```ts
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
```

- [ ] **Step 4: dispose にリスナー解除を追加**

`dispose` 関数内、`window.removeEventListener("resize", onResize);` の直後に：

```ts
    motionMql.removeEventListener("change", onMotionChange);
```

- [ ] **Step 5: 動作確認**

```bash
pnpm astro check
pnpm dev
```

DevTools > Rendering > "Emulate CSS media feature prefers-reduced-motion" を `reduce` に設定 → アニメーション停止、マウス動かしてもカメラ動かないこと確認。`no-preference` に戻すと再開。

- [ ] **Step 6: Commit**

```bash
git add src/scripts/three/floating-shapes.ts
git commit -m "prefers-reduced-motion 設定時にアニメーションを抑止"
```

---

## Task 10：theme-sync 統合

**Files:**
- Modify: `src/scripts/three/floating-shapes.ts`

- [ ] **Step 1: import を追加**

ファイル先頭の import 群に追加：
```ts
import { observeTheme, type Theme } from "./theme-sync";
```

- [ ] **Step 2: observeTheme 呼び出しを追加**

`init` 関数内、`motionMql.addEventListener("change", onMotionChange);` の直後に：

```ts
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
```

- [ ] **Step 3: dispose で停止**

`dispose` 関数内、`motionMql.removeEventListener(...)` の直後に：

```ts
    stopThemeSync();
```

- [ ] **Step 4: 動作確認**

```bash
pnpm astro check
pnpm dev
```

`http://localhost:4321/experiments` で：
- ヘッダーが無いのでテーマ切替ボタンは出ないが、`/` に Back → ThemeToggle で dark に切替 → `/experiments` に戻る → 暗い色合いのライティングで shapes が描画される
- もしくは DevTools console から `document.documentElement.setAttribute('data-theme', 'dark')` 実行 → リアルタイムでライティングが切り替わる

- [ ] **Step 5: Commit**

```bash
git add src/scripts/three/floating-shapes.ts
git commit -m "ライト/ダークテーマでライティングを切替"
```

---

## Task 11：最終 verification と整理

**Files:** なし（確認のみ）

- [ ] **Step 1: 完全な型チェック**

```bash
pnpm astro check
```
Expected: 0 error, 0 warning

- [ ] **Step 2: production build**

```bash
pnpm build
```
Expected:
- エラーなし
- `dist/experiments/index.html` が生成される
- 出力サイズ ログで `experiments` 関連 chunk に three が含まれ、index.html・about.html などのページの chunk には含まれていないこと（実際には `_astro/*.js` を grep）

```bash
grep -l "THREE\|three.module" dist/_astro/*.js | head -5
```
Expected: 1〜2 個のファイル名が出力（experiments 用の chunk のみ）

- [ ] **Step 3: spec の verification 表に従って手動確認**

`pnpm preview` で起動し、`http://localhost:8787/experiments`（または wrangler dev のポート）で：

| 項目 | 確認 |
|---|---|
| ✅ 15〜20 個の shape が表示 | 目視 |
| ✅ ゆっくり回転＋上下揺れ | 目視 |
| ✅ マウス parallax | カーソル動かす |
| ✅ タッチ drag | DevTools mobile emulator |
| ✅ reduce-motion | DevTools Rendering で reduce |
| ✅ theme 連動 | `/` で ThemeToggle → `/experiments` 戻り |
| ✅ Back リンク動作 | クリックで `/` 遷移 |
| ✅ モードチップ表示 | matte ハイライト、他 disabled |
| ✅ console 警告ゼロ | DevTools console |
| ✅ メモリリークなし | DevTools Performance > Memory で `/experiments` ↔ `/` 5回往復、ヒープが増え続けない |

問題があればその場で fix → 再 commit。

- [ ] **Step 4: 完了 Commit（コードに変更がない場合は不要）**

verification の過程でコード修正があれば commit。なければ skip。

- [ ] **Step 5: 完了報告**

user に Phase 0 完了を報告し、`pnpm dev` で実機確認してもらう。OK が出たら次フェーズ（Task B：CLAUDE.md / hook 整備）または Phase 1（wire モード追加）に進む判断を仰ぐ。

---

## Self-Review

**1. Spec coverage check：**

| Spec 項目 | カバーする Task |
|---|---|
| ファイル構成（§2.1） | Task 2〜7 |
| 依存追加（§2.3） | Task 1 |
| 形状・配置・アニメ（§3.1〜3.3） | Task 5 |
| matte マテリアル（§3.4） | Task 5 |
| ライティング（§3.5） | Task 5 ＋ Task 10（theme で intensity 切替） |
| カメラ ＋ parallax（§3.6） | Task 4 ＋ Task 8 |
| 透明背景（§3.7） | Task 4 |
| 入力デバイス分岐（§4.1） | Task 8 |
| reduce-motion（§4.2） | Task 9 |
| テーマ連動（§4.3） | Task 3 ＋ Task 10 |
| モード切替 UI（§4.4） | Task 7（disabled 状態） |
| Back リンク（§4.5） | Task 7 |
| DPR / resize（§4.6） | Task 4 |
| dispose（§4.7） | Task 4 で skeleton、各 Task で追加 |
| Verification（§6） | Task 11 |

**2. Placeholder scan：** "TBD" / "TODO" / "implement later" を含む step は無し。各 step に実コードまたは具体的コマンドを記載済み。

**3. Type consistency：** `init` の戻り値型 `FloatingShapesHandle`、`Mode` 型、`InitOptions` インタフェースは Task 4 で定義され Task 6 / Task 7 でも使用、ブレ無し。`Theme` 型は Task 3 で定義 Task 10 で import、ブレ無し。`ShapeInstance` インタフェースは Task 5 内で完結。

---

## Execution Handoff

実装計画完成、保存先：`docs/superpowers/plans/2026-04-25-floating-shapes-phase-0.md`

実行方法を選んでください：

**1. Subagent-Driven（推奨）**
- 各 Task を新しい subagent に dispatch、Task 間でレビュー、速い iteration

**2. Inline Execution**
- 同一セッションで `superpowers:executing-plans` を使い、checkpoint ごとに review

どちらで進めますか？

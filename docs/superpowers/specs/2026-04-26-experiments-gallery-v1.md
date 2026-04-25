# Experiments Gallery v1 — Design Spec

- **Date:** 2026-04-26
- **Status:** Approved（口頭で承認済み）
- **Owner:** So Momma
- **Related:** `2026-04-25-floating-shapes-design.md`（前タスク、`<FloatingShapes />` を生む）

---

## 1. Goal

`/experiments` を「6 種類の芸術的 three.js デモを並べた gallery」に進化させる。各 demo は独立した視覚表現で、他人に見せる portfolio piece として成立する最小版（v1）を一気に揃える。各 demo は同じ共通基盤の上に乗り、後続フェーズで個別に深掘り可能。

## 2. URL 再構成

```
/experiments                        ← INDEX ページに変更（カードグリッド）
/experiments/floating-shapes        ← 既存 /experiments を移動
/experiments/blob-hero              ← α  vertex shader noise blob
/experiments/3d-name                ← β  TextGeometry "So Momma"
/experiments/liquid-metal           ← γ  CPU-side gerstner wave plane
/experiments/sculpture              ← δ  high-detail icosahedron + OrbitControls
/experiments/generative             ← ε  time-based generative scene
/experiments/scroll-story           ← ζ  3-scene scroll lerp camera
```

ヘッダーの `Experiments` タブはそのまま `/experiments`（index）へ。

## 3. 共通基盤

### 3.1 `src/scripts/three/scene-base.ts`

renderer・camera・animation loop・resize・dispose の boilerplate を抽出。各 demo は以下のシグネチャを実装：

```ts
export interface DemoHooks {
  setup: (ctx: SceneContext) => void;
  update?: (ctx: SceneContext, time: number, dt: number) => void;
  cleanup?: () => void;
}

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  rng: () => number;
}

export function createScene(canvas: HTMLCanvasElement, hooks: DemoHooks, options?: SceneOptions): { dispose: () => void };
```

floating-shapes も Task 2 でこれに乗せ替え（既存挙動を維持）。

### 3.2 `src/components/three/CanvasFrame.astro`

汎用 fullscreen canvas wrapper。Astro 側からは `<CanvasFrame demo="blob-hero" />` のように demo 名を渡し、内部で動的に対応モジュールを import する。

### 3.3 既存ユーティリティの再利用

- `prng.ts` — 既存。各 demo で seeded random 利用
- `theme-sync.ts` — 既存。demo によって使う／使わない

## 4. 各 demo の v1 仕様

| | 中身 | 主な技術 | 参考 |
|---|---|---|---|
| **α blob-hero** | 1個の SphereGeometry を vertex shader で simplex noise displacement。半透明ガラス材質で常に微妙に脈動 | `ShaderMaterial`（custom GLSL）、`MeshTransmissionMaterial` 不使用（PhysicalMaterial で代替） | Lusion |
| **β 3d-name** | `TextGeometry` で "So Momma" を立体化、`MeshPhysicalMaterial`（transmission）でガラス、Y軸ゆっくり回転、マウスで微 parallax | three.js 標準 | Cody Bennett |
| **γ liquid-metal** | 細分化された `PlaneGeometry` の頂点 Y を gerstner wave 風の sin 重ね合わせで CPU 更新。`MeshStandardMaterial`（metalness 0.9）で metallic 表現 | CPU vertex animation | Active Theory |
| **δ sculpture** | `IcosahedronGeometry(1, 4)` をベースに per-vertex で sub-displacement。`OrbitControls` で自由に観察。背景は theme 連動 | OrbitControls、vertex color attribute | DesignEmbraced |
| **ε generative** | 訪問時の時刻・分から seed 生成 → shapes 数（3〜12）・色相・回転速度が動的決定。リロードで再生成 | 時刻ベース seed、HSL 色相環 | akella |
| **ζ scroll-story** | scroll position（0〜100%）を camera position の lerp で 3 つの key pose 間で補間。1段目：1球、2段目：群れ、3段目：渦巻き | scroll listener（rAF throttle）、camera key-frame | Apple LP |

各 demo は**フルスクリーン canvas ＋ 左上 Back（`/experiments` index へ）**。モード切替 UI は v1 では出さない。

## 5. Index ページ `/experiments`

カード 7 枚（既存 floating-shapes ＋ 新規 6）：

```
[ floating-shapes ]  [ blob-hero ]    [ 3d-name ]
[ liquid-metal ]     [ sculpture ]    [ generative ]
[ scroll-story ]
```

- 3 列 grid（>= md）、1 列（< md）
- 各カード `.glass` スタイル、padding、hover で軽く scale
- カード内：title（小）、1 行説明（極小）、矢印
- thumbnail 画像は v1 では作らない（後続 phase）

ヘッダーは通常通り表示。Header の `Experiments` タブはこの index を指す（既に `/experiments` を指しているので変更不要）。

## 6. Phasing

### v1（このサイクルで完成）

- ✅ `scene-base.ts` 抽出
- ✅ `CanvasFrame.astro` 共通化
- ✅ 既存 floating-shapes を新基盤に乗せ替え（リグレッションなし）
- ✅ URL 再構成
- ✅ 6 demos の動く最小版
- ✅ Index ページ（カード7枚）

### v2 以降（後続）

- ❌ thumbnail 画像（gif/動画）
- ❌ 各 demo のモード切替（floating-shapes の wire/glass/neon 等）
- ❌ ε の曜日・乱数・天気 API 連携
- ❌ ζ の scroll narrative テキスト挿入
- ❌ 解説ページ（コード公開）
- ❌ home hero への 1 demo 抜擢

## 7. Verification

| 項目 | 確認 |
|---|---|
| `pnpm astro check` | 0 error |
| `pnpm build` | 9 → 16 pages（既存 9 + experiments index + 6 demos = 16） |
| `/experiments` index | 7 枚カード表示、各クリックで遷移 |
| floating-shapes リグレッション | 旧 URL `/experiments/floating-shapes` で同じ scene が動く |
| 各 demo | 開いて表示、エラー無し、Back で index に戻る |
| bundle 影響 | three を含む chunk が demo ページ群限定（home/about/blog 漏出なし） |

各 demo の細部の動作は user 目視で OK 判定。

## 8. Out of Scope

- demo 間のクロス参照（demo A から demo B に遷移）
- demo 内の UI 操作（パラメータ slider 等）
- ソーシャルシェア機能
- アクセシビリティの完全対応（reduce-motion は scene-base レベルで実装、各 demo 個別の細かな a11y は後）
- パフォーマンスチューニング（v1 は動けば OK、Lighthouse 数値は要確認のみ）

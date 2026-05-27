# three.js Floating Shapes Experiments — Design Spec

- **Date:** 2026-04-25
- **Status:** Draft（user レビュー待ち）
- **Owner:** So Momma
- **Related:** future home page hero 3D 統合の前段

---

## 1. Goal & Context

`/experiments` ページに three.js の最初の作品「floating shapes」を作る。複数の幾何形状がゆっくり浮遊し、マウス／タッチで視点が揺れる。MVP は **matte（マットなパステル）モード** のみで完成とし、その後 wire → glass → neon の3モードを段階的に追加する。最終的にこのコンポーネントは `index.astro` の hero 背景にも転用する。

サイトの既存テーマ（ウォームベージュ ＋ Liquid Glass）に馴染ませること、Astro v6 SSG の構成を壊さないこと、初学者が後から読んで理解できる構造であることを設計の制約とする。

## 2. Architecture

### 2.1 ファイル構成

```
src/
├── pages/
│   └── experiments.astro          # /experiments — fullscreen page
├── components/
│   └── three/
│       └── FloatingShapes.astro   # canvas + client script（再利用可能）
└── scripts/
    └── three/
        ├── floating-shapes.ts     # scene 構築・アニメーション・dispose
        ├── theme-sync.ts          # data-theme → callback 同期ユーティリティ
        └── prng.ts                # mulberry32 seeded PRNG
```

### 2.2 役割分担

- **`experiments.astro`**：Base レイアウトを使わず、最小 HTML（`<html data-theme>`、`<head>` メタのみ）と `<FloatingShapes />`、左上 Back リンクのみ。`overflow: hidden` で scroll 無効化。Header / cursor trail / scroll progress などの既存サイト機能とは衝突しないよう独立させる
- **`FloatingShapes.astro`**：`<canvas>` 要素＋ `<script>` で `floating-shapes.ts` を dynamic import → `init(canvas, options)` を呼ぶ。`<FloatingShapes />` を将来 `index.astro` に貼れば home でも同じ scene が出せる
- **`floating-shapes.ts`**：three の全ロジック。export は `init(canvas: HTMLCanvasElement, options?: InitOptions): { dispose(): void; setMode(mode: Mode): void }` の1関数。DOM id に依存しない
- **`theme-sync.ts`**：`document.documentElement` の `data-theme` 変更を `MutationObserver` で監視し、callback を呼ぶ。他の 3D 実験でも再利用可能
- **`prng.ts`**：mulberry32 ベースの seeded PRNG（10〜15行）。配置の再現性を担保

### 2.3 依存追加

```bash
pnpm add three
pnpm add -D @types/three
```
- three.js 0.160 系（現行最新）
- gzipped で約 160KB、experiments ページ限定の bundle に閉じる（Astro の code-splitting 任せ）
- 他ページの bundle サイズは増えないことを `pnpm build` 後に確認する

## 3. Scene Content（MVP = matte モード）

### 3.1 形状

- 5 種類（`BoxGeometry` / `SphereGeometry` / `TorusGeometry` / `IcosahedronGeometry` / `ConeGeometry`）を各 3〜4 個ずつ、計 15〜20 個
- 各個体に独立した size（0.4〜1.2）、回転軸（unit vector）、回転速度（0.1〜0.3 rad/s）を seeded PRNG で割り当て

### 3.2 配置

- 範囲：`x: [-6, 6]`, `y: [-4, 4]`, `z: [-8, -2]`
- カメラは原点で `-Z` 方向を向く
- 初期化時に seed（既定 `0xC0FFEE`）から PRNG を作り、各個体の position をランダム生成
- リロードしても同じレイアウトになることで、スクショや見た目の議論が安定する

### 3.3 アニメーション

- 各個体：自分の回転軸まわりに毎フレーム回転
- 各個体：Y 軸方向に sin 波で上下にふわっと揺れる（振幅 0.2、周期 3〜5 秒、個体ごとに位相をずらす）
- 全体：基本静止。カメラのみマウス／タッチで動く

### 3.4 マテリアル（matte）

- `MeshStandardMaterial`、`roughness: 0.7`, `metalness: 0.05`
- 個体ごとに以下のパレットからランダム選択：
  - `#e8dcc4` warm cream
  - `#d4b896` sand
  - `#a89078` taupe
  - `#8b9a82` sage green（差し色）
  - `#c9a57b` caramel

### 3.5 ライティング

- `AmbientLight`、強度 0.4（light theme）／ 0.25（dark theme）
- `DirectionalLight`、強度 0.8（light）／ 0.6（dark）、右上から、影なし
- `PointLight`、強度 0.3、左手前。色は light = `#a8c4e8`、dark = `#7a9bd6`

### 3.6 カメラ

- `PerspectiveCamera`, FOV 50, aspect = window 比, near 0.1, far 100
- position = `(0, 0, 0)`、原点で `(0, 0, -1)` を見る
- マウス parallax：マウス位置から target を `x: ±0.5, y: ±0.3` の範囲に変換し、`lerp` で 1 フレームごとに 10% 程度補間

### 3.7 背景

- `scene.background = null`（透明）
- `WebGLRenderer({ alpha: true })` で初期化
- body / html の CSS 背景色（既存 theme 変数）が透けて見える設計。theme 切替でコード変更不要

## 4. Interaction & Accessibility

### 4.1 入力デバイス

| デバイス | 入力 | 反応 |
|---|---|---|
| デスクトップ | マウス位置 | カメラが parallax で `x: ±0.5, y: ±0.3` 範囲を lerp 追従 |
| タッチ端末 | ドラッグ | ドラッグ量に応じてカメラを小さい振幅で回転（OrbitControls 不使用、自前実装で振幅制限） |
| 全デバイス | スクロール | 何もしない（ページ自体 `overflow: hidden`） |

判定：`window.matchMedia('(hover: hover)')` で hover 可能 → マウス mode、それ以外 → タッチ mode。両対応ならマウス優先。

### 4.2 `prefers-reduced-motion` 対応

- 初期化時に `window.matchMedia('(prefers-reduced-motion: reduce)').matches` をチェック
- `true` のとき：個体の回転・上下揺れを停止、parallax / drag を無効化、canvas は静止画として表示
- `addEventListener('change', ...)` で OS 設定変更を即時反映

### 4.3 テーマ連動

`theme-sync.ts` が `data-theme` 変更を観測し、callback で AmbientLight / DirectionalLight の強度、PointLight の色を切替。背景はノータッチ（透明維持）。

### 4.4 モード切替 UI

- 4 つのチップ（matte / wire / glass / neon）を fullscreen 右下に固定（`bottom: 1.5rem; right: 1.5rem;`）
- 既存 `.glass` クラスを再利用
- 現在モードはハイライト
- キーボード：`Tab` でフォーカス、`Enter` / `Space` で切替、`1`〜`4` でショートカット
- aria：`role="radiogroup"`、各チップ `role="radio" aria-checked`
- **MVP 段階**：matte 以外の3つは `disabled` で表示、tooltip "coming soon"

### 4.5 Back リンク

- fullscreen 左上（`top: 1.5rem; left: 1.5rem;`）
- アイコン `←` ＋ "Back"、href = `/`、`.glass` クラス、Tab 順序最優先

### 4.6 DPR / リサイズ

- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`
- `window` の resize で `renderer.setSize` ＋ `camera.aspect` 更新

### 4.7 クリーンアップ

`init` の戻り値の `dispose()` で：
- `cancelAnimationFrame`
- `scene.traverse` で全 mesh の `geometry.dispose()` / `material.dispose()`
- `renderer.dispose()`
- イベントリスナー解除（mouse, touch, resize, theme, reduce-motion）

## 5. Phasing

### Phase 0：MVP（このサイクル）

実装：
- ✅ `pnpm add three @types/three`
- ✅ `experiments.astro`、`FloatingShapes.astro`
- ✅ `floating-shapes.ts`（matte モードのみ）、`theme-sync.ts`、`prng.ts`
- ✅ モード切替 UI（matte 以外は disabled）
- ✅ Back リンク
- ✅ マウス parallax / タッチ drag / reduce-motion / theme 連動 / dispose

YAGNI（実装しない）：
- ❌ wire / glass / neon の中身（UI は disabled で出すのみ）
- ❌ `/experiments` index ページ・他 experiment 候補
- ❌ ポストプロセス（bloom 等）
- ❌ シャドウマップ
- ❌ GLTF ローダー

### Phase 1：wire モード

- マテリアルを `MeshBasicMaterial({ wireframe: true })` に切替
- 色は CSS 変数 `--t-text-muted` から動的取得
- ボタン enable

### Phase 2：glass モード

- `MeshPhysicalMaterial`（`transmission: 0.9`, `roughness: 0.05`, `thickness: 0.5`, `ior: 1.5`）
- transmission は重いので shapes 数を 10 に減らすか要検証
- 環境マップは `RoomEnvironment` プロシージャル（テクスチャ画像不要）

### Phase 3：neon モード

- ページ全体に暗い overlay（CSS の透過率変更、scene.background は触らず）
- `MeshBasicMaterial` ＋ `EffectComposer` ＋ `UnrealBloomPass`
- `three/examples/jsm/postprocessing/*` をこのフェーズで初めて import

### Phase 4：home 統合

- `<FloatingShapes />` を `index.astro` の hero 背後に絶対配置
- `pointer-events: none` で UI 操作を阻害しない
- shapes 数を 5〜8 に絞る、モード固定（matte or glass）

各フェーズは独立サイクル（計画→レビュー→承認→実行）で進める。

## 6. Verification

three.js + SSG の view-only 性質上、ユニットテストは過剰。**手動 verification ＋ 型 / lint / console 警告ゼロで担保する**。

### 6.1 Phase 0 合格基準

| 項目 | 確認方法 |
|---|---|
| ビルド成功 | `pnpm build` が正常終了、`dist/` に出力 |
| 型エラーなし | `pnpm astro check` が pass |
| dev で動く | `pnpm dev` → `http://localhost:4321/experiments` で 15〜20 個の shape が浮遊 |
| マウス parallax | カーソル移動でカメラがふわっと追従 |
| タッチ drag | DevTools mobile emulator でドラッグ → 視点が変わる |
| reduce-motion | DevTools の Rendering > "prefers-reduced-motion: reduce" で全静止 |
| theme 連動 | サイトの ThemeToggle 押下で 3D scene のライトが切替わる |
| dispose | DevTools Performance > Memory で `/experiments` ↔ 他ページ往復してもヒープが増え続けない |
| console 警告ゼロ | three.js の deprecation・shader compile warning が無い |
| Lighthouse Perf | `pnpm preview` のローカルビルドに対し、デスクトップ Lighthouse で Performance 80 以上（参考値） |

### 6.2 既存サイトへの影響

- `experiments.astro` は Base レイアウト不使用なので CSS / script 影響ゼロ
- `pnpm build` 後、他ページの bundle に three が混入していないことを確認

### 6.3 レビュー対象

- 動的挙動（parallax・drag）はスクショで判別不可。dev サーバーで実際に動かして user に確認してもらう
- ライト／ダーク両テーマで全項目確認
- Mobile：実機 or DevTools emulator で確認

## 7. Open Questions / Risks

- **bundle size**：three.js 0.160 系は gzipped 約 160KB。`/experiments` 以外への漏出を build 後に必ず確認
- **iOS Safari の WebGL 挙動**：`alpha: true` ＋ transparent background で稀にレンダリング不具合が出るとの報告あり。Phase 0 完成後、実機 Safari で要確認
- **Phase 4 の home 統合**：home の既存アバター 3D チルトとの視覚的競合（うるさくならないか）は Phase 4 着手時に再評価

## 8. Out of Scope

- マイクロインタラクション（クリック反応・shape の hover ハイライト）
- BGM / 音声
- Shape の追加・削除を user 操作でできる UI
- Shapes をユーザがドラッグして動かす（shape 単位ではなくカメラを動かす方針で確定）
- アニメーションの細かいパラメータをユーザが操作できる UI

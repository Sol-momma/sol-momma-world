[English](README.md) | [日本語](README.ja.md)

# Sol-momma's World

https://abehiroshi.la.coocan.jp/

[The Browser Company](https://thebrowser.company/) に着想を得た、ウォームなエディトリアル調の個人ポートフォリオサイトです。Apple Liquid Glass の UI 効果と滑らかなアニメーションを備えています。

**公開サイト:** [sol-momma.com](https://sol-momma.com)

## 機能

- **Liquid Glass UI** -- すりガラス風の背景、半透明のボーダー、インタラクティブ要素全体の内側ハイライト
- **ダーク / ライトモード** -- 月/太陽アイコンのアニメーション付きテーマトグル。localStorage に保存
- **3D アバターチルト** -- カーソルに追従するパースペクティブの傾き
- **タイプライター効果** -- トップページで役割を順に表示
- **カーソルトレイル** -- マウスの動きに追従する青いパーティクルドット
- **スクロールアニメーション** -- ビューポートに入ると要素がフェード / スライドイン
- **ページ遷移** -- Astro View Transitions によるページ間のクロスフェード
- **スクロールプログレスバー** -- 上部に表示する、読み進み具合の細いバー
- **名前の波** -- ホバー時に文字が跳ねる
- **レスポンシブ** -- モバイルファースト、`prefers-reduced-motion` 対応

## 技術スタック

- [Astro](https://astro.build/) v6 + View Transitions (`ClientRouter`)
- [Tailwind CSS](https://tailwindcss.com/) v4（Vite プラグイン）
- MDX、TypeScript（strict）
- Prettier（astro + tailwindcss プラグイン）

## はじめ方

### Nix を使う場合（推奨）

```bash
nix develop      # Node.js 22 + pnpm のシェルに入る
pnpm install
pnpm dev         # localhost:4321
```

または [direnv](https://direnv.net/) を使う場合:

```bash
direnv allow     # プロジェクトに cd したときに自動で有効化
pnpm install
pnpm dev
```

### Nix を使わない場合

Node.js >= 22.12.0 と pnpm が必要です。

```bash
pnpm install
pnpm dev
```

| コマンド       | 内容                                   |
| :------------- | :------------------------------------- |
| `pnpm dev`     | 開発サーバーを `localhost:4321` で起動 |
| `pnpm build`   | 本番サイトを `./dist/` にビルド        |
| `pnpm preview` | ビルド結果をローカルでプレビュー       |
| `pnpm format`  | Prettier でコードを整形                |

## プロジェクト構成

```text
src/
├── components/
│   ├── Header.astro          # ナビバー（ガラスのピル）+ テーマトグル
│   ├── ThemeToggle.astro     # アニメーション付きダーク/ライト切り替え
│   ├── SocialLinks.astro     # GitHub、LinkedIn、X のリンク
│   ├── TimelineItem.astro    # Experience タイムラインの1エントリ
│   ├── HeaderLink.astro      # アクティブ状態付きナビリンク
│   └── icons/                # SVG アイコンコンポーネント（size props）
├── content/
│   └── experience/           # タイムライン用の Experience エントリ
├── layouts/
│   └── Base.astro            # HTML ラッパー + グローバルスクリプト
├── pages/
│   ├── index.astro           # ホーム（アバター、タイプライター、ソーシャル）
│   └── about.astro           # プロフィールグリッド、テックスタック、タイムライン、コンタクト
├── styles/
│   └── global.css            # テーマトークン、ガラスユーティリティ、アニメーション
└── consts.ts                 # サイトタイトル、説明、ソーシャル URL
```

## コンテンツの追加

### Experience エントリ

`src/content/experience/` に `.md` ファイルを追加します。

```markdown
---
name: "Company Name"
role: "Role"
period: "2025/04 - present"
order: 5
---
```

About ページのタイムラインは自動で更新されます。新しい順に表示されます。`order` が大きいほど上に現れ、左右は交互に配置されます。

## テーマ

色は `global.css` の `[data-theme="light"]` と `[data-theme="dark"]` で CSS カスタムプロパティとして定義しています。Liquid Glass トークン（`--glass-bg`、`--glass-border`、`--glass-shadow`、`--glass-highlight`）は両テーマに自動で合わせます。

新しい要素にガラスのスタイルを付けるときは、`.glass` クラスを追加するか、`--glass-*` 変数を直接参照してください。

## ライセンス

MIT

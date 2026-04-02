# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — 開発サーバー起動（localhost:4321）
- `pnpm build` — 本番ビルド（`./dist/`に出力）
- `pnpm preview` — ビルド結果のローカルプレビュー
- `pnpm format` — Prettier でコード整形（astro + tailwindcss プラグイン使用）

## Architecture

Astro v6 の個人ポートフォリオ＋ブログサイト。Tailwind CSS v4（Viteプラグイン経由）、MDX、TypeScript strict mode。Browser Company風のウォームベージュ + Apple Liquid Glass デザイン。

### Content Collections

`src/content.config.ts` で2つのコレクションを定義:

- **blog** (`src/content/blog/`): Markdown/MDX。スキーマ: title, description, pubDate, updatedDate?, heroImage?。現在ヘッダーからはコメントアウトで非表示
- **experience** (`src/content/experience/`): Markdown。スキーマ: name, role, period, order。aboutページのタイムラインに使用。orderで並び順、左右は自動交互配置

ファイルを追加するだけで自動的にページ/タイムラインに反映される。

### レイアウト構成

- `layouts/Base.astro` — 全ページ共通ラッパー。スクロールプログレスバー、カーソルトレイル（青いドット）、Back to topボタン、IntersectionObserver（`.scroll-animate`用）を含む。全スクリプトは `is:inline` で即時実行
- `layouts/BlogPost.astro` — ブログ記事用。Base.astroを内部で使用
- トップページ (`pages/index.astro`) — プロフィールページ。3Dチルトアバター、タイプライター、名前の波アニメーション

### テーマシステム（ライト/ダークモード）

- `data-theme` 属性を `<html>` に設定して切り替え
- `BaseHead.astro` の `is:inline` スクリプトでフラッシュ防止（DOM構築前にテーマ適用）
- `ThemeToggle.astro` で月/太陽アイコンの切り替え UI。localStorage に保存
- CSS変数は `--t-*` プレフィックスで定義し、`@theme` ブロックで `--color-*` にマッピング
- ガラストークン: `--glass-bg`, `--glass-border`, `--glass-shadow`, `--glass-highlight` をライト/ダーク両方で定義

### Liquid Glass デザインパターン

`global.css` に `.glass` ユーティリティクラスを定義（`backdrop-filter: blur(16px) saturate(180%)` + 半透明ボーダー + 内側ハイライト）。以下のコンポーネントで使用:

- ナビバー（Header.astro の `.nav-bar`）
- Resume ボタン（`.resume-btn`）
- Back to top ボタン（`class="glass"`）
- タイムラインカード（`.timeline-card` — 独自の `--timeline-card-bg` で不透明度が高い）
- テックスタックピル、プロフィールグリッド、コンタクトカード（about.astro 内のスコープCSS）

新しいガラス要素を追加する場合は `.glass` クラスを使うか、`--glass-*` トークンを参照する。

### 共通コンポーネント設計

- `SocialLinks.astro` — ソーシャルリンク。URLは `consts.ts` の `SOCIAL_LINKS` を参照
- `icons/*.astro` — GitHub, Twitter, LinkedIn の再利用可能SVGアイコン（size props対応）
- `TimelineItem.astro` — Experience タイムラインの1エントリ（name, role, period, side props）
- `ThemeToggle.astro` — ライト/ダーク切り替えボタン。月の浮遊アニメーション、太陽の回転、切り替え時のポップアニメーション付き
- `Footer.astro` — 現在は空のスペーサー要素のみ

### スタイル

- `src/styles/global.css`: `@import "tailwindcss"` + `@theme` でCSS変数定義。ライト/ダーク両テーマ、アニメーション、Liquid Glassユーティリティ、コンポーネントスタイルを一括管理
- フォント: Atkinson Hyperlegible（sans-serif UI用）、Georgia（見出し serif イタリック用）
- アニメーション: `.animate-fade-in-up`, `.animate-scale-in` 等のロード時、`.scroll-animate` + IntersectionObserver のスクロール時

### サイト定数

- `src/consts.ts` で SITE_TITLE, SITE_DESCRIPTION, SOCIAL_LINKS を管理
- `astro.config.mjs` の `site` は `https://Sol-momma.com`

### スクリプト

- Base.astro の全スクリプトは `is:inline` で即時実行。View Transitions (ClientRouter) は無効（`is:inline` スクリプトとの互換性問題のため）
- ページ遷移は通常のフルページリロード

## Tech Stack

- Astro v6, MDX, Tailwind CSS v4, Sharp（画像最適化）
- パッケージマネージャー: pnpm
- Prettier（prettier-plugin-astro + prettier-plugin-tailwindcss）
- TypeScript strict mode（`astro/tsconfigs/strict` 継承）
- Node.js >= 22.12.0
- フォント: Atkinson Hyperlegible（woff2、`public/fonts/`）

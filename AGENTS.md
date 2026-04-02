# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — 開発サーバー起動（localhost:4321）
- `pnpm build` — 本番ビルド（`./dist/`に出力）
- `pnpm preview` — ビルド結果のローカルプレビュー
- `pnpm format` — Prettier でコード整形（astro + tailwindcss プラグイン使用）

## Architecture

Astro v6 の個人ポートフォリオ＋ブログサイト。Tailwind CSS v4（Viteプラグイン経由）、MDX、TypeScript strict mode。

### Content Collections

`src/content.config.ts` で2つのコレクションを定義:

- **blog** (`src/content/blog/`): Markdown/MDX。スキーマ: title, description, pubDate, updatedDate?, heroImage?
- **experience** (`src/content/experience/`): Markdown。スキーマ: name, role, period, order。aboutページのgitグラフ風タイムラインに使用。orderで並び順、左右は自動交互配置

ファイルを追加するだけで自動的にページ/タイムラインに反映される。

### レイアウト構成

- `layouts/Base.astro` — 全ページ共通の `<html>`/`<head>`/`<body>` ラッパー。title/descriptionをpropsで受け取る
- `layouts/BlogPost.astro` — ブログ記事用。Base.astroを内部で使用
- トップページ (`pages/index.astro`) は独自レイアウト（プロフィールページ）

### 共通コンポーネント設計

- `SocialLinks.astro` — ソーシャルリンク一式。class/linkClass/size propsでスタイル制御。Header, Footer, index.astro の3箇所で使用
- `icons/*.astro` — GitHub, Twitter, LinkedIn, Mastodon の再利用可能SVGアイコン（size props対応）
- `TimelineItem.astro` — Experience タイムラインの1エントリ（name, role, period, side props）

### スタイル

- `src/styles/global.css`: `@import "tailwindcss"` + `@theme` でカスタムカラー（accent, black, gray, gray-light, gray-dark）とフォント（Atkinson）を定義。`@layer base` でベーススタイル
- 各コンポーネントは `<style>` ブロックではなくTailwindユーティリティクラスを使用

### サイト定数

- `src/consts.ts` で SITE_TITLE, SITE_DESCRIPTION を管理
- `astro.config.mjs` の `site` はデプロイ時にURLを変更する必要あり（現在 example.com）

## Tech Stack

- Astro v6, MDX, Tailwind CSS v4, Sharp（画像最適化）
- パッケージマネージャー: pnpm
- Prettier（prettier-plugin-astro + prettier-plugin-tailwindcss）
- TypeScript strict mode（`astro/tsconfigs/strict` 継承）
- Node.js >= 22.12.0
- フォント: Atkinson Hyperlegible（woff2、`public/fonts/`）

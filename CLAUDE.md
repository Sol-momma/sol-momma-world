# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astro v6ベースのブログサイト（Astro Blog Starter Kitテンプレートから構築）。MDX、Tailwind CSS v4、サイトマップ、RSSフィードを使用。

## Commands

- `pnpm dev` — 開発サーバー起動（localhost:4321）
- `pnpm build` — 本番ビルド（`./dist/`に出力）
- `pnpm preview` — ビルド結果のローカルプレビュー

## Architecture

- **コンテンツ管理**: `src/content/blog/` にMarkdown/MDXファイルを配置。スキーマは `src/content.config.ts` で定義（title, description, pubDate, updatedDate, heroImage）
- **ページルーティング**: `src/pages/` がファイルベースルーティング。ブログ個別ページは `src/pages/blog/[...slug].astro` で動的生成
- **レイアウト**: `src/layouts/BlogPost.astro` がブログ記事のレイアウト
- **共通コンポーネント**: `src/components/` に Header, Footer, BaseHead, FormattedDate, HeaderLink
- **サイト定数**: `src/consts.ts` でサイトタイトル・説明を管理
- **スタイル**: Tailwind CSS v4（Viteプラグイン経由）+ `src/styles/global.css`
- **静的アセット**: `public/` にファビコン・フォント、`src/assets/` に画像（Astroの画像最適化対象）

## Tech Stack

- Astro v6, MDX, Tailwind CSS v4, Sharp（画像最適化）
- パッケージマネージャー: pnpm
- TypeScript strict mode（`astro/tsconfigs/strict` 継承）
- Node.js >= 22.12.0

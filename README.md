# Sol-momma's World

Hello, World👋

Personal website built with Astro, Tailwind CSS v4, and MDX.

## Tech Stack

- [Astro](https://astro.build/) v6
- [Tailwind CSS](https://tailwindcss.com/) v4
- MDX
- TypeScript

## Project Structure

```text
src/
├── components/       # Reusable UI components
│   └── icons/        # SVG icon components
├── content/
│   ├── blog/         # Blog posts (Markdown/MDX)
│   └── experience/   # Experience entries (timeline)
├── layouts/          # Page layouts (Base, BlogPost)
├── pages/            # File-based routing
│   ├── index.astro   # Profile page
│   ├── about.astro   # About + Experience timeline
│   └── blog/         # Blog listing & posts
└── styles/           # Global CSS + Tailwind theme
```

## Commands

| Command        | Action                              |
| :------------- | :---------------------------------- |
| `pnpm dev`     | Start dev server at `localhost:4321`|
| `pnpm build`   | Build production site to `./dist/` |
| `pnpm preview` | Preview build locally              |
| `pnpm format`  | Format code with Prettier          |

## Adding Content

### Blog Post

Add a `.md` or `.mdx` file to `src/content/blog/`:

```markdown
---
title: "Post Title"
description: "Description"
pubDate: "2026-03-27"
---

Content here.
```

### Experience Entry

Add a `.md` file to `src/content/experience/`:

```markdown
---
name: "Company Name"
role: "Role"
period: "2025/04 - present"
order: 5
---
```

The timeline on the About page will automatically update.

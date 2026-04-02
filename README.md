# Sol-momma's World

Personal portfolio website with a warm editorial aesthetic inspired by [The Browser Company](https://thebrowser.company/), featuring Apple Liquid Glass UI effects and smooth animations.

**Live:** [sol-momma.com](https://sol-momma.com)

## Features

- **Liquid Glass UI** -- frosted glass backgrounds, translucent borders, and inner highlights across all interactive elements
- **Dark / Light mode** -- theme toggle with animated moon/sun icons, persisted in localStorage
- **3D avatar tilt** -- perspective-based tilt that follows the cursor
- **Typewriter effect** -- cycling through roles on the home page
- **Cursor trail** -- blue particle dots that follow mouse movement
- **Scroll animations** -- elements fade/slide in as they enter the viewport
- **Page transitions** -- smooth cross-fade between pages via Astro View Transitions
- **Scroll progress bar** -- thin bar at the top showing read progress
- **Name wave** -- letters bounce on hover
- **Responsive** -- mobile-first, `prefers-reduced-motion` support

## Tech Stack

- [Astro](https://astro.build/) v6 + View Transitions (`ClientRouter`)
- [Tailwind CSS](https://tailwindcss.com/) v4 (Vite plugin)
- MDX, TypeScript (strict)
- Prettier (astro + tailwindcss plugins)

## Getting Started

### With Nix (recommended)

```bash
nix develop      # enters shell with Node.js 22 + pnpm
pnpm install
pnpm dev         # localhost:4321
```

Or with [direnv](https://direnv.net/):

```bash
direnv allow     # auto-activates on cd into the project
pnpm install
pnpm dev
```

### Without Nix

Requires Node.js >= 22.12.0 and pnpm.

```bash
pnpm install
pnpm dev
```

| Command        | Action                              |
| :------------- | :---------------------------------- |
| `pnpm dev`     | Start dev server at `localhost:4321`|
| `pnpm build`   | Build production site to `./dist/` |
| `pnpm preview` | Preview build locally              |
| `pnpm format`  | Format code with Prettier          |

## Project Structure

```text
src/
├── components/
│   ├── Header.astro          # Nav bar (glass pill) + theme toggle
│   ├── ThemeToggle.astro     # Dark/light switch with animations
│   ├── SocialLinks.astro     # GitHub, LinkedIn, X links
│   ├── TimelineItem.astro    # Experience timeline entry
│   ├── HeaderLink.astro      # Nav link with active state
│   └── icons/                # SVG icon components (size prop)
├── content/
│   ├── blog/                 # Blog posts (Markdown/MDX)
│   └── experience/           # Experience entries for timeline
├── layouts/
│   ├── Base.astro            # HTML wrapper + global scripts
│   └── BlogPost.astro        # Blog article layout
├── pages/
│   ├── index.astro           # Home (avatar, typewriter, socials)
│   ├── about.astro           # Profile grid, tech stack, timeline, contact
│   └── blog/                 # Blog listing & individual posts
├── styles/
│   └── global.css            # Theme tokens, glass utilities, animations
└── consts.ts                 # Site title, description, social URLs
```

## Adding Content

### Blog Post

Add a `.md` or `.mdx` file to `src/content/blog/`:

```markdown
---
title: "Post Title"
description: "Description"
pubDate: "2026-04-03"
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

The timeline on the About page updates automatically. `order` controls sort position; left/right placement alternates.

## Theming

Colors are defined as CSS custom properties in `global.css` under `[data-theme="light"]` and `[data-theme="dark"]`. The Liquid Glass tokens (`--glass-bg`, `--glass-border`, `--glass-shadow`, `--glass-highlight`) adapt to both themes automatically.

To apply glass styling to a new element, add the `.glass` class or reference the `--glass-*` variables directly.

## License

MIT

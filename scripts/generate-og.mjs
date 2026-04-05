import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { html } from "satori-html";
import { loadDefaultJapaneseParser } from "budoux";

const parser = loadDefaultJapaneseParser();

const SITE_TITLE = "Sol-momma";
const OUT_DIR = "dist/client/og";

async function fetchFont() {
  const url =
    "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap";
  const cssRes = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
    },
  });
  const css = await cssRes.text();
  const match = css.match(/src:\s*url\(([^)]+)\)/);
  if (!match) throw new Error("Font URL not found");
  const fontRes = await fetch(match[1]);
  return Buffer.from(await fontRes.arrayBuffer());
}

function buildMarkup(title, date) {
  const segmented = parser
    .parse(title)
    .map((w) => `<span style="word-break: keep-all;">${w}</span>`)
    .join("");

  return html(`
    <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 60px;">
      <div style="display: flex; flex-direction: column; justify-content: space-between; width: 100%; height: 100%; border: 2px solid rgba(255,255,255,0.15); border-radius: 24px; padding: 60px; background: rgba(255,255,255,0.05);">
        <div style="display: flex; flex-direction: column;">
          <div style="display: flex; flex-wrap: wrap; font-size: 52px; font-weight: 700; color: #ffffff; line-height: 1.4; letter-spacing: -0.02em;">
            ${segmented}
          </div>
          ${date ? `<div style="display: flex; font-size: 24px; color: rgba(255,255,255,0.6); margin-top: 24px;">${date}</div>` : ""}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; font-size: 28px; font-weight: 600; color: rgba(255,255,255,0.9);">Sol-momma</div>
          <div style="display: flex; font-size: 20px; color: rgba(255,255,255,0.4);">sol-momma-world</div>
        </div>
      </div>
    </div>
  `);
}

async function generatePng(title, date, fontData) {
  const markup = buildMarkup(title, date);
  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    fonts: [{ name: "NotoSansJP", data: fontData, style: "normal", weight: 700 }],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  return resvg.render().asPng();
}

function collectBlogPosts() {
  const blogDir = "src/content/blog";
  if (!fs.existsSync(blogDir)) return [];
  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
  return files.map((file) => {
    const content = fs.readFileSync(path.join(blogDir, file), "utf-8");
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatter) return null;
    const titleMatch = frontmatter[1].match(/^title:\s*["']?(.+?)["']?\s*$/m);
    const dateMatch = frontmatter[1].match(/^pubDate:\s*["']?(.+?)["']?\s*$/m);
    const slug = file.replace(/\.(md|mdx)$/, "");
    return {
      slug,
      title: titleMatch?.[1] || slug,
      date: dateMatch?.[1] || undefined,
    };
  }).filter(Boolean);
}

async function main() {
  console.log("Generating OG images...");
  const fontData = await fetchFont();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // index
  const indexPng = await generatePng(SITE_TITLE, undefined, fontData);
  fs.writeFileSync(path.join(OUT_DIR, "index.png"), indexPng);
  console.log("  ✓ /og/index.png");

  // about
  const aboutPng = await generatePng(`About | ${SITE_TITLE}`, undefined, fontData);
  fs.writeFileSync(path.join(OUT_DIR, "about.png"), aboutPng);
  console.log("  ✓ /og/about.png");

  // blog posts
  const posts = collectBlogPosts();
  const blogDir = path.join(OUT_DIR, "blog");
  fs.mkdirSync(blogDir, { recursive: true });

  for (const post of posts) {
    const date = post.date
      ? new Date(post.date).toLocaleDateString("ja-JP", {
          year: "numeric", month: "long", day: "numeric",
        })
      : undefined;
    const png = await generatePng(post.title, date, fontData);
    fs.writeFileSync(path.join(blogDir, `${post.slug}.png`), png);
    console.log(`  ✓ /og/blog/${post.slug}.png`);
  }

  console.log("Done!");
}

main().catch(console.error);

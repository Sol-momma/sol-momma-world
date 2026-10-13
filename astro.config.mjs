// @ts-check

import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://sol-momma.com",
  integrations: [
    // /private は Cloudflare Access で守る前提の非公開ページなので sitemap に載せない
    // Why not: noindex だけに頼らないのは、sitemap に載るとページの存在自体が知られるため
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith("/private"),
    }),
    preact(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});

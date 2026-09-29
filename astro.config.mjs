// @ts-check

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://sol-momma.com",
  integrations: [sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },
});
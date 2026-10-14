// @ts-check

import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://sol-momma.com",
  integrations: [sitemap(), preact()],

  vite: {
    plugins: [tailwindcss()],
  },
});

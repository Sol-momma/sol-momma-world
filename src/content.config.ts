import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const experience = defineCollection({
  loader: glob({ base: "./src/content/experience", pattern: "**/*.md" }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    period: z.string(),
    order: z.number(),
  }),
});

export const collections = { experience };

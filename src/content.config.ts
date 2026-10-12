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

// worksコレクション: デスクトップに表示する作品データ
const works = defineCollection({
  loader: glob({ base: "./src/content/works", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().optional(),
    order: z.number(),
  }),
});

export const collections = { experience, works };

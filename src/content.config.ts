import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const cases = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/cases' }),
  schema: z.object({
    title: z.string(),
    overline: z.string().optional(),
    subtitle: z.string().optional(),
    intro: z.string(),
    heroImage: z.string(),
    heroAlt: z.string().default(''),
    cover: z.string().optional(),          // Homepage-Galerie, 16:9
    coverAlt: z.string().default(''),
    meta: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    anchors: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    order: z.number().default(0),
    draft: z.boolean().default(false),
  }),
});

export const collections = { cases };

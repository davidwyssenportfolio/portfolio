import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Ein Case besteht aus festen Kopffeldern (Shell) und einer FLACHEN Blockliste.
// Reihenfolge und Section-Gruppierung ergeben sich beim Rendern aus dem Marker
// `newSection` und den Bildblöcken — nicht aus Verschachtelung im Schema.
// Abstände stehen NICHT im Schema: der Rhythmus (12/16/24, 32/40) entsteht aus
// Nachbarschaftsregeln in global.css (siehe CLAUDE.md).
//
// Die Blockform { discriminant, value } ist die Serialisierung von Keystatics
// fields.conditional — CaseRenderer normalisiert sie zu { type, ...value }.

const img = z.object({
  // fields.image speichert einen Pfad-String (auf src/assets/img) oder null,
  // wenn kein Bild gewählt ist.
  src: z.string().nullable().default(null),
  alt: z.string().default(''),
  caption: z.string().optional().default(''),
});

const block = z.discriminatedUnion('discriminant', [
  z.object({ discriminant: z.literal('newSection'), value: z.object({ anchor: z.string().optional().default('') }) }),
  z.object({ discriminant: z.literal('sectionHeader'), value: z.object({ overline: z.string().optional().default(''), title: z.string().default(''), lead: z.string().optional().default('') }) }),
  z.object({ discriminant: z.literal('paragraph'), value: z.object({ text: z.string().default('') }) }),
  z.object({ discriminant: z.literal('h3'), value: z.object({ title: z.string().default(''), text: z.string().optional().default('') }) }),
  z.object({ discriminant: z.literal('bodyBlock'), value: z.object({ title: z.string().default(''), text: z.string().default('') }) }),
  z.object({ discriminant: z.literal('listBlock'), value: z.object({ title: z.string().default(''), items: z.array(z.string()).default([]) }) }),
  z.object({ discriminant: z.literal('imageFull'), value: img }),
  z.object({ discriminant: z.literal('imageColumn'), value: img }),
  z.object({ discriminant: z.literal('imagePair'), value: z.object({ left: img, right: img }) }),
]);

const cases = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/cases' }),
  schema: z.object({
    title: z.string(),
    overline: z.string().optional().default(''),
    subtitle: z.string().optional().default(''),
    intro: z.string(),
    heroImage: z.string().nullable().default(null),
    heroAlt: z.string().default(''),
    cover: z.string().nullable().default(null),   // Homepage-Galerie, 16:9
    coverAlt: z.string().default(''),
    meta: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    anchors: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    order: z.number().default(0),
    draft: z.boolean().default(false),
    blocks: z.array(block).default([]),
  }),
});

export const collections = { cases };

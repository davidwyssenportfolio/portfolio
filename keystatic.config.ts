import { config, fields, collection } from '@keystatic/core';

// Lokales CMS für Case Studies. Speichert als YAML-Datei je Case unter
// src/content/cases/<slug>.yaml — dieselben Dateien, die Astro rendert.
//
// WICHTIG:
//  - Kein fields.blocks, sondern fields.array + fields.conditional. Nur so zeigt
//    itemLabel eine Inhaltsvorschau beim Sortieren (Auftrag).
//  - Keine Abstandsfelder. Der Rhythmus lebt in global.css; der Editor bestimmt
//    ausschliesslich Reihenfolge und Inhalt.
//  - Bildfelder sind aktuell reine Pfad-Textfelder (Bilder liegen in public/img).
//    Echte Bildverarbeitung/Upload ist ein bewusst nachgelagerter Schritt.

// Bilder landen unter src/assets/img, damit astro:assets sie zur Build-Zeit
// optimiert (AVIF/WebP, responsive Grössen). publicPath ist der Präfix, der im
// YAML gespeichert wird; der Renderer löst ihn über import.meta.glob auf.
const imageField = (label: string) =>
  fields.image({ label, directory: 'src/assets/img', publicPath: '/src/assets/img' });

const imageFields = () => ({
  src: imageField('Bild'),
  alt: fields.text({ label: 'Alt-Text' }),
  caption: fields.text({ label: 'Bildlegende', multiline: true }),
});

const preview = (s: string | undefined, n = 48) => {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
};

export default config({
  storage: { kind: 'local' },
  ui: { brand: { name: 'Portfolio David Wyssen' } },
  collections: {
    cases: collection({
      label: 'Case Studies',
      slugField: 'title',
      path: 'src/content/cases/*',
      format: { data: 'yaml' },
      schema: {
        // Titel ist H1 UND Slug (= Dateiname). Der Slug ist unabhängig editierbar,
        // damit "H1.Graphore" weiter unter /work/graphcore liegt.
        title: fields.slug({
          name: { label: 'Titel (H1, zugleich Slug)', validation: { isRequired: true } },
        }),
        overline: fields.text({ label: 'Overline (Hero)' }),
        subtitle: fields.text({ label: 'Subtitle (Hero)' }),
        intro: fields.text({ label: 'Intro (Hero)', multiline: true, validation: { isRequired: true } }),
        heroImage: imageField('Hero-Bild'),
        heroAlt: fields.text({ label: 'Hero Alt-Text' }),
        cover: imageField('Cover Startseite (16:9)'),
        coverAlt: fields.text({ label: 'Cover Alt-Text' }),
        order: fields.integer({ label: 'Reihenfolge', defaultValue: 0 }),
        draft: fields.checkbox({ label: 'Entwurf', defaultValue: false }),

        meta: fields.array(
          fields.object({ label: fields.text({ label: 'Label' }), value: fields.text({ label: 'Wert' }) }),
          { label: 'Meta Rail', itemLabel: (p) => `${p.fields.label.value}: ${p.fields.value.value}` },
        ),
        anchors: fields.array(
          fields.object({ label: fields.text({ label: 'Bezeichnung' }), href: fields.text({ label: 'Ziel', description: '#anker' }) }),
          { label: 'Nav2-Anker', itemLabel: (p) => `${p.fields.label.value} → ${p.fields.href.value}` },
        ),

        blocks: fields.array(
          fields.conditional(
            fields.select({
              label: 'Blocktyp',
              options: [
                { label: 'Neue Section (Marker)', value: 'newSection' },
                { label: 'Section Header', value: 'sectionHeader' },
                { label: 'Absatz', value: 'paragraph' },
                { label: 'H3-Block', value: 'h3' },
                { label: 'Body Block', value: 'bodyBlock' },
                { label: 'List Block', value: 'listBlock' },
                { label: 'Bild volle Breite', value: 'imageFull' },
                { label: 'Bild Textspalte', value: 'imageColumn' },
                { label: 'Zwei Bilder', value: 'imagePair' },
              ],
              defaultValue: 'paragraph',
            }),
            {
              newSection: fields.object({
                anchor: fields.text({ label: 'Anker-ID', description: 'Sprungmarke, z. B. section-1' }),
              }),
              sectionHeader: fields.object({
                overline: fields.text({ label: 'Overline' }),
                title: fields.text({ label: 'Titel (H2)' }),
                lead: fields.text({ label: 'Lead (optional)', multiline: true }),
              }),
              paragraph: fields.object({
                text: fields.text({ label: 'Text', multiline: true }),
              }),
              h3: fields.object({
                title: fields.text({ label: 'Titel (H3)' }),
                text: fields.text({ label: 'Text (optional)', multiline: true, description: 'Leer lassen = reine Überschrift' }),
              }),
              bodyBlock: fields.object({
                title: fields.text({ label: 'Body Title' }),
                text: fields.text({ label: 'Body', multiline: true }),
              }),
              listBlock: fields.object({
                title: fields.text({ label: 'Titel' }),
                items: fields.array(fields.text({ label: 'Punkt' }), { label: 'Punkte', itemLabel: (p) => p.value }),
              }),
              imageFull: fields.object(imageFields()),
              imageColumn: fields.object(imageFields()),
              imagePair: fields.object({ left: fields.object(imageFields()), right: fields.object(imageFields()) }),
            },
          ),
          {
            label: 'Blöcke',
            itemLabel: (props) => {
              const v: any = props.value;
              switch (props.discriminant) {
                case 'newSection': return `━━━━━━━━━  SECTION:  ${v.fields.anchor.value || '—'}  ━━━━━━━━━`;
                case 'sectionHeader': return `SECTION HEADER — ${preview(v.fields.title.value)}`;
                case 'paragraph': return `ABSATZ — ${preview(v.fields.text.value)}`;
                case 'h3': return `H3 — ${preview(v.fields.title.value)}`;
                case 'bodyBlock': return `BODY BLOCK — ${preview(v.fields.title.value)}`;
                case 'listBlock': return `LIST BLOCK — ${preview(v.fields.title.value)}`;
                case 'imageFull': return `BILD VOLL — ${preview(v.fields.caption.value) || 'Bild'}`;
                case 'imageColumn': return `BILD TEXTSPALTE — ${preview(v.fields.caption.value) || 'Bild'}`;
                case 'imagePair': return `ZWEI BILDER — ${preview(v.fields.left.fields.caption.value) || 'links'} | ${preview(v.fields.right.fields.caption.value) || 'rechts'}`;
                default: return String(props.discriminant);
              }
            },
          },
        ),
      },
    }),
  },
});

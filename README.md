# David Wyssen — Portfolio (Astro)

Statische Umsetzung des Portfolio Design Systems (Figma "Portfolio Design").
`tokens.css` und `design-system.md` sind die Referenz; dieser Build setzt die Spec direkt um —
inklusive des 16/24-Content-Rhythmus, der in Figma nur angenähert werden konnte.

## Setup

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # statischer Build nach dist/
```

**Graphik einbinden:** `Graphik-Regular.woff2` und `Graphik-Medium.woff2` nach `public/fonts/` legen.
Die Dateien sind in `.gitignore` — lizenzierte Fonts gehören nicht in ein öffentliches Repo.
Für GitHub Pages entweder Repo privat halten, die Fonts per Secret/Release einspielen
oder klären, ob die Lizenz Web-Embedding abdeckt. Bis dahin greift der Fallback-Stack.

## GitHub Pages

1. Repo pushen (Branch `main`), unter **Settings → Pages** Source **GitHub Actions** wählen.
2. In `astro.config.mjs` setzen:
   - `site: 'https://<username>.github.io'`
   - `base: '/<repo-name>'` (bei einem Projekt-Repo; beim User-Repo `<username>.github.io`: `'/'`)
3. Der Workflow `.github/workflows/deploy.yml` baut und deployt bei jedem Push.

Alle internen Links und Bildpfade laufen über `import.meta.env.BASE_URL` — nur die Config anpassen.

## Neue Case Study

Eine MDX-Datei in `src/content/cases/` — der Dateiname wird der Slug (`/work/<name>`).
Frontmatter-Schema in `src/content.config.ts` (Build bricht bei fehlenden Pflichtfeldern).

Die **Shell ist fix** (Nav → Hero → erstes Bild → Footer) und kommt komplett aus dem Frontmatter.
Der **Content-Flow ist frei** — eine beliebige Abfolge der Blöcke:

| Block | Verwendung |
|---|---|
| `<Section id first meta anchors>` | 5-Spalten-Grid; `first` + Frontmatter-Daten rendern Nav2- und Meta-Rail |
| `<SectionHeader overline title lead>` | Overline · H2 · optionaler Lead (gap 12) |
| `### Heading` + Absatz | H3-Block — 24 davor, 12 danach, rein über CSS-Nachbarschaft |
| Absätze | Continuation, 16 Abstand automatisch |
| `<BodyBlock title>` | Body Title + Body, gap 0 |
| `<ListBlock title>` + `- …` | Titel + Liste, gap 12 |
| `<ImageRow><ImageCard/></ImageRow>` | Bild volle Content-Breite |
| `<ImageRow card>` | Bild auf der Textspalte (3/4 Spalten) |
| `<ImageRowHalf>` + 2× `<ImageCard>` | Zweierzeile — kollabiert an keinem Breakpoint |

Bilder nach `public/img/`, Pfade ohne führenden Slash (`img/foo.jpg`).
Breite ist definiert, Höhe frei — kein Aspect-Ratio auf Detailseiten (Ausnahme Homepage: 16:9).

Referenz: `src/content/cases/pilot.mdx` zeigt alle Blöcke im Einsatz.

## Architektur

```
src/styles/tokens.css     Tokens 1:1 aus Figma, px, Modes per Media Query (≤767: Margin/Gutter 24)
src/styles/global.css     Layout-Klassen (Basis = 992, Overrides ≥1280 und ≤991), Textstile, Rhythmus
src/components/           Blockbibliothek — eine responsive Komponente je Figma-Komponente
src/layouts/              BaseLayout (HTML-Shell) · CaseStudyLayout (fixe Case-Shell)
src/content/cases/        Content als MDX, versioniert
src/pages/                Homepage (Galerie) · /work/[slug]
```

**Rhythmus statt Wrapper:** 16 (Continuation) / 24 (neues Topic) entstehen über Sibling-Selektoren
in `.section-content` — kein `.topic`-Wrapper nötig, der Flow bleibt frei.

## Offen / nächste Schritte

- [ ] Graphik-Fontdateien einspielen
- [ ] Logo-SVG exportieren und `Logo.astro` ersetzen (Artwork ist `#000000` — bewusst? Offener Punkt)
- [ ] Echte Bilder + echter Case-Content (Pilot ist Platzhalter)
- [ ] Nav2 Scrollspy (Active-State per IntersectionObserver) — sticky + Anchor-Scroll laufen bereits
- [ ] Custom Cursor portieren (`custom-cursor-demo.html` → Script in `BaseLayout`)
- [ ] Mobile-Menü (aktuell nur der "Menü"-Trigger, per Design noch offen)
- [ ] Keystatic als lokales CMS (`@keystatic/astro` + Schema aus `content.config.ts`)
- [ ] Über- und Kontakt-Seite (Nav-Links zeigen ins Leere)
- [ ] Accent-Farbe, sobald entschieden — ein Token in `tokens.css`

## Abnahme gegen Figma

Pro Breakpoint gegen die **Code-Boards** prüfen (1920 · 1440 · 1280 · 992 · 768 · 480):
1312-Cap und Zentrierung ab 1440 · Content 3→4 Spalten bei 1279/992 · Meta-Rail-Flip + 80er Row-Gap ·
Margins/Gutter je Breakpoint · Zweierzeile bleibt zweispaltig bei 480 · Footer-Verhalten (442px-Spalte nur bei 1280–1439).

# Portfolio David Wyssen — Projektkontext

Statische Portfolio-Website, gebaut mit Astro. Umsetzung eines in Figma
entwickelten Design Systems. Vorher gab es einen Webflow-Build; der ist
zugunsten dieser Code-Umsetzung eingestellt worden.

**Sprache: Deutsch.** Fachbegriffe auf Englisch, wo das üblich ist
(Breakpoint, Token, Grid, Commit). Keine englischen Antworten.

---

## Rollen der Quellen

| Quelle | Rolle |
|---|---|
| Figma `Portfolio Design`, Seite `Design 2` | Source of Truth für Layout, Tokens, Masse |
| `design-system.md` | Dokumentation des Systems — Referenz bei jeder Layoutfrage |
| `tokens.css` / `tokens.json` | Token-Werte (die CSS-Fassung im Projekt ist massgeblich) |
| Dieses Repo | Source of Truth für den gerenderten Code und allen Content |

Figma-File-Key: `pJgHQYrb2UEqiTmBbdMTVH`

**Wichtig zu Figma:** Für jeden Breakpoint (1920 · 1440 · 1280 · 992 · 768 · 480)
gibt es ein *Design*-Board und ein *Code*-Board. Die Design-Boards sind flach und
absolut positioniert. **Struktur immer aus den Code-Boards lesen**, nie aus den
Design-Boards.

**Bekannte Abweichung:** Die Figma-Boards zeigen im Content-Text einen einzigen
uniformen Abstand, weil Auto Layout nur einen Gap pro Frame erlaubt. Der Code
setzt stattdessen den korrekten Rhythmus 16/24 um (siehe unten). Bei Abweichungen
zwischen Figma-Abstand und Spec gilt die **Spec**, nicht das Board.

---

## Architektur

```
src/styles/tokens.css     Tokens 1:1 aus Figma, px-basiert
src/styles/global.css     Layout-Klassen, Textstile, Content-Rhythmus
src/lib/url.ts            Pfad-Helfer (base-fest) — PFLICHT für alle internen Pfade
src/components/           Blockbibliothek, je eine responsive Komponente
src/layouts/BaseLayout    HTML-Shell, Font-Einbindung, Preloads
src/layouts/CaseStudyLayout  Fixe Case-Shell: Nav → Hero → erstes Bild → Slot → Footer
src/content/cases/*.mdx   Content, validiert gegen src/content.config.ts
src/pages/index.astro     Homepage-Galerie (16:9)
src/pages/work/[slug].astro  Case-Route
public/img/               Bilder
public/fonts/             Graphik woff2 — per .gitignore NICHT im Repo (Lizenz)
```

---

## Harte Konventionen

**1. px, nicht rem.** Das gesamte System ist px-basiert.

**2. Jeder interne Pfad läuft über `url()` aus `src/lib/url.ts`.**
Nie `import.meta.env.BASE_URL` direkt verketten — Astro liefert den Wert je nach
Schreibweise mit oder ohne Slash, direktes Zusammenkleben erzeugt kaputte Pfade.

```astro
import { url } from '../lib/url';
<img src={url('img/foo.jpg')} />
<a href={url('work/mein-case')}>…</a>
```

Das gilt auch für Assets aus `public/` in CSS: reines CSS kennt die `base` nicht.
Deshalb stehen die `@font-face`-Regeln in `BaseLayout.astro` und nicht in einer
CSS-Datei.

**3. Breakpoint-Strategie: Basis ist der 992-Zustand.**
Overrides nur nach oben (`min-width: 1280`) und nach unten (`max-width: 991`).
Bei ≤767 wechseln ausschliesslich `--page-margin` und `--grid-gutter` auf 24 —
das entspricht den Variable-Modes aus Figma und ist der Grund, warum das
480er-Board keine eigenen Overrides braucht.

**4. Keine Farbe ohne Token.** Alles bindet an die semantische Ebene
(`--text-primary`, `--surface-inverse`, …), nie direkt an ein Primitive.
Einzige Ausnahme: die grauen Bildplatzhalter und das Logo-Artwork (`#000000`,
dokumentierter offener Punkt).

**5. Bilder: Breite definiert, Höhe frei.** Auf Detailseiten nie ein
Seitenverhältnis erzwingen — `width: 100%; height: auto`. Einzige Ausnahme:
Homepage-Galerie mit 16:9.

**6. Content-Rhythmus über Nachbarschaft, nicht über Wrapper.**
In `.section-content`: 16px zwischen fortlaufenden Absätzen, 24px vor
Überschriften und neuen Topics — umgesetzt mit Sibling-Selektoren in
`global.css`. Kein `.topic`-Wrapper. Der Content-Flow bleibt dadurch frei.

---

## Case Studies

Die **Shell ist fix** (Nav → Hero → erstes Bild → Footer) und kommt komplett aus
dem Frontmatter. Der **Content-Flow ist frei** — beliebige Abfolge dieser Blöcke:

| Block | Zweck |
|---|---|
| `<Section id first meta anchors>` | 5-Spalten-Grid; `first` rendert Nav2- und Meta-Rail |
| `<SectionHeader overline title lead>` | Overline · H2 · optionaler Lead (gap 12) |
| `### Heading` + Absatz | H3-Block — 24 davor, 12 danach |
| Absätze | Fortlaufend, 16 Abstand |
| `<BodyBlock title>` | Body Title + Body, gap 0 |
| `<ListBlock title>` | Titel + Liste, gap 12 |
| `<ImageRow>` / `<ImageRow card>` | Bild volle Breite / auf Textspalte |
| `<ImageRowHalf>` | Zweierzeile, kollabiert an keinem Breakpoint |

Neue Case Study = neue `.mdx` in `src/content/cases/`. Dateiname wird der Slug.
Frontmatter-Schema in `src/content.config.ts` — fehlende Pflichtfelder brechen
den Build ab, das ist Absicht.

---

## Arbeitsweise

- **Autonom arbeiten.** Design-Absicht direkt aus Figma und `design-system.md`
  lesen, statt Rückfragen zu stellen, die aus dem Design beantwortbar sind.
- **Schreibvorgänge separat verifizieren**, nicht inline im selben Aufruf.
- **Keine Workarounds**, die eine Token-Bindung aufbrechen. Lieber die saubere
  Lösung, auch wenn sie länger dauert.
- **Nach Layoutänderungen visuell prüfen**, mindestens 1440 · 992 · 480 gegen
  die entsprechenden Figma-Code-Boards.
- Bei Unsicherheit über eine Designentscheidung: nachfragen statt raten.

---

## Deploy

Push auf `main` löst `.github/workflows/deploy.yml` aus (GitHub Actions →
GitHub Pages). Live unter `https://davidwyssenportfolio.github.io/portfolio/`.

`base: '/portfolio'` in `astro.config.mjs` — deshalb läuft auch lokal alles
unter `http://localhost:4321/portfolio/`.

**Auf der Live-Seite fehlt Graphik**, weil die lizenzierten woff2-Dateien nicht
im Repo liegen. Dort greift der Fallback-Stack. Typografie deshalb immer **lokal**
beurteilen, nie auf github.io.

---

## Offene Punkte

- Echter Content statt Platzhalter im Pilot-Case
- Nav2 Scrollspy (Active-State per IntersectionObserver); sticky läuft bereits
- Custom Cursor portieren — Vanilla-Demo existiert: Dot 16px / Blob 28px bei 35%
  Opazität / Pill mit Label über `data-cursor`-Attribut. Auf Touch deaktivieren.
- Mobile-Menü (aktuell nur der „Menü"-Trigger)
- Keystatic als lokales CMS auf Basis des Content-Schemas
- Seiten „Über" und „Kontakt" (Nav-Links zeigen ins Leere)
- Accent-Farbe — System ist derzeit vollständig monochrom
- Hover-Interaktion auf H1 (später)

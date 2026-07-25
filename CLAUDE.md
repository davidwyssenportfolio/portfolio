# Portfolio David Wyssen — Projektkontext

Statische Portfolio-Website, gebaut mit Astro. Umsetzung eines in Figma
entwickelten Design Systems. Vorher gab es einen Webflow-Build; der ist
zugunsten dieser Code-Umsetzung eingestellt worden. Case Studies werden über
**Keystatic** als lokales CMS gepflegt (siehe unten).

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
src/lib/images.ts         Löst Bildpfade (src/assets/img) via import.meta.glob zu ImageMetadata
src/components/           Blockbibliothek, je eine responsive Komponente
src/components/CaseRenderer.astro  Baut aus der Blockliste die Sections (Marker + Bild-Split)
src/components/BlockContent.astro  Ein Block -> exakt die bekannten DOM-Elemente
src/layouts/BaseLayout    HTML-Shell, Font-Einbindung, Preloads
src/layouts/CaseStudyLayout  Fixe Case-Shell: Nav → Hero → erstes Bild → Slot → Footer
src/content/cases/*.yaml  Content als Datendateien, validiert gegen src/content.config.ts
src/pages/index.astro     Homepage-Galerie (16:9)
src/pages/work/[slug].astro  Case-Route (baut komplett aus entry.data, kein render())
keystatic.config.ts       Lokales CMS (Schema-Spiegel der 9 Blöcke) — nur `npm run cms`
src/assets/img/<slug>/    Case-Bilder (auch Keystatic-Uploads) — von astro:assets optimiert
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
Homepage-Galerie mit 16:9. Optimierung läuft über `astro:assets`: Raster als
`<Picture>` (AVIF/WebP + Fallback, responsive Breiten = Board-Breiten), SVG als
`<Image>` (Passthrough). Der `<picture>`-Wrapper ist per `picture{display:contents}`
layout-transparent, damit die Selektoren greifen. Bildpfade werden NICHT über
`url()` gebaut, sondern über `resolveImage()` (`src/lib/images.ts`) aufgelöst —
astro:assets setzt die base selbst.

**6. Content-Rhythmus über Nachbarschaft, nicht über Wrapper.**
In `.section-content`: 16px zwischen fortlaufenden Absätzen, 24px vor
Überschriften und neuen Topics — umgesetzt mit Sibling-Selektoren in
`global.css`. Kein `.topic`-Wrapper. Der Content-Flow bleibt dadurch frei.

Ausnahme: **Section Header → H3 liegt bei 16** (der erste Block direkt nach dem
Section Header ist immer 16), während **Absatz → H3 mitten im Text bei 24 bleibt**
(neues Topic). Umgesetzt mit `.section-content > .section-header + h3` (höhere
Spezifität als die 24er-Sammelregel).

---

## Case Studies

Ein Case ist eine **YAML-Datendatei** in `src/content/cases/` (Dateiname = Slug):
feste **Kopffelder** (die Shell: Titel/H1, Overline, Subtitle, Intro, Hero-Bild,
Cover, Meta Rail, Nav2-Anker, Reihenfolge, Entwurf) plus eine **flache Blockliste**
`blocks`. Kein MDX-Fluss mehr, kein `render()` — `[slug].astro` baut komplett aus
`entry.data`; `CaseRenderer` setzt daraus die bestehenden Komponenten zusammen.

Jeder Block hat die Form `{ discriminant, value }` (so serialisiert Keystatics
`fields.conditional`). `CaseRenderer` normalisiert das intern auf `{ type, ...value }`.
Die neun Blöcke:

| discriminant | Felder | Rendert als (direktes Kind von `.section-content`, Bilder auf `.content`) |
|---|---|---|
| `newSection` | anchor | Marker: neue thematische Section mit Sprungmarke |
| `sectionHeader` | overline, title, lead? | `<SectionHeader>` → `.section-header` |
| `paragraph` | text | `<p>` ohne Klasse |
| `h3` | title, text? | `<h3>` (+ `<p>` nur wenn text gesetzt — sonst bare `<h3>`) |
| `bodyBlock` | title, text | `<BodyBlock>` → `.body-block` |
| `listBlock` | title, items[] | `<ListBlock>` → `.list-block` + `<ul>` |
| `imageFull` | src, alt, caption? | `<ImageCard>` direkt in `.content` |
| `imageColumn` | src, alt, caption? | `<ImageRow card>` + `<ImageCard>` |
| `imagePair` | left, right | `<ImageRowHalf>` + 2× `<ImageCard>` |

**Section-Logik (in `CaseRenderer`):** Textblöcke werden in `<Section>` gruppiert,
Bildblöcke stehen als Geschwister auf `.content`-Ebene. Ein Bildblock **schliesst**
die laufende Section; der nächste Textblock öffnet **lazy** eine neue (keine leeren
`<section>`). Anker-ID nur an der ersten Section einer thematischen Section (nicht
an der Fortsetzung nach einem Bild); Meta Rail + Nav2 nur an der allerersten Section
der Seite.

**Selektor-Vertrag (Pflicht, sonst greift der Rhythmus in `global.css` nicht):**
Blöcke als direkte Kinder von `.section-content`, echte `h3`-Elemente, und die
Klassen `.section-header` / `.body-block` / `.list-block`. Alles andere ist frei.
Abstände kommen NIE aus dem Content — nur aus den Nachbarschaftsregeln.

**Nav2-Verhalten (Client-Script in `CaseStudyLayout.astro`, rein statisch):**
Scrollspy setzt `is-active` auf den aktiven Anker (IntersectionObserver, ⅓-Band;
aktiv nur bei Eintritt → bleibt in Bild-Lücken stehen). `#nav2-end-sentinel` am
Ende von `.container` aktiviert am Seitenende den letzten Anker. Zusätzlich blendet
Nav2 aus (`.nav2--hidden`), wenn ein VOLLBREITES Bild die Rail überdeckt — Auslöser
über die Klasse/Struktur (`.content > figure.image-card` = imageFull,
`.content > .image-row-half` = imagePair), NICHT `.image-row` (imageColumn,
eingerückt). Unter 992px ist die Rail per CSS aus; das Script bleibt fehlerfrei.

Schema in `src/content.config.ts` (zod, Diskriminante `discriminant`). Fehlende
Pflichtfelder brechen den Build ab, das ist Absicht.

**Hinweis Typografie:** Das alte MDX lief durch Astros Markdown (smartypants →
typografische Apostrophe ’). Datendateien werden NICHT durch Markdown geschickt —
gewünschte Sonderzeichen stehen direkt im Text (im Editor eintippen).

---

## Keystatic (lokales CMS)

Editor zum Anlegen/Pflegen der Case Studies: Blöcke per Drag-and-drop sortieren,
Text/Bilder in Formularfeldern. Schreibt direkt die YAML-Dateien im Repo
(`storage: local`), kein Cloud-Dienst.

- **Starten:** `npm run cms` (setzt `KEYSTATIC=1`), dann `http://localhost:4321/keystatic`.
- **Warum ein eigener Modus:** Keystatic verdrahtet die Pfade `/keystatic` und
  `/api/keystatic` hart und ist mit `base: '/portfolio'` inkompatibel. Der CMS-Modus
  läuft deshalb OHNE base. Der normale `npm run dev` und der Prod-Build behalten
  `base '/portfolio'` und laden Keystatic **nicht** — der GitHub-Pages-Build bleibt
  rein statisch (verifiziert: `npm run build` erzeugt nur HTML).
- **Bilder-Upload:** Bildfelder sind `fields.image` mit `directory: src/assets/img`,
  `publicPath: /src/assets/img`. Keystatic legt Uploads pro Case unter
  `src/assets/img/<slug>/` ab (den Slug hängt es selbst an) und speichert den Pfad
  im YAML. Beim Build optimiert `astro:assets` sie (AVIF/WebP, responsive Grössen).
  Ablauf: Bild in Keystatic ziehen → landet in `src/assets/img/<slug>/` → nach Push
  optimiert live. Kein manuelles Pfad-Anfassen. (SVG-Platzhalter bleiben SVG.)
- **Section-Trenner:** Der `newSection`-Marker wird in der Blockliste als
  Volllinien-Trenner dargestellt (`itemLabel` gibt `━━━ SECTION: <anchor> ━━━`
  zurück), damit die Sections optisch getrennt sind.
- **Abnahme nach Content-Änderungen:** `/styleguide` muss weiterhin 0 Abweichungen
  von den gemessenen Beziehungen zeigen (1440 · 992 · 480); der Selektor-Vertrag oben
  ist die Bedingung dafür.

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
- Custom Cursor portieren — Vanilla-Demo existiert: Dot 16px / Blob 28px bei 35%
  Opazität / Pill mit Label über `data-cursor`-Attribut. Auf Touch deaktivieren.
- Mobile-Menü (aktuell nur der „Menü"-Trigger)
- Seiten „Über" und „Kontakt" (Nav-Links zeigen ins Leere)
- Accent-Farbe — System ist derzeit vollständig monochrom
- Hover-Interaktion auf H1 (später)

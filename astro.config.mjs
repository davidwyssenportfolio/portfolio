import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

// GitHub Pages:
//   site = https://<username>.github.io
//   base = '/<repo-name>'  (bei einem Projekt-Repo; bei <username>.github.io-Repo: '/')
// Alle internen Links/Assets nutzen import.meta.env.BASE_URL — nur hier anpassen.
//
// Keystatic (lokales CMS) verdrahtet die Pfade /keystatic und /api/keystatic hart
// und ist mit Astros base '/portfolio' inkompatibel (der Admin-Router erwartet
// /keystatic, die serverseitigen Routen lägen aber unter /portfolio/…).
// Deshalb läuft Keystatic in einem EIGENEN Dev-Modus OHNE base: `npm run cms`
// (setzt KEYSTATIC=1). Dort greifen Keystatics native Pfade ohne jeden Umweg.
// Der normale Dev-Server (`npm run dev`) und der Prod-Build behalten base
// '/portfolio' und laden Keystatic NICHT — der GitHub-Pages-Build bleibt statisch.
const cms = process.env.KEYSTATIC === '1';

export default defineConfig({
  site: 'https://davidwyssenportfolio.github.io',
  base: cms ? '/' : '/portfolio',
  integrations: [mdx(), ...(cms ? [react(), keystatic()] : [])],
});

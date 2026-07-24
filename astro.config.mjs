import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// GitHub Pages:
//   site = https://<username>.github.io
//   base = '/<repo-name>'  (bei einem Projekt-Repo; bei <username>.github.io-Repo: '/')
// Alle internen Links/Assets nutzen import.meta.env.BASE_URL — nur hier anpassen.
export default defineConfig({
  site: 'https://example.github.io',
  base: '/',
  integrations: [mdx()],
});

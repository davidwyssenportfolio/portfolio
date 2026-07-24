/**
 * Baut einen internen Pfad relativ zur konfigurierten `base` in astro.config.mjs.
 *
 * Astro liefert BASE_URL je nach Schreibweise mit oder ohne abschliessenden
 * Schrägstrich ('/portfolio' vs. '/portfolio/'). Direktes Zusammenkleben
 * erzeugt sonst kaputte Pfade wie '/portfolioimg/foo.svg'.
 *
 *   url()                  -> '/portfolio/'
 *   url('work/pilot')      -> '/portfolio/work/pilot'
 *   url('/img/foo.svg')    -> '/portfolio/img/foo.svg'
 *   url('https://…')       -> unverändert (externe URLs bleiben unangetastet)
 */
export function url(path: string = ''): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const clean = String(path).replace(/^\/+/, '');
  return clean ? `${base}/${clean}` : `${base}/`;
}

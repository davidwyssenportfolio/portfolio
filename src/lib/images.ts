import type { ImageMetadata } from 'astro';

// Bilder liegen unter src/assets/img/ (auch die Keystatic-Uploads). Damit
// astro:assets sie optimiert, müssen sie als Modul importiert werden — hier
// über einen eager, REKURSIVEN Glob (robust gegen Slug-Unterordner, die
// Keystatic je nach Konfiguration anlegt).
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/img/**/*.{png,jpg,jpeg,webp,avif,gif,svg}',
  { eager: true },
);

/**
 * Löst einen in den Case-Daten gespeicherten Bildpfad
 * (z. B. '/src/assets/img/gc-01.svg') zur importierten ImageMetadata auf.
 * Gibt null zurück, wenn nichts passt (Aufrufer rendert dann einen Fallback).
 */
export function resolveImage(path?: string | null): ImageMetadata | null {
  if (!path) return null;
  const key = path.startsWith('/') ? path : `/${path}`;
  return modules[key]?.default ?? null;
}

export function isSvg(meta: ImageMetadata | null | undefined): boolean {
  return !!meta && meta.format === 'svg';
}

// Board-Breiten aus dem Design System — Basis für die responsive srcset-Auswahl.
export const IMAGE_WIDTHS = [480, 768, 992, 1280, 1440, 1920];

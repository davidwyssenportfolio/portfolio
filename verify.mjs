// Kontinuierliche Abnahme der Nav2-Case-Seiten (Chromium + WebKit, graphcore + pilot).
//
// WARUM KONTINUIERLICH: Eine Messung an festen Scroll-Positionen kann Verhalten
// WÄHREND des Scrollens nicht erfassen und meldet grün, obwohl der Fehler im Browser
// sichtbar ist. Diese Abnahme fährt die Seite in kleinen Schritten bzw. Frame für
// Frame ab, liest den ECHTEN, vom Seiten-Code gesetzten Zustand (opacity), und prüft:
//
//   1) Timeliness ("zu spät?"): Beim kontinuierlichen Scrollen muss die Nav in dem
//      Frame, in dem ein Bild ihre reale Box erstmals berührt, opacity≈0 haben.
//      (Der scroll-gekoppelte Scrub ist per Konstruktion synchron — hier wird es belegt.)
//   2) Kein Flackern: Zustandswechsel (op um 0.5) sind monoton, keine kurzen
//      Aus/Ein-Oszillationen an einer Kante.
//   3) Kein X-Versatz: nav.left und rail.left sind sichtbar wie ausgeblendet identisch.
//   4) Keine Regression: Styleguide 0 Abweichungen, Scrollspy progressiert, Anker-
//      sprung landet 96px unter Oberkante, sticky Nav klebt bei top=64.
//
// Aufruf:  npm run verify   (startet selbst einen Dev-Server auf einem eigenen Port)
// Voraussetzung einmalig:   npx playwright install chromium webkit
import { chromium, webkit } from 'playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = 4373; // eigener Port, kollidiert nicht mit einem laufenden `npm run dev` (4321)
const ORIGIN = `http://localhost:${PORT}/portfolio`;
const SLUGS = ['graphcore', 'pilot'];
const VP = { width: 1440, height: 900 };
const STEP = 50;              // Schrittweite des Positions-Sweeps
const SPEEDS = [60, 150];     // px/Frame für den kontinuierlichen Fade-Test
const HIDE_ZONE = 128, SHOW_ZONE = 48; // müssen zu NAV_HIDE/SHOW_BUFFER im Layout passen

// ---- Dev-Server hoch/runter -------------------------------------------------
function startServer() {
  const bin = join(ROOT, 'node_modules', '.bin', 'astro');
  const child = spawn(bin, ['dev', '--port', String(PORT)], {
    cwd: ROOT, detached: true, stdio: 'ignore',
    env: { ...process.env, KEYSTATIC: '' }, // base bleibt /portfolio
  });
  return child;
}
async function waitForServer(url, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Dev-Server nicht erreichbar: ${url}`);
}
function stopServer(child) {
  if (child && child.pid) { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
}

// ---- In-Browser: Positions-Sweep (echter opacity-Zustand pro 50px) ----------
async function sweep(step) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  document.documentElement.style.scrollBehavior = 'auto';
  const nav = document.querySelector('.nav2');
  const rail = document.querySelector('.nav2-rail');
  const content = document.querySelector('.content');
  // Wie der Cover-Code: gemessen wird der BLOCK (figure.image-card = Bild + Caption).
  const blocks = () => { const s = new Set(); for (const im of content.querySelectorAll('img')) s.add(im.closest('figure.image-card') || im); return Array.from(s); };
  const box = (el) => { const r = el.getBoundingClientRect(); return { L: +r.left.toFixed(1), R: +r.right.toFixed(1), T: Math.round(r.top), B: Math.round(r.bottom) }; };
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const log = [];
  for (let y = 0; y <= maxScroll + step; y += step) {
    const yy = Math.min(y, maxScroll);
    window.scrollTo(0, yy);
    await raf(); await sleep(16); await raf(); // Seiten-Scroll-Handler laufen lassen
    const n = box(nav);
    const opacity = +getComputedStyle(nav).opacity;
    const over = blocks().map((b, i) => {
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      if (!(r.left < n.R && r.right > n.L)) return null; // nur Nav-Spalte
      const cap = b.querySelector ? b.querySelector('figcaption') : null;
      return { i, T: Math.round(r.top), B: Math.round(r.bottom), L: Math.round(r.left), R: Math.round(r.right), caption: !!cap };
    }).filter(Boolean);
    log.push({ y: yy, opacity, hidden: opacity < 0.5, nav: n, rail: box(rail), over });
  }
  return { maxScroll, log };
}

// ---- In-Browser: kontinuierlicher Fade-Test -------------------------------
// Prüft die ganze Überdeckung, nicht nur den Erst-Kontakt: solange IRGENDEIN Block
// (figure.image-card, inkl. Caption) die reale Nav-Box überlappt, muss opacity≈0 sein.
// Erfasst damit beide Seiten — Anflug ("zu spät") UND Abflug (Caption reicht unter das Bild).
async function fadeScan(pxPerFrame) {
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  document.documentElement.style.scrollBehavior = 'auto';
  const nav = document.querySelector('.nav2');
  const content = document.querySelector('.content');
  const set = new Set();
  for (const im of content.querySelectorAll('img')) set.add(im.closest('figure.image-card') || im);
  const blocks = Array.from(set);
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, 0); await raf();
  let worst = 0, worstY = null; const events = []; let wasOverlap = false;
  for (let y = 0; y <= maxScroll; y += pxPerFrame) {
    window.scrollTo(0, y); await raf();
    const nb = nav.getBoundingClientRect();
    const op = +getComputedStyle(nav).opacity;
    let overlap = false;
    for (const b of blocks) {
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.left < nb.right && r.right > nb.left && r.top < nb.bottom && r.bottom > nb.top) { overlap = true; break; }
    }
    if (overlap) { if (op > worst) { worst = op; worstY = y; } if (!wasOverlap) events.push({ y, op: +op.toFixed(3) }); }
    wasOverlap = overlap;
  }
  return { worst: +worst.toFixed(3), worstY, events };
}

// ---- Analyse -----------------------------------------------------------------
function analyseSweep(res) {
  const { log } = res;
  const changes = [];
  let prev = null;
  for (const s of log) {
    if (prev && s.hidden !== prev.hidden) {
      const trig = s.over.length
        ? s.over.reduce((a, b) => (Math.abs(b.T - s.nav.B) < Math.abs(a.T - s.nav.B) ? b : a))
        : null;
      changes.push({ y: s.y, to: s.hidden ? 'HIDDEN' : 'visible', opacity: +s.opacity.toFixed(2), trigger: trig });
    }
    prev = s;
  }
  // Flackern: jeder Segmentabstand zwischen zwei Wechseln < 200px ist verdächtig
  // (echte Aus/Ein-Segmente sind hunderte px lang; die alte Hysterese kippte im 50px-Takt).
  let flicker = null;
  for (let i = 1; i < changes.length; i++) {
    const gap = changes[i].y - changes[i - 1].y;
    if (gap < 200) { flicker = { at: changes[i].y, gap }; break; }
  }
  const vis = log.find((s) => s.opacity > 0.99);
  const hid = log.find((s) => s.opacity < 0.01);
  return {
    changes, flicker,
    xproof: {
      navVisible: vis ? vis.nav.L : null, navHidden: hid ? hid.nav.L : null,
      railVisible: vis ? vis.rail.L : null, railHidden: hid ? hid.rail.L : null,
    },
  };
}

// ---- Regression (Styleguide / Scrollspy / Anker / Sticky) -------------------
async function regression(page, engineFmt) {
  const R = {};
  await page.goto(`${ORIGIN}/styleguide`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  R.deviations = await page.evaluate(() => document.querySelectorAll('.sg-row--abweichung').length);

  await page.goto(`${ORIGIN}/work/graphcore`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  R.anchors = await page.evaluate(() => Array.from(document.querySelectorAll('a.text-nav2')).map((a) => a.textContent.trim()));

  // Scrollspy: feiner Sweep, Reihenfolge der aktiven Anker
  R.spyOrder = await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const seq = []; let last = null;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    for (let y = 0; y <= max; y += 100) {
      window.scrollTo(0, y); await sleep(90);
      const el = document.querySelector('a.text-nav2.is-active');
      const t = el ? el.textContent.trim() : null;
      if (t !== last) { seq.push(t); last = t; }
    }
    return seq;
  });

  // Ankersprung: 2. Anker klicken, Landeposition + aktiver Anker
  R.jump = await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 100));
    const links = Array.from(document.querySelectorAll('a.text-nav2'));
    const target = links[1]; // "Prozess"
    const href = target.getAttribute('href');
    target.click();
    await new Promise((r) => setTimeout(r, 1500)); // smooth-scroll voll ausklingen lassen
    const sec = document.querySelector(href);
    const active = document.querySelector('a.text-nav2.is-active');
    return { label: target.textContent.trim(), top: Math.round(sec.getBoundingClientRect().top), active: active ? active.textContent.trim() : null };
  });

  // Sticky: nav.top im geklebten Bereich
  R.stickyTops = await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    const nav = document.querySelector('.nav2');
    const out = [];
    for (const y of [2000, 3500]) { window.scrollTo(0, y); await new Promise((r) => requestAnimationFrame(r)); out.push(Math.round(nav.getBoundingClientRect().top)); }
    return out;
  });
  return R;
}

// ---- Lauf --------------------------------------------------------------------
const results = []; // {check, pass, detail}
const changeLog = []; // {tag, changes} — Zustandswechsel je Engine·Seite für den Bericht
const ok = (check, pass, detail) => results.push({ check, pass, detail });

const server = startServer();
try {
  await waitForServer(`${ORIGIN}/work/graphcore`);
  for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
    let browser;
    try { browser = await launcher.launch(); }
    catch (e) { ok(`${engine} start`, false, `${e.message} — evtl. "npx playwright install ${engine}" nötig`); continue; }

    for (const slug of SLUGS) {
      const tag = `${engine}·${slug}`;
      const page = await browser.newPage({ viewport: VP });

      // Sweep + Analyse
      await page.goto(`${ORIGIN}/work/${slug}`, { waitUntil: 'load' });
      await page.waitForTimeout(300);
      const a = analyseSweep(await page.evaluate(sweep, STEP));
      changeLog.push({ tag, changes: a.changes });
      ok(`${tag} kein Flackern`, a.flicker === null, a.flicker ? `Segment ${a.flicker.gap}px bei y=${a.flicker.at}` : `${a.changes.length} Wechsel, alle Segmente ≥200px`);
      const xp = a.xproof;
      const xOk = xp.navVisible === xp.navHidden && xp.railVisible === xp.railHidden && xp.navVisible !== null && xp.navHidden !== null;
      ok(`${tag} kein X-Versatz`, xOk, `nav ${xp.navVisible}/${xp.navHidden}, rail ${xp.railVisible}/${xp.railHidden}`);

      // Timeliness: solange ein Block (inkl. Caption) die Nav-Box überdeckt, opacity≈0.
      for (const spd of SPEEDS) {
        await page.goto(`${ORIGIN}/work/${slug}`, { waitUntil: 'load' });
        await page.waitForTimeout(250);
        const f = await page.evaluate(fadeScan, spd);
        ok(`${tag} nie sichtbar über Block @${spd}px/f`, f.worst <= 0.05, `max opacity ${f.worst}${f.worstY != null ? ` @y=${f.worstY}` : ''} solange ein Block die Nav-Box überdeckt`);
      }

      // Explizit: vollbreiter Block MIT Caption muss die Szene tatsächlich auslösen
      // (sonst würde die Timeliness-Prüfung ihn nie erreichen). Korrektheit selbst
      // liegt in der Timeliness-Prüfung oben (Block-Rect inkl. Caption).
      if (slug === 'pilot') {
        const cap = a.changes.find((c) => c.to === 'HIDDEN' && c.trigger && c.trigger.caption && c.trigger.R - c.trigger.L > 1000);
        ok(`${tag} vollbreiter Caption-Block geprüft`, !!cap, cap ? `Block#${cap.trigger.i} [L=${cap.trigger.L} R=${cap.trigger.R}] mit Caption, HIDE @y=${cap.y}` : 'kein vollbreiter Caption-Block im Sweep');
      }
      await page.close();
    }

    // Regression (einmal je Engine)
    const page = await browser.newPage({ viewport: VP });
    const R = await regression(page);
    ok(`${engine} Styleguide 0 Abw.`, R.deviations === 0, `${R.deviations} Abweichungen`);
    const spyMonotone = R.spyOrder.filter(Boolean).join('>') && R.anchors.every((_, i) => R.spyOrder.filter(Boolean)[i] === R.anchors[i] || i >= R.spyOrder.filter(Boolean).length);
    const lastActiveIsLast = R.spyOrder.filter(Boolean).slice(-1)[0] === R.anchors.slice(-1)[0];
    ok(`${engine} Scrollspy progressiert`, spyMonotone && lastActiveIsLast, `aktiv-Reihenfolge [${R.spyOrder.join(', ')}] vs Anker [${R.anchors.join(', ')}]`);
    ok(`${engine} Ankersprung 96px`, Math.abs(R.jump.top - 96) <= 8 && R.jump.active === R.jump.label, `Section-top ${R.jump.top}px, aktiv ${R.jump.active}`);
    ok(`${engine} Sticky top=64`, R.stickyTops.every((t) => t === 64), `nav.top ${JSON.stringify(R.stickyTops)}`);
    await page.close();
    await browser.close();
  }
} finally {
  stopServer(server);
}

// ---- Bericht -----------------------------------------------------------------
const pass = results.filter((r) => r.pass).length;
const fail = results.length - pass;
console.log('\nNav2-Abnahme (kontinuierlich, Chromium + WebKit, graphcore + pilot)\n');
for (const r of results) console.log(`  ${r.pass ? '✓' : '✗'} ${r.check.padEnd(34)} ${r.detail}`);

console.log('\nZustandswechsel (50px-Sweep, auslösender Block):');
for (const { tag, changes } of changeLog) {
  const line = changes.map((c) => {
    const t = c.trigger ? `Block#${c.trigger.i}${c.trigger.caption ? '+Cap' : ''}[T=${c.trigger.T} B=${c.trigger.B}]` : '—';
    return `y=${c.y}→${c.to}(op${c.opacity}) ${t}`;
  }).join('  ·  ');
  console.log(`  ${tag.padEnd(18)} ${line || 'keine'}`);
}

console.log(`\n${pass}/${results.length} bestanden${fail ? `, ${fail} FEHLGESCHLAGEN` : ''}.`);
process.exit(fail ? 1 : 0);

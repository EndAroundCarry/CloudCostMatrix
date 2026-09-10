/**
 * Generates sitemap.xml from the actual prerendered output, so a URL can never
 * appear in the sitemap without having been prerendered — or vice versa.
 *
 * Runs after `ng build`. Replaces the previous hand-maintained sitemap, whose
 * 24 entries all claimed `lastmod 2026-09-07` with `changefreq daily`: a
 * changefreq that is obviously false and a lastmod that never moved, which is
 * exactly the pattern Google learns to distrust.
 *
 * Writes both the deployable copy (dist/.../browser/sitemap.xml) and the
 * committed source copy (public/sitemap.xml), so a plain `ng build` without
 * this script still ships a last-good sitemap rather than none.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ROUTES_JSON = path.join(ROOT, 'dist', 'CloudCostMatrix', 'prerendered-routes.json');
const PRICING_CACHE = path.join(ROOT, 'src', 'app', 'core', 'engine', 'catalog', 'live-pricing-cache.json');
const OUTS = [
  path.join(ROOT, 'dist', 'CloudCostMatrix', 'browser', 'sitemap.xml'),
  path.join(ROOT, 'public', 'sitemap.xml')
];
const SITE = 'https://cloudcostmatrix.com';

if (!fs.existsSync(ROUTES_JSON)) {
  console.error(`❌ ${ROUTES_JSON} not found — run \`ng build\` first.`);
  process.exit(1);
}

// lastmod is tied to the last real price sync, not to build time. Each build
// would otherwise rewrite every lastmod to today, producing diff noise on
// every commit and telling Google the content changed when it did not.
let lastmod = new Date().toISOString().split('T')[0];
if (fs.existsSync(PRICING_CACHE)) {
  const syncedAt = JSON.parse(fs.readFileSync(PRICING_CACHE, 'utf8'))?.meta?.lastSyncedAt;
  if (syncedAt) lastmod = String(syncedAt).split('T')[0];
}

const routeList = Object.keys(JSON.parse(fs.readFileSync(ROUTES_JSON, 'utf8')).routes ?? {})
  // Filter on the raw key, before normalising: the homepage key is just '/',
  // which normalises to '' and must survive as a real (root) entry.
  .filter((route) => !route.includes('*'))
  .map((route) => route.replace(/^\/+/, '').replace(/\/+$/, ''))
  .sort();

if (routeList.length === 0) {
  console.error('❌ prerendered-routes.json contains no routes — refusing to write an empty sitemap.');
  process.exit(1);
}

/** Priority banding by route shape. No changefreq: Google ignores it and a false "daily" reads as noise. */
function priority(route) {
  if (route === '') return '1.0';
  if (route.startsWith('compare/')) return '0.9';
  if (route.startsWith('blueprints/') || route.startsWith('guides/')) return '0.8';
  return '0.5';
}

const entries = routeList
  .map((route) => {
    const loc = route ? `${SITE}/${route}` : `${SITE}/`;
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <priority>${priority(route)}</priority>`,
      '  </url>'
    ].join('\n');
  })
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;

for (const out of OUTS) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, xml);
}

console.log(`✅ sitemap.xml generated — ${routeList.length} prerendered routes, lastmod ${lastmod}.`);

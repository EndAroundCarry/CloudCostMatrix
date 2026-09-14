/**
 * Generates sitemap.xml from the actual prerendered output, so a URL can never
 * appear in the sitemap without having been prerendered — or vice versa.
 *
 * Two filters apply, both read from what actually shipped rather than
 * re-derived here: a route must have an index.html, and that HTML must be
 * indexable. The second one is what keeps the reversed-ordering pair pages
 * (prerendered so `…/azure-vs-aws` resolves, but `noindex` + canonical to the
 * forward URL) out of the sitemap without this script duplicating the app's
 * own indexability rules.
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

const BROWSER = path.join(ROOT, 'dist', 'CloudCostMatrix', 'browser');

/** Does the HTML that shipped for this route ask to be excluded from search? */
function isIndexable(route) {
  const file = path.join(BROWSER, route ? path.join(route, 'index.html') : 'index.html');
  if (!fs.existsSync(file)) {
    console.warn(`⚠️  ${route || '/'} is listed as prerendered but has no index.html — excluded from the sitemap.`);
    return false;
  }
  const tag = /<meta[^>]*\bname="robots"[^>]*>/i.exec(fs.readFileSync(file, 'utf8'))?.[0] ?? '';
  return !/noindex/i.test(/\bcontent="([^"]*)"/i.exec(tag)?.[1] ?? '');
}

const indexableRoutes = routeList.filter(isIndexable);

if (indexableRoutes.length === 0) {
  console.error('❌ Every prerendered route is noindex — refusing to write an empty sitemap.');
  process.exit(1);
}

/** Priority banding by route shape. No changefreq: Google ignores it and a false "daily" reads as noise. */
const HUB_ROUTES = new Set(['compare', 'providers', 'guides', 'blueprints']);

function priority(route) {
  if (route === '') return '1.0';
  if (HUB_ROUTES.has(route)) return '0.9';
  if (route.startsWith('compare/')) return '0.85';
  if (route.startsWith('providers/') || route.startsWith('guides/') || route.startsWith('blueprints/')) return '0.8';
  return '0.3';
}

const entries = indexableRoutes
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

const skipped = routeList.length - indexableRoutes.length;
console.log(
  `✅ sitemap.xml generated — ${indexableRoutes.length} indexable routes` +
    (skipped > 0 ? ` (${skipped} prerendered but noindex, excluded)` : '') +
    `, lastmod ${lastmod}.`
);

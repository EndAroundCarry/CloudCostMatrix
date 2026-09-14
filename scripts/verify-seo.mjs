/**
 * Per-page SEO assertions over the prerendered output. Runs after `ng build`
 * (wired into CI as `npm run verify:all`, before deploy).
 *
 * verify-prerender.mjs proves pages exist; verify-jsonld.mjs proves structured
 * data is valid and policy-safe. This one proves the tags a crawler acts on are
 * actually right — and specifically that they are *unique*, which is the failure
 * mode a growing set of programmatic pages drifts into silently: two pages
 * sharing a title is invisible in a browser and expensive in search.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const BROWSER = path.join(ROOT, 'dist', 'CloudCostMatrix', 'browser');
const SITEMAP = path.join(BROWSER, 'sitemap.xml');
const SITE = 'https://cloudcostmatrix.com';

const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 170;
const TITLE_MAX = 80; // SeoService appends ' | CloudCostMatrix' (17) to most titles.

let failures = 0;
let pagesChecked = 0;

function fail(page, message) {
  console.error(`  ❌ ${page}: ${message}`);
  failures++;
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

const metaContent = (html, name) => {
  const tag = new RegExp(`<meta[^>]*\\bname="${name}"[^>]*>`, 'i').exec(html)?.[0] ?? '';
  return new RegExp('\\bcontent="([^"]*)"', 'i').exec(tag)?.[1] ?? null;
};

const metaProperty = (html, property) => {
  const tag = new RegExp(`<meta[^>]*\\bproperty="${property}"[^>]*>`, 'i').exec(html)?.[0] ?? '';
  return new RegExp('\\bcontent="([^"]*)"', 'i').exec(tag)?.[1] ?? null;
};

const linkHref = (html, rel) => {
  const tag = new RegExp(`<link[^>]*\\brel="${rel}"[^>]*>`, 'i').exec(html)?.[0] ?? '';
  return new RegExp('\\bhref="([^"]*)"', 'i').exec(tag)?.[1] ?? null;
};

const count = (html, pattern) => (html.match(pattern) ?? []).length;

if (!fs.existsSync(BROWSER)) {
  console.error(`❌ ${BROWSER} not found — run \`ng build\` first.`);
  process.exit(1);
}

console.log('🔎 Validating per-page SEO tags in prerendered output...\n');

const titles = new Map();
const descriptions = new Map();
const indexable = new Set();

for (const file of walk(BROWSER)) {
  const routePath = path.relative(BROWSER, file).replace(/\\/g, '/').replace(/index\.html$/, '');
  const page = routePath || '/';
  const url = routePath ? `${SITE}/${routePath.replace(/\/$/, '')}` : `${SITE}/`;
  // Comments are stripped before every check: they are not rendered, and a
  // comment that merely mentions a tag (as several in this codebase do) must
  // not count as one.
  const html = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  pagesChecked++;

  const robots = metaContent(html, 'robots') ?? '';
  const isIndexable = !/noindex/i.test(robots);
  if (isIndexable) indexable.add(url);

  // Title — exactly one, unique, inside the length search engines render.
  const titleMatches = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => m[1].trim());
  if (titleMatches.length !== 1) {
    fail(page, `expected exactly one <title>, found ${titleMatches.length}`);
  } else {
    const title = titleMatches[0];
    if (!title) fail(page, 'title is empty');
    if (title.length > TITLE_MAX) fail(page, `title is ${title.length} chars (max ${TITLE_MAX}): "${title}"`);
    if (/undefined|NaN|\[object/i.test(title)) fail(page, `title contains a placeholder: "${title}"`);
    if (titles.has(title)) fail(page, `title is not unique — shared with ${titles.get(title)}: "${title}"`);
    else titles.set(title, page);
  }

  // Description — exactly one, unique, substantive, not truncated by the SERP.
  const description = metaContent(html, 'description');
  if (!description) {
    fail(page, 'missing meta description');
  } else {
    if (description.length < DESCRIPTION_MIN) fail(page, `description is only ${description.length} chars`);
    if (description.length > DESCRIPTION_MAX) fail(page, `description is ${description.length} chars (max ${DESCRIPTION_MAX})`);
    if (/undefined|NaN|\[object/i.test(description)) fail(page, 'description contains a placeholder');
    if (descriptions.has(description)) fail(page, `description is not unique — shared with ${descriptions.get(description)}`);
    else descriptions.set(description, page);
  }

  if (!robots) fail(page, 'missing robots meta');

  // Canonical — indexable pages must be self-canonical; noindex pages may point
  // somewhere else deliberately (that is how a duplicate consolidates).
  const canonical = linkHref(html, 'canonical');
  if (!canonical) {
    if (isIndexable) fail(page, 'indexable page has no canonical URL');
  } else if (isIndexable && canonical !== url) {
    fail(page, `indexable page canonicalizes elsewhere: ${canonical} (expected ${url})`);
  }

  // Social tags — every page is shareable, so every page carries them.
  for (const [label, value] of [
    ['og:title', metaProperty(html, 'og:title')],
    ['og:description', metaProperty(html, 'og:description')],
    ['og:image', metaProperty(html, 'og:image')],
    ['og:url', metaProperty(html, 'og:url')],
    ['twitter:card', metaContent(html, 'twitter:card')]
  ]) {
    if (!value) fail(page, `missing ${label}`);
  }
  const ogUrl = metaProperty(html, 'og:url');
  if (ogUrl && canonical && ogUrl !== canonical) {
    fail(page, `og:url (${ogUrl}) disagrees with the canonical (${canonical})`);
  }

  // One H1 per page, and structured data on everything we ask to be indexed.
  const h1Count = count(html, /<h1[\s>]/gi);
  if (h1Count !== 1) fail(page, `expected exactly one <h1>, found ${h1Count}`);

  const jsonLdCount = count(html, /application\/ld\+json/gi);
  if (isIndexable && jsonLdCount === 0) fail(page, 'indexable page has no JSON-LD block');
}

// The sitemap and the shipped HTML must agree in both directions: a URL in the
// sitemap that 404s is worse than a URL missing from it, and an indexable page
// missing from it is simply never discovered.
const sitemapUrls = fs.existsSync(SITEMAP)
  ? [...fs.readFileSync(SITEMAP, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  : [];
if (sitemapUrls.length === 0) fail('sitemap.xml', 'missing or empty');

for (const url of sitemapUrls) {
  if (!indexable.has(url)) fail('sitemap.xml', `lists ${url}, which is not an indexable prerendered page`);
}
for (const url of indexable) {
  if (!sitemapUrls.includes(url)) fail('sitemap.xml', `does not list the indexable page ${url}`);
}

console.log(
  `  ℹ️  ${pagesChecked} prerendered page(s), ${indexable.size} indexable, ${sitemapUrls.length} sitemap entries, ` +
    `${titles.size} unique titles.\n`
);

if (failures > 0) {
  console.error(`❌ ${failures} SEO problem(s) found.`);
  process.exit(1);
}
console.log('✅ Per-page SEO tags, canonical URLs and sitemap coverage are correct.');

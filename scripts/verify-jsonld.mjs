/**
 * Extracts every <script type="application/ld+json"> block from the
 * prerendered output and validates it. Runs after `ng build` in CI.
 *
 * This exists because structured data is invisible in the browser (it never
 * throws, never looks wrong on screen) but is one of the fastest ways to earn
 * a Google manual action. The original offence was a fabricated
 * `aggregateRating` of 4.8/127 reviews on an app with no review system —
 * schema-generator.spec.ts guards the generator itself, and this script guards
 * what actually shipped to crawlers.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST_BROWSER = path.join(process.cwd(), 'dist', 'CloudCostMatrix', 'browser');

let failures = 0;
let blocksChecked = 0;
let pagesChecked = 0;

function fail(page, message) {
  console.error(`  ❌ ${page}: ${message}`);
  failures++;
}

/** Structured-data properties that must never appear without a real backing feature. */
const BANNED_PROPERTIES = ['aggregateRating', 'review', 'reviewCount', 'ratingValue'];

/** Minimum viable fields per @type we actually emit. */
const REQUIRED_BY_TYPE = {
  WebApplication: ['name', 'url', 'applicationCategory', 'offers'],
  Organization: ['name', 'url', 'logo'],
  FAQPage: ['mainEntity'],
  BreadcrumbList: ['itemListElement'],
  WebPage: ['name', 'url'],
  HowTo: ['name', 'step']
};

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

if (!fs.existsSync(DIST_BROWSER)) {
  console.error(`❌ ${DIST_BROWSER} not found — run \`ng build\` first.`);
  process.exit(1);
}

console.log('🔎 Validating JSON-LD structured data in prerendered output...\n');

for (const file of walk(DIST_BROWSER)) {
  const page = path.relative(DIST_BROWSER, file).replace(/\\/g, '/');
  const html = fs.readFileSync(file, 'utf8');
  pagesChecked++;

  const matches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  if (matches.length === 0) continue;

  for (const [, body] of matches) {
    blocksChecked++;
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (err) {
      fail(page, `malformed JSON-LD (${err instanceof Error ? err.message : err})`);
      continue;
    }

    // @graph wraps multiple schemas in one block; validate each member.
    const nodes = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];

    for (const node of nodes) {
      const type = node?.['@type'];
      if (!type) {
        fail(page, 'schema node is missing @type');
        continue;
      }
      if (node['@context'] !== undefined && node['@context'] !== 'https://schema.org') {
        fail(page, `@context is "${node['@context']}" (expected https://schema.org)`);
      }

      for (const banned of BANNED_PROPERTIES) {
        if (banned in node) {
          fail(page, `contains banned property "${banned}" — no real user reviews exist to back it`);
        }
      }

      const required = REQUIRED_BY_TYPE[type];
      if (required) {
        for (const field of required) {
          const value = node[field];
          const empty = value === undefined || value === null || (Array.isArray(value) && value.length === 0);
          if (empty) fail(page, `${type} is missing required "${field}"`);
        }
      }
    }
  }
}

console.log(`  ℹ️  ${pagesChecked} prerendered page(s), ${blocksChecked} JSON-LD block(s) inspected.\n`);

if (blocksChecked === 0) {
  console.error('❌ No JSON-LD found in any prerendered page — structured data regressed entirely.');
  process.exit(1);
}

if (failures > 0) {
  console.error(`❌ ${failures} JSON-LD problem(s) found.`);
  process.exit(1);
}
console.log('✅ Structured data is valid and policy-safe.');

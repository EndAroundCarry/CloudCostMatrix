/**
 * Prerender smoke test — run after `ng build` (or wire into CI right after
 * the build step). Fails loudly if the static output regresses in a way that
 * would otherwise only surface as "Google can't index this page anymore".
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST_BROWSER = path.join(process.cwd(), 'dist', 'CloudCostMatrix', 'browser');
const ROUTES_JSON = path.join(process.cwd(), 'dist', 'CloudCostMatrix', 'prerendered-routes.json');

const MIN_EXPECTED_ROUTES = 115; // home + 3 legal + 4 hubs + 15+8 curated compares + 90 pair orderings (minus overlap) + 10 providers + 4 blueprints + 6 guides

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.error(`  ❌ ${label}`);
    failures++;
  }
}

console.log('🔎 Verifying prerendered output...\n');

check(`prerendered-routes.json exists`, fs.existsSync(ROUTES_JSON));
if (fs.existsSync(ROUTES_JSON)) {
  const routes = Object.keys(JSON.parse(fs.readFileSync(ROUTES_JSON, 'utf8')).routes ?? {});
  check(`at least ${MIN_EXPECTED_ROUTES} routes prerendered (found ${routes.length})`, routes.length >= MIN_EXPECTED_ROUTES);
}

check('index.csr.html (CSR shell) exists', fs.existsSync(path.join(DIST_BROWSER, 'index.csr.html')));

const home = path.join(DIST_BROWSER, 'index.html');
check('home index.html exists', fs.existsSync(home));
if (fs.existsSync(home)) {
  const html = fs.readFileSync(home, 'utf8');
  check('home HTML is substantial (not an empty shell)', html.length > 50_000);
  check('home HTML carries ng-server-context marker', html.includes('ng-server-context'));
}

const compare = path.join(DIST_BROWSER, 'compare', 'aws-vs-azure', 'index.html');
check('compare/aws-vs-azure/index.html exists', fs.existsSync(compare));
if (fs.existsSync(compare)) {
  const html = fs.readFileSync(compare, 'utf8');
  check('carries the correct self-canonical', html.includes('href="https://cloudcostmatrix.com/compare/aws-vs-azure"'));
  check('carries real page content', html.includes('AWS vs Azure'));
}

// The pair space is now fully prerendered — a pair with no curated page is a
// real indexable page, not just a client-side render behind a shared shell.
const generatedPair = path.join(DIST_BROWSER, 'compare', 'gcp-vs-ibm', 'index.html');
check('a non-curated pair (gcp-vs-ibm) is prerendered', fs.existsSync(generatedPair));
if (fs.existsSync(generatedPair)) {
  const html = fs.readFileSync(generatedPair, 'utf8');
  check('  ...and ships an indexable robots meta', /name="robots"[^>]*content="index/i.test(html));
  check('  ...with a self-canonical', html.includes('href="https://cloudcostmatrix.com/compare/gcp-vs-ibm"'));
  check('  ...and catalog-computed copy', html.includes('GCP') && html.includes('/mo'));
}

// The reversed ordering has to resolve (the SPA fallback is gone) while
// consolidating any link equity into the forward URL instead of competing.
const reversedPair = path.join(DIST_BROWSER, 'compare', 'ibm-vs-gcp', 'index.html');
check('the reversed ordering (ibm-vs-gcp) is prerendered', fs.existsSync(reversedPair));
if (fs.existsSync(reversedPair)) {
  const html = fs.readFileSync(reversedPair, 'utf8');
  check('  ...but is noindex', /name="robots"[^>]*content="noindex/i.test(html));
  check('  ...and canonicalizes forward', html.includes('href="https://cloudcostmatrix.com/compare/gcp-vs-ibm"'));
}

console.log('');
if (failures > 0) {
  console.error(`❌ ${failures} prerender check(s) failed.`);
  process.exit(1);
}
console.log('✅ Prerendered output looks correct.');

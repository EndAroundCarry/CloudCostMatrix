/**
 * Prerender smoke test — run after `ng build` (or wire into CI right after
 * the build step). Fails loudly if the static output regresses in a way that
 * would otherwise only surface as "Google can't index this page anymore".
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST_BROWSER = path.join(process.cwd(), 'dist', 'CloudCostMatrix', 'browser');
const ROUTES_JSON = path.join(process.cwd(), 'dist', 'CloudCostMatrix', 'prerendered-routes.json');

const MIN_EXPECTED_ROUTES = 19; // home + methodology + disclosure + 12 curated compares + 4 blueprints

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

console.log('');
if (failures > 0) {
  console.error(`❌ ${failures} prerender check(s) failed.`);
  process.exit(1);
}
console.log('✅ Prerendered output looks correct.');

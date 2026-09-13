import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Reports whether a freshly-synced live-pricing-cache.json moved any provider's
 * CATALOG content — the numbers themselves — while ignoring the meta timestamps
 * (meta.lastSyncedAt, meta.sources[p]) that every sync rewrites unconditionally.
 *
 * The price-sync workflow uses this to skip a build + deploy on a scheduled run
 * where nothing actually changed: a plain `git diff` can never make that call,
 * because the timestamp bump alone guarantees the file differs every run.
 */

/** True when the two cache documents differ in any provider catalog. */
export function catalogsMoved(prev, next) {
  return JSON.stringify(prev?.catalogs ?? {}) !== JSON.stringify(next?.catalogs ?? {});
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // A missing/unparseable previous cache (first run) counts as a change, so
    // the very first sync is never skipped.
    return null;
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const [prevPath, nextPath] = process.argv.slice(2);
  if (!prevPath || !nextPath) {
    console.error('usage: node scripts/cache-content-diff.mjs <previous.json> <next.json>');
    process.exit(2);
  }
  const changed = catalogsMoved(readJson(prevPath), readJson(nextPath));
  console.error(`provider catalogs ${changed ? 'changed — build + deploy' : 'unchanged — skipping build + deploy'}`);
  // Exactly one line on stdout, meant to be appended straight to $GITHUB_OUTPUT.
  console.log(`changed=${changed}`);
}

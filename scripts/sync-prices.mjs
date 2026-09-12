/**
 * Automated Live Multi-Cloud Price Ingestion Engine
 * -------------------------------------------------
 * Fetches the latest public pricing feeds for the providers that have one
 * wired up, normalizes them into the app's benchmark catalog contract, and
 * writes src/app/core/engine/catalog/live-pricing-cache.json — a committed
 * artifact, bundled at build-time so the SPA has ZERO runtime API dependencies.
 *
 * Sources (all public / free):
 *   - Azure:  Retail Prices REST API      https://prices.azure.com/api/retail/prices
 *   - AWS:    Price List Bulk API (S3)    https://pricing.us-east-1.amazonaws.com
 *   - GCP:    Cloud Billing Catalog       https://cloudbilling.googleapis.com/v1/services (needs GCP_API_KEY)
 *   - Oracle: cetools public price list   https://apexapps.oracle.com/pls/apex/cetools/api/v1/products/
 *   - Linode: v4 public API               https://api.linode.com/v4/
 *   - DigitalOcean: public pricing page   https://www.digitalocean.com/pricing/droplets
 *     (its /v2/sizes API is a filtered view topping out at 4 vCPU — see
 *     fetchers/digitalocean.mjs for why the page is the honest source)
 *
 * The remaining 3 providers (IBM, Alibaba, OVHcloud) have no fetcher registered
 * below and are intentionally skipped — see the loop in runSync() — rather than
 * treated as a failure.
 *
 * The script is intentionally resilient: when a feed is unreachable it falls
 * back to the current live cache (or the built-in seed baseline) so a network
 * blip can never regress the committed catalog. When NO source can be refreshed
 * the script exits 0 with the cache untouched (mode stays 'seed' or 'live').
 *
 * The app-side resolver (pricing-catalog.resolver.ts) merges each refreshed
 * section over the seed baseline, so a partial sync is always safe.
 *
 * Individual fetchers live in scripts/fetchers/*.mjs so each is independently
 * importable and independently testable (see scripts/fetchers/*.spec.mjs).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAwsCatalog } from './fetchers/aws.mjs';
import { fetchAzureCatalog } from './fetchers/azure.mjs';
import { fetchGcpCatalog } from './fetchers/gcp.mjs';
import { fetchOracleCatalog } from './fetchers/oracle.mjs';
import { fetchLinodeCatalog } from './fetchers/linode.mjs';
import { fetchDigitalOceanCatalog } from './fetchers/digitalocean.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', 'src', 'app', 'core', 'engine', 'catalog', 'live-pricing-cache.json');

// AWS/Azure/GCP/Oracle/Linode/DigitalOcean have live fetchers below. IBM,
// Alibaba, and OVHcloud ship seed-only — IBM and Alibaba need signed requests,
// and OVHcloud's public catalog has no USD subsidiary (only EUR/CAD/GBP) — see
// provider-verification.ts for the per-provider reasoning.
const PROVIDERS = ['AWS', 'AZURE', 'GCP', 'ORACLE', 'IBM', 'DIGITALOCEAN', 'ALIBABA', 'LINODE', 'OVHCLOUD'];

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return { meta: { mode: 'seed', lastSyncedAt: null, syncedBy: 'scripts/sync-prices.mjs', sources: {} }, catalogs: {} };
  }
}

async function runSync() {
  console.log('🚀 Starting cloud pricing sync (AWS, Azure, GCP, Oracle, Linode, DigitalOcean live; 3 more seed-only)...');

  const cacheDoc = readCache();
  const syncedAt = new Date().toISOString();
  const sources = {};
  const catalogs = {};
  let anyRefreshed = false;

  const fetchers = {
    AWS: fetchAwsCatalog,
    AZURE: fetchAzureCatalog,
    GCP: fetchGcpCatalog,
    ORACLE: fetchOracleCatalog,
    LINODE: fetchLinodeCatalog,
    DIGITALOCEAN: fetchDigitalOceanCatalog
  };

  for (const provider of PROVIDERS) {
    const fetcher = fetchers[provider];
    if (!fetcher) {
      // No public feed wired up for this provider yet — stay on whatever the
      // cache already has (seed baseline on a fresh checkout) rather than
      // treating "no fetcher" as a failure worth warning about every run.
      catalogs[provider] = cacheDoc.catalogs?.[provider] ?? null;
      sources[provider] = cacheDoc.meta?.sources?.[provider] || 'seed';
      console.log(`  ⏭️  ${provider}: seed-only (no public feed configured).`);
      continue;
    }
    try {
      console.log(`  ⏳ Fetching ${provider} public pricing feed...`);
      const fresh = await fetcher();
      const hasContent =
        (fresh.compute?.length ?? 0) > 0 ||
        (fresh.storage && Object.keys(fresh.storage).length > 0) ||
        (fresh.database?.length ?? 0) > 0;
      if (!hasContent) throw new Error(`${provider} feed returned no usable rows`);
      catalogs[provider] = fresh;
      sources[provider] = `live@${syncedAt}`;
      anyRefreshed = true;
      console.log(
        `  ✅ ${provider}: ${fresh.compute?.length ?? 0} compute, ` +
          `${fresh.storage ? Object.keys(fresh.storage).length : 0} storage tiers synced`
      );
    } catch (err) {
      console.warn(`  ⚠️  ${provider} sync failed (${err?.message || err}). Falling back to cache/seed.`);
      catalogs[provider] = cacheDoc.catalogs?.[provider] || null;
      sources[provider] = cacheDoc.meta?.sources?.[provider] || 'seed';
    }
  }

  const next = {
    meta: {
      mode: anyRefreshed ? 'live' : cacheDoc.meta?.mode || 'seed',
      lastSyncedAt: anyRefreshed ? syncedAt : cacheDoc.meta?.lastSyncedAt || null,
      syncedBy: 'scripts/sync-prices.mjs',
      sources
    },
    catalogs
  };

  fs.writeFileSync(CACHE_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(`💾 Wrote live-pricing-cache.json (mode=${next.meta.mode}, syncedAt=${next.meta.lastSyncedAt || 'n/a'})`);

  console.log('✅ Sync finished successfully.');
}

runSync().catch((err) => {
  console.error('❌ Fatal sync error:', err);
  process.exit(1);
});

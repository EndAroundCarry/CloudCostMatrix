import { CloudProvider } from '../../models/cloud-provider.enum';
import { BENCHMARK_CATALOGS, ProviderPricingCatalog } from './seeded-pricing-catalog';
import * as liveCacheJson from './live-pricing-cache.json';

/**
 * Shape of the committed JSON artifact written by `scripts/sync-prices.mjs`.
 * When the script runs with network access it rewrites `live-pricing-cache.json`
 * in place with `mode: 'live'` + refreshed sections, which is then committed to
 * the repo and bundled at build time — zero runtime API costs.
 *
 * The writer normalizes against the exact ProviderPricingCatalog contract and
 * validates all sections before writing, so a partial/aborted sync can never
 * produce a broken bundle. The seed baseline below is always the fallback.
 */
export interface LivePricingCacheFile {
  meta: {
    mode: 'seed' | 'live';
    lastSyncedAt: string | null;
    syncedBy: string;
    sources: Record<string, string>;
  };
  catalogs: Partial<Record<CloudProvider, ProviderPricingCatalog>>;
}

export const LIVE_PRICING_CACHE = liveCacheJson as unknown as LivePricingCacheFile;
export const PRICING_MODE: 'live' | 'seed' = LIVE_PRICING_CACHE.meta?.mode === 'live' ? 'live' : 'seed';
export const PRICING_LAST_SYNCED_AT: string | null = LIVE_PRICING_CACHE.meta?.lastSyncedAt ?? null;

/**
 * Effective benchmark catalog used by the cost engine.
 *
 * The committed live JSON only carries refreshed sections from the last sync.
 * To stay bulletproof at runtime we merge each section OVER the seed baseline:
 * any section the script didn't refresh (or that failed validation) transparently
 * falls back to the accurate seeded 2026 catalog — never an empty list.
 */
function mergeOverSeed(seed: ProviderPricingCatalog, live?: ProviderPricingCatalog | null): ProviderPricingCatalog {
  if (!live) return seed;
  return {
    provider: live.provider ?? seed.provider,
    region: live.region || seed.region,
    compute: live.compute?.length ? live.compute : seed.compute,
    storage: { ...seed.storage, ...(live.storage ?? {}) },
    database: live.database?.length ? live.database : seed.database,
    networking: { ...seed.networking, ...(live.networking ?? {}) },
    kubernetes: { ...seed.kubernetes, ...(live.kubernetes ?? {}) }
  };
}

export const EFFECTIVE_CATALOGS: Record<CloudProvider, ProviderPricingCatalog> = {
  [CloudProvider.AWS]: mergeOverSeed(BENCHMARK_CATALOGS[CloudProvider.AWS], LIVE_PRICING_CACHE.catalogs?.[CloudProvider.AWS]),
  [CloudProvider.AZURE]: mergeOverSeed(BENCHMARK_CATALOGS[CloudProvider.AZURE], LIVE_PRICING_CACHE.catalogs?.[CloudProvider.AZURE]),
  [CloudProvider.GCP]: mergeOverSeed(BENCHMARK_CATALOGS[CloudProvider.GCP], LIVE_PRICING_CACHE.catalogs?.[CloudProvider.GCP])
};

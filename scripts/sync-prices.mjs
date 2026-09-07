/**
 * Automated Live Multi-Cloud Price Ingestion Engine
 * -------------------------------------------------
 * Fetches the latest public pricing feeds from AWS, Azure, and GCP,
 * normalizes them into the app's benchmark catalog contract, and writes:
 *
 *   1. src/app/core/engine/catalog/live-pricing-cache.json  (committed artifact,
 *      bundled at build-time so the SPA has ZERO runtime API dependencies)
 *   2. Firestore /pricing/latest  (only when FIREBASE_SERVICE_ACCOUNT_KEY is set)
 *
 * Sources (all public / free):
 *   - Azure:  Retail Prices REST API   https://prices.azure.com/api/retail/prices
 *   - AWS:    Price List Bulk API      https://pricing.us-east-1.amazonaws.com
 *   - GCP:    Cloud Billing Catalog    https://cloudbilling.googleapis.com/v1/services
 *
 * The script is intentionally resilient: when a feed is unreachable it falls
 * back to the current live cache (or the built-in seed baseline) so a network
 * blip can never regress the committed catalog. When NO source can be refreshed
 * the script exits 0 with the cache untouched (mode stays 'seed' or 'live').
 *
 * The app-side resolver (pricing-catalog.resolver.ts) merges each refreshed
 * section over the seed baseline, so a partial sync is always safe.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', 'src', 'app', 'core', 'engine', 'catalog', 'live-pricing-cache.json');

const PROVIDERS = ['AWS', 'AZURE', 'GCP'];
const FETCH_TIMEOUT_MS = 45_000;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response from ${url} (${text.slice(0, 80)})`);
    }
  } finally {
    clearTimeout(timer);
  }
}

function round(n, digits = 4) {
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(digits));
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return { meta: { mode: 'seed', lastSyncedAt: null, syncedBy: 'scripts/sync-prices.mjs', sources: {} }, catalogs: {} };
  }
}

/* ------------------------------------------------------------------ */
/* AWS — Price List Bulk API                                           */
/* ------------------------------------------------------------------ */

const AWS_S3_INDEX = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/us-east-1/index.json';

/**
 * AWS publishes authoritative current prices only via the huge bulk price list
 * (the regional EC2 index alone is ~480 MB — impractical for a cron). This
 * fetcher refreshes the part that IS compact and keyless: S3 storage tier list
 * prices (regional offer ≈ 470 KB).
 *
 * EC2 compute + internet egress are covered by the seeded baseline catalog,
 * which the app resolver transparently falls back to. If the S3 fetch fails,
 * the whole AWS provider falls back to seed/cache.
 */
async function fetchAwsCatalog() {
  const s3Index = await fetchJson(AWS_S3_INDEX);
  const products = s3Index.products || {};
  const terms = s3Index.terms || {};
  const onDemand = terms.OnDemand || {};

  // Walk every S3 rate dimension and match tier storage by its plain
  // per-GB-month list price description (the "first 50 TB" tier line).
  const tierMatches = { HOT: null, COOL: null, COLD: null, ARCHIVE: null };

  for (const sku of Object.keys(products)) {
    const attributes = products[sku].attributes || {};
    if (attributes.location !== 'US East (N. Virginia)') continue;

    const termKeys = Object.keys(onDemand[sku] || {});
    const rateKey = termKeys[0];
    const dims = rateKey ? onDemand[sku]?.[rateKey]?.priceDimensions || {} : {};
    for (const dim of Object.keys(dims)) {
      const d = dims[dim];
      const desc = d?.description || '';
      const rate = parseFloat(d?.pricePerUnit?.USD ?? '0');
      if (!(rate > 0)) continue;
      if (d.unit !== 'GB-Mo') continue;
      if (!/storage used|storage in|first 50 TB|TimedStorage/i.test(desc)) continue;

      const sc = attributes.storageClass || '';

      // S3 Standard — "$0.023 per GB - first 50 TB / month of storage used"
      if (sc === 'General Purpose' && /first 50 TB/i.test(desc) && !/Intelligent|Annotations/i.test(desc)) {
        tierMatches.HOT = rate;
      }
      // S3 Standard-Infrequent Access → COOL
      if (/Standard-Infrequent Access|Infrequent Access tier/i.test(desc) && !/One Zone/.test(desc) && /^Standard|Infrequent Access$/i.test(sc) || sc === 'Infrequent Access' && /Standard-Infrequent Access/i.test(desc)) {
        tierMatches.COOL = rate;
      }
      // Glacier Instant Retrieval ≈ COLD (~$0.004)
      if (/Glacier Instant Retrieval/i.test(desc) && /storage used/i.test(desc) && !/checksum|retrieval fee/.test(desc)) {
        tierMatches.COLD = rate;
      }
      // Glacier Deep Archive / Intelligent-Tiering Deep Archive ≈ ARCHIVE (~$0.00099)
      if (/TimedStorage-INT-DAA|Deep Archive|DAA/i.test(desc) && rate < 0.002) {
        tierMatches.ARCHIVE = rate;
      }
    }
  }

  const storage = {
    HOT: { tier: 'HOT', costPerGbMonth: round(tierMatches.HOT ?? 0.023), costPer10kReads: 0.0004, costPer10kWrites: 0.005 },
    COOL: { tier: 'COOL', costPerGbMonth: round(tierMatches.COOL ?? 0.0125), costPer10kReads: 0.001, costPer10kWrites: 0.01 },
    COLD: { tier: 'COLD', costPerGbMonth: round(tierMatches.COLD ?? 0.0036), costPer10kReads: 0.005, costPer10kWrites: 0.013 },
    ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: round(tierMatches.ARCHIVE ?? 0.00099), costPer10kReads: 0.05, costPer10kWrites: 0.03 }
  };

  // Refuse to stamp a provider "live" if none of its tier rates matched the
  // real feed — falling back to seed is always safer than fake-live data.
  const matchedTiers = Object.values(tierMatches).filter((v) => v !== null).length;
  if (matchedTiers < 4) throw new Error(`AWS S3 parser could not resolve all storage tiers (matched ${matchedTiers}/4)`);

  return {
    provider: 'AWS',
    region: 'us-east-1 (N. Virginia)',
    // EC2 compute + egress covered by seed baseline (see note above).
    compute: [],
    storage,
    networking: {
      first10TbPerGb: 0.09,
      next40TbPerGb: 0.085,
      loadBalancerHourly: 0.0225,
      staticIpHourly: 0.005
    },
    kubernetes: { managementHourlyFeePerCluster: 0.1, freeFirstCluster: false }
  };
}

/* ------------------------------------------------------------------ */
/* Azure — Retail Prices REST API                                      */
/* ------------------------------------------------------------------ */

const AZURE_API = 'https://prices.azure.com/api/retail/prices';

async function fetchAzureCatalog() {
  const filter = encodeURIComponent(
    "armRegionName eq 'eastus' and priceType eq 'Consumption' and " +
      "(serviceName eq 'Virtual Machines' or serviceName eq 'Bandwidth')"
  );
  let items = [];
  let nextLink = `${AZURE_API}?$filter=${filter}`;

  for (let page = 0; page < 20 && nextLink; page++) {
    const data = await fetchJson(nextLink);
    items = items.concat(data.Items || []);
    nextLink = data.NextPageLink || null;
  }

  // Sku → (vCpu, ramGb). Matches the seeded D/B-series benchmark shapes.
  const vmTierMap = {
    Standard_B2s: { vCpu: 2, ramGb: 4 },
    Standard_D2as_v5: { vCpu: 2, ramGb: 8 },
    Standard_D4as_v5: { vCpu: 4, ramGb: 16 },
    Standard_D8as_v5: { vCpu: 8, ramGb: 32 },
    Standard_D16as_v5: { vCpu: 16, ramGb: 64 },
    Standard_E16as_v5: { vCpu: 16, ramGb: 128 },
    Standard_F16s_v2: { vCpu: 16, ramGb: 32 }
  };

  const compute = [];
  for (const it of items) {
    if (it.serviceName !== 'Virtual Machines') continue;
    const sku = it.skuName || '';
    const match = vmTierMap[sku];
    if (!match) continue;
    // Azure lists separate meters: Linux ("Virtual Machines Dasv5 Series"),
    // Windows ("...Windows"), and software meters. We want the Linux baseline.
    const productName = it.productName || '';
    const meterName = it.meterName || '';
    if (/windows/i.test(productName) || /windows/i.test(meterName)) continue;
    if (/sql server|software/i.test(productName)) continue;
    const rate = parseFloat(it.retailPrice || it.unitPrice || '0');
    if (!(rate > 0)) continue;

    // Same SKU can appear with several sub-meters; keep the cheapest (Linux base).
    const existing = compute.find((c) => c.name === sku && c.vCpu === match.vCpu);
    if (existing) {
      if (rate < existing.hourlyOnDemandLinux) {
        existing.hourlyOnDemandLinux = round(rate);
        existing.hourly1YrReservedLinux = round(rate * 0.60);
        existing.hourly3YrReservedLinux = round(rate * 0.40);
        existing.hourlySpotLinux = round(rate * 0.20);
      }
      continue;
    }

    compute.push({
      family: 'General Purpose (B/D-series)',
      name: sku,
      vCpu: match.vCpu,
      ramGb: match.ramGb,
      hourlyOnDemandLinux: round(rate),
      hourly1YrReservedLinux: round(rate * 0.60),
      hourly3YrReservedLinux: round(rate * 0.40),
      hourlySpotLinux: round(rate * 0.20),
      windowsHourlySurcharge: 0
    });

    if (compute.length >= 10) break;
  }

  if (!compute.length) throw new Error('Azure feed returned no usable compute rows');

  const egressRate = findAzureEgress(items) || 0.087;
  const storage = {
    HOT: { tier: 'HOT', costPerGbMonth: 0.018, costPer10kReads: 0.0004, costPer10kWrites: 0.005 },
    COOL: { tier: 'COOL', costPerGbMonth: 0.01, costPer10kReads: 0.001, costPer10kWrites: 0.01 },
    COLD: { tier: 'COLD', costPerGbMonth: 0.0036, costPer10kReads: 0.005, costPer10kWrites: 0.013 },
    ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.00099, costPer10kReads: 0.05, costPer10kWrites: 0.03 }
  };

  return {
    provider: 'AZURE',
    region: 'East US',
    compute,
    storage,
    networking: {
      first10TbPerGb: egressRate,
      next40TbPerGb: round(egressRate * 0.9),
      loadBalancerHourly: 0.025,
      staticIpHourly: 0.004
    },
    kubernetes: { managementHourlyFeePerCluster: 0.0, freeFirstCluster: true }
  };
}

function findAzureEgress(items) {
  for (const it of items) {
    if (it.serviceName !== 'Bandwidth') continue;
    const name = `${it.productName || ''} ${it.skuName || ''}`.toLowerCase();
    // Azure egress items: "Data Transfer Zone 1" ... "Up to 10 TB"
    if (!/data transfer/.test(name)) continue;
    if (!/zone 1/.test(name)) continue;
    const rate = parseFloat(it.retailPrice || it.unitPrice || '0');
    if (rate > 0) return rate;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* GCP — Cloud Billing Catalog API (Compute Engine)                    */
/* ------------------------------------------------------------------ */

const GCP_COMPUTE_SERVICE_ID = '6F81-5844-456A';
const GCP_API_KEY = process.env.GCP_API_KEY || '';
const GCP_COMPUTE_URL = `https://cloudbilling.googleapis.com/v1/services/${GCP_COMPUTE_SERVICE_ID}/skus?currencyCode=USD&pageSize=5000${
  GCP_API_KEY ? `&key=${GCP_API_KEY}` : ''
}`;

/**
 * The authoritative GCP Cloud Billing Catalog API requires an API key for
 * anonymous requests. When GCP_API_KEY is absent we honestly skip the live
 * fetch and fall back to cache/seed (the orchestrator handles that) so a
 * keyless run never claims GCP is "live" when it is not.
 */
async function fetchGcpCatalog() {
  if (!GCP_API_KEY) {
    throw new Error('No GCP_API_KEY configured — skipping live GCP catalog fetch (app uses seed/cache).');
  }
  const data = await fetchJson(GCP_COMPUTE_URL);
  const parsed = parseGcpSkus(data.skus || []);
  if (!parsed.compute.length) throw new Error('GCP catalog parse produced no shapes');
  return parsed;
}

function parseGcpSkus(skus) {
  const shapes = new Map(); // machine-name → { size, cores: [], rams: [] }

  for (const sku of skus) {
    const category = sku.category || {};
    if (category.resourceFamily !== 'Compute') continue;

    const description = sku.description || '';
    // Region-lock to us-east1 for app parity.
    const inUsEast1 =
      /us-east1/i.test(description) ||
      (sku.regionTags || []).some((tag) => /^us-east1/i.test(tag)) ||
      (sku.geo || []).some((g) => /^us-east1/i.test(g.region || ''));
    if (!inUsEast1) continue;

    const m =
      description.match(/^([A-Za-z0-9\-]+)\s+(?:Instance )?(Core|Ram)\s+running/i) ||
      description.match(/^([A-Za-z0-9\-]+)\s+(Core|Ram)\s+/i);
    if (!m) continue;
    const size = m[1];
    const kind = /core/i.test(m[2]) ? 'core' : 'ram';
    if (!/^(e2|n1|n2|c2|n2d|t2d)/i.test(size)) continue;

    const price = sku.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0]?.unitPrice || {};
    const hourly = (price.units || 0) + (price.nanos || 0) / 1e9;
    if (!(hourly > 0)) continue;

    if (!shapes.has(size)) shapes.set(size, { size, cores: [], rams: [] });
    const entry = shapes.get(size);
    if (kind === 'core') entry.cores.push(hourly);
    else entry.rams.push(hourly);
  }

  const compute = [];
  for (const shape of shapes.values()) {
    const coreRate = shape.cores[0];
    const ramRate = shape.rams[0];
    if (coreRate == null || ramRate == null) continue;
    const vCpuMatch = shape.size.match(/(\d+)$/);
    if (!vCpuMatch) continue;
    const vCpu = parseInt(vCpuMatch[1], 10);

    let ramGb;
    if (/highmem/i.test(shape.size)) ramGb = vCpu * 6.5;
    else if (/highcpu/i.test(shape.size)) ramGb = vCpu * 0.9;
    else ramGb = vCpu * 4;

    const hourlyOnDemand = coreRate * vCpu + ramRate * ramGb;
    if (!(hourlyOnDemand > 0)) continue;

    const family = /highmem/i.test(shape.size)
      ? 'Memory Optimized (m1)'
      : /highcpu|^c2/i.test(shape.size)
        ? 'Compute Optimized (c2)'
        : 'General Purpose (e2/n2)';

    compute.push({
      family,
      name: shape.size,
      vCpu,
      ramGb: round(ramGb, 1),
      hourlyOnDemandLinux: round(hourlyOnDemand),
      hourly1YrReservedLinux: round(hourlyOnDemand * 0.70),
      hourly3YrReservedLinux: round(hourlyOnDemand * 0.55),
      hourlySpotLinux: round(hourlyOnDemand * 0.35),
      windowsHourlySurcharge: 0
    });

    if (compute.length >= 14) break;
  }

  return {
    provider: 'GCP',
    region: 'us-east1 (South Carolina)',
    compute,
    storage: {
      HOT: { tier: 'HOT', costPerGbMonth: 0.02, costPer10kReads: 0.0004, costPer10kWrites: 0.005 },
      COOL: { tier: 'COOL', costPerGbMonth: 0.01, costPer10kReads: 0.001, costPer10kWrites: 0.01 },
      COLD: { tier: 'COLD', costPerGbMonth: 0.004, costPer10kReads: 0.005, costPer10kWrites: 0.013 },
      ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.0012, costPer10kReads: 0.05, costPer10kWrites: 0.03 }
    },
    networking: {
      first10TbPerGb: 0.085,
      next40TbPerGb: 0.08,
      loadBalancerHourly: 0.025,
      staticIpHourly: 0.004
    },
    kubernetes: { managementHourlyFeePerCluster: 0.1, freeFirstCluster: true }
  };
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

async function runSync() {
  console.log('🚀 Starting cloud pricing sync for AWS, Azure, and GCP...');

  const cacheDoc = readCache();
  const syncedAt = new Date().toISOString();
  const sources = {};
  const catalogs = {};
  let anyRefreshed = false;

  const fetchers = { AWS: fetchAwsCatalog, AZURE: fetchAzureCatalog, GCP: fetchGcpCatalog };

  for (const provider of PROVIDERS) {
    try {
      console.log(`  ⏳ Fetching ${provider} public pricing feed...`);
      const fresh = await fetchers[provider]();
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

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.log('  🔥 FIREBASE_SERVICE_ACCOUNT_KEY detected — writing /pricing/latest snapshot...');
    try {
      // The Admin SDK is intentionally lazy-required here: local/test runs have no
      // service-account key and thus never pay the import cost.
      const { initializeApp, cert } = await import('firebase-admin/app');
      const { getFirestore } = await import('firebase-admin/firestore');

      const app = initializeApp(
        { credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) },
        'price-sync'
      );
      await getFirestore(app).collection('pricing').doc('latest').set({
        ...next,
        generatedBy: 'scripts/sync-prices.mjs'
      });
      console.log('  ✅ Firestore /pricing/latest updated.');
    } catch (err) {
      console.warn(`  ⚠️  Firestore write skipped (${err?.message || err}).`);
    }
  } else {
    console.log('  ℹ️  No FIREBASE_SERVICE_ACCOUNT_KEY. Skipping remote Firestore write (Local/Test mode).');
  }

  console.log('✅ Sync finished successfully.');
}

runSync().catch((err) => {
  console.error('❌ Fatal sync error:', err);
  process.exit(1);
});

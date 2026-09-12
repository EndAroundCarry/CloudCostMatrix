import { fetchAllPages, round, roundStorageRate, unitPriceToNumber } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* GCP — Cloud Billing Catalog API                                     */
/* ------------------------------------------------------------------ */

// Service IDs resolved from GET https://cloudbilling.googleapis.com/v1/services
// and matched on displayName — verified, never guessed.
const GCP_COMPUTE_SERVICE_ID = '6F81-5844-456A'; // "Compute Engine"
const GCP_STORAGE_SERVICE_ID = '95FF-2EF5-5EA1'; // "Cloud Storage"

const PAGE_SIZE = 5000;
const MAX_PAGES = 25;

/**
 * GCP bills Compute per vCPU-hour and per GB-hour *per family*; predefined
 * machine types are a published static catalog layered on top of those rates.
 * GCP's own JSON never states "e2-standard-2 = 2 vCPU / 8 GB", so the shape
 * table has to live here. These six shapes mirror the seed catalog
 * (seeded-pricing-catalog.ts) exactly so a live sync refreshes the *rates*
 * without changing which shapes the app compares.
 */
const SHAPES = [
  { family: 'E2', name: 'e2-standard-2', vCpu: 2, ramGb: 8, category: 'General Purpose (e2/n2)' },
  { family: 'E2', name: 'e2-standard-4', vCpu: 4, ramGb: 16, category: 'General Purpose (e2/n2)' },
  { family: 'N2', name: 'n2-standard-8', vCpu: 8, ramGb: 32, category: 'General Purpose (n2)' },
  { family: 'C2', name: 'c2-standard-16', vCpu: 16, ramGb: 64, category: 'Compute Optimized (c2)' },
  { family: 'N2', name: 'n2-highmem-16', vCpu: 16, ramGb: 128, category: 'Memory Optimized (m1)' },
  { family: 'N2', name: 'n2-standard-32', vCpu: 32, ramGb: 128, category: 'High Capacity' }
];

/**
 * SKU description prefix → shape-table family. The compute-optimized line is
 * published only under the generic "Compute optimized" prefix (no "C2"), which
 * is why the old `^(e2|n1|n2|c2|...)$` size allowlist matched nothing.
 */
const FAMILY_ALIASES = {
  E2: /^E2$/i,
  N2: /^N2$/i,
  C2: /^Compute optimized$/i
};

// Exclude spot/preemptible/committed/sole-tenancy/custom rows: they are real
// prices, but not the on-demand list rate this catalog models.
const EXCLUDE_RE = /spot|preemptible|commitment|sole tenancy|premium|gpu|license|custom|dws/i;

// `^(prefix) [instance ](core|ram) running` — handles both "E2 Instance Core
// running" and "Compute optimized Core running".
const SKU_KIND_RE = /^(.*?)\s+(?:instance\s+)?(core|ram)\s+running/i;

const REGION_RE = /^us-east1/i;

/**
 * Capacity SKUs for the us-east1 ("South Carolina") region, in priority order.
 * GCP publishes no plain "Standard Storage South Carolina" SKU — regional
 * Standard capacity is only listed as the Autoclass variant, at the same
 * published rate — so HOT falls back to it.
 */
const STORAGE_TIER_SKUS = [
  { tier: 'HOT', descriptions: ['Standard Storage South Carolina', 'Autoclass Standard Storage South Carolina'] },
  { tier: 'COOL', descriptions: ['Nearline Storage South Carolina'] },
  { tier: 'COLD', descriptions: ['Coldline Storage South Carolina'] },
  { tier: 'ARCHIVE', descriptions: ['Archive Storage South Carolina'] }
];

/**
 * Internet egress for the Americas group (us-central1/east1/west1 all share
 * this SKU). GCP publishes three billable tiers — $0.12 to 1 TB, $0.11 to
 * 10 TB, $0.08 above — which this catalog's two-rung ladder flattens to the
 * first billable rate and the top rate.
 */
const EGRESS_SKU_DESCRIPTION = 'Network Internet Data Transfer Out from Americas to Americas';

/**
 * Operation rates are NOT fetched. Cloud Storage SKUs omit `unit` entirely
 * (the API returns no billing unit for this service), and the published
 * operation rates don't reconcile against a per-1,000 or per-10,000 reading —
 * so there is no honest way to convert them. These stay on the seed benchmark
 * and are called out in PROVIDER_VERIFICATION.GCP.
 */
const SEEDED_STORAGE_OPS = {
  HOT: { costPer10kReads: 0.0004, costPer10kWrites: 0.005 },
  COOL: { costPer10kReads: 0.001, costPer10kWrites: 0.01 },
  COLD: { costPer10kReads: 0.005, costPer10kWrites: 0.013 },
  ARCHIVE: { costPer10kReads: 0.05, costPer10kWrites: 0.03 }
};

/** Pricing for a "running in Americas" SKU is shared by us-central1/east1/west1. */
function inUsEast1(sku) {
  return (
    (sku.serviceRegions || []).some((r) => REGION_RE.test(r)) ||
    (sku.geoTaxonomy?.regions || []).some((r) => REGION_RE.test(r)) ||
    REGION_RE.test(sku.description || '')
  );
}

function resolveFamily(prefix) {
  for (const [family, re] of Object.entries(FAMILY_ALIASES)) {
    if (re.test(prefix)) return family;
  }
  return null;
}

function serviceUrl(serviceId) {
  return `https://cloudbilling.googleapis.com/v1/services/${serviceId}/skus?currencyCode=USD&pageSize=${PAGE_SIZE}`;
}

/**
 * Walks every page of a service's catalog (shared token-following helper). The
 * key travels as a HEADER rather than a `?key=` query param so it can never be
 * echoed into an error message (the shared fetch helpers include the URL in
 * their errors) or a CI log.
 */
async function fetchAllSkus(serviceId, apiKey) {
  const url = serviceUrl(serviceId);
  return fetchAllPages({
    firstUrl: url,
    nextUrl: (token) => `${url}&pageToken=${encodeURIComponent(token)}`,
    extract: (data) => data.skus ?? [],
    getToken: (data) => data.nextPageToken || '',
    headers: { 'X-goog-api-key': apiKey },
    maxPages: MAX_PAGES,
    id: `GCP catalog ${serviceId}`
  });
}

/**
 * The authoritative GCP Cloud Billing Catalog API requires an API key for
 * anonymous requests. When GCP_API_KEY is absent we honestly skip the live
 * fetch and fall back to cache/seed (the orchestrator handles that) so a
 * keyless run never claims GCP is "live" when it is not.
 */
export async function fetchGcpCatalog() {
  if (!process.env.GCP_API_KEY) {
    throw new Error('No GCP_API_KEY configured — skipping live GCP catalog fetch (app uses seed/cache).');
  }

  const apiKey = process.env.GCP_API_KEY;
  const computeSkus = await fetchAllSkus(GCP_COMPUTE_SERVICE_ID, apiKey);
  const compute = parseGcpSkus(computeSkus);

  // Validation gate: every shape must price from a live family rate, otherwise
  // throw and let the orchestrator keep the last-good catalog. A partial list
  // would REPLACE the seed's complete envelope (mergeOverSeed) and degrade the
  // app, so partial success is a failure here.
  if (compute.length !== SHAPES.length) {
    throw new Error(
      `GCP catalog incomplete: priced ${compute.length}/${SHAPES.length} shapes from ${computeSkus.length} SKUs`
    );
  }

  const storageSkus = await fetchAllSkus(GCP_STORAGE_SERVICE_ID, apiKey);
  const storageRates = parseGcpStorage(storageSkus);
  const missingTiers = STORAGE_TIER_SKUS.map((d) => d.tier).filter((t) => !(storageRates[t] > 0));
  if (missingTiers.length) {
    throw new Error(`GCP storage feed incomplete — no us-east1 capacity rate for: ${missingTiers.join(', ')}`);
  }

  const egress = parseGcpEgress(computeSkus);
  if (!egress) throw new Error(`GCP egress SKU not found: ${EGRESS_SKU_DESCRIPTION}`);

  return {
    provider: 'GCP',
    region: 'us-east1 (South Carolina)',
    compute,
    storage: Object.fromEntries(
      STORAGE_TIER_SKUS.map(({ tier }) => [
        tier,
        {
          tier,
          costPerGbMonth: roundStorageRate(storageRates[tier]),
          ...SEEDED_STORAGE_OPS[tier]
        }
      ])
    ),
    networking: {
      first10TbPerGb: egress.first10TbPerGb,
      next40TbPerGb: egress.next40TbPerGb,
      // Not exposed by the catalog feeds this fetcher reads; carried from the
      // seeded benchmark.
      loadBalancerHourly: 0.025,
      staticIpHourly: 0.004
    },
    kubernetes: { managementHourlyFeePerCluster: 0.1, freeFirstCluster: true }
  };
}

/** Compute shapes only — capacity and egress are parsed by their own helpers. */
export function parseGcpSkus(skus) {
  const rates = new Map(); // family → { core, ram }

  for (const sku of skus) {
    if (sku.category?.resourceFamily !== 'Compute') continue;

    const description = sku.description || '';
    if (EXCLUDE_RE.test(description)) continue;
    if (!inUsEast1(sku)) continue;

    const match = SKU_KIND_RE.exec(description);
    if (!match) continue;

    const family = resolveFamily(match[1].trim());
    if (!family) continue;

    const kind = /^core$/i.test(match[2]) ? 'core' : 'ram';
    const rate = unitPriceToNumber(sku.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0]?.unitPrice);
    if (!(rate > 0)) continue;

    const entry = rates.get(family) ?? {};
    if (entry[kind] == null) entry[kind] = rate;
    rates.set(family, entry);
  }

  const compute = [];
  for (const shape of SHAPES) {
    const rate = rates.get(shape.family);
    if (!rate?.core || !rate?.ram) continue;

    const hourlyOnDemand = rate.core * shape.vCpu + rate.ram * shape.ramGb;
    if (!(hourlyOnDemand > 0)) continue;

    compute.push({
      family: shape.category,
      name: shape.name,
      vCpu: shape.vCpu,
      ramGb: shape.ramGb,
      hourlyOnDemandLinux: round(hourlyOnDemand),
      // GCP does not publish discounted rates in the Catalog API; these mirror
      // the committed-use multipliers the seed and every other fetcher use.
      hourly1YrReservedLinux: round(hourlyOnDemand * 0.70),
      hourly3YrReservedLinux: round(hourlyOnDemand * 0.55),
      hourlySpotLinux: round(hourlyOnDemand * 0.35),
      windowsHourlySurcharge: 0
    });
  }

  return compute;
}

/** Per-GB-month capacity rate for each tier, keyed by tier name. */
export function parseGcpStorage(skus) {
  const byDescription = new Map();
  for (const sku of skus) {
    if (!inUsEast1(sku)) continue;
    if (!byDescription.has(sku.description)) byDescription.set(sku.description, sku);
  }

  const out = {};
  for (const { tier, descriptions } of STORAGE_TIER_SKUS) {
    const sku = descriptions.map((d) => byDescription.get(d)).find(Boolean);
    if (!sku) continue;
    const firstTier = sku.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0];
    const rate = unitPriceToNumber(firstTier?.unitPrice);
    if (rate > 0) out[tier] = rate;
  }
  return out;
}

/**
 * Internet egress ladder. The SKU's tiers lead with a $0 row covering the first
 * GB, so the first *billable* rate is the one this catalog's first rung maps
 * to; the last row is the high-volume rate.
 */
export function parseGcpEgress(skus) {
  const sku = skus.find((s) => s.description === EGRESS_SKU_DESCRIPTION);
  if (!sku) return null;

  const tiers = sku.pricingInfo?.[0]?.pricingExpression?.tieredRates || [];
  const billable = tiers
    .map((t) => unitPriceToNumber(t.unitPrice))
    .filter((rate) => rate > 0);

  if (billable.length < 2) return null;

  return {
    first10TbPerGb: round(billable[0]),
    next40TbPerGb: round(billable[billable.length - 1])
  };
}

export const __internal = {
  inUsEast1,
  resolveFamily,
  SHAPES,
  MAX_PAGES,
  STORAGE_TIER_SKUS,
  EGRESS_SKU_DESCRIPTION,
  GCP_STORAGE_SERVICE_ID
};

import { fetchJson, round } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* GCP — Cloud Billing Catalog API (Compute Engine)                    */
/* ------------------------------------------------------------------ */

const GCP_COMPUTE_SERVICE_ID = '6F81-5844-456A';

// The catalog holds ~33k SKUs and pages at 5,000; reading only the first page
// (the previous behaviour) silently missed ~85% of them, including every
// predefined machine-type SKU this fetcher needs.
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

/**
 * `units` is a STRING in this API (to preserve precision), so `"0" + 0.0316`
 * previously produced the string "00.0316" instead of a number. Coerce both
 * fields explicitly.
 */
function unitHourly(unitPrice) {
  if (!unitPrice) return 0;
  const value = Number(unitPrice.units ?? 0) + Number(unitPrice.nanos ?? 0) / 1e9;
  return Number.isFinite(value) ? value : 0;
}

function computeUrl(pageToken) {
  return (
    `https://cloudbilling.googleapis.com/v1/services/${GCP_COMPUTE_SERVICE_ID}/skus` +
    `?currencyCode=USD&pageSize=${PAGE_SIZE}` +
    (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '')
  );
}

/**
 * Walks every page of the catalog. The key travels as a HEADER rather than a
 * `?key=` query param so it can never be echoed into an error message (the
 * shared fetch helpers include the URL in their errors) or a CI log.
 */
async function fetchAllSkus(apiKey) {
  const all = [];
  const seenTokens = new Set();
  let pageToken = '';

  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchJson(computeUrl(pageToken), { 'X-goog-api-key': apiKey });
    all.push(...(data.skus || []));

    pageToken = data.nextPageToken || '';
    if (!pageToken) return all;

    // Guard against a feed that loops forever on the same token.
    if (seenTokens.has(pageToken)) throw new Error('GCP catalog pagination returned a repeated pageToken');
    seenTokens.add(pageToken);
  }

  throw new Error(`GCP catalog exceeded ${MAX_PAGES} pages — refusing to sync a partial catalog`);
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

  const skus = await fetchAllSkus(process.env.GCP_API_KEY);
  const parsed = parseGcpSkus(skus);

  // Validation gate: every shape must price from a live family rate, otherwise
  // throw and let the orchestrator keep the last-good catalog. A partial list
  // would REPLACE the seed's complete envelope (mergeOverSeed) and degrade the
  // app, so partial success is a failure here.
  if (parsed.compute.length !== SHAPES.length) {
    throw new Error(
      `GCP catalog incomplete: priced ${parsed.compute.length}/${SHAPES.length} shapes from ${skus.length} SKUs`
    );
  }

  return parsed;
}

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
    const rate = unitHourly(sku.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0]?.unitPrice);
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

export const __internal = { inUsEast1, resolveFamily, unitHourly, SHAPES, MAX_PAGES };

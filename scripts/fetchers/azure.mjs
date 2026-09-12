import { fetchAllPages, fetchJson, round } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* Azure — Retail Prices REST API                                      */
/* ------------------------------------------------------------------ */

const AZURE_API = 'https://prices.azure.com/api/retail/prices';

const VM_AND_BANDWIDTH_FILTER =
  "armRegionName eq 'eastus' and priceType eq 'Consumption' and " +
  "(serviceName eq 'Virtual Machines' or serviceName eq 'Bandwidth')";

/**
 * General Block Blob v2 is the current-generation block-blob product. The SAME
 * meter names recur under 'Blob Storage', 'Files v2' and the ADLS Gen2
 * products at DIFFERENT prices (e.g. "Hot LRS Data Stored" is 0.0208 for block
 * blob but 0.0287 under Files v2), so the product has to be pinned — matching
 * on meter name alone silently picks up Azure Files.
 */
const BLOB_PRODUCT = 'General Block Blob v2';

const BLOB_LRS_FILTER =
  "armRegionName eq 'eastus' and priceType eq 'Consumption' and serviceName eq 'Storage' and " +
  `productName eq '${BLOB_PRODUCT}' and ` +
  "(skuName eq 'Hot LRS' or skuName eq 'Cool LRS' or skuName eq 'Cold LRS' or skuName eq 'Archive LRS')";

/**
 * Meter names per tier, exactly as the Retail Prices API publishes them for
 * General Block Blob v2 / * LRS SKUs. Note the inconsistency: Hot and Archive
 * reads omit "LRS" from the meter name while the writes include it.
 *
 * The API's `unitOfMeasure` for every one of these is '10K', which is already
 * the app's `costPer10kReads`/`costPer10kWrites` unit (the engine divides
 * ops-thousands by 10) — so these prices are used AS-IS, never scaled.
 */
const STORAGE_TIERS = [
  {
    tier: 'HOT',
    sku: 'Hot LRS',
    stored: 'Hot LRS Data Stored',
    reads: 'Hot Read Operations',
    writes: 'Hot LRS Write Operations'
  },
  {
    tier: 'COOL',
    sku: 'Cool LRS',
    stored: 'Cool LRS Data Stored',
    reads: 'Cool Read Operations',
    writes: 'Cool LRS Write Operations'
  },
  {
    tier: 'COLD',
    sku: 'Cold LRS',
    stored: 'Cold LRS Data Stored',
    reads: 'Cold LRS Read Operations',
    writes: 'Cold LRS Write Operations'
  },
  {
    tier: 'ARCHIVE',
    sku: 'Archive LRS',
    stored: 'Archive LRS Data Stored',
    reads: 'Archive Read Operations',
    writes: 'Archive LRS Write Operations'
  }
];

// Tiers that must resolve or the provider falls back to the seed. COLD is
// allowed to go missing (it is the newest tier) and clones COOL when it does.
const REQUIRED_TIERS = ['HOT', 'COOL', 'ARCHIVE'];

function retailUrl(filter) {
  return `${AZURE_API}?$filter=${encodeURIComponent(filter)}`;
}

export async function fetchAzureCatalog() {
  // Compute + egress keep the original bounded walk: the loop below stops as
  // soon as the seven mapped VM shapes are found, so exhausting every page of
  // this deliberately broad query would be wasted work.
  const filter = encodeURIComponent(VM_AND_BANDWIDTH_FILTER);
  let items = [];
  let nextLink = `${AZURE_API}?$filter=${filter}`;

  for (let page = 0; page < 20 && nextLink; page++) {
    const data = await fetchJson(nextLink);
    items = items.concat(data.Items || []);
    nextLink = data.NextPageLink || null;
  }

  const compute = buildCompute(items);
  if (!compute.length) throw new Error('Azure feed returned no usable compute rows');

  // Storage is a small, precisely-filtered query, so it walks to completion and
  // throws rather than truncating — mergeOverSeed swaps the whole object.
  const storageItems = await fetchAllPages({
    firstUrl: retailUrl(BLOB_LRS_FILTER),
    nextUrl: (token) => token, // NextPageLink is already a complete URL
    extract: (data) => data.Items ?? [],
    getToken: (data) => data.NextPageLink || '',
    maxPages: 40,
    id: 'Azure blob storage'
  });

  const storage = parseAzureStorage(storageItems);

  const egressRate = findAzureEgress(items) || 0.087;

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

export function parseAzureStorage(items) {
  // Keyed by sku + meter, first tier only. Azure publishes volume-discount
  // tiers as extra rows of the SAME meter with a non-zero `tierMinimumUnits`;
  // this catalog models one marginal rate, so only tierMin === 0 applies.
  const rateByMeter = new Map();
  for (const item of items) {
    if (item.productName !== BLOB_PRODUCT) continue;
    if (Number(item.tierMinimumUnits ?? 0) !== 0) continue;
    const rate = parseFloat(item.retailPrice ?? item.unitPrice ?? '0');
    if (!Number.isFinite(rate) || rate < 0) continue;
    const key = `${item.skuName}|${item.meterName}`;
    if (!rateByMeter.has(key)) rateByMeter.set(key, rate);
  }

  const lookup = (tierDef) => {
    const stored = rateByMeter.get(`${tierDef.sku}|${tierDef.stored}`);
    const reads = rateByMeter.get(`${tierDef.sku}|${tierDef.reads}`);
    const writes = rateByMeter.get(`${tierDef.sku}|${tierDef.writes}`);
    if (stored == null || reads == null || writes == null) return null;
    return { stored, reads, writes };
  };

  const resolved = new Map();
  for (const tierDef of STORAGE_TIERS) {
    const hit = lookup(tierDef);
    if (hit) resolved.set(tierDef.tier, hit);
  }

  const missingRequired = REQUIRED_TIERS.filter((t) => !resolved.has(t));
  if (missingRequired.length) {
    throw new Error(
      `Azure storage feed incomplete — no ${BLOB_PRODUCT} LRS rates for: ${missingRequired.join(', ')}`
    );
  }

  // Cold is the newest tier; if Azure stops publishing it, clone COOL rather
  // than dropping the key (a $0 row could make Azure look spuriously cheapest).
  if (!resolved.has('COLD')) resolved.set('COLD', resolved.get('COOL'));

  const out = {};
  for (const tierDef of STORAGE_TIERS) {
    const hit = resolved.get(tierDef.tier);
    out[tierDef.tier] = {
      tier: tierDef.tier,
      // 6 dp, not the shared helper's default 4: per-GB storage rates are
      // legitimately sub-cent (Archive is $0.00099/GB-mo), and rounding to
      // 4 dp silently turns that into $0.001 — a corrupted list price.
      costPerGbMonth: round(hit.stored, 6),
      // Already per 10,000 operations — see STORAGE_TIERS note above.
      costPer10kReads: round(hit.reads),
      costPer10kWrites: round(hit.writes)
    };
  }
  return out;
}

function buildCompute(items) {
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
  return compute;
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

export const __internal = { parseAzureStorage, BLOB_PRODUCT, STORAGE_TIERS, REQUIRED_TIERS };

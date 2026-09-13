import { FETCH_TIMEOUT_MS, USER_AGENT, fetchJson, round } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* IBM Cloud — Global Catalog API (VPC Virtual Server for VPC)         */
/* ------------------------------------------------------------------ */

/**
 * WHY THIS COMPOSES RATES INSTEAD OF READING A PROFILE PRICE.
 *
 * IBM does not publish a per-profile list price for VPC virtual servers.
 * Verified against the live catalog: the `instance.profile` entries (bx2-2x8,
 * cx2-16x32, …) carry only shape metadata and their `/pricing` returns "Pricing
 * not available for this object"; the Gen3 profile *plans* (bx3d-*, …) expose a
 * base `INSTANCE_HOURS_MULTI_TENANT` metric that is 0.
 *
 * What IBM does publish — and what it actually bills VPC servers against — are
 * two component rates under the "Standard Gen 2" (advanced-vsi) plan:
 *   VCPU_HOURS   ($ per `charge_unit_quantity` vCPU-hours, qty 63)
 *   MEMORY_HOURS ($ per `charge_unit_quantity` GB-hours,   qty 450)
 * A profile's hourly rate is vCpu × vCpuHour + ramGb × gbHour, which is exactly
 * how IBM's own catalog UI and cost estimator derive it (see the IBM
 * platform-services discussion and the Stack Overflow answer pointing at
 * `is.instance` → Standard Gen 2 → region deployment → Pricing). The rates are
 * fetched live; only the shape table is static, mirroring the GCP fetcher.
 */
const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';
const GLOBAL_CATALOG_API = 'https://globalcatalog.cloud.ibm.com/api/v1';

// The "Standard Gen 2" / advanced-vsi plan, discovered by name from the
// is.instance plan listing rather than hardcoding the UUID — see findGen2PlanId.
const GEN2_PLAN_NAME = 'gen2-instance';

// Component metrics. `charge_unit_quantity` is NOT 1: the published `price` is
// for that many units (63 vCPU-hours / 450 GB-hours), so it must be divided out
// or every rate is ~63×/450× too high.
const CPU_METRIC = 'part-is.cpu-hours'; // charge_unit_name VCPU_HOURS
const RAM_METRIC = 'part-is.ram-hours'; // charge_unit_name MEMORY_HOURS

const USA = { country: 'USA', currency: 'USD' };

// IBM's public catalog publishes no commitment rates for these profiles, so
// reserved prices are derived from the live on-demand rate. Spot mirrors 3-yr
// (IBM has no spot tier; PROVIDER_CAPABILITIES.IBM gates it off).
const RESERVED_1YR_MULTIPLIER = 0.75;
const RESERVED_3YR_MULTIPLIER = 0.6;

/**
 * The seeded envelope (2 → 32 vCPU) mapped to IBM's REAL Gen-2 profile names.
 * The seed table labelled two points with profiles that don't exist (bx2-2x4 —
 * bx2 is 1:4, and mx2-32x128 — mx2 is 1:8); the correct profiles for those same
 * vCPU/RAM points are cx2-2x4 and bx2-32x128 (IBM's published profile list).
 *
 * `seedHourly` is the seeded on-demand USD rate, used only for the sanity band.
 * `windowsHourlySurcharge` is carried from the seed: IBM prices Windows Server
 * on a separate per-vCore metric, a different unit from this per-instance field,
 * and reconciling it is a follow-up rather than part of this phase.
 */
const SHAPES = [
  { name: 'cx2-2x4', family: 'Compute (cx2)', vCpu: 2, ramGb: 4, seedHourly: 0.0353, windowsHourlySurcharge: 0.0177 },
  { name: 'bx2-2x8', family: 'Balanced (bx2)', vCpu: 2, ramGb: 8, seedHourly: 0.0504, windowsHourlySurcharge: 0.0252 },
  { name: 'bx2-4x16', family: 'Balanced (bx2)', vCpu: 4, ramGb: 16, seedHourly: 0.1411, windowsHourlySurcharge: 0.0706 },
  { name: 'bx2-8x32', family: 'Balanced (bx2)', vCpu: 8, ramGb: 32, seedHourly: 0.4032, windowsHourlySurcharge: 0.2016 },
  { name: 'cx2-16x32', family: 'Compute (cx2)', vCpu: 16, ramGb: 32, seedHourly: 0.714, windowsHourlySurcharge: 0.357 },
  { name: 'mx2-16x128', family: 'Memory (mx2)', vCpu: 16, ramGb: 128, seedHourly: 1.0584, windowsHourlySurcharge: 0.5292 },
  { name: 'bx2-32x128', family: 'Balanced (bx2)', vCpu: 32, ramGb: 128, seedHourly: 1.6128, windowsHourlySurcharge: 0.8064 }
];

/**
 * The seeded figures are an AWS-anchored estimate, so the composed rate can
 * legitimately differ by a wide margin. This band is a unit/scale tripwire — a
 * missed ÷charge_unit_quantity (63×/450×) lands far outside it.
 */
const SEED_RATIO_MIN = 0.15;
const SEED_RATIO_MAX = 8;

let cachedToken = null;

/** Exchanges the API key for an IAM bearer token, cached for the process. */
export async function getIamToken() {
  const apikey = process.env.IBM_CLOUD_API_KEY;
  if (!apikey) {
    throw new Error('No IBM_CLOUD_API_KEY configured — skipping live IBM catalog fetch (app uses seed/cache).');
  }
  if (!cachedToken) cachedToken = requestIamToken(apikey);
  return cachedToken;
}

async function requestIamToken(apikey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // The key travels in the POST BODY, never the URL, so it cannot leak into an
    // error message or a CI log.
    const res = await fetch(IAM_TOKEN_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'User-Agent': USER_AGENT },
      body: new URLSearchParams({ grant_type: 'urn:ibm:params:oauth:grant-type:apikey', apikey })
    });
    if (!res.ok) throw new Error(`IBM IAM token request failed: HTTP ${res.status} ${res.statusText}`);
    const body = await res.json();
    if (!body.access_token) {
      throw new Error(`IBM IAM token request returned no access_token (${body.errorCode || res.status})`);
    }
    return body.access_token;
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' };
}

/** Resolves the Standard Gen 2 plan id from the is.instance plan listing. */
export async function findGen2PlanId(token) {
  let url = `${GLOBAL_CATALOG_API}/is.instance/*?limit=50&_offset=0`;
  for (let page = 0; page < 12 && url; page++) {
    const data = await fetchJson(url, authHeaders(token));
    const hit = (data.resources || []).find((r) => r.name === GEN2_PLAN_NAME);
    if (hit) return hit.id;
    url = data.next;
  }
  throw new Error(`IBM catalog did not expose the "${GEN2_PLAN_NAME}" (Standard Gen 2) plan`);
}

function unitRate(metrics, metricId) {
  const metric = metrics.find((m) => m.metric_id === metricId);
  if (!metric) return null;
  const quantity = Number(metric.charge_unit_quantity) > 0 ? Number(metric.charge_unit_quantity) : 1;
  const amount = (metric.amounts || []).find((a) => a.country === USA.country && a.currency === USA.currency);
  const price = Number(amount?.prices?.[0]?.price);
  const value = price / quantity;
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Per-unit USD rates, or throws so the orchestrator keeps the seed. */
export function parseIbmComponentRates(pricing) {
  const metrics = pricing?.metrics || [];
  const vCpuHour = unitRate(metrics, CPU_METRIC);
  const gbHour = unitRate(metrics, RAM_METRIC);
  if (vCpuHour == null || gbHour == null) {
    const missing = vCpuHour == null ? CPU_METRIC : RAM_METRIC;
    throw new Error(`IBM pricing feed incomplete — no usable USD rate for ${missing}`);
  }
  return { vCpuHour, gbHour };
}

function assertSeedRatio(name, usd, seedUsd) {
  if (!(seedUsd > 0)) return;
  const ratio = usd / seedUsd;
  if (ratio < SEED_RATIO_MIN || ratio > SEED_RATIO_MAX) {
    throw new Error(
      `IBM ${name}: composed $${usd}/hr is ${ratio.toFixed(2)}× the seeded $${seedUsd}/hr — outside the ${SEED_RATIO_MIN}-${SEED_RATIO_MAX}× sanity band (unit/scale error?)`
    );
  }
}

/** Composes every envelope shape from the live component rates, or throws. */
export function buildIbmCompute(rates) {
  const compute = SHAPES.map((shape) => {
    const hourlyOnDemandLinux = round(shape.vCpu * rates.vCpuHour + shape.ramGb * rates.gbHour);
    assertSeedRatio(shape.name, hourlyOnDemandLinux, shape.seedHourly);
    return {
      family: shape.family,
      name: shape.name,
      vCpu: shape.vCpu,
      ramGb: shape.ramGb,
      hourlyOnDemandLinux,
      hourly1YrReservedLinux: round(hourlyOnDemandLinux * RESERVED_1YR_MULTIPLIER),
      hourly3YrReservedLinux: round(hourlyOnDemandLinux * RESERVED_3YR_MULTIPLIER),
      hourlySpotLinux: round(hourlyOnDemandLinux * RESERVED_3YR_MULTIPLIER),
      windowsHourlySurcharge: shape.windowsHourlySurcharge
    };
  });

  const minVcpu = Math.min(...compute.map((c) => c.vCpu));
  const maxVcpu = Math.max(...compute.map((c) => c.vCpu));
  if (minVcpu > 2 || maxVcpu < 32) {
    throw new Error(`IBM compute envelope too narrow: ${minVcpu}-${maxVcpu} vCPU (need <=2 and >=32)`);
  }
  return compute;
}

export async function fetchIbmCatalog() {
  const token = await getIamToken();
  const planId = await findGen2PlanId(token);
  const pricing = await fetchJson(`${GLOBAL_CATALOG_API}/${planId}/pricing`, authHeaders(token));
  const rates = parseIbmComponentRates(pricing);
  const compute = buildIbmCompute(rates);

  return {
    provider: 'IBM',
    region: 'us-east (Washington DC)',
    compute
    // storage / database / networking / kubernetes intentionally omitted —
    // mergeOverSeed keeps the seeded sections.
  };
}

export const __internal = {
  SHAPES,
  CPU_METRIC,
  RAM_METRIC,
  GEN2_PLAN_NAME,
  IAM_TOKEN_URL,
  GLOBAL_CATALOG_API,
  SEED_RATIO_MIN,
  SEED_RATIO_MAX,
  // Test-only: the token is memoised for the process, so a spec needs a way to
  // force a fresh IAM exchange.
  resetTokenCache: () => {
    cachedToken = null;
  }
};

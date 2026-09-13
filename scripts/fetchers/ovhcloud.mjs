import { fetchJson, round, roundStorageRate } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* OVHcloud — public cloud catalog (EUR) + ECB reference FX            */
/* ------------------------------------------------------------------ */

/**
 * WHY THIS FETCHER CONVERTS CURRENCY.
 *
 * OVHcloud's public catalog API publishes EUR/CAD/GBP only — there is no USD
 * subsidiary — so a live USD feed is impossible. Rather than layer a hardcoded
 * FX rate under a "live" badge, this fetcher pulls the ECB reference rate from
 * a free no-key feed and lets the orchestrator label the whole provider
 * `fx-converted@`, a distinct tier from `live@`. See provider-verification.ts.
 *
 * The catalog `price` field is an integer in units of 1e-8 of the catalog
 * currency (verified against the live feed: `credit` = 1000000 with
 * formattedPrice "€ 0.01"), so every price is divided by PRICE_SCALE.
 */
const OVH_CATALOG_URL = 'https://api.ovh.com/1.0/order/catalog/public/cloud?ovhSubsidiary=IE';
const FX_URL = 'https://api.frankfurter.app/latest?from=EUR&to=USD';
const PRICE_SCALE = 1e8;

/**
 * Plausibility band for the EUR→USD rate. An INVERTED quote (≈0.86 USD per EUR
 * at the time of writing) lands below the floor, so an accidental `from=USD`
 * swap is rejected instead of silently publishing numbers ~26% low.
 */
const EUR_USD_MIN = 0.9;
const EUR_USD_MAX = 2.0;

/**
 * The seeded OVHcloud figures are an AWS-anchored *estimate*, not a prior live
 * reading, so the real list price can legitimately sit several multiples away.
 * This band is deliberately wide — it is a unit/scale tripwire (100× or 10×
 * blunders), not a price-drift check.
 */
const SEED_RATIO_MIN = 0.15;
const SEED_RATIO_MAX = 8;

// OVHcloud publishes no commitment rates for these flavors via this endpoint,
// so reserved/spot are derived from the live on-demand rate, mirroring the
// multipliers the other fetchers use. Spot mirrors 3-yr (OVH has no spot tier;
// PROVIDER_CAPABILITIES.OVHCLOUD.commitments gates it off anyway).
const RESERVED_1YR_MULTIPLIER = 0.75;
const RESERVED_3YR_MULTIPLIER = 0.65;

/**
 * The seven shapes the seed catalog compares, keyed to OVHcloud's own instance
 * flavor codes. `seedHourly` is the seeded on-demand USD rate, carried here
 * only for the sanity-band gate — the live rate replaces it.
 *
 * `windowsHourlySurcharge` is NOT fetched: OVHcloud prices Windows Server as a
 * separate per-vCore licence SKU, a different unit from this per-instance
 * field, and reconciling it is a follow-up rather than part of this phase. The
 * seeded value is carried so the Linux-rate sync can't change the Windows
 * standing (see PROVIDER_VERIFICATION.OVHCLOUD).
 */
const INSTANCE_SHAPES = [
  { flavor: 'b3-8', family: 'Balanced (b3)', vCpu: 2, ramGb: 4, seedHourly: 0.0161, windowsHourlySurcharge: 0.0081 },
  { flavor: 'b3-16', family: 'Balanced (b3)', vCpu: 2, ramGb: 8, seedHourly: 0.023, windowsHourlySurcharge: 0.0115 },
  { flavor: 'b3-32', family: 'Balanced (b3)', vCpu: 4, ramGb: 16, seedHourly: 0.0645, windowsHourlySurcharge: 0.0323 },
  { flavor: 'b3-64', family: 'Balanced (b3)', vCpu: 8, ramGb: 32, seedHourly: 0.1843, windowsHourlySurcharge: 0.0922 },
  { flavor: 'c3-32', family: 'Compute Optimized (c3)', vCpu: 16, ramGb: 32, seedHourly: 0.3264, windowsHourlySurcharge: 0.1632 },
  { flavor: 'r3-128', family: 'Memory Optimized (r3)', vCpu: 16, ramGb: 128, seedHourly: 0.4838, windowsHourlySurcharge: 0.2419 },
  { flavor: 'r3-256', family: 'Memory Optimized (r3)', vCpu: 32, ramGb: 128, seedHourly: 0.7373, windowsHourlySurcharge: 0.3687 }
];

/**
 * Object-storage tiers OVHcloud actually sells. PROVIDER_CAPABILITIES marks
 * COOL and COLD as unsupported, so only Standard (→ HOT) and Archive (→
 * ARCHIVE) are fetched; the operation rates are not published in a convertible
 * billing unit and are carried from the seed (same rationale as GCP).
 */
const STORAGE_TIERS = [
  {
    tier: 'HOT',
    planCode: 'storage-standard.monthly.postpaid',
    seedPerGbMonth: 0.0122,
    costPer10kReads: 0.004,
    costPer10kWrites: 0.05
  },
  {
    tier: 'ARCHIVE',
    planCode: 'archive.monthly.postpaid',
    seedPerGbMonth: 0.0018,
    costPer10kReads: 0.5,
    costPer10kWrites: 0.3
  }
];

/** OVHcloud `price` is currency × 1e8; coerce defensively. */
export function ovhPriceToNumber(pricing) {
  const raw = Number(pricing?.price);
  return Number.isFinite(raw) ? raw / PRICE_SCALE : 0;
}

/**
 * Validates the FX payload and returns the USD-per-EUR rate. Throws on a wrong
 * base (an inverted `from=USD` request) or an implausible magnitude, so a bad
 * conversion fails the whole provider rather than publishing wrong numbers.
 */
export function fxRateFromPayload(payload) {
  if (payload?.base !== 'EUR') {
    throw new Error(`OVHcloud FX feed did not quote EUR as base (got "${payload?.base}") — refusing an inverted conversion`);
  }
  const rate = Number(payload?.rates?.USD);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('OVHcloud FX feed returned no usable EUR→USD rate');
  }
  if (rate < EUR_USD_MIN || rate > EUR_USD_MAX) {
    throw new Error(
      `OVHcloud EUR→USD rate ${rate} is outside the plausible band ${EUR_USD_MIN}-${EUR_USD_MAX} — refusing to sync (an inverted quote lands here)`
    );
  }
  return { base: 'EUR', quote: 'USD', rate, date: payload.date ?? null };
}

function findBasePrice(addons, planCode) {
  const addon = addons.find((a) => a.planCode === planCode);
  if (!addon) return null;
  const pricings = addon.pricings || [];
  const pricing = pricings.find((p) => p.mode === 'default') ?? pricings[0];
  if (!pricing) return null;
  const value = ovhPriceToNumber(pricing);
  return value > 0 ? value : null;
}

function assertSeedRatio(label, usd, seedUsd) {
  if (!(seedUsd > 0)) return;
  const ratio = usd / seedUsd;
  if (ratio < SEED_RATIO_MIN || ratio > SEED_RATIO_MAX) {
    throw new Error(
      `OVHcloud ${label}: converted $${usd} is ${ratio.toFixed(2)}× the seeded $${seedUsd} — outside the ${SEED_RATIO_MIN}-${SEED_RATIO_MAX}× sanity band (unit/scale error?)`
    );
  }
}

/** Prices all seven seed shapes, or throws so the orchestrator keeps the seed. */
export function parseOvhCompute(addons, fxRate) {
  const resolved = [];
  for (const shape of INSTANCE_SHAPES) {
    const eur = findBasePrice(addons, `${shape.flavor}.consumption`);
    if (eur != null) resolved.push({ shape, eur });
  }

  const missing = INSTANCE_SHAPES.filter((s) => !resolved.some((r) => r.shape.flavor === s.flavor));
  if (missing.length) {
    throw new Error(`OVHcloud catalog incomplete — no hourly price for: ${missing.map((s) => s.flavor).join(', ')}`);
  }

  for (const { shape, eur } of resolved) {
    assertSeedRatio(`${shape.flavor} compute`, round(eur * fxRate), shape.seedHourly);
  }

  const minVcpu = Math.min(...resolved.map((r) => r.shape.vCpu));
  const maxVcpu = Math.max(...resolved.map((r) => r.shape.vCpu));
  if (minVcpu > 2 || maxVcpu < 32) {
    throw new Error(`OVHcloud compute envelope too narrow: ${minVcpu}-${maxVcpu} vCPU (need <=2 and >=32)`);
  }

  return resolved.map(({ shape, eur }) => {
    const hourlyOnDemandLinux = round(eur * fxRate);
    return {
      family: shape.family,
      name: shape.flavor,
      vCpu: shape.vCpu,
      ramGb: shape.ramGb,
      hourlyOnDemandLinux,
      hourly1YrReservedLinux: round(hourlyOnDemandLinux * RESERVED_1YR_MULTIPLIER),
      hourly3YrReservedLinux: round(hourlyOnDemandLinux * RESERVED_3YR_MULTIPLIER),
      hourlySpotLinux: round(hourlyOnDemandLinux * RESERVED_3YR_MULTIPLIER),
      windowsHourlySurcharge: shape.windowsHourlySurcharge
    };
  });
}

/** Prices the two supported object-storage tiers, or throws. */
export function parseOvhStorage(addons, fxRate) {
  const out = {};
  for (const def of STORAGE_TIERS) {
    const eur = findBasePrice(addons, def.planCode);
    if (eur == null) {
      throw new Error(`OVHcloud storage feed incomplete — no monthly price for ${def.planCode}`);
    }
    const costPerGbMonth = roundStorageRate(eur * fxRate);
    assertSeedRatio(`storage ${def.tier}`, costPerGbMonth, def.seedPerGbMonth);
    out[def.tier] = {
      tier: def.tier,
      costPerGbMonth,
      costPer10kReads: def.costPer10kReads,
      costPer10kWrites: def.costPer10kWrites
    };
  }
  return out;
}

export async function fetchOvhcloudCatalog() {
  const [catalog, fxPayload] = await Promise.all([fetchJson(OVH_CATALOG_URL), fetchJson(FX_URL)]);
  const addons = catalog?.addons;
  if (!Array.isArray(addons) || !addons.length) {
    throw new Error('OVHcloud catalog feed returned no addons');
  }

  const fx = fxRateFromPayload(fxPayload);
  const compute = parseOvhCompute(addons, fx.rate);
  const storage = parseOvhStorage(addons, fx.rate);

  return {
    provider: 'OVHCLOUD',
    // The catalog's reference region is retained for display; rates are
    // OVHcloud's published EUR list, not a region-specific quote.
    region: 'BHS (Beauharnois, Canada)',
    compute,
    storage,
    // Consumed and stripped by scripts/sync-prices.mjs, which records the rate
    // in `meta.fx` and marks the provider `fx-converted@` rather than `live@`.
    fxConversion: { ...fx, source: FX_URL }
  };
}

export const __internal = {
  INSTANCE_SHAPES,
  STORAGE_TIERS,
  OVH_CATALOG_URL,
  FX_URL,
  PRICE_SCALE,
  EUR_USD_MIN,
  EUR_USD_MAX,
  SEED_RATIO_MIN,
  SEED_RATIO_MAX,
  findBasePrice
};

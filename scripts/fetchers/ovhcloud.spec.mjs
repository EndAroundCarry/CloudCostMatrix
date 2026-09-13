import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ------------------------------------------------------------------ */
/* Fixtures shaped like the live OVHcloud catalog.                     */
/* ------------------------------------------------------------------ */

/**
 * The catalog `price` is an integer in units of 1e-8 of the currency —
 * verified against the live feed (`credit` = 1000000 ⇒ "€ 0.01"). Every value
 * below is the real EUR rate × 1e8.
 */
const instance = (planCode, invoiceName, price) => ({
  planCode,
  invoiceName,
  product: 'publiccloud-instance',
  pricings: [{ mode: 'default', price, interval: 1, intervalUnit: 'hour', capacities: ['consumption'] }]
});

const CATALOG = {
  catalogId: 'cloud',
  addons: [
    instance('b3-8.consumption', 'b3-8', 5120000),
    instance('b3-16.consumption', 'b3-16', 10230000),
    instance('b3-32.consumption', 'b3-32', 20460000),
    instance('b3-64.consumption', 'b3-64', 40920000),
    instance('c3-32.consumption', 'c3-32', 36500000),
    instance('r3-128.consumption', 'r3-128', 53000000),
    instance('r3-256.consumption', 'r3-256', 105900000),
    // Region-suffixed variant at a DIFFERENT price — the exact-planCode match
    // must never pick this one up.
    instance('b3-8.consumption.LZ.AF', 'b3-8', 9300000),
    { planCode: 'storage-standard.monthly.postpaid', invoiceName: 'storage-standard', product: 'publiccloud-storage', pricings: [{ mode: 'default', price: 700000, interval: 1, intervalUnit: 'month' }] },
    { planCode: 'archive.monthly.postpaid', invoiceName: 'archive', product: 'publiccloud-archive', pricings: [{ mode: 'default', price: 240000, interval: 1, intervalUnit: 'month' }] }
  ]
};

const FX = { amount: 1, base: 'EUR', date: '2026-09-11', rates: { USD: 1.1592 } };

let fxPayload = FX;

vi.mock('./shared.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchJson: vi.fn(async (url) => (String(url).includes('frankfurter') ? fxPayload : CATALOG))
  };
});

const { fetchOvhcloudCatalog, fxRateFromPayload, ovhPriceToNumber, parseOvhCompute, parseOvhStorage } = await import(
  './ovhcloud.mjs'
);

beforeEach(() => {
  fxPayload = FX;
});

describe('ovh fetcher — price scale', () => {
  it('divides the catalog integer price by 1e8 (verified against the live feed)', () => {
    expect(ovhPriceToNumber({ price: 1000000 })).toBe(0.01);
    expect(ovhPriceToNumber({ price: 5120000 })).toBe(0.0512);
    expect(ovhPriceToNumber(undefined)).toBe(0);
  });
});

describe('ovh fetcher — FX guard', () => {
  it('accepts a plausible EUR→USD quote and carries the ECB date', () => {
    expect(fxRateFromPayload(FX)).toEqual({ base: 'EUR', quote: 'USD', rate: 1.1592, date: '2026-09-11' });
  });

  it('rejects a quote whose base is USD (an inverted from/to swap)', () => {
    expect(() => fxRateFromPayload({ base: 'USD', rates: { EUR: 0.8627 } })).toThrow(/inverted/);
  });

  it('rejects a numerically inverted rate below the plausibility floor', () => {
    // 1 / 1.1592 ≈ 0.8627 — a real inverted quote, which must not slip through.
    expect(() => fxRateFromPayload({ base: 'EUR', date: '2026-09-11', rates: { USD: 0.8627 } })).toThrow(/plausible band|inverted/);
  });

  it('rejects a missing rate', () => {
    expect(() => fxRateFromPayload({ base: 'EUR', rates: {} })).toThrow(/no usable/);
  });
});

describe('ovh fetcher — compute', () => {
  it('maps all seven seed shapes and converts EUR→USD', () => {
    const compute = parseOvhCompute(CATALOG.addons, 1.1592);
    expect(compute).toHaveLength(7);
    const byName = Object.fromEntries(compute.map((c) => [c.name, c]));
    expect(byName['b3-8'].hourlyOnDemandLinux).toBeCloseTo(0.0594, 4);
    expect(byName['r3-256'].hourlyOnDemandLinux).toBeCloseTo(1.2276, 4);
    // Exact planCode match — NOT the 9,300,000 LZ.AF variant.
    expect(byName['b3-8'].hourlyOnDemandLinux).toBeCloseTo(round4(5120000, 1.1592), 4);
  });

  it('keeps every row monotonic: spot ≤ 3yr ≤ 1yr ≤ on-demand', () => {
    const compute = parseOvhCompute(CATALOG.addons, 1.1592);
    for (const row of compute) {
      expect(row.hourlySpotLinux).toBeLessThanOrEqual(row.hourly3YrReservedLinux);
      expect(row.hourly3YrReservedLinux).toBeLessThanOrEqual(row.hourly1YrReservedLinux);
      expect(row.hourly1YrReservedLinux).toBeLessThanOrEqual(row.hourlyOnDemandLinux);
    }
  });

  it('throws when a required flavor has no hourly price, so the orchestrator keeps the seed', () => {
    const withoutR3 = CATALOG.addons.filter((a) => a.planCode !== 'r3-128.consumption');
    expect(() => parseOvhCompute(withoutR3, 1.1592)).toThrow(/incomplete/);
  });

  it('throws when converted rates are an order of magnitude off the seed (unit/scale tripwire)', () => {
    const scaled = CATALOG.addons.map((a) =>
      a.product === 'publiccloud-instance' ? { ...a, pricings: [{ ...a.pricings[0], price: a.pricings[0].price * 100 }] } : a
    );
    expect(() => parseOvhCompute(scaled, 1.1592)).toThrow(/sanity band/);
  });

  it('spans the 2 → 32 vCPU envelope every other provider catalog spans', () => {
    const compute = parseOvhCompute(CATALOG.addons, 1.1592);
    expect(Math.min(...compute.map((c) => c.vCpu))).toBe(2);
    expect(Math.max(...compute.map((c) => c.vCpu))).toBe(32);
  });
});

describe('ovh fetcher — storage', () => {
  it('prices the two supported tiers and carries the non-fetched operation rates', () => {
    const storage = parseOvhStorage(CATALOG.addons, 1.1592);
    expect(Object.keys(storage).sort()).toEqual(['ARCHIVE', 'HOT']);
    expect(storage.HOT.costPerGbMonth).toBe(0.008114);
    expect(storage.ARCHIVE.costPerGbMonth).toBe(0.002782);
    // Operations are not published in a convertible unit — seeded, not synced.
    expect(storage.HOT.costPer10kReads).toBe(0.004);
    expect(storage.ARCHIVE.costPer10kWrites).toBe(0.3);
  });

  it('throws when a supported tier cannot be priced', () => {
    const withoutArchive = CATALOG.addons.filter((a) => a.planCode !== 'archive.monthly.postpaid');
    expect(() => parseOvhStorage(withoutArchive, 1.1592)).toThrow(/storage feed incomplete/);
  });
});

describe('ovh fetcher — end to end', () => {
  it('returns a complete catalog plus the FX metadata the orchestrator records', async () => {
    const catalog = await fetchOvhcloudCatalog();
    expect(catalog.compute).toHaveLength(7);
    expect(catalog.storage.HOT.costPerGbMonth).toBe(0.008114);
    expect(catalog.fxConversion).toMatchObject({ base: 'EUR', quote: 'USD', rate: 1.1592, date: '2026-09-11' });
    expect(catalog.fxConversion.source).toContain('frankfurter');
  });

  it('fails the whole provider when the FX feed reports an inverted base', async () => {
    fxPayload = { base: 'USD', date: '2026-09-11', rates: { EUR: 0.8627 } };
    await expect(fetchOvhcloudCatalog()).rejects.toThrow(/inverted/);
  });
});

function round4(price, rate) {
  return Number(((price / 1e8) * rate).toFixed(4));
}

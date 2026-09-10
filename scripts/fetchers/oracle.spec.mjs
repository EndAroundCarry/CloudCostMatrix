import { describe, it, expect, vi } from 'vitest';

// A trimmed fixture shaped exactly like the live feed, including the traps
// this fetcher must defend against: every tiered SKU below leads with a
// `value: 0` free-allowance tier, which is what makes these assertions mean
// something — naively reading prices[0] would make every one of them fail.
const FIXTURE = {
  lastUpdated: new Date().toISOString(),
  items: [
    ...Array.from({ length: 300 }, (_, i) => ({ partNumber: `PADDING-${i}`, displayName: 'padding', metricName: 'padding', currencyCodeLocalizations: [] })),
    { partNumber: 'B97384', displayName: 'Compute - Standard - E5 - OCPU', metricName: 'OCPU Per Hour', currencyCodeLocalizations: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0.03 }] }] },
    { partNumber: 'B97385', displayName: 'Compute - Standard - E5 - Memory', metricName: 'Gigabytes Per Hour', currencyCodeLocalizations: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0.002 }] }] },
    { partNumber: 'B93297', displayName: 'Compute - Standard - A1 - OCPU', description: "In Oracle's ARM compute shapes, OCPUs equate to vCPUs.", metricName: 'OCPU Per Hour', currencyCodeLocalizations: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0, rangeMin: 0, rangeMax: 3000 }, { model: 'PAY_AS_YOU_GO', value: 0.01, rangeMin: 3000, rangeMax: 999999999999999 }] }] },
    { partNumber: 'B88318', displayName: 'Compute - Windows OS', metricName: 'OCPU Per Hour', currencyCodeLocalizations: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0.092 }] }] },
    { partNumber: 'B91628', displayName: 'Object Storage - Storage', metricName: 'GB/mo', currencyCodeLocalizations: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0, rangeMin: 0, rangeMax: 10 }, { model: 'PAY_AS_YOU_GO', value: 0.0255, rangeMin: 10, rangeMax: 999999999 }] }] },
    { partNumber: 'B93000', displayName: 'Infrequent Access Storage - Storage', metricName: 'GB/mo', currencyCodeLocalizations: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0, rangeMin: 0, rangeMax: 10 }, { model: 'PAY_AS_YOU_GO', value: 0.01, rangeMin: 10, rangeMax: 999999999999999 }] }] },
    { partNumber: 'B91633', displayName: 'Archive Storage - Storage', metricName: 'GB/mo', currencyCodeLocalizations: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0, rangeMin: 0, rangeMax: 10 }, { model: 'PAY_AS_YOU_GO', value: 0.0026, rangeMin: 10, rangeMax: 999999999 }] }] },
    { partNumber: 'B91627', displayName: 'Object Storage - Requests', metricName: '10k requests', currencyCodeLocalizations: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0, rangeMin: 0, rangeMax: 5 }, { model: 'PAY_AS_YOU_GO', value: 0.0034, rangeMin: 5, rangeMax: 999999999 }] }] },
    { partNumber: 'B88327', displayName: 'Outbound Data Transfer - NA/EU/UK', metricName: 'GB/mo', currencyCodeLocalizations: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0, rangeMin: 0, rangeMax: 10240 }, { model: 'PAY_AS_YOU_GO', value: 0.0085, rangeMin: 10240, rangeMax: 999999999999999 }] }] },
    { partNumber: 'B93030', displayName: 'Load Balancer Base', metricName: 'Load Balancer', currencyCodeLocalizations: [{ currencyCode: 'USD', prices: [{ model: 'PAY_AS_YOU_GO', value: 0, rangeMin: 0, rangeMax: 744 }, { model: 'PAY_AS_YOU_GO', value: 0.0113, rangeMin: 744, rangeMax: 999999999 }] }] }
  ]
};

vi.mock('./shared.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchJson: vi.fn().mockResolvedValue(FIXTURE) };
});

const { fetchOracleCatalog, __internal } = await import('./oracle.mjs');
const { ociMarginalRate, ociFreeAllowance } = __internal;

describe('oracle fetcher — free-tier trap', () => {
  it('ociMarginalRate returns the marginal rate, not the leading $0 free-tier value', () => {
    const byPart = new Map(FIXTURE.items.map((i) => [i.partNumber, i]));
    expect(ociMarginalRate(byPart, 'B91628')).toBe(0.0255); // storage — not 0
    expect(ociMarginalRate(byPart, 'B88327')).toBe(0.0085); // egress — not 0
    expect(ociMarginalRate(byPart, 'B93030')).toBe(0.0113); // load balancer — not 0
  });

  it('ociFreeAllowance derives the free tier size from rangeMax, not a hardcoded constant', () => {
    const byPart = new Map(FIXTURE.items.map((i) => [i.partNumber, i]));
    expect(ociFreeAllowance(byPart, 'B88327')).toBe(10240);
  });
});

describe('oracle fetcher — OCPU conversion trap', () => {
  it('the 8 vCPU / 32 GB E5 shape lands at the correct rate (0.184), not the OCPU=vCPU error (0.304)', async () => {
    const catalog = await fetchOracleCatalog();
    const shape = catalog.compute.find((c) => c.vCpu === 8 && c.ramGb === 32);
    expect(shape).toBeDefined();
    // (8/2)*0.03 + 32*0.002 = 0.12 + 0.064 = 0.184
    expect(shape.hourlyOnDemandLinux).toBeCloseTo(0.184, 4);
    // The wrong conversion (treating OCPU as 1:1 with vCPU) would give
    // 8*0.03 + 32*0.002 = 0.304 — assert we are nowhere near it.
    expect(shape.hourlyOnDemandLinux).not.toBeCloseTo(0.304, 2);
  });

  it('emits a 7-row envelope spanning 2 to 32 vCPU, matching every other provider catalog', async () => {
    const catalog = await fetchOracleCatalog();
    expect(catalog.compute).toHaveLength(7);
    expect(Math.min(...catalog.compute.map((c) => c.vCpu))).toBeLessThanOrEqual(2);
    expect(Math.max(...catalog.compute.map((c) => c.vCpu))).toBeGreaterThanOrEqual(32);
  });

  it('keeps every compute row monotonic: spot ≤ 3yr ≤ 1yr ≤ on-demand', async () => {
    const catalog = await fetchOracleCatalog();
    for (const row of catalog.compute) {
      expect(row.hourlySpotLinux).toBeLessThanOrEqual(row.hourly3YrReservedLinux);
      expect(row.hourly3YrReservedLinux).toBeLessThanOrEqual(row.hourly1YrReservedLinux);
      expect(row.hourly1YrReservedLinux).toBeLessThanOrEqual(row.hourlyOnDemandLinux);
    }
  });

  it('returns an empty database array rather than fabricating ECPU-based rates', async () => {
    const catalog = await fetchOracleCatalog();
    expect(catalog.database).toEqual([]);
  });

  it('storage tiers are in the correct HOT > COOL > ARCHIVE order', async () => {
    const catalog = await fetchOracleCatalog();
    expect(catalog.storage.HOT.costPerGbMonth).toBeGreaterThan(catalog.storage.COOL.costPerGbMonth);
    expect(catalog.storage.COOL.costPerGbMonth).toBeGreaterThan(catalog.storage.ARCHIVE.costPerGbMonth);
    expect(catalog.storage.COLD.costPerGbMonth).toBe(catalog.storage.COOL.costPerGbMonth); // documented clone
  });
});

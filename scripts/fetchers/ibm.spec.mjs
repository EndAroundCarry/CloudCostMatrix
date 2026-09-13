import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { fetchIbmCatalog, parseIbmComponentRates, buildIbmCompute, getIamToken, __internal } = await import('./ibm.mjs');
const { SHAPES, CPU_METRIC, RAM_METRIC, resetTokenCache } = __internal;

/* ------------------------------------------------------------------ */
/* Fixtures shaped like the live IBM Global Catalog pricing response.  */
/* ------------------------------------------------------------------ */

/**
 * `price` is for `charge_unit_quantity` units, NOT one — the trap this fetcher
 * must divide out (63 vCPU-hours, 450 GB-hours). Real USA rates, 2026-09.
 */
const metric = (metricId, unitName, quantity, usaPrice) => ({
  metric_id: metricId,
  charge_unit_name: unitName,
  charge_unit_quantity: quantity,
  amounts: [{ country: 'USA', currency: 'USD', prices: [{ quantity_tier: 1, price: usaPrice }] }]
});

const PRICING = {
  origin: 'pricing_catalog',
  metrics: [
    metric(CPU_METRIC, 'VCPU_HOURS', 63, 1.7626),
    metric(RAM_METRIC, 'MEMORY_HOURS', 450, 2.0054),
    metric('part-is.windowsOS', 'WINDOWS_VCPU_HOURS', 1, 0.05151)
  ]
};

const jsonResponse = (body) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  text: async () => JSON.stringify(body),
  json: async () => body
});

let mockFetch;

const routeFetch = (pricing = PRICING) => {
  mockFetch.mockImplementation(async (url) => {
    const u = String(url);
    if (u.includes('iam.cloud.ibm.com')) return jsonResponse({ access_token: 'test-token' });
    if (u.includes('/is.instance/')) return jsonResponse({ resources: [{ name: 'gen2-instance', id: 'plan-1' }], next: null });
    if (u.includes('/plan-1/pricing')) return jsonResponse(pricing);
    return jsonResponse({});
  });
};

beforeEach(() => {
  resetTokenCache();
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
  process.env.IBM_CLOUD_API_KEY = 'test-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ibm fetcher — component rates', () => {
  it('divides the published price by charge_unit_quantity (63 vCPU-hours / 450 GB-hours)', () => {
    const rates = parseIbmComponentRates(PRICING);
    expect(rates.vCpuHour).toBeCloseTo(1.7626 / 63, 8);
    expect(rates.gbHour).toBeCloseTo(2.0054 / 450, 8);
  });

  it('throws when a component metric is missing, so the orchestrator keeps the seed', () => {
    const withoutRam = { metrics: PRICING.metrics.filter((m) => m.metric_id !== RAM_METRIC) };
    expect(() => parseIbmComponentRates(withoutRam)).toThrow(/incomplete/);
  });

  it('treats a missing charge_unit_quantity as 1 rather than dividing by zero', () => {
    const rates = parseIbmComponentRates({
      metrics: [metric(CPU_METRIC, 'VCPU_HOURS', 0, 0.03), metric(RAM_METRIC, 'MEMORY_HOURS', 1, 0.004)]
    });
    expect(rates.vCpuHour).toBe(0.03);
  });
});

describe('ibm fetcher — composed compute', () => {
  it('composes vCpu × vCPU-hour + ramGb × GB-hour for every envelope shape', () => {
    const compute = buildIbmCompute({ vCpuHour: 1.7626 / 63, gbHour: 2.0054 / 450 });
    expect(compute).toHaveLength(7);
    const byName = Object.fromEntries(compute.map((c) => [c.name, c]));
    expect(byName['bx2-2x8'].hourlyOnDemandLinux).toBeCloseTo(0.0916, 4);
    expect(byName['bx2-32x128'].hourlyOnDemandLinux).toBeCloseTo(1.4657, 4);
  });

  it('uses real IBM profile names — never the seed\'s impossible bx2-2x4 / mx2-32x128', () => {
    const names = SHAPES.map((s) => s.name);
    expect(names).not.toContain('bx2-2x4');
    expect(names).not.toContain('mx2-32x128');
    expect(names).toContain('cx2-2x4');
    expect(names).toContain('bx2-32x128');
  });

  it('spans the 2 → 32 vCPU envelope every other provider catalog spans', () => {
    const compute = buildIbmCompute({ vCpuHour: 1.7626 / 63, gbHour: 2.0054 / 450 });
    expect(Math.min(...compute.map((c) => c.vCpu))).toBe(2);
    expect(Math.max(...compute.map((c) => c.vCpu))).toBe(32);
  });

  it('keeps every row monotonic: spot ≤ 3yr ≤ 1yr ≤ on-demand', () => {
    const compute = buildIbmCompute({ vCpuHour: 1.7626 / 63, gbHour: 2.0054 / 450 });
    for (const row of compute) {
      expect(row.hourlySpotLinux).toBeLessThanOrEqual(row.hourly3YrReservedLinux);
      expect(row.hourly3YrReservedLinux).toBeLessThanOrEqual(row.hourly1YrReservedLinux);
      expect(row.hourly1YrReservedLinux).toBeLessThanOrEqual(row.hourlyOnDemandLinux);
    }
  });

  it('throws when a missed division makes every rate ~63× too high (scale tripwire)', () => {
    // charge_unit_quantity: 1 means the raw 1.7626 / 2.0054 are treated as
    // per-unit, inflating every profile far past the seed band.
    expect(() =>
      buildIbmCompute({ vCpuHour: 1.7626, gbHour: 2.0054 })
    ).toThrow(/sanity band/);
  });
});

describe('ibm fetcher — end to end', () => {
  it('resolves the plan by name, fetches pricing, and returns the envelope', async () => {
    routeFetch();
    const catalog = await fetchIbmCatalog();
    expect(catalog.provider).toBe('IBM');
    expect(catalog.compute).toHaveLength(7);
    expect(catalog.compute.find((c) => c.name === 'bx2-2x8').hourlyOnDemandLinux).toBeCloseTo(0.0916, 4);
  });

  it('sends the API key in the IAM POST body, never in a URL', async () => {
    routeFetch();
    await fetchIbmCatalog();
    const iamCall = mockFetch.mock.calls.find((c) => String(c[0]).includes('iam.cloud.ibm.com'));
    expect(String(iamCall[0])).not.toContain('test-key');
    expect(String(iamCall[1].body)).toContain('apikey=test-key');
    // Catalog calls authenticate with the exchanged bearer token.
    const catalogCall = mockFetch.mock.calls.find((c) => String(c[0]).includes('globalcatalog'));
    expect(catalogCall[1].headers.Authorization).toBe('Bearer test-token');
  });

  it('throws without an IBM_CLOUD_API_KEY', async () => {
    delete process.env.IBM_CLOUD_API_KEY;
    await expect(getIamToken()).rejects.toThrow(/No IBM_CLOUD_API_KEY/);
  });

  it('throws when the IAM exchange fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized', text: async () => '', json: async () => ({}) });
    await expect(getIamToken()).rejects.toThrow(/IAM token request failed/);
  });
});

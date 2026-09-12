import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { fetchGcpCatalog, parseGcpSkus, __internal } = await import('./gcp.mjs');
const { resolveFamily } = __internal;

/**
 * Shaped exactly like the live Cloud Billing Catalog API, including the traps
 * this fetcher must defend against. Crucially `units`/`nanos` are STRINGS in
 * the real API (to preserve precision), and the region lives in
 * `serviceRegions`/`geoTaxonomy` — never `regionTags`/`geo`.
 */
const sku = (prefix, units, nanos, regions = ['us-central1', 'us-east1', 'us-west1']) => ({
  description: `${prefix} running in Americas`,
  category: { resourceFamily: 'Compute' },
  serviceRegions: regions,
  geoTaxonomy: { type: 'REGIONAL', regions },
  pricingInfo: [{ pricingExpression: { tieredRates: [{ unitPrice: { units, nanos } }] } }]
});

// Live per-vCPU / per-GB rates recorded from us-east1 (2026-09).
const E2_CORE = sku('E2 Instance Core', '0', 21811590);
const E2_RAM = sku('E2 Instance Ram', '0', 2923530);
const N2_CORE = sku('N2 Instance Core', '0', 31611000);
const N2_RAM = sku('N2 Instance Ram', '0', 4237000);
const C2_CORE = sku('Compute optimized Core', '0', 33982000);
const C2_RAM = sku('Compute optimized Ram', '0', 4555000);

const COMPLETE = [E2_CORE, E2_RAM, N2_CORE, N2_RAM, C2_CORE, C2_RAM];

const jsonResponse = (body) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  text: async () => JSON.stringify(body)
});

// The fetcher pages through shared.mjs's fetchAllPages, which calls the module-
// internal fetchJson — so a `vi.mock('./shared.mjs')` would NOT intercept it.
// Stubbing the global fetch exercises the real helper chain instead.
let mockFetch;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
  process.env.GCP_API_KEY = 'test-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// The string-`units` coercion trap now lives in shared.mjs and is covered by
// shared.spec.mjs, since Azure/IBM money objects have the same shape.

describe('gcp fetcher — SKU filtering', () => {
  it('accepts the generic "Compute optimized" prefix, which carries the C2 family rate', () => {
    expect(resolveFamily('Compute optimized')).toBe('C2');
    expect(resolveFamily('E2')).toBe('E2');
    expect(resolveFamily('N2')).toBe('N2');
    expect(resolveFamily('N4')).toBeNull();
  });

  it('ignores spot, commitment, custom and off-region rows', () => {
    const noise = [
      sku('Spot Preemptible E2 Instance Core', '0', 7000000),
      sku('Commitment v1: E2 Cpu in Americas for 1 Year', '0', 1000000),
      sku('E2 Custom Instance Core', '0', 1000000),
      sku('E2 Instance Core', '0', 99999999, ['europe-west1']),
      { ...sku('E2 Instance Core', '0', 88888), category: { resourceFamily: 'Storage' } }
    ];
    const catalog = parseGcpSkus([...COMPLETE, ...noise]);
    const e2 = catalog.compute.find((c) => c.name === 'e2-standard-2');
    // Must use the on-demand 0.02181159 core rate, never a cheaper spot noise row.
    expect(e2.hourlyOnDemandLinux).toBeCloseTo(0.067, 4);
  });
});

describe('gcp fetcher — shape derivation', () => {
  it('derives all six seed shapes from live family rates', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ skus: COMPLETE }));
    const catalog = await fetchGcpCatalog();

    expect(catalog.compute).toHaveLength(6);
    const byName = Object.fromEntries(catalog.compute.map((c) => [c.name, c]));
    expect(Object.keys(byName).sort()).toEqual(
      ['c2-standard-16', 'e2-standard-2', 'e2-standard-4', 'n2-highmem-16', 'n2-standard-32', 'n2-standard-8'].sort()
    );

    // Reproduces the committed seed values (which were derived from these rates).
    expect(byName['e2-standard-2'].hourlyOnDemandLinux).toBeCloseTo(0.067, 4);
    expect(byName['e2-standard-4'].hourlyOnDemandLinux).toBeCloseTo(0.134, 4);
    expect(byName['n2-standard-8'].hourlyOnDemandLinux).toBeCloseTo(0.3885, 4);
    expect(byName['c2-standard-16'].hourlyOnDemandLinux).toBeCloseTo(0.8352, 4);
    expect(byName['n2-standard-32'].hourlyOnDemandLinux).toBeCloseTo(1.5539, 4);
  });

  it('spans the 2 → 32 vCPU envelope every other provider catalog spans', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ skus: COMPLETE }));
    const catalog = await fetchGcpCatalog();
    expect(Math.min(...catalog.compute.map((c) => c.vCpu))).toBe(2);
    expect(Math.max(...catalog.compute.map((c) => c.vCpu))).toBe(32);
  });

  it('keeps every compute row monotonic: spot ≤ 3yr ≤ 1yr ≤ on-demand', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ skus: COMPLETE }));
    const catalog = await fetchGcpCatalog();
    for (const row of catalog.compute) {
      expect(row.hourlySpotLinux).toBeLessThanOrEqual(row.hourly3YrReservedLinux);
      expect(row.hourly3YrReservedLinux).toBeLessThanOrEqual(row.hourly1YrReservedLinux);
      expect(row.hourly1YrReservedLinux).toBeLessThanOrEqual(row.hourlyOnDemandLinux);
    }
  });
});

describe('gcp fetcher — pagination and guards', () => {
  it('follows nextPageToken instead of reading only the first page', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ skus: [E2_CORE, E2_RAM], nextPageToken: 'page-2' }))
      .mockResolvedValueOnce(jsonResponse({ skus: [N2_CORE, N2_RAM, C2_CORE, C2_RAM] }));

    const catalog = await fetchGcpCatalog();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(catalog.compute).toHaveLength(6);
  });

  it('throws when a required family is missing, so the orchestrator keeps the seed', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ skus: [E2_CORE, E2_RAM] }));
    await expect(fetchGcpCatalog()).rejects.toThrow(/incomplete/);
  });

  it('throws rather than syncing a partial catalog when pagination never terminates', async () => {
    let n = 0;
    mockFetch.mockImplementation(async () =>
      jsonResponse({ skus: COMPLETE, nextPageToken: `unique-${++n}` })
    );
    await expect(fetchGcpCatalog()).rejects.toThrow(/exceeded/);
  });

  it('throws when no GCP_API_KEY is configured', async () => {
    delete process.env.GCP_API_KEY;
    await expect(fetchGcpCatalog()).rejects.toThrow(/No GCP_API_KEY/);
  });

  it('sends the API key as a header, never in the URL (it would leak into error messages)', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ skus: COMPLETE }));
    await fetchGcpCatalog();

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).not.toContain('key=');
    expect(url).not.toContain('test-key');
    expect(init.headers['X-goog-api-key']).toBe('test-key');
  });
});

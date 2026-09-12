import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { fetchGcpCatalog, parseGcpSkus, parseGcpStorage, parseGcpEgress, __internal } = await import('./gcp.mjs');
const { resolveFamily, GCP_STORAGE_SERVICE_ID, EGRESS_SKU_DESCRIPTION } = __internal;

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

/**
 * Internet egress lives in the Compute Engine service (the "Networking" service
 * carries only inter-region and CDN transfer). Tiers lead with a $0 row for the
 * first GB, which is the trap: reading tier[0] would make egress free.
 */
const EGRESS_SKU = {
  description: EGRESS_SKU_DESCRIPTION,
  category: { resourceFamily: 'Network' },
  serviceRegions: ['us-central1', 'us-east1', 'us-west1'],
  pricingInfo: [
    {
      pricingExpression: {
        tieredRates: [
          { startUsageAmount: 0, unitPrice: { units: '0', nanos: 0 } },
          { startUsageAmount: 1, unitPrice: { units: '0', nanos: 120000000 } },
          { startUsageAmount: 1024, unitPrice: { units: '0', nanos: 110000000 } },
          { startUsageAmount: 10240, unitPrice: { units: '0', nanos: 80000000 } }
        ]
      }
    }
  ]
};

const storageSku = (description, price, regions = ['us-east1']) => ({
  description,
  category: { resourceFamily: 'Storage' },
  serviceRegions: regions,
  pricingInfo: [
    {
      pricingExpression: {
        tieredRates: [{ startUsageAmount: 0, unitPrice: { units: '0', nanos: Math.round(price * 1e9) } }]
      }
    }
  ]
});

// Live us-east1 regional capacity rates recorded 2026-09.
const STORAGE_ROWS = [
  storageSku('Autoclass Standard Storage South Carolina', 0.02),
  storageSku('Nearline Storage South Carolina', 0.01),
  storageSku('Coldline Storage South Carolina', 0.004),
  storageSku('Archive Storage South Carolina', 0.0012)
];

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

const routeFetch = (computeSkus = [...COMPLETE, EGRESS_SKU], storageSkus = STORAGE_ROWS) => {
  mockFetch.mockImplementation(async (url) => {
    if (url.includes(GCP_STORAGE_SERVICE_ID)) return jsonResponse({ skus: storageSkus });
    return jsonResponse({ skus: computeSkus });
  });
};

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
    const compute = parseGcpSkus([...COMPLETE, ...noise]);
    const e2 = compute.find((c) => c.name === 'e2-standard-2');
    // Must use the on-demand 0.02181159 core rate, never a cheaper spot noise row.
    expect(e2.hourlyOnDemandLinux).toBeCloseTo(0.067, 4);
  });
});

describe('gcp fetcher — shape derivation', () => {
  it('derives all six seed shapes from live family rates', async () => {
    routeFetch();
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
    routeFetch();
    const catalog = await fetchGcpCatalog();
    expect(Math.min(...catalog.compute.map((c) => c.vCpu))).toBe(2);
    expect(Math.max(...catalog.compute.map((c) => c.vCpu))).toBe(32);
  });

  it('keeps every compute row monotonic: spot ≤ 3yr ≤ 1yr ≤ on-demand', async () => {
    routeFetch();
    const catalog = await fetchGcpCatalog();
    for (const row of catalog.compute) {
      expect(row.hourlySpotLinux).toBeLessThanOrEqual(row.hourly3YrReservedLinux);
      expect(row.hourly3YrReservedLinux).toBeLessThanOrEqual(row.hourly1YrReservedLinux);
      expect(row.hourly1YrReservedLinux).toBeLessThanOrEqual(row.hourlyOnDemandLinux);
    }
  });
});

describe('gcp fetcher — storage capacity', () => {
  it('reads the four us-east1 regional capacity rates', () => {
    const rates = parseGcpStorage(STORAGE_ROWS);
    expect(rates.HOT).toBe(0.02);
    expect(rates.COOL).toBe(0.01);
    expect(rates.COLD).toBe(0.004);
    expect(rates.ARCHIVE).toBe(0.0012);
  });

  it('falls back to the Autoclass Standard SKU, since GCP publishes no plain regional Standard one', () => {
    const rates = parseGcpStorage([storageSku('Autoclass Standard Storage South Carolina', 0.02)]);
    expect(rates.HOT).toBe(0.02);
  });

  it('ignores dual-region and multi-region capacity, which are priced differently', () => {
    const noise = [
      storageSku('Standard Storage South Carolina Dual-region', 0.022),
      storageSku('Standard Storage US Multi-region', 0.026),
      storageSku('Nearline Storage South Carolina Dual-region', 0.011)
    ];
    const rates = parseGcpStorage([...STORAGE_ROWS, ...noise]);
    expect(rates.HOT).toBe(0.02);
    expect(rates.COOL).toBe(0.01);
  });

  it('surfaces the live capacity rate through the catalog, keeping the seeded operation rates', async () => {
    routeFetch();
    const catalog = await fetchGcpCatalog();
    expect(catalog.storage.HOT.costPerGbMonth).toBe(0.02);
    expect(catalog.storage.ARCHIVE.costPerGbMonth).toBe(0.0012);
    // Operations are deliberately not fetched — see the note in gcp.mjs.
    expect(catalog.storage.HOT.costPer10kReads).toBe(0.0004);
  });
});

describe('gcp fetcher — internet egress', () => {
  it('skips the leading $0 free-GB tier and takes the first billable rate and the top rate', () => {
    const egress = parseGcpEgress([EGRESS_SKU]);
    expect(egress.first10TbPerGb).toBe(0.12);
    expect(egress.next40TbPerGb).toBe(0.08);
  });

  it('returns null when the egress SKU is absent', () => {
    expect(parseGcpEgress(COMPLETE)).toBeNull();
  });

  it('would report free egress only if it wrongly read tier[0]', () => {
    const egress = parseGcpEgress([EGRESS_SKU]);
    expect(egress.first10TbPerGb).not.toBe(0);
  });
});

describe('gcp fetcher — pagination and guards', () => {
  it('follows nextPageToken instead of reading only the first page', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ skus: [E2_CORE, E2_RAM], nextPageToken: 'page-2' }))
      .mockResolvedValueOnce(jsonResponse({ skus: [N2_CORE, N2_RAM, C2_CORE, C2_RAM, EGRESS_SKU] }))
      .mockResolvedValue(jsonResponse({ skus: STORAGE_ROWS }));

    const catalog = await fetchGcpCatalog();
    expect(catalog.compute).toHaveLength(6);
    // Two compute pages, then one storage page.
    expect(mockFetch.mock.calls.filter((c) => c[0].includes(GCP_STORAGE_SERVICE_ID))).toHaveLength(1);
  });

  it('throws when a required compute family is missing, so the orchestrator keeps the seed', async () => {
    routeFetch([E2_CORE, E2_RAM, EGRESS_SKU]);
    await expect(fetchGcpCatalog()).rejects.toThrow(/incomplete/);
  });

  it('throws when a storage tier cannot be priced', async () => {
    routeFetch(undefined, STORAGE_ROWS.filter((s) => !/Archive/.test(s.description)));
    await expect(fetchGcpCatalog()).rejects.toThrow(/storage feed incomplete/);
  });

  it('throws when the egress SKU is missing', async () => {
    routeFetch(COMPLETE);
    await expect(fetchGcpCatalog()).rejects.toThrow(/egress SKU not found/);
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
    routeFetch();
    await fetchGcpCatalog();

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).not.toContain('key=');
    expect(url).not.toContain('test-key');
    expect(init.headers['X-Goog-Api-Key'] ?? init.headers['X-goog-api-key']).toBe('test-key');
  });
});

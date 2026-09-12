import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAzureCatalog, parseAzureStorage } from './azure.mjs';

const jsonResponse = (body) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  text: async () => JSON.stringify(body)
});

/* ------------------------------------------------------------------ */
/* Fixtures shaped like the live Retail Prices API.                    */
/* ------------------------------------------------------------------ */

const blobRow = (skuName, meterName, retailPrice, extra = {}) => ({
  serviceName: 'Storage',
  productName: 'General Block Blob v2',
  skuName,
  meterName,
  unitOfMeasure: '10K',
  tierMinimumUnits: 0,
  armRegionName: 'eastus',
  priceType: 'Consumption',
  retailPrice,
  ...extra
});

// Live eastus LRS rates recorded 2026-09 (per the API's own '10K' unit).
const BLOB_LRS_ROWS = [
  blobRow('Hot LRS', 'Hot LRS Data Stored', 0.0208, { unitOfMeasure: '1 GB/Month' }),
  blobRow('Hot LRS', 'Hot Read Operations', 0.004),
  blobRow('Hot LRS', 'Hot LRS Write Operations', 0.05),
  blobRow('Cool LRS', 'Cool LRS Data Stored', 0.0152, { unitOfMeasure: '1 GB/Month' }),
  blobRow('Cool LRS', 'Cool Read Operations', 0.01),
  blobRow('Cool LRS', 'Cool LRS Write Operations', 0.1),
  blobRow('Cold LRS', 'Cold LRS Data Stored', 0.0036, { unitOfMeasure: '1 GB/Month' }),
  blobRow('Cold LRS', 'Cold LRS Read Operations', 0.1),
  blobRow('Cold LRS', 'Cold LRS Write Operations', 0.18),
  blobRow('Archive LRS', 'Archive LRS Data Stored', 0.00099, { unitOfMeasure: '1 GB/Month' }),
  blobRow('Archive LRS', 'Archive Read Operations', 5),
  blobRow('Archive LRS', 'Archive LRS Write Operations', 0.1)
];

const VM_ROWS = [
  {
    serviceName: 'Virtual Machines',
    productName: 'Virtual Machines Dasv5 Series',
    skuName: 'Standard_D2as_v5',
    meterName: 'D2as v5',
    armRegionName: 'eastus',
    priceType: 'Consumption',
    retailPrice: 0.096
  },
  {
    serviceName: 'Bandwidth',
    productName: 'Data Transfer',
    skuName: 'Zone 1',
    meterName: 'Data Transfer Zone 1',
    armRegionName: 'eastus',
    priceType: 'Consumption',
    retailPrice: 0.087
  }
];

let mockFetch;

const routeFetch = (storageRows, vmRows = VM_ROWS) => {
  mockFetch.mockImplementation(async (url) => {
    const decoded = decodeURIComponent(url);
    if (decoded.includes("productName eq 'General Block Blob v2'")) {
      return jsonResponse({ Items: storageRows });
    }
    return jsonResponse({ Items: vmRows });
  });
};

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('azure storage — unit handling', () => {
  it('uses the API 10K rate as-is; the engine already divides ops-thousands by 10', () => {
    const storage = parseAzureStorage(BLOB_LRS_ROWS);
    // 0.004 per 10K reads. A "multiply by 10 to reach per-10K" misreading —
    // which this plan originally contained — would produce 0.04 here.
    expect(storage.HOT.costPer10kReads).toBe(0.004);
    expect(storage.HOT.costPer10kWrites).toBe(0.05);
    expect(storage.ARCHIVE.costPer10kReads).toBe(5);
  });

  it('reads per-GB-month storage rates from the live feed', () => {
    const storage = parseAzureStorage(BLOB_LRS_ROWS);
    expect(storage.HOT.costPerGbMonth).toBe(0.0208);
    expect(storage.COOL.costPerGbMonth).toBe(0.0152);
    expect(storage.COLD.costPerGbMonth).toBe(0.0036);
    expect(storage.ARCHIVE.costPerGbMonth).toBe(0.00099);
  });
});

describe('azure storage — row selection', () => {
  it('ignores the identically-named meters published under other products', () => {
    // Azure Files publishes "Hot LRS Data Stored" at a DIFFERENT price under
    // productName 'Files v2' — matching on meter name alone would pick this up.
    const noise = [
      blobRow('Hot LRS', 'Hot LRS Data Stored', 0.0287, {
        productName: 'Files v2',
        unitOfMeasure: '1 GB/Month'
      }),
      blobRow('Hot LRS', 'Hot LRS Write Operations', 0.065, { productName: 'Files v2' })
    ];
    const storage = parseAzureStorage([...BLOB_LRS_ROWS, ...noise]);
    expect(storage.HOT.costPerGbMonth).toBe(0.0208);
    expect(storage.HOT.costPer10kWrites).toBe(0.05);
  });

  it('ignores volume-discount tiers and keeps the marginal tierMin=0 rate', () => {
    const tiered = [
      blobRow('Hot LRS', 'Hot LRS Data Stored', 0.019968, {
        unitOfMeasure: '1 GB/Month',
        tierMinimumUnits: 51200
      })
    ];
    const storage = parseAzureStorage([...BLOB_LRS_ROWS, ...tiered]);
    expect(storage.HOT.costPerGbMonth).toBe(0.0208);
  });

  it('ignores non-LRS redundancy (GRS/RA-GRS) rather than merging it in', () => {
    const grs = [
      blobRow('Hot GRS', 'Hot GRS Data Stored', 0.0416, { unitOfMeasure: '1 GB/Month' }),
      blobRow('Hot GRS', 'Hot GRS Write Operations', 0.1)
    ];
    const storage = parseAzureStorage([...BLOB_LRS_ROWS, ...grs]);
    expect(storage.HOT.costPerGbMonth).toBe(0.0208);
    expect(storage.HOT.costPer10kWrites).toBe(0.05);
  });
});

describe('azure storage — validation gate', () => {
  it('clones COOL into COLD when the newest tier is absent, rather than emitting $0', () => {
    const withoutCold = BLOB_LRS_ROWS.filter((r) => r.skuName !== 'Cold LRS');
    const storage = parseAzureStorage(withoutCold);
    expect(storage.COLD.costPerGbMonth).toBe(storage.COOL.costPerGbMonth);
    expect(storage.COLD.costPer10kReads).toBe(storage.COOL.costPer10kReads);
  });

  it('throws when a required tier cannot be priced, so the orchestrator keeps the seed', () => {
    const withoutArchive = BLOB_LRS_ROWS.filter((r) => r.skuName !== 'Archive LRS');
    expect(() => parseAzureStorage(withoutArchive)).toThrow(/incomplete/);
  });
});

describe('azure fetcher — end to end', () => {
  it('prices all four tiers from the storage query and still parses compute', async () => {
    routeFetch(BLOB_LRS_ROWS);
    const catalog = await fetchAzureCatalog();

    expect(Object.keys(catalog.storage).sort()).toEqual(['ARCHIVE', 'COLD', 'COOL', 'HOT']);
    expect(catalog.compute.length).toBeGreaterThan(0);
    expect(catalog.compute[0].name).toBe('Standard_D2as_v5');
    expect(catalog.networking.first10TbPerGb).toBe(0.087);
  });

  it('fails the whole provider rather than shipping a partial storage catalog', async () => {
    routeFetch(BLOB_LRS_ROWS.filter((r) => r.skuName !== 'Archive LRS'));
    await expect(fetchAzureCatalog()).rejects.toThrow(/incomplete/);
  });
});

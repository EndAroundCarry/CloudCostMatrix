import { describe, it, expect, vi } from 'vitest';

// Real shapes pulled from the live API at write time (api.linode.com/v4/*) —
// trimmed to what the fetcher needs, but the numbers are genuine, including
// the trap: g6-standard-2's hourly ($0.036) is deliberately HIGHER than its
// monthly-equivalent rate ($24/730 ≈ $0.0329), so a full month billed hourly
// never undercuts the flat monthly price.
const COMPUTE_FIXTURE = {
  data: [
    { id: 'g6-standard-1', class: 'standard', vcpus: 1, memory: 2048, price: { hourly: 0.018, monthly: 12 } },
    { id: 'g6-standard-2', class: 'standard', vcpus: 2, memory: 4096, price: { hourly: 0.036, monthly: 24 } },
    { id: 'g6-standard-4', class: 'standard', vcpus: 4, memory: 8192, price: { hourly: 0.072, monthly: 48 } },
    { id: 'g6-standard-8', class: 'standard', vcpus: 8, memory: 32768, price: { hourly: 0.288, monthly: 192 } },
    { id: 'g6-standard-24', class: 'standard', vcpus: 24, memory: 131072, price: { hourly: 1.728, monthly: 1152 } },
    { id: 'g6-standard-32', class: 'standard', vcpus: 32, memory: 196608, price: { hourly: 2.592, monthly: 1728 } },
    { id: 'g6-dedicated-2', class: 'dedicated', vcpus: 2, memory: 4096, price: { hourly: 0.054, monthly: 36 } },
    { id: 'g6-dedicated-16', class: 'dedicated', vcpus: 16, memory: 32768, price: { hourly: 0.432, monthly: 288 } },
    { id: 'g6-dedicated-32', class: 'dedicated', vcpus: 32, memory: 65536, price: { hourly: 0.864, monthly: 576 } },
    { id: 'g7-highmem-16', class: 'highmem', vcpus: 16, memory: 307200, price: { hourly: 1.44, monthly: 960 } },
    // g8-* has null monthly (hourly-only billing) — must be excluded, not crash the monthly/730 derivation.
    { id: 'g8-dedicated-4-2', class: 'dedicated', vcpus: 2, memory: 4096, price: { hourly: 0.07, monthly: null } }
  ]
};
const DB_FIXTURE = {
  data: [
    { id: 'g6-standard-1', vcpus: 1, memory: 2048, engines: { mysql: [{ price: { hourly: 0.047, monthly: 32 }, quantity: 1 }, { price: { hourly: 0.11, monthly: 74 }, quantity: 3 }] } },
    { id: 'g6-standard-2', vcpus: 2, memory: 4096, engines: { mysql: [{ price: { hourly: 0.094, monthly: 63 }, quantity: 1 }, { price: { hourly: 0.22, monthly: 147 }, quantity: 3 }] } },
    { id: 'g6-standard-8', vcpus: 8, memory: 32768, engines: { mysql: [{ price: { hourly: 0.756, monthly: 504 }, quantity: 1 }, { price: { hourly: 1.75, monthly: 1176 }, quantity: 3 }] } },
    { id: 'g6-standard-16', vcpus: 16, memory: 65536, engines: { mysql: [{ price: { hourly: 1.512, monthly: 1008 }, quantity: 1 }, { price: { hourly: 3.5, monthly: 2352 }, quantity: 3 }] } }
  ]
};
const LKE_FIXTURE = { data: [{ id: 'lke-sa', price: { hourly: 0, monthly: 0 } }, { id: 'lke-ha', price: { hourly: 0.09, monthly: 60 } }] };
const OBJ_FIXTURE = { data: [{ id: 'objectstorage', price: { hourly: 0.0075, monthly: 5 } }, { id: 'objectstorage-overage', price: { hourly: 0.02, monthly: null } }] };
const NB_FIXTURE = { data: [{ id: 'nodebalancer', price: { hourly: 0.015, monthly: 10 } }] };

vi.mock('./shared.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  const responses = {
    'linode/types': COMPUTE_FIXTURE,
    'databases/types': DB_FIXTURE,
    'lke/types': LKE_FIXTURE,
    'object-storage/types': OBJ_FIXTURE,
    'nodebalancers/types': NB_FIXTURE
  };
  return {
    ...actual,
    fetchJson: vi.fn((url) => {
      const key = Object.keys(responses).find((k) => url.includes(k));
      return Promise.resolve(responses[key]);
    })
  };
});

const { fetchLinodeCatalog } = await import('./linode.mjs');

describe('linode fetcher — hourly-cap trap', () => {
  it('derives hourlyOnDemandLinux from monthly/730, not from the inflated hourly field', async () => {
    const catalog = await fetchLinodeCatalog();
    const g6standard2 = catalog.compute.find((c) => c.name === 'g6-standard-2');
    expect(g6standard2).toBeDefined();
    expect(g6standard2.hourlyOnDemandLinux).toBeCloseTo(24 / 730, 4);
    expect(g6standard2.hourlyOnDemandLinux).not.toBeCloseTo(0.036, 3); // the raw (wrong) hourly field
  });

  it('holds monthly/730 <= hourly for every fixture row that has both', () => {
    for (const t of COMPUTE_FIXTURE.data) {
      if (typeof t.price.monthly !== 'number') continue;
      expect(t.price.monthly / 730).toBeLessThanOrEqual(t.price.hourly + 1e-9);
    }
  });

  it('excludes g8-* rows with null monthly rather than crashing on them', async () => {
    const catalog = await fetchLinodeCatalog();
    expect(catalog.compute.find((c) => c.name.startsWith('g8-'))).toBeUndefined();
  });
});

describe('linode fetcher — envelope coverage', () => {
  it('spans 2 to 32 vCPU with 7 distinct shapes despite catalog gaps at the high end', async () => {
    const catalog = await fetchLinodeCatalog();
    expect(catalog.compute).toHaveLength(7);
    expect(new Set(catalog.compute.map((c) => c.name)).size).toBe(7); // all distinct
    expect(Math.min(...catalog.compute.map((c) => c.vCpu))).toBeLessThanOrEqual(2);
    expect(Math.max(...catalog.compute.map((c) => c.vCpu))).toBeGreaterThanOrEqual(32);
  });

  it('produces 4 distinct database rows', async () => {
    const catalog = await fetchLinodeCatalog();
    expect(catalog.database).toHaveLength(4);
    expect(new Set(catalog.database.map((d) => d.name)).size).toBe(4);
  });
});

describe('linode fetcher — mislabeled overage field', () => {
  it('reads objectstorage-overage.price.hourly as a per-GB-MONTH rate, matching the seed value', async () => {
    const catalog = await fetchLinodeCatalog();
    expect(catalog.storage.HOT.costPerGbMonth).toBe(0.02);
    expect(catalog.storage.HOT.minimumMonthlyFee).toBe(5);
  });

  it('clones the single storage class across all four tiers', async () => {
    const catalog = await fetchLinodeCatalog();
    expect(catalog.storage.COOL.costPerGbMonth).toBe(catalog.storage.HOT.costPerGbMonth);
    expect(catalog.storage.ARCHIVE.costPerGbMonth).toBe(catalog.storage.HOT.costPerGbMonth);
  });
});

describe('linode fetcher — LKE and NodeBalancer', () => {
  it('reads the free LKE Standard Availability control plane correctly', async () => {
    const catalog = await fetchLinodeCatalog();
    expect(catalog.kubernetes.managementHourlyFeePerCluster).toBe(0);
  });

  it('derives NodeBalancer effective rate from monthly/730, matching the seed exactly', async () => {
    const catalog = await fetchLinodeCatalog();
    expect(catalog.networking.loadBalancerHourly).toBeCloseTo(10 / 730, 4);
  });
});

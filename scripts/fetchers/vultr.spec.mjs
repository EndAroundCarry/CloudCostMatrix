import { describe, it, expect, vi, beforeEach } from 'vitest';

// Real rows pulled from the live Vultr API (api.vultr.com/v2/plans) at write
// time — trimmed to the fields the fetcher reads, but the numbers are genuine.
// `hourly_cost` is Vultr's capped 672-hour meter, so it generally sits just
// above or below monthly_cost/730; the fetcher must prefer the latter.
const PLAN_ROWS = [
  // Cloud Compute — Regular Performance (vc2)
  { id: 'vc2-1c-1gb', type: 'vc2', vcpu_count: 1, ram: 1024, monthly_cost: 5, hourly_cost: 0.007, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vc2-2c-2gb', type: 'vc2', vcpu_count: 2, ram: 2048, monthly_cost: 15, hourly_cost: 0.021, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vc2-2c-4gb', type: 'vc2', vcpu_count: 2, ram: 4096, monthly_cost: 20, hourly_cost: 0.027, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vc2-4c-8gb', type: 'vc2', vcpu_count: 4, ram: 8192, monthly_cost: 40, hourly_cost: 0.055, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vc2-6c-16gb', type: 'vc2', vcpu_count: 6, ram: 16384, monthly_cost: 80, hourly_cost: 0.11, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vc2-8c-32gb', type: 'vc2', vcpu_count: 8, ram: 32768, monthly_cost: 160, hourly_cost: 0.219, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vc2-16c-64gb', type: 'vc2', vcpu_count: 16, ram: 65536, monthly_cost: 320, hourly_cost: 0.438, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vc2-24c-96gb', type: 'vc2', vcpu_count: 24, ram: 98304, monthly_cost: 640, hourly_cost: 0.877, gpu_brand: 'none', deploy_ondemand: true },
  // Cloud Compute — High Frequency (vhf)
  { id: 'vhf-2c-2gb', type: 'vhf', vcpu_count: 2, ram: 2048, monthly_cost: 18, hourly_cost: 0.025, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vhf-2c-4gb', type: 'vhf', vcpu_count: 2, ram: 4096, monthly_cost: 24, hourly_cost: 0.033, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vhf-4c-16gb', type: 'vhf', vcpu_count: 4, ram: 16384, monthly_cost: 96, hourly_cost: 0.132, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vhf-8c-32gb', type: 'vhf', vcpu_count: 8, ram: 32768, monthly_cost: 192, hourly_cost: 0.263, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vhf-16c-58gb', type: 'vhf', vcpu_count: 16, ram: 59392, monthly_cost: 320, hourly_cost: 0.438, gpu_brand: 'none', deploy_ondemand: true },
  // Cloud Compute — High Performance (vhp)
  { id: 'vhp-2c-2gb-amd', type: 'vhp', vcpu_count: 2, ram: 2048, monthly_cost: 18, hourly_cost: 0.025, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vhp-2c-4gb-amd', type: 'vhp', vcpu_count: 2, ram: 4096, monthly_cost: 24, hourly_cost: 0.033, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vhp-4c-8gb-amd', type: 'vhp', vcpu_count: 4, ram: 8192, monthly_cost: 48, hourly_cost: 0.066, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vhp-8c-16gb-amd', type: 'vhp', vcpu_count: 8, ram: 16384, monthly_cost: 96, hourly_cost: 0.132, gpu_brand: 'none', deploy_ondemand: true },
  // Optimized Cloud Compute (voc)
  { id: 'voc-c-2c-4gb-50s-amd', type: 'voc', vcpu_count: 2, ram: 4096, monthly_cost: 40, hourly_cost: 0.055, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'voc-g-2c-8gb-50s-amd', type: 'voc', vcpu_count: 2, ram: 8192, monthly_cost: 60, hourly_cost: 0.082, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'voc-g-4c-16gb-80s-amd', type: 'voc', vcpu_count: 4, ram: 16384, monthly_cost: 120, hourly_cost: 0.164, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'voc-c-8c-16gb-150s-amd', type: 'voc', vcpu_count: 8, ram: 16384, monthly_cost: 160, hourly_cost: 0.219, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'voc-c-16c-32gb-300s-amd', type: 'voc', vcpu_count: 16, ram: 32768, monthly_cost: 320, hourly_cost: 0.438, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'voc-m-16c-128gb-800s-amd', type: 'voc', vcpu_count: 16, ram: 131072, monthly_cost: 640, hourly_cost: 0.877, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'voc-g-32c-128gb-640s-amd', type: 'voc', vcpu_count: 32, ram: 131072, monthly_cost: 960, hourly_cost: 1.315, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'voc-g-96c-256gb-1280s-amd', type: 'voc', vcpu_count: 96, ram: 262144, monthly_cost: 3840, hourly_cost: 5.26, gpu_brand: 'none', deploy_ondemand: true },
  // Excluded: GPU, bare metal, VX1 (block-storage-backed), and the free plan.
  { id: 'vcg-a16-2c-8g-2vram', type: 'vcg', vcpu_count: 2, ram: 8192, monthly_cost: 43, hourly_cost: 0.059, gpu_brand: 'NVIDIA', deploy_ondemand: true },
  { id: 'vcg-h100-216c-1914gb-640vram', type: 'vdm', vcpu_count: 216, ram: 1929120, monthly_cost: 16074.24, hourly_cost: 23.92, gpu_brand: 'NVIDIA', deploy_ondemand: false },
  { id: 'vx1-g-2c-8g', type: 'vx1', vcpu_count: 2, ram: 8192, monthly_cost: 43.8, hourly_cost: 0.06, gpu_brand: 'none', deploy_ondemand: true },
  { id: 'vc2-1c-0.5gb-free', type: 'vc2', vcpu_count: 1, ram: 512, monthly_cost: 0, hourly_cost: 0, gpu_brand: 'none', deploy_ondemand: true }
];

// Managed-database plans (api.vultr.com/v2/databases/plans). PostgreSQL and
// MySQL share identical shape pricing; a Kafka plan is present to prove the
// engine filter excludes non-relational engines.
const DB_ROWS = [
  { id: 'vultr-dbaas-postgres-30s-amd-1c-4gb', engine: 'pg', vcpus: 1, ram: 4096, disk: 30, monthly_cost: 90, hourly_cost: 0.134 },
  { id: 'vultr-dbaas-postgres-50s-amd-2c-8gb', engine: 'pg', vcpus: 2, ram: 8192, disk: 50, monthly_cost: 180, hourly_cost: 0.268 },
  { id: 'vultr-dbaas-postgres-80s-amd-4c-16gb', engine: 'pg', vcpus: 4, ram: 16384, disk: 80, monthly_cost: 360, hourly_cost: 0.536 },
  { id: 'vultr-dbaas-postgres-160s-amd-8c-32gb', engine: 'pg', vcpus: 8, ram: 32768, disk: 160, monthly_cost: 720, hourly_cost: 1.071 },
  { id: 'vultr-dbaas-postgres-320s-amd-16c-64gb', engine: 'pg', vcpus: 16, ram: 65536, disk: 320, monthly_cost: 1440, hourly_cost: 2.143 },
  { id: 'vultr-dbaas-mysql-30s-amd-1c-4gb', engine: 'mysql', vcpus: 1, ram: 4096, disk: 30, monthly_cost: 90, hourly_cost: 0.134 },
  { id: 'vultr-dbaas-kafka-3b-600gb', engine: 'kafka', vcpus: 3, ram: 8192, disk: 600, monthly_cost: 475, hourly_cost: 0.707 }
];

const state = vi.hoisted(() => ({ plans: [], dbPlans: null, dbFails: false, calls: [] }));

vi.mock('./shared.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchJson: vi.fn((url, opts) => {
      state.calls.push({ url, opts });
      if (url.includes('/databases/plans')) {
        if (state.dbFails) return Promise.reject(new Error('HTTP 500 Internal Server Error'));
        return Promise.resolve(state.dbPlans);
      }
      return Promise.resolve({ plans: state.plans });
    })
  };
});

const { fetchVultrCatalog } = await import('./vultr.mjs');

beforeEach(() => {
  state.plans = PLAN_ROWS.map((p) => ({ ...p }));
  state.dbPlans = { plans: DB_ROWS.map((p) => ({ ...p })) };
  state.dbFails = false;
  state.calls = [];
  delete process.env.VULTR_API_KEY;
});

describe('vultr fetcher — effective hourly rate', () => {
  it('derives hourlyOnDemandLinux from monthly_cost/730, not the capped hourly_cost meter', async () => {
    const catalog = await fetchVultrCatalog();
    const row = catalog.compute.find((c) => c.name === 'vc2-2c-4gb');
    expect(row).toBeDefined();
    expect(row.hourlyOnDemandLinux).toBeCloseTo(20 / 730, 4);
    expect(row.hourlyOnDemandLinux).not.toBe(0.027); // the raw (capped) hourly field
  });

  it('clones the flat on-demand rate into every commitment field (no reserved/spot at Vultr)', async () => {
    const catalog = await fetchVultrCatalog();
    for (const row of catalog.compute) {
      expect(row.hourly1YrReservedLinux).toBe(row.hourlyOnDemandLinux);
      expect(row.hourly3YrReservedLinux).toBe(row.hourlyOnDemandLinux);
      expect(row.hourlySpotLinux).toBe(row.hourlyOnDemandLinux);
    }
  });
});

describe('vultr fetcher — envelope coverage', () => {
  it('emits 7 distinct shapes spanning 2 to 32 vCPU', async () => {
    const catalog = await fetchVultrCatalog();
    expect(catalog.compute).toHaveLength(7);
    expect(new Set(catalog.compute.map((c) => c.name)).size).toBe(7);
    expect(Math.min(...catalog.compute.map((c) => c.vCpu))).toBeLessThanOrEqual(2);
    expect(Math.max(...catalog.compute.map((c) => c.vCpu))).toBeGreaterThanOrEqual(32);
  });

  it('prefers the cheapest shape of a given size rather than a dedicated one', async () => {
    const catalog = await fetchVultrCatalog();
    // 2 vCPU / 4 GB: the Regular (vc2) shape is cheaper than High Frequency/High Performance.
    const twoByFour = catalog.compute.find((c) => c.vCpu === 2 && c.ramGb === 4);
    expect(twoByFour?.name).toBe('vc2-2c-4gb');
  });
});

describe('vultr fetcher — exclusions', () => {
  it('excludes GPU, bare-metal, VX1, and free plans', async () => {
    const catalog = await fetchVultrCatalog();
    for (const row of catalog.compute) {
      expect(row.name.startsWith('vcg-')).toBe(false);
      expect(row.name.startsWith('vx1-')).toBe(false);
      expect(row.name.includes('free')).toBe(false);
      expect(row.hourlyOnDemandLinux).toBeGreaterThan(0);
    }
  });
});

describe('vultr fetcher — managed databases', () => {
  it('does not call the database endpoint and omits the section when no key is set', async () => {
    const catalog = await fetchVultrCatalog();
    expect(catalog.database).toBeUndefined();
    expect(state.calls.some((c) => c.url.includes('/databases/plans'))).toBe(false);
    expect(catalog.compute).toHaveLength(7); // compute is unaffected
  });

  it('syncs 4 distinct database rows from monthly_cost/730 when the key is set', async () => {
    process.env.VULTR_API_KEY = 'test-key';
    const catalog = await fetchVultrCatalog();
    expect(catalog.database).toHaveLength(4);
    expect(new Set(catalog.database.map((d) => d.name)).size).toBe(4);
    const row = catalog.database.find((d) => d.vCpu === 1);
    expect(row?.name).toBe('vultr-dbaas-postgres-30s-amd-1c-4gb');
    expect(row?.ramGb).toBe(4);
    expect(row?.hourlyPostgres).toBeCloseTo(90 / 730, 4);
    expect(row?.hourlyMySql).toBe(row?.hourlyPostgres); // Vultr prices both identically
    expect(row?.hourlySqlServer).toBe(row?.hourlyPostgres); // cloned, gated off
  });

  it('sends the API key as a Bearer token', async () => {
    process.env.VULTR_API_KEY = 'test-key';
    await fetchVultrCatalog();
    const call = state.calls.find((c) => c.url.includes('/databases/plans'));
    expect(call?.opts?.Authorization).toBe('Bearer test-key');
  });

  it('excludes non-relational engines (kafka)', async () => {
    process.env.VULTR_API_KEY = 'test-key';
    const catalog = await fetchVultrCatalog();
    expect(catalog.database.every((d) => !d.name.includes('kafka'))).toBe(true);
  });

  it('degrades to the seed (no database section) when the DB fetch fails, keeping compute live', async () => {
    process.env.VULTR_API_KEY = 'test-key';
    state.dbFails = true;
    const catalog = await fetchVultrCatalog();
    expect(catalog.database).toBeUndefined();
    expect(catalog.compute).toHaveLength(7);
  });

  it('degrades to the seed when the DB response is malformed', async () => {
    process.env.VULTR_API_KEY = 'test-key';
    state.dbPlans = {};
    const catalog = await fetchVultrCatalog();
    expect(catalog.database).toBeUndefined();
    expect(catalog.compute).toHaveLength(7);
  });
});

describe('vultr fetcher — guards', () => {
  it('throws instead of emitting a partial catalog when the feed is too thin', async () => {
    state.plans = PLAN_ROWS.slice(0, 2);
    await expect(fetchVultrCatalog()).rejects.toThrow(/too few usable shapes/);
  });

  it('throws when the response is not a plans envelope', async () => {
    state.plans = undefined;
    await expect(fetchVultrCatalog()).rejects.toThrow(/no plans array/);
  });
});

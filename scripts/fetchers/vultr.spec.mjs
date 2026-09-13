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

const state = vi.hoisted(() => ({ plans: [] }));

vi.mock('./shared.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, fetchJson: vi.fn(() => Promise.resolve({ plans: state.plans })) };
});

const { fetchVultrCatalog } = await import('./vultr.mjs');

beforeEach(() => {
  state.plans = PLAN_ROWS.map((p) => ({ ...p }));
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

import { describe, it, expect } from 'vitest';
import { ALL_PROVIDERS, CloudProvider } from '../../models/cloud-provider.enum';
import { BENCHMARK_CATALOGS } from './seeded-pricing-catalog';
import { EFFECTIVE_CATALOGS } from './pricing-catalog.resolver';
import { CostCalculatorEngine } from '../cost-calculator.engine';

describe('BENCHMARK_CATALOGS sanity', () => {
  it('has exactly 9 provider catalogs, one per CloudProvider member', () => {
    expect(Object.keys(BENCHMARK_CATALOGS)).toHaveLength(9);
    for (const p of ALL_PROVIDERS) expect(BENCHMARK_CATALOGS[p]).toBeDefined();
  });

  it('keeps every compute row monotonic: spot ≤ 3yr ≤ 1yr ≤ on-demand, all positive', () => {
    for (const provider of ALL_PROVIDERS) {
      for (const row of BENCHMARK_CATALOGS[provider].compute) {
        expect(row.hourlyOnDemandLinux).toBeGreaterThan(0);
        expect(row.hourly1YrReservedLinux).toBeLessThanOrEqual(row.hourlyOnDemandLinux);
        expect(row.hourly3YrReservedLinux).toBeLessThanOrEqual(row.hourly1YrReservedLinux);
        expect(row.hourlySpotLinux).toBeLessThanOrEqual(row.hourly3YrReservedLinux);
        expect(row.hourlySpotLinux).toBeGreaterThan(0);
      }
    }
  });

  it('spans the same 2→32 vCPU envelope for every provider, so the nearest-match sizer never silently undersizes', () => {
    for (const provider of ALL_PROVIDERS) {
      const vCpus = BENCHMARK_CATALOGS[provider].compute.map((c) => c.vCpu);
      expect(Math.min(...vCpus)).toBeLessThanOrEqual(2);
      expect(Math.max(...vCpus)).toBeGreaterThanOrEqual(32);
    }
  });

  it('never prices ARCHIVE above HOT for any provider (equal only for the single-tier developer clouds)', () => {
    for (const provider of ALL_PROVIDERS) {
      const storage = BENCHMARK_CATALOGS[provider].storage;
      expect(storage.HOT.costPerGbMonth).toBeGreaterThanOrEqual(storage.ARCHIVE.costPerGbMonth);
    }
  });

  it('keeps HOT strictly more expensive than ARCHIVE for every provider with real tiering', () => {
    // DigitalOcean and Linode have a single storage class (all 4 tiers clone the
    // same rate, gated off by PROVIDER_CAPABILITIES) — excluded deliberately.
    const singleTierProviders = new Set([CloudProvider.DIGITALOCEAN, CloudProvider.LINODE]);
    for (const provider of ALL_PROVIDERS) {
      if (singleTierProviders.has(provider)) continue;
      const storage = BENCHMARK_CATALOGS[provider].storage;
      expect(storage.HOT.costPerGbMonth).toBeGreaterThan(storage.ARCHIVE.costPerGbMonth);
    }
  });

  it('has 4 database rows per provider, each with a positive Postgres and MySQL rate', () => {
    for (const provider of ALL_PROVIDERS) {
      const db = BENCHMARK_CATALOGS[provider].database;
      expect(db).toHaveLength(4);
      for (const row of db) {
        expect(row.hourlyPostgres).toBeGreaterThan(0);
        expect(row.hourlyMySql).toBeGreaterThan(0);
      }
    }
  });
});

describe('Egress allowance math', () => {
  const baseSpec = { egressGbPerMonth: 0, loadBalancersCount: 0, staticIpsCount: 0 };

  it('OVHcloud is $0 regardless of volume (unlimited fair-use egress)', () => {
    const low = CostCalculatorEngine.calculateNetworking({ ...baseSpec, egressGbPerMonth: 500 }, CloudProvider.OVHCLOUD, 1);
    const high = CostCalculatorEngine.calculateNetworking({ ...baseSpec, egressGbPerMonth: 50_000 }, CloudProvider.OVHCLOUD, 5);
    expect(low.monthlyCost).toBe(0);
    expect(high.monthlyCost).toBe(0);
  });

  it('Oracle is free under the 10 TB/month allowance and bills only the overage above it', () => {
    const underAllowance = CostCalculatorEngine.calculateNetworking({ ...baseSpec, egressGbPerMonth: 5_000 }, CloudProvider.ORACLE, 0);
    expect(underAllowance.monthlyCost).toBe(0);

    const overAllowance = CostCalculatorEngine.calculateNetworking({ ...baseSpec, egressGbPerMonth: 15_360 }, CloudProvider.ORACLE, 0);
    // Read the EFFECTIVE catalog — the one the engine actually resolves against —
    // not BENCHMARK_CATALOGS, which a live sync may have superseded.
    const rate = EFFECTIVE_CATALOGS[CloudProvider.ORACLE].networking.first10TbPerGb;
    expect(overAllowance.monthlyCost).toBeCloseTo((15_360 - 10_240) * rate, 2);
  });

  it('DigitalOcean bills only the transfer above its pooled per-Droplet bundle', () => {
    // EFFECTIVE_CATALOGS, not BENCHMARK_CATALOGS: DigitalOcean's bundle is now
    // supplied by the live fetcher, so the seed value no longer matches what the
    // engine bills against.
    const net = EFFECTIVE_CATALOGS[CloudProvider.DIGITALOCEAN].networking;
    const instanceCount = 2;
    const bundled = (net.bundledEgressGbPerInstance ?? 0) * instanceCount;
    expect(bundled).toBeGreaterThan(0);

    // Under the pooled allowance → nothing billable.
    const under = CostCalculatorEngine.calculateNetworking(
      { ...baseSpec, egressGbPerMonth: Math.floor(bundled / 2) },
      CloudProvider.DIGITALOCEAN,
      instanceCount
    );
    expect(under.monthlyCost).toBe(0);

    // Over it → only the excess is billed, at the flat overage rate.
    const excessGb = 1_000;
    const over = CostCalculatorEngine.calculateNetworking(
      { ...baseSpec, egressGbPerMonth: bundled + excessGb },
      CloudProvider.DIGITALOCEAN,
      instanceCount
    );
    expect(over.monthlyCost).toBeCloseTo(excessGb * (net.overageEgressPerGb ?? 0), 2);
  });
});

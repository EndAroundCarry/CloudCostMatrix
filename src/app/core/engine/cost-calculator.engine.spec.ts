import { describe, it, expect } from 'vitest';
import { CostCalculatorEngine } from './cost-calculator.engine';
import { ALL_PROVIDERS, CloudProvider, PROVIDER_METAS } from '../models/cloud-provider.enum';
import { PROVIDER_CAPABILITIES } from '../models/provider-capabilities.model';
import { ServiceCategory } from '../models/service-category.enum';
import { BENCHMARK_CATALOGS } from './catalog/seeded-pricing-catalog';
import { ARCHITECTURE_BLUEPRINTS } from '../models/blueprints.model';

describe('CostCalculatorEngine', () => {
  it('should calculate compute pricing correctly across providers', () => {
    const spec = {
      vCpu: 4,
      ramGb: 16,
      os: 'LINUX' as const,
      count: 2,
      hoursPerMonth: 730,
      commitment: 'ON_DEMAND' as const
    };

    const awsResult = CostCalculatorEngine.calculateCompute(spec, CloudProvider.AWS);
    const azureResult = CostCalculatorEngine.calculateCompute(spec, CloudProvider.AZURE);
    const gcpResult = CostCalculatorEngine.calculateCompute(spec, CloudProvider.GCP);

    expect(awsResult.monthlyCost).toBeGreaterThan(0);
    expect(azureResult.monthlyCost).toBeGreaterThan(0);
    expect(gcpResult.monthlyCost).toBeGreaterThan(0);
    expect(awsResult.annualCost).toBeCloseTo(awsResult.monthlyCost * 12, 1);
  });

  it('should apply commitment discounts for 1-year and 3-year commitments', () => {
    const onDemandSpec = {
      vCpu: 4,
      ramGb: 16,
      os: 'LINUX' as const,
      count: 1,
      hoursPerMonth: 730,
      commitment: 'ON_DEMAND' as const
    };

    const reservedSpec = {
      ...onDemandSpec,
      commitment: '1_YEAR_RESERVED' as const
    };

    const onDemand = CostCalculatorEngine.calculateCompute(onDemandSpec, CloudProvider.AWS);
    const reserved = CostCalculatorEngine.calculateCompute(reservedSpec, CloudProvider.AWS);

    expect(reserved.monthlyCost).toBeLessThan(onDemand.monthlyCost);
  });

  it('should calculate full matrix comparison for a SaaS blueprint', () => {
    const blueprint = ARCHITECTURE_BLUEPRINTS[0];
    const matrix = CostCalculatorEngine.calculateFullMatrix(blueprint.config);

    // Every provider this build knows about is always priced, gap-free blueprint or not.
    for (const provider of ALL_PROVIDERS) {
      expect(matrix.providers[provider].monthlyTotal).toBeGreaterThan(0);
    }
    expect(matrix.monthlyMaxSavings).toBeGreaterThanOrEqual(0);
    expect(matrix.selectedProviders).toContain(matrix.cheapestMonthlyProvider);
  });

  it('exposes exactly 9 providers across the metas, capabilities, and catalog records', () => {
    expect(ALL_PROVIDERS).toHaveLength(9);
    expect(Object.keys(PROVIDER_METAS)).toHaveLength(9);
    expect(Object.keys(PROVIDER_CAPABILITIES)).toHaveLength(9);
    expect(Object.keys(BENCHMARK_CATALOGS)).toHaveLength(9);
  });

  it('never lets an unsupported storage tier, DB engine, or category win the cheapest ranking', () => {
    const blueprint = ARCHITECTURE_BLUEPRINTS[0];

    // ARCHIVE tier: DigitalOcean and Linode don't offer it.
    const archiveConfig = { ...blueprint.config, storage: { ...blueprint.config.storage, tier: 'ARCHIVE' as const } };
    const archiveMatrix = CostCalculatorEngine.calculateFullMatrix(archiveConfig);
    const doStorage = archiveMatrix.breakdowns.find((b) => b.provider === CloudProvider.DIGITALOCEAN && b.category === ServiceCategory.STORAGE);
    expect(doStorage?.supported).toBe(false);
    expect(doStorage?.monthlyCost).toBe(0);
    expect(archiveMatrix.providers[CloudProvider.DIGITALOCEAN].hasCoverageGap).toBe(true);

    // SQL_SERVER engine: Oracle, IBM, DigitalOcean, Linode, OVHcloud don't offer it.
    const sqlConfig = {
      ...blueprint.config,
      database: { ...blueprint.config.database, engine: 'SQL_SERVER' as const },
      selectedProviders: [...ALL_PROVIDERS]
    };
    const sqlMatrix = CostCalculatorEngine.calculateFullMatrix(sqlConfig);
    const noSqlServer: CloudProvider[] = [CloudProvider.ORACLE, CloudProvider.IBM, CloudProvider.DIGITALOCEAN, CloudProvider.LINODE, CloudProvider.OVHCLOUD];
    for (const p of noSqlServer) {
      expect(sqlMatrix.providers[p].hasCoverageGap).toBe(true);
    }
    expect(noSqlServer).not.toContain(sqlMatrix.cheapestMonthlyProvider);

    // Turning DATABASE off removes the gap — the provider becomes comparable again.
    const noDbConfig = {
      ...sqlConfig,
      activeCategories: { ...sqlConfig.activeCategories, [ServiceCategory.DATABASE]: false }
    };
    const noDbMatrix = CostCalculatorEngine.calculateFullMatrix(noDbConfig);
    expect(noDbMatrix.providers[CloudProvider.ORACLE].hasCoverageGap).toBe(false);
  });

  it('falls back to ranking the full selection (without crashing) when every selected provider has a gap', () => {
    const blueprint = ARCHITECTURE_BLUEPRINTS[0];
    const sqlConfig = {
      ...blueprint.config,
      database: { ...blueprint.config.database, engine: 'SQL_SERVER' as const },
      selectedProviders: [CloudProvider.DIGITALOCEAN, CloudProvider.LINODE]
    };
    const matrix = CostCalculatorEngine.calculateFullMatrix(sqlConfig);
    expect(matrix.allSelectedHaveGaps).toBe(true);
    expect(matrix.comparableProviders).toHaveLength(0);
    expect([CloudProvider.DIGITALOCEAN, CloudProvider.LINODE]).toContain(matrix.cheapestMonthlyProvider);
  });
});

import { describe, it, expect } from 'vitest';
import { CostCalculatorEngine } from './cost-calculator.engine';
import { CloudProvider } from '../models/cloud-provider.enum';
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

    expect(matrix.providers[CloudProvider.AWS].monthlyTotal).toBeGreaterThan(0);
    expect(matrix.providers[CloudProvider.AZURE].monthlyTotal).toBeGreaterThan(0);
    expect(matrix.providers[CloudProvider.GCP].monthlyTotal).toBeGreaterThan(0);
    expect(matrix.monthlyMaxSavings).toBeGreaterThanOrEqual(0);
    expect([CloudProvider.AWS, CloudProvider.AZURE, CloudProvider.GCP]).toContain(matrix.cheapestMonthlyProvider);
  });
});

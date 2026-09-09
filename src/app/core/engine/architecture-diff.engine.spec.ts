import { describe, it, expect } from 'vitest';
import { ArchitectureDiffEngine } from './architecture-diff.engine';
import { ARCHITECTURE_BLUEPRINTS } from '../models/blueprints.model';
import { CloudProvider, DEFAULT_SELECTED_PROVIDERS } from '../models/cloud-provider.enum';

describe('ArchitectureDiffEngine', () => {
  it('produces a TIE when comparing a config against itself', () => {
    const cfg = ARCHITECTURE_BLUEPRINTS[0].config;
    const diff = ArchitectureDiffEngine.compute(cfg, cfg);
    expect(diff.winner).toBe('TIE');
    expect(diff.monthlyDelta).toBe(0);
    expect(diff.rows.every((r) => !r.changed)).toBe(true);
  });

  it('flags changed rows and computes ROI for a small vs large architecture', () => {
    const small = ARCHITECTURE_BLUEPRINTS[0].config; // SaaS starter
    const large = ARCHITECTURE_BLUEPRINTS[2].config; // Enterprise K8s
    const diff = ArchitectureDiffEngine.compute(small, large);

    expect(diff.rows.some((r) => r.changed)).toBe(true);
    // Both configs default to the big-3 selection (neither sets selectedProviders).
    expect(diff.providerDeltas).toHaveLength(DEFAULT_SELECTED_PROVIDERS.length);
    expect(diff.savingsPerMonth).toBeGreaterThan(0);

    // Every provider delta should show B (large) more expensive than A (small)
    for (const pd of diff.providerDeltas) {
      expect(pd.bMonthly).toBeGreaterThanOrEqual(pd.aMonthly);
    }
  });

  it('unions both scenarios’ provider selections when they differ', () => {
    const small = { ...ARCHITECTURE_BLUEPRINTS[0].config, selectedProviders: [CloudProvider.AWS, CloudProvider.ORACLE] };
    const large = { ...ARCHITECTURE_BLUEPRINTS[2].config, selectedProviders: [CloudProvider.AWS, CloudProvider.DIGITALOCEAN] };
    const diff = ArchitectureDiffEngine.compute(small, large);
    const providers = diff.providerDeltas.map((pd) => pd.provider);
    expect(providers).toHaveLength(3);
    expect(providers).toEqual(expect.arrayContaining([CloudProvider.AWS, CloudProvider.ORACLE, CloudProvider.DIGITALOCEAN]));
  });

  it('identifies the cheapest provider per side', () => {
    const a = ARCHITECTURE_BLUEPRINTS[0].config;
    const b = ARCHITECTURE_BLUEPRINTS[3].config; // AI/ML
    const diff = ArchitectureDiffEngine.compute(a, b);
    expect(diff.matrixA.cheapestMonthlyProvider).toBeDefined();
    expect(diff.matrixB.cheapestMonthlyProvider).toBeDefined();
  });
});

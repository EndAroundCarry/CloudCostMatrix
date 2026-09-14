import { describe, it, expect } from 'vitest';
import { rankProviders, rankingCaption, rankingLabel, RankingMetricId } from './provider-rankings';
import { ALL_PROVIDERS, CloudProvider } from '../models/cloud-provider.enum';

const METRICS: RankingMetricId[] = ['egress', 'entryCompute', 'objectStorage', 'managedPostgres', 'kubernetes'];

describe('provider-rankings', () => {
  it('ranks providers with strictly ascending ranks and exactly one lowest', () => {
    for (const metric of METRICS) {
      const rows = rankProviders(metric);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThanOrEqual(ALL_PROVIDERS.length);
      expect(new Set(rows.map((r) => r.provider)).size).toBe(rows.length);
      expect(rows.map((r) => r.rank)).toEqual(rows.map((_, i) => i + 1));
      expect(rows.filter((r) => r.lowest)).toHaveLength(1);
      expect(rows[0].lowest).toBe(true);
    }
  });

  it('sorts cheapest first — values never decrease down the table', () => {
    for (const metric of METRICS) {
      const values = rankProviders(metric).map((r) => r.value);
      expect([...values].sort((a, b) => a - b)).toEqual(values);
    }
  });

  it('never leaks NaN, undefined, Infinity or an empty display string', () => {
    for (const metric of METRICS) {
      for (const row of rankProviders(metric)) {
        expect(Number.isFinite(row.value)).toBe(true);
        expect(row.display.length).toBeGreaterThan(0);
        expect(row.display).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('ranks the unlimited-egress provider cheapest for egress', () => {
    // Tied to the catalog flag, not a hardcoded rate: if OVHcloud's
    // unlimitedEgress ever goes away, this fails rather than silently lying.
    const rows = rankProviders('egress');
    expect(rows[0].provider).toBe(CloudProvider.OVHCLOUD);
    expect(rows[0].value).toBe(0);
    expect(rows[0].display).toContain('Unlimited');
  });

  it('charges every provider something for entry-level compute', () => {
    for (const row of rankProviders('entryCompute')) {
      expect(row.value).toBeGreaterThan(0);
      expect(row.display).toMatch(/\$/);
    }
  });

  it('exposes a label and caption for each metric', () => {
    for (const metric of METRICS) {
      expect(rankingLabel(metric).length).toBeGreaterThan(0);
      expect(rankingCaption(metric).length).toBeGreaterThan(0);
    }
  });

  it('ranks all ten providers for the metrics every provider sells', () => {
    // Every provider in the catalog offers hot-tier storage, managed PostgreSQL
    // and Kubernetes, so a shorter table would mean a catalog regression rather
    // than a legitimate exclusion.
    for (const metric of ['objectStorage', 'managedPostgres', 'kubernetes'] as RankingMetricId[]) {
      expect(rankProviders(metric), metric).toHaveLength(ALL_PROVIDERS.length);
    }
  });

  it('charges every provider something for storage, Postgres and Kubernetes', () => {
    for (const metric of ['objectStorage', 'managedPostgres', 'kubernetes'] as RankingMetricId[]) {
      for (const row of rankProviders(metric)) {
        expect(row.value, `${metric}/${row.provider}`).toBeGreaterThan(0);
        expect(row.display).toMatch(/\$/);
      }
    }
  });

  it('ranks the one provider that bills a first control plane last for Kubernetes', () => {
    // Tied to the catalog flags rather than a hardcoded rate: AWS is the only
    // provider here that charges for the first cluster, and nine free control
    // planes beat its node costs by a wide margin. If AWS ever waives the fee,
    // this fails loudly instead of leaving the guide saying otherwise.
    const rows = rankProviders('kubernetes');
    const aws = rows.find((r) => r.provider === CloudProvider.AWS);
    expect(aws).toBeDefined();
    expect(rows[0].provider).not.toBe(CloudProvider.AWS);
    expect(rows[0].value).toBeLessThan(aws!.value);
  });

  it('is deterministic across calls — no shared mutable state between rankings', () => {
    const first = rankProviders('egress');
    rankProviders('entryCompute');
    rankProviders('kubernetes');
    expect(rankProviders('egress')).toEqual(first);
  });
});

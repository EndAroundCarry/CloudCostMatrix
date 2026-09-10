import { describe, it, expect } from 'vitest';
import { rankProviders, rankingCaption, rankingLabel, RankingMetricId } from './provider-rankings';
import { ALL_PROVIDERS, CloudProvider } from '../models/cloud-provider.enum';

const METRICS: RankingMetricId[] = ['egress', 'entryCompute'];

describe('provider-rankings', () => {
  it('ranks every provider exactly once, with strictly ascending ranks', () => {
    for (const metric of METRICS) {
      const rows = rankProviders(metric);
      expect(rows).toHaveLength(ALL_PROVIDERS.length);
      expect(new Set(rows.map((r) => r.provider)).size).toBe(ALL_PROVIDERS.length);
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

  it('is deterministic across calls — no shared mutable state between rankings', () => {
    const first = rankProviders('egress');
    rankProviders('entryCompute');
    expect(rankProviders('egress')).toEqual(first);
  });
});

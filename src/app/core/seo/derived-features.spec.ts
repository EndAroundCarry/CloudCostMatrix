import { describe, it, expect } from 'vitest';
import { buildDerivedFeatures } from './derived-features';
import { ALL_PROVIDERS, CloudProvider } from '../models/cloud-provider.enum';
import { allPairSlugs, parsePairSlug } from './comparison-slug';

describe('buildDerivedFeatures', () => {
  it('produces a non-empty row for every one of the 36 unordered pairs, with no NaN/undefined/blank values', () => {
    for (const slug of allPairSlugs()) {
      const { a, b } = parsePairSlug(slug)!;
      const rows = buildDerivedFeatures(a, b);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.feature).toBeTruthy();
        expect(row.category).toBeTruthy();
        expect(row.providerAVal).toBeTruthy();
        expect(row.providerAVal).not.toContain('NaN');
        expect(row.providerAVal).not.toContain('undefined');
        expect(row.providerBVal).toBeTruthy();
        expect(row.providerBVal).not.toContain('NaN');
        expect(row.providerBVal).not.toContain('undefined');
        expect(['A', 'B', 'TIE']).toContain(row.winner);
      }
    }
  });

  it('swapping (a, b) mirrors every winner (A<->B, TIE stays TIE)', () => {
    for (const slug of allPairSlugs()) {
      const { a, b } = parsePairSlug(slug)!;
      const forward = buildDerivedFeatures(a, b);
      const reversed = buildDerivedFeatures(b, a);
      expect(reversed).toHaveLength(forward.length);
      for (let i = 0; i < forward.length; i++) {
        const expectedWinner = forward[i].winner === 'A' ? 'B' : forward[i].winner === 'B' ? 'A' : 'TIE';
        expect(reversed[i].winner, `${slug} row "${forward[i].feature}"`).toBe(expectedWinner);
        expect(reversed[i].providerAVal).toBe(forward[i].providerBVal);
        expect(reversed[i].providerBVal).toBe(forward[i].providerAVal);
      }
    }
  });

  it('OVHcloud wins (or ties) the egress rows against every other provider', () => {
    for (const provider of ALL_PROVIDERS) {
      if (provider === CloudProvider.OVHCLOUD) continue;
      const rows = buildDerivedFeatures(CloudProvider.OVHCLOUD, provider);
      const egressRow = rows.find((r) => r.feature.startsWith('Internet egress'));
      expect(egressRow?.winner, `OVHcloud vs ${provider} egress`).not.toBe('B');
      const allowanceRow = rows.find((r) => r.feature === 'Free egress allowance');
      expect(allowanceRow?.providerAVal).toBe('Unlimited');
    }
  });

  it('DigitalOcean and Linode lose the archive-storage row with "Not offered" against a provider that has it', () => {
    const rows = buildDerivedFeatures(CloudProvider.DIGITALOCEAN, CloudProvider.AWS);
    const archiveRow = rows.find((r) => r.feature.startsWith('Archive storage'));
    expect(archiveRow?.providerAVal).toBe('Not offered');
    expect(archiveRow?.winner).toBe('B');

    const linodeRows = buildDerivedFeatures(CloudProvider.LINODE, CloudProvider.AWS);
    const linodeArchive = linodeRows.find((r) => r.feature.startsWith('Archive storage'));
    expect(linodeArchive?.providerAVal).toBe('Not offered');
    expect(linodeArchive?.winner).toBe('B');
  });

  it('Alibaba is the only challenger that wins the Managed SQL Server row against AWS (a tie, since AWS also offers it)', () => {
    const rows = buildDerivedFeatures(CloudProvider.ALIBABA, CloudProvider.AWS);
    const sqlRow = rows.find((r) => r.feature === 'Managed SQL Server');
    expect(sqlRow?.winner).toBe('TIE'); // both offer it
    expect(sqlRow?.providerAVal).toBe('Offered');

    const doRows = buildDerivedFeatures(CloudProvider.DIGITALOCEAN, CloudProvider.AWS);
    const doSqlRow = doRows.find((r) => r.feature === 'Managed SQL Server');
    expect(doSqlRow?.winner).toBe('B');
    expect(doSqlRow?.providerAVal).not.toBe('Offered');
  });
});

import { describe, it, expect } from 'vitest';
import { ALL_PROVIDERS, CloudProvider } from '../../models/cloud-provider.enum';
import { PROVIDER_VERIFICATION, getProviderFreshness } from './provider-verification';

describe('PROVIDER_VERIFICATION', () => {
  it('has a complete, well-formed record for every provider', () => {
    for (const p of ALL_PROVIDERS) {
      const v = PROVIDER_VERIFICATION[p];
      expect(v, `${p} missing verification record`).toBeDefined();
      expect(v.provider).toBe(p);
      expect(v.sourceUrl.startsWith('https://')).toBe(true);
      expect(v.caveats.length).toBeGreaterThan(0);
      const parsed = new Date(v.lastVerifiedAt);
      expect(Number.isNaN(parsed.getTime()), `${p} lastVerifiedAt does not parse`).toBe(false);
      expect(parsed.getTime()).toBeLessThanOrEqual(Date.now());
    }
  });
});

describe('getProviderFreshness', () => {
  it('reports LIVE exactly for providers whose live-cache source starts with "live@"', () => {
    // AWS, Azure, Oracle, and Linode have live fetchers wired up today (see
    // scripts/fetchers/). This reads whatever is actually committed in
    // live-pricing-cache.json, so it reflects the last real sync, not a fixture.
    for (const p of [CloudProvider.AWS, CloudProvider.AZURE, CloudProvider.ORACLE, CloudProvider.LINODE]) {
      expect(getProviderFreshness(p).tier, `${p} should be LIVE`).toBe('LIVE');
      expect(getProviderFreshness(p).label).toContain('Live');
    }
  });

  it('never reports LIVE for a provider with no fetcher configured', () => {
    for (const p of [CloudProvider.IBM, CloudProvider.DIGITALOCEAN, CloudProvider.ALIBABA, CloudProvider.OVHCLOUD]) {
      expect(getProviderFreshness(p).tier).not.toBe('LIVE');
    }
  });

  it('every freshness result carries a non-empty label and a valid source URL', () => {
    for (const p of ALL_PROVIDERS) {
      const f = getProviderFreshness(p);
      expect(f.label).toBeTruthy();
      expect(f.sourceUrl.startsWith('https://')).toBe(true);
    }
  });
});

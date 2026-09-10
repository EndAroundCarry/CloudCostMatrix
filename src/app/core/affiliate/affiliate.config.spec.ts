import { describe, it, expect } from 'vitest';
import { AFFILIATE_LINKS, resolveProviderCta } from './affiliate.config';
import { ALL_PROVIDERS, PROVIDER_METAS } from '../models/cloud-provider.enum';

describe('affiliate.config', () => {
  it('has an entry for every provider', () => {
    for (const p of ALL_PROVIDERS) {
      expect(AFFILIATE_LINKS[p]).toBeDefined();
      expect(AFFILIATE_LINKS[p].provider).toBe(p);
    }
  });

  it('falls back to ProviderMeta.pricingUrl when url is null', () => {
    for (const p of ALL_PROVIDERS) {
      if (AFFILIATE_LINKS[p].url) continue;
      const cta = resolveProviderCta(p);
      expect(cta.href).toBe(PROVIDER_METAS[p].pricingUrl);
      expect(cta.isPaid).toBe(false);
    }
  });

  it('rel contains "sponsored" if and only if isPaid && url are both set, and always contains "nofollow"', () => {
    for (const p of ALL_PROVIDERS) {
      const link = AFFILIATE_LINKS[p];
      const cta = resolveProviderCta(p);
      const shouldBeSponsored = link.isPaid && !!link.url;
      expect(cta.rel.includes('sponsored')).toBe(shouldBeSponsored);
      expect(cta.rel.includes('nofollow')).toBe(true);
    }
  });

  it('every configured affiliate URL is https', () => {
    for (const p of ALL_PROVIDERS) {
      const url = AFFILIATE_LINKS[p].url;
      if (url) expect(url.startsWith('https://')).toBe(true);
    }
  });

  // Structural guard, best-effort in a browser-scoped test environment (no
  // Node fs types here): asserts the ranking engine's own module namespace
  // exposes nothing named after this file, so a future refactor that pulls
  // affiliate data into the engine's exports (and by extension its math)
  // doesn't slip past silently. A real static-analysis version of this check
  // (grepping core/engine/**/*.ts for the import) is a good CI addition
  // outside this test target.
  it('the cost engine module has no affiliate-shaped exports', async () => {
    const engineModule = await import('../engine/cost-calculator.engine');
    const exportNames = Object.keys(engineModule).join(' ').toLowerCase();
    expect(exportNames).not.toContain('affiliate');
  });
});

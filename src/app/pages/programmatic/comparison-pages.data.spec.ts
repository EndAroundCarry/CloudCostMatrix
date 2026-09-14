import { describe, it, expect } from 'vitest';
import {
  COMPARISON_PAGES,
  COMPARISON_SLUGS,
  indexableSlugForPair,
  relatedComparisons
} from './comparison-pages.data';
import { CloudProvider } from '../../core/models/cloud-provider.enum';
import { allPairSlugs, parsePairSlug } from '../../core/seo/comparison-slug';

/**
 * The pair space is 45 pages with one indexable URL each. These tests exist
 * because getting that wrong is invisible in the UI but expensive in search:
 * two URLs for one pair compete with each other, and a pair with no indexable
 * URL is simply not discoverable.
 */
describe('comparison-pages.data — pair coverage', () => {
  it('gives every pair exactly one indexable URL, order-independently', () => {
    const claimed = new Map<string, string>();

    for (const forwardSlug of allPairSlugs()) {
      const parsed = parsePairSlug(forwardSlug)!;
      const indexable = indexableSlugForPair(parsed.a, parsed.b);

      // Asking about the same pair the other way round must land on the same URL.
      expect(indexableSlugForPair(parsed.b, parsed.a)).toBe(indexable);

      // And no two pairs may claim the same page.
      expect(claimed.has(indexable), `${indexable} is claimed by two pairs`).toBe(false);
      claimed.set(indexable, forwardSlug);

      // The URL is either a real curated page, or the canonical forward slug.
      const curated = COMPARISON_PAGES[indexable] !== undefined;
      expect(curated || indexable === forwardSlug).toBe(true);
      if (!curated) expect(parsePairSlug(indexable)!.isReversed).toBe(false);
    }

    expect(claimed.size).toBe(45);
  });

  it('routes a pair to its curated page even when that page was authored reverse-ordered', () => {
    // 'oracle-vs-aws' predates forward-ordering and must keep the traffic it has.
    expect(indexableSlugForPair(CloudProvider.AWS, CloudProvider.ORACLE)).toBe('oracle-vs-aws');
    expect(indexableSlugForPair(CloudProvider.ORACLE, CloudProvider.AWS)).toBe('oracle-vs-aws');
  });

  it('falls back to the canonical forward slug for pairs with no curated page', () => {
    expect(indexableSlugForPair(CloudProvider.GCP, CloudProvider.IBM)).toBe('gcp-vs-ibm');
    expect(indexableSlugForPair(CloudProvider.IBM, CloudProvider.GCP)).toBe('gcp-vs-ibm');
  });

  it('does not let a topical or three-provider curated page claim a pair', () => {
    // '…-egress' pages are not pairs, so AWS↔Oracle's pair page stays the curated pair page.
    expect(indexableSlugForPair(CloudProvider.AWS, CloudProvider.ORACLE)).not.toContain('egress');
  });

  it('produces related links that are never self-referential and never dead', () => {
    for (const slug of COMPARISON_SLUGS) {
      const page = COMPARISON_PAGES[slug];
      if (!page.providerA || !page.providerB) continue;

      const indexable = indexableSlugForPair(page.providerA, page.providerB);
      const links = relatedComparisons(page.providerA, page.providerB, indexable);

      expect(links.length, `${slug} should link out`).toBeGreaterThan(0);
      expect(links.length).toBeLessThanOrEqual(8);
      expect(new Set(links.map((l) => l.slug)).size).toBe(links.length);
      expect(links.some((l) => l.slug === indexable), `${slug} links to itself`).toBe(false);

      for (const link of links) {
        // Every target must actually resolve — curated page or parsable pair.
        expect(
          COMPARISON_PAGES[link.slug] !== undefined || parsePairSlug(link.slug) !== null,
          `${slug} links to unresolvable ${link.slug}`
        ).toBe(true);
        expect(link.label.length).toBeGreaterThan(0);
      }
    }
  });
});

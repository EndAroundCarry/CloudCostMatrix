import { describe, it, expect } from 'vitest';
import { parsePairSlug, buildPairSlug, allPairSlugs, allPairOrderings, canonicalPairSlug } from './comparison-slug';
import { CloudProvider } from '../models/cloud-provider.enum';

describe('comparison-slug', () => {
  it('parses a forward-order pair as already canonical', () => {
    const parsed = parsePairSlug('aws-vs-azure');
    expect(parsed).not.toBeNull();
    expect(parsed!.a).toBe(CloudProvider.AWS);
    expect(parsed!.b).toBe(CloudProvider.AZURE);
    expect(parsed!.isReversed).toBe(false);
    expect(parsed!.canonicalSlug).toBe('aws-vs-azure');
  });

  it('parses a reversed pair and canonicalizes it forward', () => {
    const parsed = parsePairSlug('azure-vs-aws');
    expect(parsed).not.toBeNull();
    expect(parsed!.isReversed).toBe(true);
    expect(parsed!.canonicalSlug).toBe('aws-vs-azure');
  });

  it('rejects a self-pair', () => {
    expect(parsePairSlug('aws-vs-aws')).toBeNull();
  });

  it('rejects an unparseable or unknown-provider slug', () => {
    expect(parsePairSlug('garbage')).toBeNull();
    expect(parsePairSlug('aws-vs-hetzner')).toBeNull();
    expect(parsePairSlug('')).toBeNull();
  });

  it('is case-insensitive', () => {
    const parsed = parsePairSlug('AWS-VS-Azure');
    expect(parsed?.a).toBe(CloudProvider.AWS);
    expect(parsed?.b).toBe(CloudProvider.AZURE);
  });

  // This is the test that protects the site's existing rankings: if
  // CloudProvider is ever reordered, a currently-canonical, currently-ranking
  // curated slug could silently start canonicalizing to a different URL,
  // splitting whatever link equity and rankings it had accumulated.
  it('keeps every currently-curated pair slug already canonical', () => {
    const curatedPairs = ['aws-vs-azure', 'aws-vs-gcp', 'azure-vs-gcp'];
    for (const slug of curatedPairs) {
      const parsed = parsePairSlug(slug);
      expect(parsed, `${slug} should parse`).not.toBeNull();
      expect(parsed!.isReversed, `${slug} should already be canonical`).toBe(false);
      expect(parsed!.canonicalSlug).toBe(slug);
    }
  });

  it('buildPairSlug round-trips through parsePairSlug', () => {
    const slug = buildPairSlug(CloudProvider.ORACLE, CloudProvider.LINODE);
    const parsed = parsePairSlug(slug);
    expect(parsed?.canonicalSlug).toBe(slug);
  });

  it('enumerates exactly the 45 unordered pairs for 10 providers, all forward-ordered', () => {
    const slugs = allPairSlugs();
    expect(slugs).toHaveLength(45); // C(10,2)
    expect(new Set(slugs).size).toBe(45); // no duplicates
    for (const slug of slugs) {
      const parsed = parsePairSlug(slug);
      expect(parsed?.isReversed).toBe(false);
    }
  });

  it('enumerates both orderings of every pair, half of which canonicalize forward', () => {
    const orderings = allPairOrderings();
    expect(orderings).toHaveLength(90); // 45 pairs × 2 orderings
    expect(new Set(orderings).size).toBe(90); // no duplicates

    const canonical = new Set(allPairSlugs());
    let reversedCount = 0;
    for (const slug of orderings) {
      const parsed = parsePairSlug(slug);
      expect(parsed, `${slug} should parse`).not.toBeNull();
      // every ordering resolves to one of the 45 canonical URLs
      expect(canonical.has(parsed!.canonicalSlug)).toBe(true);
      if (parsed!.isReversed) reversedCount++;
    }
    expect(reversedCount).toBe(45);
  });

  it('canonicalPairSlug is order-independent', () => {
    expect(canonicalPairSlug(CloudProvider.ORACLE, CloudProvider.AWS)).toBe('aws-vs-oracle');
    expect(canonicalPairSlug(CloudProvider.AWS, CloudProvider.ORACLE)).toBe('aws-vs-oracle');
  });
});

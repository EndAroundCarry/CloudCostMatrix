import { describe, it, expect } from 'vitest';
import {
  PROVIDER_PAGE_SLUGS,
  providerFromSlug,
  providerPageCopy,
  providerHeadline,
  buildProviderFaqs,
  buildComputeRows,
  buildStorageRows,
  buildDatabaseRows,
  buildNetworkingRows,
  buildKubernetesRows,
  buildWorkloadRows,
  buildRankNotes,
  providerComparisonLinks
} from './provider-pages.data';
import { ALL_PROVIDERS, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';

/**
 * Provider pages are the largest programmatic surface on the site, so the
 * checks that matter are the ones a crawler would notice: unique titles and
 * descriptions, real content in every table, and copy that does not contradict
 * the catalogs it is generated from.
 */
describe('provider-pages.data', () => {
  it('maps every provider to exactly one slug, in both directions', () => {
    expect(PROVIDER_PAGE_SLUGS).toHaveLength(ALL_PROVIDERS.length);
    expect(new Set(PROVIDER_PAGE_SLUGS).size).toBe(ALL_PROVIDERS.length);

    for (const provider of ALL_PROVIDERS) {
      expect(providerFromSlug(PROVIDER_METAS[provider].slug)).toBe(provider);
    }
    expect(providerFromSlug('HETZNER')).toBeNull();
    expect(providerFromSlug('')).toBeNull();
  });

  it('keeps titles and descriptions unique and inside the lengths search engines render', () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const provider of ALL_PROVIDERS) {
      const copy = providerPageCopy(provider);

      // SeoService appends ' | CloudCostMatrix' (17 chars) to the title.
      expect(copy.title.length, copy.title).toBeLessThanOrEqual(45);
      expect(copy.metaDescription.length, copy.metaDescription).toBeGreaterThanOrEqual(50);
      expect(copy.metaDescription.length, copy.metaDescription).toBeLessThanOrEqual(165);

      expect(titles.has(copy.title), `duplicate title: ${copy.title}`).toBe(false);
      expect(descriptions.has(copy.metaDescription), `duplicate description for ${provider}`).toBe(false);
      titles.add(copy.title);
      descriptions.add(copy.metaDescription);
    }
  });

  it('gives every provider a headline naming its own branded services', () => {
    const headlines = new Set<string>();
    for (const provider of ALL_PROVIDERS) {
      const headline = providerHeadline(provider);
      const meta = PROVIDER_METAS[provider];
      expect(headline).toContain(meta.name);
      expect(headline).toContain(meta.services.compute);
      expect(headline).toContain(meta.services.objectStorage);
      expect(headlines.has(headline)).toBe(false);
      headlines.add(headline);
    }
  });

  it('assembles six FAQs per provider with no unresolved placeholders', () => {
    for (const provider of ALL_PROVIDERS) {
      const faqs = buildProviderFaqs(provider);
      expect(faqs.length).toBe(6);
      expect(new Set(faqs.map((f) => f.question)).size).toBe(6);

      for (const faq of faqs) {
        expect(faq.question).toMatch(/\?$/);
        expect(faq.answer.length).toBeGreaterThan(100);
        expect(faq.answer).not.toMatch(/undefined|NaN|\[object/);
      }
    }
  });

  it('derives a non-empty table for every section of every provider page', () => {
    for (const provider of ALL_PROVIDERS) {
      expect(buildComputeRows(provider).length, `${provider} compute`).toBeGreaterThan(0);
      expect(buildStorageRows(provider).length, `${provider} storage`).toBeGreaterThan(0);
      expect(buildDatabaseRows(provider).length, `${provider} database`).toBeGreaterThan(0);
      expect(buildNetworkingRows(provider).length, `${provider} networking`).toBeGreaterThan(0);
      expect(buildKubernetesRows(provider).length, `${provider} kubernetes`).toBeGreaterThan(0);
      expect(buildWorkloadRows(provider).length, `${provider} workloads`).toBeGreaterThan(0);
      expect(buildRankNotes(provider).length, `${provider} rankings`).toBeGreaterThan(0);
      expect(providerComparisonLinks(provider)).toHaveLength(ALL_PROVIDERS.length - 1);
    }
  });

  it('prices every compute shape and every reference workload without gaps', () => {
    for (const provider of ALL_PROVIDERS) {
      for (const row of buildComputeRows(provider)) {
        expect(row.onDemand, `${provider} ${row.name}`).toMatch(/^\$\d/);
        expect(row.shape).toMatch(/vCPU/);
      }
      for (const workload of buildWorkloadRows(provider)) {
        expect(workload.monthly, `${provider} ${workload.name}`).toMatch(/^\$\d/);
        expect(workload.monthly).not.toContain('NaN');
        expect(workload.annual).toMatch(/^\$\d/);
      }
    }
  });

  it('shows capability-gated storage tiers as not offered rather than dropping them', () => {
    // DigitalOcean Spaces has a single class; the other three tiers must still be stated.
    const rows = buildStorageRows(ALL_PROVIDERS.find((p) => PROVIDER_METAS[p].slug === 'digitalocean')!);
    expect(rows).toHaveLength(4);
    expect(rows.filter((r) => r.value === 'Not offered').length).toBe(3);
    for (const row of rows.filter((r) => r.value === 'Not offered')) {
      expect(row.note, row.label).toBeTruthy();
    }
  });

  it('links to every other provider at that pair\u2019s indexable URL', () => {
    const links = providerComparisonLinks(ALL_PROVIDERS[0]);
    expect(new Set(links.map((l) => l.slug)).size).toBe(links.length);
    for (const link of links) {
      expect(link.slug).toContain(PROVIDER_METAS[ALL_PROVIDERS[0]].slug);
      expect(link.label).toContain(PROVIDER_METAS[ALL_PROVIDERS[0]].shortName);
    }
  });
});

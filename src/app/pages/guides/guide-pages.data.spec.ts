import { describe, it, expect } from 'vitest';
import { GUIDE_PAGES, GUIDE_SLUGS, GUIDE_TABS } from './guide-pages.data';
import { COMPARISON_PAGES } from '../programmatic/comparison-pages.data';

describe('guide-pages.data', () => {
  it('exposes the three content-pivot guides', () => {
    expect(GUIDE_SLUGS).toEqual([
      'cheapest-cloud-egress-pricing',
      'cheapest-cloud-provider-for-startups',
      'eu-cloud-providers-gdpr-data-residency'
    ]);
  });

  it('keys each entry by its own slug, so routing and data can never disagree', () => {
    for (const [slug, page] of Object.entries(GUIDE_PAGES)) {
      expect(page.slug).toBe(slug);
    }
  });

  it('derives the tab strip from the pages', () => {
    expect(GUIDE_TABS.map((t) => t.slug)).toEqual(GUIDE_SLUGS);
    for (const tab of GUIDE_TABS) {
      expect(tab.label.length).toBeGreaterThan(0);
      expect(tab.label).toBe(GUIDE_PAGES[tab.slug].tabLabel);
    }
  });

  it('gives every guide the content the page actually renders', () => {
    for (const slug of GUIDE_SLUGS) {
      const page = GUIDE_PAGES[slug];
      expect(page.headline.length).toBeGreaterThan(0);
      expect(page.summary.length).toBeGreaterThan(0);
      expect(page.metaDescription.length).toBeGreaterThan(0);
      expect(page.keywords.length).toBeGreaterThan(0);
      expect(page.faqs.length).toBeGreaterThanOrEqual(2);
      expect(page.caveats.length).toBeGreaterThan(0);
      expect(page.relatedSlugs.length).toBeGreaterThan(0);
      for (const faq of page.faqs) {
        expect(faq.question.length).toBeGreaterThan(0);
        expect(faq.answer.length).toBeGreaterThan(0);
      }
    }
  });

  it('points every relatedSlug at a real curated comparison', () => {
    // A typo'd slug would otherwise render an empty cross-link section silently.
    for (const slug of GUIDE_SLUGS) {
      for (const related of GUIDE_PAGES[slug].relatedSlugs) {
        expect(COMPARISON_PAGES[related], `${slug} → ${related}`).toBeDefined();
      }
    }
  });

  it('gives provider-note rows a label and a note', () => {
    for (const slug of GUIDE_SLUGS) {
      for (const note of GUIDE_PAGES[slug].providerNotes ?? []) {
        expect(note.label.length).toBeGreaterThan(0);
        expect(note.note.length).toBeGreaterThan(0);
      }
    }
  });
});

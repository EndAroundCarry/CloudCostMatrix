import { describe, it, expect } from 'vitest';
import { buildDerivedComparison } from './derived-comparison';
import { buildDerivedFeatures } from './derived-features';
import { CostCalculatorEngine } from '../engine/cost-calculator.engine';
import { ARCHITECTURE_BLUEPRINTS } from '../models/blueprints.model';
import { PROVIDER_METAS, CloudProvider } from '../models/cloud-provider.enum';

const REFERENCE = ARCHITECTURE_BLUEPRINTS[0].config;

function contentFor(a: CloudProvider, b: CloudProvider) {
  const matrix = CostCalculatorEngine.calculateFullMatrix({ ...REFERENCE, selectedProviders: [a, b] });
  return buildDerivedComparison(a, b, matrix, buildDerivedFeatures(a, b));
}

/**
 * These pages are generated, which is exactly why they need tests: a generated
 * page that says nothing pair-specific is scaled content, and the whole reason
 * indexing them is defensible is that every answer quotes this pair's own
 * computed numbers.
 */
describe('buildDerivedComparison', () => {
  it('quotes both providers\u2019 real monthly totals in the first FAQ answer', () => {
    const a = CloudProvider.GCP;
    const b = CloudProvider.IBM;
    const matrix = CostCalculatorEngine.calculateFullMatrix({ ...REFERENCE, selectedProviders: [a, b] });
    const content = buildDerivedComparison(a, b, matrix, buildDerivedFeatures(a, b));

    const answer = content.faqs[0].answer;
    for (const provider of [a, b]) {
      const total = Math.round(matrix.providers[provider].monthlyTotal).toLocaleString('en-US');
      expect(answer, `${answer} should quote ${provider}`).toContain(`$${total}/mo`);
    }
  });

  it('summarizes the verdict with the winner and the difference', () => {
    const content = contentFor(CloudProvider.LINODE, CloudProvider.VULTR);
    expect(content.summary).toMatch(/— a \d+% difference/);
    expect(content.summary).toContain(REFERENCE.name);
    expect(content.summary.length).toBeGreaterThan(200);
  });

  it('asks five substantive, distinct questions with no unresolved placeholders', () => {
    const content = contentFor(CloudProvider.AWS, CloudProvider.ALIBABA);

    expect(content.faqs).toHaveLength(5);
    expect(new Set(content.faqs.map((f) => f.question)).size).toBe(5);
    for (const faq of content.faqs) {
      expect(faq.question).toMatch(/\?$/);
      expect(faq.answer.length).toBeGreaterThan(120);
      expect(faq.answer).not.toMatch(/undefined|NaN|\[object/);
    }
  });

  it('keeps the meta description inside the length search engines render', () => {
    for (const [a, b] of [
      [CloudProvider.GCP, CloudProvider.IBM],
      [CloudProvider.DIGITALOCEAN, CloudProvider.OVHCLOUD],
      [CloudProvider.AWS, CloudProvider.ALIBABA]
    ] as [CloudProvider, CloudProvider][]) {
      const content = contentFor(a, b);
      expect(content.metaDescription.length).toBeLessThanOrEqual(165);
      expect(content.metaDescription).toContain(PROVIDER_METAS[a].shortName);
      expect(content.metaDescription).toContain(PROVIDER_METAS[b].shortName);
    }
  });

  it('reports the same numbers whichever way the pair is queried', () => {
    const forward = contentFor(CloudProvider.AWS, CloudProvider.ORACLE);
    const reversed = contentFor(CloudProvider.ORACLE, CloudProvider.AWS);

    const moneyTokens = (faqs: { answer: string }[]) =>
      [...faqs.map((f) => f.answer).join(' ').matchAll(/\$[\d,]+(?:\.\d+)?/g)].map((m) => m[0]).sort();

    // The copy names the providers in the order the URL was requested…
    expect(forward.slugTitle).toBe('AWS vs Oracle');
    expect(reversed.slugTitle).toBe('Oracle vs AWS');

    // …but the facts must not move with the word order, or the reversed (noindex)
    // page would contradict the canonical one it consolidates into.
    expect(moneyTokens(reversed.faqs)).toEqual(moneyTokens(forward.faqs));
  });

  it('says something different for different pairs', () => {
    const one = contentFor(CloudProvider.GCP, CloudProvider.IBM);
    const other = contentFor(CloudProvider.LINODE, CloudProvider.VULTR);

    expect(one.faqs[0].answer).not.toBe(other.faqs[0].answer);
    expect(one.summary).not.toBe(other.summary);
    expect(one.metaDescription).not.toBe(other.metaDescription);
  });
});

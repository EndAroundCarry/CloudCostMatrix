import { describe, it, expect } from 'vitest';
import { ALL_PROVIDERS, CloudProvider } from '../../models/cloud-provider.enum';
import { PROVIDER_VERIFICATION, freshnessFromSource, getProviderFreshness } from './provider-verification';

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
    // AWS, Azure, GCP, Oracle, Linode, DigitalOcean, and IBM have live fetchers
    // wired up today (see scripts/fetchers/). This reads whatever is actually
    // committed in live-pricing-cache.json, so it reflects the last real sync.
    for (const p of [
      CloudProvider.AWS,
      CloudProvider.AZURE,
      CloudProvider.GCP,
      CloudProvider.ORACLE,
      CloudProvider.LINODE,
      CloudProvider.DIGITALOCEAN,
      CloudProvider.IBM
    ]) {
      expect(getProviderFreshness(p).tier, `${p} should be LIVE`).toBe('LIVE');
      expect(getProviderFreshness(p).label).toContain('Live');
    }
  });

  it('never reports LIVE for the providers with no live (or FX-converted) fetcher configured', () => {
    for (const p of [CloudProvider.ALIBABA, CloudProvider.VULTR]) {
      expect(getProviderFreshness(p).tier).not.toBe('LIVE');
      expect(getProviderFreshness(p).tier).not.toBe('LIVE_FX_CONVERTED');
    }
  });

  it('reports OVHcloud as FX-converted — never as plain LIVE — when the committed sync converted it', () => {
    const f = getProviderFreshness(CloudProvider.OVHCLOUD);
    expect(f.tier).not.toBe('LIVE');
    expect(f.tier).toBe('LIVE_FX_CONVERTED');
    expect(f.label).toContain('FX-converted');
  });

  it('every freshness result carries a non-empty label and a valid source URL', () => {
    for (const p of ALL_PROVIDERS) {
      const f = getProviderFreshness(p);
      expect(f.label).toBeTruthy();
      expect(f.sourceUrl.startsWith('https://')).toBe(true);
    }
  });
});

describe('freshnessFromSource — tier mapping', () => {
  const record = PROVIDER_VERIFICATION[CloudProvider.OVHCLOUD];

  it('maps an fx-converted source to LIVE_FX_CONVERTED, never to LIVE', () => {
    const f = freshnessFromSource('fx-converted@2026-09-12T04:00:00.000Z', record);
    expect(f.tier).toBe('LIVE_FX_CONVERTED');
    expect(f.tier).not.toBe('LIVE');
    expect(f.label).toContain('FX-converted');
    expect(f.asOf).toBe('2026-09-12T04:00:00.000Z');
  });

  it('maps a plain live source to LIVE', () => {
    const f = freshnessFromSource('live@2026-09-12T04:00:00.000Z', record);
    expect(f.tier).toBe('LIVE');
    expect(f.label).toContain('Live');
  });

  it('a bare "live" prefix cannot be forged by an fx-converted marker', () => {
    // Guards the header badge's counting rule, which matches sources starting
    // with "live" — an fx-converted provider must never inflate that count.
    const f = freshnessFromSource('fx-converted@2026-09-12T04:00:00.000Z', record);
    expect(f.tier.startsWith('LIVE')).toBe(true);
    expect(f.tier).not.toBe('LIVE');
  });

  it('falls back to the record method for seed sources, and to ESTIMATE for anything unknown', () => {
    expect(freshnessFromSource('seed', record).tier).toBe('ESTIMATE');
    expect(freshnessFromSource('', PROVIDER_VERIFICATION[CloudProvider.AWS]).tier).toBe('ESTIMATE');
  });

  it('still carries the record source URL and caveats on every tier', () => {
    for (const source of ['seed', 'live@2026-09-12T04:00:00.000Z', 'fx-converted@2026-09-12T04:00:00.000Z']) {
      const f = freshnessFromSource(source, record);
      expect(f.sourceUrl).toBe(record.sourceUrl);
      expect(f.caveats).toBe(record.caveats);
      expect(f.provider).toBe(CloudProvider.OVHCLOUD);
    }
  });

  it('renders the recorded FX rate and date into the caveats, not just the tier', () => {
    const fx = {
      base: 'EUR',
      quote: 'USD',
      rate: 1.1592,
      date: '2026-09-11',
      source: 'https://api.frankfurter.app/latest?from=EUR&to=USD'
    };
    const f = freshnessFromSource('fx-converted@2026-09-12T04:00:00.000Z', record, fx);
    expect(f.tier).toBe('LIVE_FX_CONVERTED');
    expect(f.caveats.length).toBe(record.caveats.length + 1);
    const joined = f.caveats.join(' ');
    expect(joined).toContain('1.1592');
    expect(joined).toContain('2026-09-11');
  });
});

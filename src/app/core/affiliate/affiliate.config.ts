import { CloudProvider, PROVIDER_METAS } from '../models/cloud-provider.enum';

/**
 * Commercial link data — deliberately a SEPARATE file from ProviderMeta.
 * ProviderMeta is imported by the cost engine, the matrix table, exports, and
 * the schema generator; commercial data has no business there. It's also a
 * compile-forced Record<CloudProvider, …> (see cloud-provider.enum.ts), which
 * would otherwise block adding a 10th provider on having signed up for its
 * referral program first.
 *
 * This is also the ONE file a referral link ever needs to be dropped into —
 * see `resolveProviderCta()` below for how the fallback works before that
 * happens.
 */
export interface AffiliateLink {
  provider: CloudProvider;
  /** Referral/affiliate URL. null → resolveProviderCta() falls back to ProviderMeta.pricingUrl (a plain, non-commission link). */
  url: string | null;
  /** Shown in the CTA copy when present. Must be literally true — this is a factual claim to a stranger, not marketing copy. */
  offer?: string;
  /** Program name, for the /disclosure page listing. */
  program?: string;
  /** false (the default for every entry until a real program exists) → plain link: no "sponsored" label, no rel=sponsored. */
  isPaid: boolean;
}

export interface ResolvedProviderCta {
  href: string;
  rel: string;
  isPaid: boolean;
  label: string;
  offer?: string;
}

/**
 * Real referral links go here once you have approved accounts. Until then,
 * every entry safely resolves to the plain pricing page — the CTA works and
 * looks right from day one, and adding a real link later is a one-line edit
 * to this file, nothing else.
 */
export const AFFILIATE_LINKS: Record<CloudProvider, AffiliateLink> = {
  [CloudProvider.AWS]: { provider: CloudProvider.AWS, url: null, isPaid: false },
  [CloudProvider.AZURE]: { provider: CloudProvider.AZURE, url: null, isPaid: false },
  [CloudProvider.GCP]: { provider: CloudProvider.GCP, url: null, isPaid: false },
  [CloudProvider.ORACLE]: { provider: CloudProvider.ORACLE, url: null, isPaid: false },
  [CloudProvider.IBM]: { provider: CloudProvider.IBM, url: null, isPaid: false },
  [CloudProvider.DIGITALOCEAN]: { provider: CloudProvider.DIGITALOCEAN, url: null, isPaid: false, program: 'DigitalOcean Referral Program (not yet enrolled)' },
  [CloudProvider.ALIBABA]: { provider: CloudProvider.ALIBABA, url: null, isPaid: false },
  [CloudProvider.LINODE]: { provider: CloudProvider.LINODE, url: null, isPaid: false, program: 'Linode/Akamai Partner Program (not yet enrolled)' },
  [CloudProvider.OVHCLOUD]: { provider: CloudProvider.OVHCLOUD, url: null, isPaid: false, program: 'OVHcloud Affiliate Program (not yet enrolled)' }
};

/**
 * Resolves the click-through target + all the attributes a CTA needs.
 * `nofollow` is applied unconditionally (paid or not) — this site should
 * never pass PageRank to nine hyperscalers from every page it has.
 */
export function resolveProviderCta(provider: CloudProvider): ResolvedProviderCta {
  const link = AFFILIATE_LINKS[provider];
  const meta = PROVIDER_METAS[provider];
  const href = link.url ?? meta.pricingUrl;
  const rel = link.isPaid && link.url ? 'sponsored noopener nofollow' : 'noopener nofollow';
  return {
    href,
    rel,
    isPaid: !!(link.isPaid && link.url),
    label: `Visit ${meta.shortName}`,
    offer: link.isPaid && link.url ? link.offer : undefined
  };
}

/** Every provider with a real (paid) affiliate link configured today — drives the /disclosure page listing. */
export function activeAffiliatePrograms(): AffiliateLink[] {
  return Object.values(AFFILIATE_LINKS).filter((l) => l.isPaid && l.url);
}

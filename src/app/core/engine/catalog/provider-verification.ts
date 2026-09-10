import { CloudProvider } from '../../models/cloud-provider.enum';
import { LIVE_PRICING_CACHE } from './pricing-catalog.resolver';

export type VerificationMethod = 'LIVE_API' | 'MANUAL_LIST_PRICE' | 'DERIVED_ESTIMATE';
export type FreshnessTier = 'LIVE' | 'VERIFIED' | 'ESTIMATE';

export interface ProviderVerification {
  provider: CloudProvider;
  /** ISO date a human last reconciled this catalog against the provider's published pricing (independent of any live-sync timestamp). */
  lastVerifiedAt: string;
  method: VerificationMethod;
  /** The exact page checked — rendered as a link on /methodology so a reader can audit us. */
  sourceUrl: string;
  /** Everything this catalog knowingly approximates. Rendered verbatim on /methodology. */
  caveats: string[];
}

export interface ProviderFreshness {
  provider: CloudProvider;
  tier: FreshnessTier;
  /** ISO instant for LIVE (from the sync timestamp), ISO date otherwise (from lastVerifiedAt). */
  asOf: string;
  label: string;
  sourceUrl: string;
  caveats: string[];
}

/**
 * Hand-maintained provenance record — deliberately OUTSIDE the sync merge
 * path in scripts/sync-prices.mjs, for the same reason PROVIDER_CAPABILITIES
 * is: a live-sync bug should never be able to silently upgrade a provider's
 * claimed accuracy. `meta.sources[p]` (see pricing-catalog.resolver.ts) only
 * distinguishes 'live@<iso>' from 'seed' — it can't distinguish "nobody has
 * fetched this" from "a human reconciled this against the pricing page on
 * date X", and only the second is worth telling a visitor.
 */
export const PROVIDER_VERIFICATION: Record<CloudProvider, ProviderVerification> = {
  [CloudProvider.AWS]: {
    provider: CloudProvider.AWS,
    lastVerifiedAt: '2026-09-07',
    method: 'LIVE_API',
    sourceUrl: 'https://aws.amazon.com/s3/pricing/',
    caveats: ['Object storage (S3) is fetched live. EC2 compute and internet egress use the seeded 2026 benchmark — the AWS Price List bulk EC2 index is ~480MB, impractical to sync on a schedule.']
  },
  [CloudProvider.AZURE]: {
    provider: CloudProvider.AZURE,
    lastVerifiedAt: '2026-09-07',
    method: 'LIVE_API',
    sourceUrl: 'https://prices.azure.com/api/retail/prices',
    caveats: ['Compute and egress are fetched live from the Azure Retail Prices API. Reserved-instance (1-yr/3-yr) and Spot rates are derived as fixed multipliers of the live on-demand rate, not fetched directly — Azure does not publish those via this API.']
  },
  [CloudProvider.GCP]: {
    provider: CloudProvider.GCP,
    lastVerifiedAt: '2026-01-15',
    method: 'MANUAL_LIST_PRICE',
    sourceUrl: 'https://cloud.google.com/compute/all-pricing',
    caveats: ['Live sync requires a GCP Cloud Billing Catalog API key which this deployment does not currently have configured — pricing is a manually-reconciled benchmark, not a live feed. Reserved and Spot rates are derived multipliers, matching Azure\'s approach.']
  },
  [CloudProvider.ORACLE]: {
    provider: CloudProvider.ORACLE,
    lastVerifiedAt: '2026-09-10',
    method: 'LIVE_API',
    sourceUrl: 'https://apexapps.oracle.com/pls/apex/cetools/api/v1/products/',
    caveats: [
      'Compute, storage, egress, and load balancer pricing sync live from OCI\'s public cetools price list (converted from OCI\'s per-OCPU billing unit — 1 OCPU = 2 vCPU on the x86 shapes modeled here). Managed database pricing is not synced live: OCI prices MySQL/Autonomous DB per ECPU, a different unit from this app\'s per-instance model, so database figures use the seeded 2026 benchmark. Reserved (1-yr/3-yr) and Spot rates are derived as fixed multipliers of the live on-demand rate — OCI\'s price list does not publish those directly.'
    ]
  },
  [CloudProvider.IBM]: {
    provider: CloudProvider.IBM,
    lastVerifiedAt: '2026-01-15',
    method: 'DERIVED_ESTIMATE',
    sourceUrl: 'https://www.ibm.com/cloud/pricing',
    caveats: ['Pricing is a relative-positioning estimate anchored to AWS list price. IBM Cloud pricing requires the Global Catalog API with IAM authentication to fetch live — not yet wired up.']
  },
  [CloudProvider.DIGITALOCEAN]: {
    provider: CloudProvider.DIGITALOCEAN,
    lastVerifiedAt: '2026-01-15',
    method: 'DERIVED_ESTIMATE',
    sourceUrl: 'https://www.digitalocean.com/pricing',
    caveats: ['Pricing is a relative-positioning estimate anchored to AWS list price. DigitalOcean\'s Droplet size API requires an authenticated API token to fetch live — not yet wired up.']
  },
  [CloudProvider.ALIBABA]: {
    provider: CloudProvider.ALIBABA,
    lastVerifiedAt: '2026-01-15',
    method: 'DERIVED_ESTIMATE',
    sourceUrl: 'https://www.alibabacloud.com/pricing',
    caveats: ['Pricing is a relative-positioning estimate anchored to AWS list price. Alibaba Cloud\'s pricing API requires signed (HMAC) requests — not yet wired up.']
  },
  [CloudProvider.LINODE]: {
    provider: CloudProvider.LINODE,
    lastVerifiedAt: '2026-09-10',
    method: 'LIVE_API',
    sourceUrl: 'https://api.linode.com/v4/linode/types',
    caveats: [
      'Compute, managed database, object storage, NodeBalancer, and Kubernetes control-plane pricing sync live from Linode\'s public v4 API. Two figures are not exposed by that API and are carried from the seeded benchmark: managed-database storage cost per GB (disk is bundled into the instance price) and the egress overage rate. The per-Droplet-equivalent pooled bandwidth allowance genuinely varies by instance size (1,000–20,000 GB) — this catalog uses one representative mid-size value rather than a per-shape allowance.'
    ]
  },
  [CloudProvider.OVHCLOUD]: {
    provider: CloudProvider.OVHCLOUD,
    lastVerifiedAt: '2026-01-15',
    method: 'DERIVED_ESTIMATE',
    sourceUrl: 'https://www.ovhcloud.com/en/public-cloud/prices/',
    caveats: ['Pricing is a relative-positioning estimate anchored to AWS list price. OVHcloud\'s public catalog API only publishes EUR/CAD/GBP pricing (no USD subsidiary) — a live USD feed would require layering a currency conversion under a "live" badge, which we\'d rather not do dishonestly.']
  }
};

/** Fuses the hand-maintained verification record with the live sync timestamp into one display-ready freshness tier. */
export function getProviderFreshness(provider: CloudProvider): ProviderFreshness {
  const verification = PROVIDER_VERIFICATION[provider];
  const source = LIVE_PRICING_CACHE.meta?.sources?.[provider] ?? 'seed';

  if (source.startsWith('live@')) {
    const asOf = source.slice('live@'.length);
    const date = new Date(asOf);
    const label = Number.isNaN(date.getTime())
      ? 'Live'
      : `Live · synced ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    return { provider, tier: 'LIVE', asOf, label, sourceUrl: verification.sourceUrl, caveats: verification.caveats };
  }

  if (verification.method === 'MANUAL_LIST_PRICE') {
    return {
      provider,
      tier: 'VERIFIED',
      asOf: verification.lastVerifiedAt,
      label: `Verified ${formatDate(verification.lastVerifiedAt)}`,
      sourceUrl: verification.sourceUrl,
      caveats: verification.caveats
    };
  }

  return {
    provider,
    tier: 'ESTIMATE',
    asOf: verification.lastVerifiedAt,
    label: 'Estimate — not yet list-verified',
    sourceUrl: verification.sourceUrl,
    caveats: verification.caveats
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

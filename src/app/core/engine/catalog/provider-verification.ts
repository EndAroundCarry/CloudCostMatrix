import { CloudProvider } from '../../models/cloud-provider.enum';
import { FxConversionMeta, LIVE_PRICING_CACHE } from './pricing-catalog.resolver';

export type VerificationMethod = 'LIVE_API' | 'LIVE_API_FX_CONVERTED' | 'MANUAL_LIST_PRICE' | 'DERIVED_ESTIMATE';
/**
 * `LIVE_FX_CONVERTED` is deliberately its own tier rather than a flavour of
 * `LIVE`: the figure was fetched, but a currency conversion sits between the
 * provider's published number and the one shown, so it must never be labelled
 * or counted as plainly live.
 */
export type FreshnessTier = 'LIVE' | 'LIVE_FX_CONVERTED' | 'VERIFIED' | 'ESTIMATE';

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
    caveats: ['S3 capacity tiers are fetched live. S3 request/operation rates, EC2 compute, and internet egress use the seeded 2026 benchmark — the AWS Price List bulk EC2 index is ~480MB, impractical to sync on a schedule.']
  },
  [CloudProvider.AZURE]: {
    provider: CloudProvider.AZURE,
    lastVerifiedAt: '2026-09-12',
    method: 'LIVE_API',
    sourceUrl: 'https://prices.azure.com/api/retail/prices',
    caveats: [
      'Compute, internet egress, and Blob Storage capacity and operation rates are fetched live from the Azure Retail Prices API (eastus). Storage is pinned to Locally-Redundant (LRS) General Block Blob v2 meters and to the marginal first-volume tier — geo-redundant (GRS/ZRS) redundancy is not modelled. Reserved-instance (1-yr/3-yr) and Spot rates are derived as fixed multipliers of the live on-demand rate, not fetched directly — Azure does not publish those via this API.'
    ]
  },
  [CloudProvider.GCP]: {
    provider: CloudProvider.GCP,
    lastVerifiedAt: '2026-09-12',
    method: 'LIVE_API',
    sourceUrl: 'https://cloudbilling.googleapis.com/v1/services/6F81-5844-456A/skus',
    caveats: [
      'Compute, object-storage capacity, and internet egress are fetched live from the Cloud Billing Catalog API (us-east1). GCP bills compute per vCPU-hour and per GB-hour per machine family, so predefined machine types are priced by multiplying those live family rates by a static shape table — the six shapes match the benchmark catalog exactly. Storage is pinned to regional (South Carolina) capacity; dual-region and multi-region rates are not modelled. Internet egress uses the Americas group rate, whose three published tiers are flattened onto this catalog\'s two-rung ladder. Object-storage operation rates, load balancer, static IP, and Kubernetes figures still carry the seeded 2026 benchmark — Cloud Storage SKUs publish no billing unit, so their operation rates cannot be converted honestly. Reserved and Spot rates are derived as fixed multipliers of the live on-demand rate.'
    ]
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
    lastVerifiedAt: '2026-09-11',
    method: 'LIVE_API',
    sourceUrl: 'https://www.digitalocean.com/pricing/droplets',
    caveats: [
      'Compute pricing syncs live from DigitalOcean\'s public Droplet pricing page for the bundled-plan families (Basic, CPU-Optimized, General Purpose, Memory-Optimized) across a 2–32 vCPU envelope. DigitalOcean\'s /v2/sizes API is deliberately NOT used: it returns a filtered catalog whose largest non-GPU Droplet is 4 vCPU, which would match a 32 vCPU request to a 4 vCPU shape and render DigitalOcean roughly 8x too cheap.',
      'Rates are derived from each plan\'s flat monthly cap (monthly / 730), not the published $/hr meter — DigitalOcean prices the hourly meter above the monthly-equivalent rate so a full month billed hourly never undercuts the bundled price.',
      'v5 Droplets are excluded: they bill per configured resource hourly with no monthly cap, so a monthly-equivalent rate is not a like-for-like comparison.',
      'Spaces object storage and Managed Databases are not published on this page, so those sections carry the seeded 2026 benchmark. Spaces has a single storage class (no Cool/Cold/Archive tiering), DigitalOcean offers no SQL Server, and it does not sell Windows Server licensing on Droplets.',
      'Bundled outbound transfer genuinely varies by plan (500–10,000 GB). This catalog models one flat per-instance allowance taken from the reference plan, not a per-shape value.'
    ]
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
    lastVerifiedAt: '2026-09-13',
    method: 'LIVE_API_FX_CONVERTED',
    sourceUrl: 'https://api.ovh.com/1.0/order/catalog/public/cloud?ovhSubsidiary=IE',
    caveats: [
      'Compute and object-storage rates sync live from OVHcloud\'s public cloud catalog in EUR (IE subsidiary). OVHcloud publishes no USD subsidiary, so every figure is converted to USD at the ECB reference rate recorded at sync time — the exact rate and date are shown with the freshness label, and this provider is labelled FX-converted, never plain live.',
      'Reserved (1-yr/3-yr) rates are derived as fixed multipliers of the live on-demand rate; OVHcloud publishes no commitment rates for these flavors via this catalog, and there is no spot tier (gated off in PROVIDER_CAPABILITIES). Object-storage operation rates are not published in a convertible billing unit and carry the seed benchmark, as does the per-instance Windows licence surcharge (OVHcloud prices Windows Server per vCore-hour on a separate SKU). Managed databases, load balancers, and static IPs are not synced and carry the seeded 2026 benchmark. Outbound internet bandwidth is unlimited and free on every Public Cloud plan.'
    ]
  }
};

/**
 * Source markers written by scripts/sync-prices.mjs into `meta.sources`:
 *
 *   'live@<iso>'          — fetched straight from the provider, no conversion
 *   'fx-converted@<iso>'  — fetched, then converted to USD at a live FX rate
 *   'seed'                — not fetched at all
 *
 * Kept as distinct prefixes so a converted figure can't be summarised as plain
 * "live" by `pricingLabel()` (which counts sources starting with `live`).
 */
export const LIVE_SOURCE_PREFIX = 'live@';
export const FX_CONVERTED_SOURCE_PREFIX = 'fx-converted@';

/**
 * Fuses a sync source marker with the hand-maintained verification record into
 * one display-ready freshness tier. Pure, so every tier — including branches no
 * provider currently exercises — is unit-testable without a fixture catalog.
 *
 * `fx` is the conversion recorded by the last sync (see FxConversionMeta). When
 * present it is appended to the caveats so the rate and date are rendered, not
 * merely implied by the tier. Omitted, the caveats are the static record's.
 */
export function freshnessFromSource(source: string, verification: ProviderVerification, fx?: FxConversionMeta): ProviderFreshness {
  const base = {
    provider: verification.provider,
    sourceUrl: verification.sourceUrl,
    caveats: verification.caveats
  };

  if (source.startsWith(FX_CONVERTED_SOURCE_PREFIX)) {
    const asOf = source.slice(FX_CONVERTED_SOURCE_PREFIX.length);
    return {
      ...base,
      caveats: fx ? [...verification.caveats, formatFxCaveat(fx)] : verification.caveats,
      tier: 'LIVE_FX_CONVERTED',
      asOf,
      label: `FX-converted · ${formatSyncDate(asOf)}`
    };
  }

  if (source.startsWith(LIVE_SOURCE_PREFIX)) {
    const asOf = source.slice(LIVE_SOURCE_PREFIX.length);
    return { ...base, tier: 'LIVE', asOf, label: `Live · synced ${formatSyncDate(asOf)}` };
  }

  if (verification.method === 'MANUAL_LIST_PRICE') {
    return {
      ...base,
      tier: 'VERIFIED',
      asOf: verification.lastVerifiedAt,
      label: `Verified ${formatDate(verification.lastVerifiedAt)}`
    };
  }

  return {
    ...base,
    tier: 'ESTIMATE',
    asOf: verification.lastVerifiedAt,
    label: 'Estimate — not yet list-verified'
  };
}

/** Fuses the hand-maintained verification record with the live sync marker for the given provider. */
export function getProviderFreshness(provider: CloudProvider): ProviderFreshness {
  const source = LIVE_PRICING_CACHE.meta?.sources?.[provider] ?? 'seed';
  const fx = LIVE_PRICING_CACHE.meta?.fx?.[provider];
  return freshnessFromSource(source, PROVIDER_VERIFICATION[provider], fx);
}

function formatFxCaveat(fx: FxConversionMeta): string {
  return `Converted at 1 ${fx.base} = ${fx.rate} ${fx.quote} (ECB reference rate dated ${fx.date}, via ${fx.source}).`;
}

function formatSyncDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

import { fetchJson, round } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* AWS — Price List Bulk API                                           */
/* ------------------------------------------------------------------ */

const AWS_S3_INDEX = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/us-east-1/index.json';

/**
 * AWS publishes authoritative current prices only via the huge bulk price list
 * (the regional EC2 index alone is ~480 MB — impractical for a cron). This
 * fetcher refreshes the part that IS compact and keyless: S3 storage tier list
 * prices (regional offer ≈ 470 KB).
 *
 * EC2 compute + internet egress are covered by the seeded baseline catalog,
 * which the app resolver transparently falls back to. If the S3 fetch fails,
 * the whole AWS provider falls back to seed/cache.
 */
export async function fetchAwsCatalog() {
  const s3Index = await fetchJson(AWS_S3_INDEX);
  const products = s3Index.products || {};
  const terms = s3Index.terms || {};
  const onDemand = terms.OnDemand || {};

  // Walk every S3 rate dimension and match tier storage by its plain
  // per-GB-month list price description (the "first 50 TB" tier line).
  const tierMatches = { HOT: null, COOL: null, COLD: null, ARCHIVE: null };

  for (const sku of Object.keys(products)) {
    const attributes = products[sku].attributes || {};
    if (attributes.location !== 'US East (N. Virginia)') continue;

    const termKeys = Object.keys(onDemand[sku] || {});
    const rateKey = termKeys[0];
    const dims = rateKey ? onDemand[sku]?.[rateKey]?.priceDimensions || {} : {};
    for (const dim of Object.keys(dims)) {
      const d = dims[dim];
      const desc = d?.description || '';
      const rate = parseFloat(d?.pricePerUnit?.USD ?? '0');
      if (!(rate > 0)) continue;
      if (d.unit !== 'GB-Mo') continue;
      if (!/storage used|storage in|first 50 TB|TimedStorage/i.test(desc)) continue;

      const sc = attributes.storageClass || '';

      // S3 Standard — "$0.023 per GB - first 50 TB / month of storage used"
      if (sc === 'General Purpose' && /first 50 TB/i.test(desc) && !/Intelligent|Annotations/i.test(desc)) {
        tierMatches.HOT = rate;
      }
      // S3 Standard-Infrequent Access → COOL
      if (/Standard-Infrequent Access|Infrequent Access tier/i.test(desc) && !/One Zone/.test(desc) && /^Standard|Infrequent Access$/i.test(sc) || sc === 'Infrequent Access' && /Standard-Infrequent Access/i.test(desc)) {
        tierMatches.COOL = rate;
      }
      // Glacier Instant Retrieval ≈ COLD (~$0.004)
      if (/Glacier Instant Retrieval/i.test(desc) && /storage used/i.test(desc) && !/checksum|retrieval fee/.test(desc)) {
        tierMatches.COLD = rate;
      }
      // Glacier Deep Archive / Intelligent-Tiering Deep Archive ≈ ARCHIVE (~$0.00099)
      if (/TimedStorage-INT-DAA|Deep Archive|DAA/i.test(desc) && rate < 0.002) {
        tierMatches.ARCHIVE = rate;
      }
    }
  }

  const storage = {
    HOT: { tier: 'HOT', costPerGbMonth: round(tierMatches.HOT ?? 0.023), costPer10kReads: 0.0004, costPer10kWrites: 0.005 },
    COOL: { tier: 'COOL', costPerGbMonth: round(tierMatches.COOL ?? 0.0125), costPer10kReads: 0.001, costPer10kWrites: 0.01 },
    COLD: { tier: 'COLD', costPerGbMonth: round(tierMatches.COLD ?? 0.0036), costPer10kReads: 0.005, costPer10kWrites: 0.013 },
    ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: round(tierMatches.ARCHIVE ?? 0.00099), costPer10kReads: 0.05, costPer10kWrites: 0.03 }
  };

  // Refuse to stamp a provider "live" if none of its tier rates matched the
  // real feed — falling back to seed is always safer than fake-live data.
  const matchedTiers = Object.values(tierMatches).filter((v) => v !== null).length;
  if (matchedTiers < 4) throw new Error(`AWS S3 parser could not resolve all storage tiers (matched ${matchedTiers}/4)`);

  return {
    provider: 'AWS',
    region: 'us-east-1 (N. Virginia)',
    // EC2 compute + egress covered by seed baseline (see note above).
    compute: [],
    storage,
    networking: {
      first10TbPerGb: 0.09,
      next40TbPerGb: 0.085,
      loadBalancerHourly: 0.0225,
      staticIpHourly: 0.005
    },
    kubernetes: { managementHourlyFeePerCluster: 0.1, freeFirstCluster: false }
  };
}

import { fetchJson, round, nearest } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* Linode (Akamai) — public v4 API, all endpoints unauthenticated       */
/* ------------------------------------------------------------------ */

const BASE = 'https://api.linode.com/v4';
// NOTE the path is singular — /v4/linodes/types (plural) 404s.
const URLS = {
  compute: `${BASE}/linode/types`,
  database: `${BASE}/databases/types`,
  lke: `${BASE}/lke/types`,
  objectStorage: `${BASE}/object-storage/types`,
  nodeBalancer: `${BASE}/nodebalancers/types`
};

const ENVELOPE = [
  { vCpu: 2, ramGb: 4 },
  { vCpu: 2, ramGb: 8 },
  { vCpu: 4, ramGb: 16 },
  { vCpu: 8, ramGb: 32 },
  { vCpu: 16, ramGb: 32 },
  { vCpu: 16, ramGb: 128 },
  { vCpu: 32, ramGb: 128 }
];

const DB_ENVELOPE = [
  { vCpu: 2, ramGb: 4 },
  { vCpu: 4, ramGb: 16 },
  { vCpu: 8, ramGb: 32 },
  { vCpu: 8, ramGb: 64 }
];

/**
 * CRITICAL: derive the effective hourly rate from `price.monthly / 730`, NOT
 * `price.hourly`. Linode's hourly meter is deliberately priced ABOVE the
 * monthly-equivalent rate (confirmed live: g6-standard-2 is $0.036/hr vs
 * $24/mo — $24/730 ≈ $0.0329, ~9% lower) so that running a full month on the
 * hourly meter never undercuts the flat monthly price. Using `hourly` directly
 * overstates Linode's real steady-state cost by that same margin.
 */
function effectiveHourly(type) {
  if (typeof type.price?.monthly !== 'number' || type.price.monthly <= 0) return null;
  return type.price.monthly / 730;
}

function familyLabel(cls) {
  if (cls === 'standard') return 'Shared CPU (g6-standard)';
  if (cls === 'dedicated') return 'Dedicated CPU (g6-dedicated)';
  if (cls === 'highmem') return 'High Memory (g7-highmem)';
  return cls;
}

export async function fetchLinodeCatalog() {
  const [computeRes, dbRes, lkeRes, objRes, nbRes] = await Promise.all([
    fetchJson(URLS.compute),
    fetchJson(URLS.database),
    fetchJson(URLS.lke),
    fetchJson(URLS.objectStorage),
    fetchJson(URLS.nodeBalancer)
  ]);

  // Current-gen only: g6-standard-*, g6-dedicated-*, and g7-highmem-* (Linode
  // has no g6 highmem tier). Excludes g7-premium/g7-dedicated-X-Y duplicates
  // and the g8-* tiers, which carry `monthly: null` (hourly-only billing) and
  // would break the monthly/730 derivation above.
  const relevant = (computeRes.data || []).filter((t) => {
    const isCurrentGen = /^g6-/.test(t.id) || /^g7-highmem-/.test(t.id);
    const validClass = ['standard', 'dedicated', 'highmem'].includes(t.class);
    return isCurrentGen && validClass && effectiveHourly(t) != null;
  });
  if (relevant.length < 5) throw new Error(`Linode compute feed returned too few usable shapes (${relevant.length})`);

  // Pick 7 DISTINCT shapes, one per envelope point. Linode's real catalog has
  // gaps (e.g. no clean 32vCPU/128GB combo), so two envelope targets can have
  // the same nearest shape — excluding already-picked candidates before each
  // subsequent pick (rather than skipping the target outright) guarantees the
  // envelope's actual min/max vCPU range is still covered.
  const picked = [];
  const remaining = [...relevant];
  for (const target of ENVELOPE) {
    if (!remaining.length) break;
    const match = nearest(remaining, target.vCpu, target.ramGb, (t) => t.vcpus, (t) => t.memory / 1024);
    if (!match) continue;
    picked.push(match);
    remaining.splice(remaining.indexOf(match), 1);
  }

  const compute = [];
  for (const match of picked) {
    const hourlyOnDemandLinux = round(effectiveHourly(match));
    compute.push({
      family: familyLabel(match.class),
      name: match.id,
      vCpu: match.vcpus,
      ramGb: round(match.memory / 1024, 1),
      // No reserved/spot pricing exists — all four rate fields are the same
      // flat on-demand rate, gated by PROVIDER_CAPABILITIES.commitments.
      hourlyOnDemandLinux,
      hourly1YrReservedLinux: hourlyOnDemandLinux,
      hourly3YrReservedLinux: hourlyOnDemandLinux,
      hourlySpotLinux: hourlyOnDemandLinux,
      windowsHourlySurcharge: 0 // windowsOs: false — never read; the WINDOWS gate intercepts first
    });
  }
  if (compute.length < 5) throw new Error(`Linode envelope mapping produced too few distinct shapes (${compute.length})`);
  const minVcpu = Math.min(...compute.map((c) => c.vCpu));
  const maxVcpu = Math.max(...compute.map((c) => c.vCpu));
  if (minVcpu > 2 || maxVcpu < 32) throw new Error(`Linode compute envelope too narrow: ${minVcpu}-${maxVcpu} vCPU`);

  // Object storage: the base "objectstorage" SKU is the $5/mo-for-250GB floor;
  // "objectstorage-overage" is mislabeled as an hourly price but its value is
  // actually a per-GB-MONTH overage rate (confirmed live: 0.02, matching the
  // seed exactly). Single storage class — same values across all four tiers,
  // gated by PROVIDER_CAPABILITIES (COOL/COLD/ARCHIVE unsupported).
  const objBase = (objRes.data || []).find((o) => o.id === 'objectstorage');
  const objOverage = (objRes.data || []).find((o) => o.id === 'objectstorage-overage');
  if (!objBase || !objOverage) throw new Error('Linode object-storage feed missing expected SKUs');
  const minimumMonthlyFee = objBase.price.monthly;
  const costPerGbMonth = round(objOverage.price.hourly, 4); // mislabeled field, see comment above
  if (!(costPerGbMonth > 0.005 && costPerGbMonth < 0.10)) throw new Error(`Linode storage rate out of expected range: ${costPerGbMonth}`);
  const storageTier = { costPerGbMonth, costPer10kReads: 0.004, costPer10kWrites: 0.05, minimumMonthlyFee };
  const storage = {
    HOT: { tier: 'HOT', ...storageTier },
    COOL: { tier: 'COOL', ...storageTier },
    COLD: { tier: 'COLD', ...storageTier },
    ARCHIVE: { tier: 'ARCHIVE', ...storageTier }
  };

  // LKE: assert the standard control plane is still free — if Akamai ever
  // starts charging for it, this should fail loudly rather than silently
  // under-price every Linode Kubernetes comparison.
  const lkeSa = (lkeRes.data || []).find((t) => t.id === 'lke-sa');
  if (!lkeSa) throw new Error('Linode LKE feed missing lke-sa (Standard Availability) SKU');
  if (lkeSa.price.hourly !== 0) throw new Error(`Linode LKE Standard Availability is no longer free (hourly=${lkeSa.price.hourly}) — update the pricing model`);

  const nodeBalancer = (nbRes.data || []).find((n) => n.id === 'nodebalancer');
  if (!nodeBalancer) throw new Error('Linode NodeBalancer feed missing base SKU');
  const loadBalancerHourly = round(nodeBalancer.price.monthly / 730);

  // Database — same distinct-pick spread approach as compute, over the
  // schema's (vcpu, memory-in-MB) shapes. Current-gen g6-* only.
  const dbCandidates = (dbRes.data || []).filter((t) => /^g6-/.test(t.id) && t.engines?.mysql?.length);
  const pickedDb = [];
  const remainingDb = [...dbCandidates];
  for (const target of DB_ENVELOPE) {
    if (!remainingDb.length) break;
    const match = nearest(remainingDb, target.vCpu, target.ramGb, (t) => t.vcpus, (t) => t.memory / 1024);
    if (!match) continue;
    pickedDb.push(match);
    remainingDb.splice(remainingDb.indexOf(match), 1);
  }

  const database = [];
  for (const match of pickedDb) {
    const qty1 = match.engines.mysql.find((e) => e.quantity === 1);
    const qty3 = match.engines.mysql.find((e) => e.quantity === 3);
    if (!qty1) continue;
    const hourlyMySql = round(qty1.price.hourly);
    database.push({
      name: match.id,
      vCpu: match.vcpus,
      ramGb: round(match.memory / 1024, 1),
      hourlyPostgres: hourlyMySql, // Linode prices Postgres/MySQL identically on the same shape
      hourlyMySql,
      hourlySqlServer: hourlyMySql, // UNSUPPORTED — cloned, gated by PROVIDER_CAPABILITIES
      storagePerGbMonth: 0.10, // not exposed by this API; carried from the seed benchmark
      multiAzMultiplier: qty3 ? round(qty3.price.hourly / qty1.price.hourly, 2) : 2.0
    });
  }
  if (database.length < 3) throw new Error(`Linode database envelope mapping produced too few shapes (${database.length})`);

  return {
    provider: 'LINODE',
    region: 'us-east (Newark)',
    compute,
    storage,
    database,
    networking: {
      first10TbPerGb: 0.005, // overage rate isn't exposed by these 5 endpoints; carried from the seed benchmark
      next40TbPerGb: 0.005,
      loadBalancerHourly,
      staticIpHourly: 0,
      // Pooled transfer is genuinely per-shape (1,000–20,000 GB depending on
      // size) — this single flat value uses the mid-size reference shape's
      // allowance as a representative approximation, since EgressBenchmark
      // models one flat bundle per instance regardless of its size.
      bundledEgressGbPerInstance: 4000,
      overageEgressPerGb: 0.005,
      egressPolicyNote: 'Transfer is pooled account-wide across every Linode; overage is billed at $0.005/GB — the lowest rate in this comparison.'
    },
    kubernetes: { managementHourlyFeePerCluster: round(lkeSa.price.hourly), freeFirstCluster: true }
  };
}

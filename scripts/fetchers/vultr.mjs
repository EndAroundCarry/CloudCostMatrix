import { fetchJson, round } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* Vultr — public v2 API. `GET /v2/plans` (compute) is unauthenticated;  */
/* the managed-database plans endpoint returns 401 without an API token, */
/* so only compute syncs live and every other section falls back to the  */
/* seed benchmark via the resolver's mergeOverSeed().                    */
/* ------------------------------------------------------------------ */

const PLANS_URL = 'https://api.vultr.com/v2/plans';

// Vultr's Cloud Compute (vc2/vhf/vhp) and Optimized Cloud Compute (voc)
// families are the local-storage IaaS products this catalog models. GPU/bare
// metal (vcg/vdm) and VX1 (block-storage-backed, where disk is billed
// separately) are excluded so a shape's price stays like-for-like with the
// other providers' bundled-compute offers.
const INCLUDED_TYPES = new Set(['vc2', 'vhf', 'vhp', 'voc']);

const FAMILY_LABELS = {
  vc2: 'Cloud Compute (Regular)',
  vhf: 'Cloud Compute (High Frequency)',
  vhp: 'Cloud Compute (High Performance)',
  voc: 'Optimized Cloud Compute'
};

// Same 7-point envelope the other providers' catalogs span, so the engine's
// nearest-match sizer always has a shape at each size instead of undersizing.
const ENVELOPE = [
  { vCpu: 2, ramGb: 4 },
  { vCpu: 2, ramGb: 8 },
  { vCpu: 4, ramGb: 16 },
  { vCpu: 8, ramGb: 32 },
  { vCpu: 16, ramGb: 32 },
  { vCpu: 16, ramGb: 128 },
  { vCpu: 32, ramGb: 128 }
];

/**
 * Vultr bills compute hourly but caps a month at 672 hours, and its published
 * `hourly_cost` is that capped meter rounded to three decimals. The app bills
 * `hourly × 730`, so the honest steady-state rate is `monthly_cost / 730` —
 * the same correction the Linode fetcher makes. Using `hourly_cost` directly
 * would understate a full month by the 672/730 gap.
 */
function effectiveHourly(plan) {
  if (typeof plan.monthly_cost !== 'number' || plan.monthly_cost <= 0) return null;
  return plan.monthly_cost / 730;
}

/**
 * Picks one distinct shape per envelope point. Within a target's vCPU count it
 * prefers the closest RAM and then the cheapest plan, so a dedicated shape
 * can't win on a distance rounding and make Vultr look far pricier than its
 * cheapest shape of that size. Falls back to any remaining plan when Vultr
 * publishes no exact vCPU count for a target.
 */
function pickEnvelope(candidates) {
  const picked = [];
  const remaining = [...candidates];
  for (const target of ENVELOPE) {
    if (!remaining.length) break;
    const exact = remaining.filter((p) => p.vcpu_count === target.vCpu);
    const pool = exact.length ? exact : remaining;
    const ranked = [...pool].sort((a, b) => {
      const da = Math.abs(a.ram / 1024 - target.ramGb);
      const db = Math.abs(b.ram / 1024 - target.ramGb);
      if (da !== db) return da - db;
      return a.monthly_cost - b.monthly_cost;
    });
    const match = ranked[0];
    picked.push(match);
    remaining.splice(remaining.indexOf(match), 1);
  }
  return picked;
}

export async function fetchVultrCatalog() {
  const res = await fetchJson(PLANS_URL);
  const plans = res?.plans;
  if (!Array.isArray(plans)) throw new Error('Vultr plans feed returned no plans array');

  const candidates = plans.filter(
    (p) =>
      INCLUDED_TYPES.has(p.type) &&
      p.gpu_brand === 'none' &&
      p.deploy_ondemand !== false &&
      effectiveHourly(p) != null
  );
  if (candidates.length < 20) {
    throw new Error(`Vultr plans feed returned too few usable shapes (${candidates.length})`);
  }

  const picked = pickEnvelope(candidates);
  if (picked.length < 5) {
    throw new Error(`Vultr envelope mapping produced too few shapes (${picked.length})`);
  }

  const compute = picked.map((plan) => {
    const hourlyOnDemandLinux = round(effectiveHourly(plan));
    return {
      family: FAMILY_LABELS[plan.type] ?? plan.type,
      name: plan.id,
      vCpu: plan.vcpu_count,
      ramGb: round(plan.ram / 1024, 1),
      // Vultr sells no reserved or spot instances — all four rates are the flat
      // on-demand rate, gated by PROVIDER_CAPABILITIES.commitments.
      hourlyOnDemandLinux,
      hourly1YrReservedLinux: hourlyOnDemandLinux,
      hourly3YrReservedLinux: hourlyOnDemandLinux,
      hourlySpotLinux: hourlyOnDemandLinux,
      // The API exposes no Windows licence rate; carry the seed's ~$0.004/vCPU-hr.
      windowsHourlySurcharge: round(0.004 * plan.vcpu_count)
    };
  });

  if (new Set(compute.map((c) => c.name)).size !== compute.length) {
    throw new Error('Vultr envelope mapping produced duplicate shapes');
  }
  const minVcpu = Math.min(...compute.map((c) => c.vCpu));
  const maxVcpu = Math.max(...compute.map((c) => c.vCpu));
  if (minVcpu > 2 || maxVcpu < 32) {
    throw new Error(`Vultr compute envelope too narrow: ${minVcpu}-${maxVcpu} vCPU`);
  }

  return {
    provider: 'VULTR',
    region: 'ewr (New Jersey)',
    compute
    // storage, database, networking, and kubernetes are intentionally omitted:
    // object storage has no public feed and managed-database plans need a token,
    // so mergeOverSeed keeps the seed benchmark for those sections.
  };
}

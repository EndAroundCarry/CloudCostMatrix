import { fetchJson, round } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* Vultr — v2 API                                                      */
/*   GET /v2/plans            compute      (unauthenticated)           */
/*   GET /v2/databases/plans  managed DB   (needs VULTR_API_KEY)       */
/*                                                                     */
/* Object storage, networking, and Kubernetes expose no pricing        */
/* endpoint and carry the seed benchmark. Vultr's compute always syncs */
/* live; the database section only syncs when VULTR_API_KEY is set and */
/* otherwise stays on its seed — a missing key must never regress the  */
/* compute rows, so the DB fetch is deliberately non-fatal.            */
/* ------------------------------------------------------------------ */

const PLANS_URL = 'https://api.vultr.com/v2/plans';
const DB_PLANS_URL = 'https://api.vultr.com/v2/databases/plans';

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

// The app requires exactly four managed-database rows; Vultr's entry-level
// Optimized shapes line up with this envelope.
const DB_ENVELOPE = [
  { vCpu: 1, ramGb: 4 },
  { vCpu: 2, ramGb: 8 },
  { vCpu: 4, ramGb: 16 },
  { vCpu: 8, ramGb: 32 }
];

/**
 * Vultr bills hourly but caps a month at 672 hours, and its published
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
 * publishes no exact vCPU count for a target. `measure` projects a plan onto
 * `{ vCpu, ramGb, cost }` so the same picker serves compute and databases.
 */
function pickEnvelope(candidates, envelope, measure) {
  const picked = [];
  const remaining = [...candidates];
  for (const target of envelope) {
    if (!remaining.length) break;
    const exact = remaining.filter((p) => measure(p).vCpu === target.vCpu);
    const pool = exact.length ? exact : remaining;
    const ranked = [...pool].sort((a, b) => {
      const da = Math.abs(measure(a).ramGb - target.ramGb);
      const db = Math.abs(measure(b).ramGb - target.ramGb);
      if (da !== db) return da - db;
      return measure(a).cost - measure(b).cost;
    });
    const match = ranked[0];
    picked.push(match);
    remaining.splice(remaining.indexOf(match), 1);
  }
  return picked;
}

/**
 * Managed databases. The endpoint needs a Personal Access Token; Vultr prices
 * PostgreSQL and MySQL identically per shape, so one rate fills both. Database
 * storage and the replica (multi-AZ) multiplier are not exposed by this
 * endpoint and carry the seed benchmark.
 */
async function fetchDatabaseRows(apiKey) {
  const res = await fetchJson(DB_PLANS_URL, { Authorization: `Bearer ${apiKey}` });
  const plans = res?.plans;
  if (!Array.isArray(plans)) throw new Error('Vultr database plans feed returned no plans array');

  const candidates = plans.filter(
    (p) =>
      (p.engine === 'pg' || p.engine === 'mysql') &&
      typeof p.vcpus === 'number' &&
      typeof p.ram === 'number' &&
      typeof p.monthly_cost === 'number' &&
      p.monthly_cost > 0
  );
  if (candidates.length < DB_ENVELOPE.length) {
    throw new Error(`Vultr database feed returned too few usable shapes (${candidates.length})`);
  }

  const picked = pickEnvelope(candidates, DB_ENVELOPE, (p) => ({
    vCpu: p.vcpus,
    ramGb: p.ram / 1024,
    cost: p.monthly_cost
  }));
  if (picked.length < DB_ENVELOPE.length) {
    throw new Error(`Vultr database envelope mapping produced too few shapes (${picked.length})`);
  }
  if (new Set(picked.map((p) => p.id)).size !== picked.length) {
    throw new Error('Vultr database envelope mapping produced duplicate shapes');
  }

  const rows = picked.map((p) => {
    const hourly = round(p.monthly_cost / 730);
    return {
      name: p.id,
      vCpu: p.vcpus,
      ramGb: round(p.ram / 1024, 1),
      hourlyPostgres: hourly,
      hourlyMySql: hourly,
      hourlySqlServer: hourly, // UNSUPPORTED — cloned, gated by PROVIDER_CAPABILITIES
      storagePerGbMonth: 0.10, // not exposed by this endpoint; carried from the seed
      multiAzMultiplier: 2.0 // not exposed by this endpoint; carried from the seed
    };
  });
  // `ram` is in MB everywhere else in Vultr's API; a sub-1-GB result means the
  // unit changed and the rows would be nonsense, so fail rather than emit them.
  if (Math.min(...rows.map((r) => r.ramGb)) < 1) {
    throw new Error('Vultr database RAM unit looks wrong (sub-1 GB minimum)');
  }
  return rows;
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

  const picked = pickEnvelope(candidates, ENVELOPE, (p) => ({
    vCpu: p.vcpu_count,
    ramGb: p.ram / 1024,
    cost: p.monthly_cost
  }));
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

  // Best-effort: a missing key or a DB-API hiccup must never take the compute
  // rows down with it, so it degrades to the seed benchmark with a warning.
  const apiKey = process.env.VULTR_API_KEY;
  let database;
  if (apiKey) {
    try {
      database = await fetchDatabaseRows(apiKey);
    } catch (err) {
      console.warn(`  ⚠️  Vultr managed-database fetch failed (${err?.message || err}). Database stays on the seed benchmark.`);
    }
  }

  return {
    provider: 'VULTR',
    region: 'ewr (New Jersey)',
    compute,
    ...(database ? { database } : {})
    // storage, networking, and kubernetes are intentionally omitted (no pricing
    // endpoint); with no database rows above, that section falls back to seed too.
  };
}

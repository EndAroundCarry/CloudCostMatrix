import { fetchText, round, nearest } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* DigitalOcean — public Droplet pricing page                          */
/* ------------------------------------------------------------------ */

const PRICING_PAGE = 'https://www.digitalocean.com/pricing/droplets';

/**
 * WHY THIS SCRAPES A PAGE INSTEAD OF USING THE API.
 *
 * DigitalOcean's `/v2/sizes` endpoint (with or without a PAT) returns a
 * FILTERED view of the catalog: 80 shapes total, of which the largest non-GPU
 * Droplet is 4 vCPU. Every larger shape 404s individually too — s-8vcpu-16gb,
 * c-8..c-48, g-4vcpu-16gb, g-8vcpu-32gb, m-16vcpu-128gb all return 404 — while
 * DO's own pricing page still sells them.
 *
 * That matters because the cost engine picks the NEAREST shape from whatever
 * list it is given. A catalog topping out at 4 vCPU would match a 32 vCPU
 * request to a 4 vCPU Droplet and render DigitalOcean roughly 8x cheaper than
 * reality — a silently wrong winner, which is worse than no live data at all.
 *
 * The pricing page is server-rendered HTML with one <tr> per plan and a link
 * carrying `size=<slug>` plus the monthly price, and it agrees exactly with the
 * API on every SKU both sources expose ($24 s-2vcpu-4gb, $48 s-4vcpu-8gb, $84
 * c-4 / m-2vcpu-16gb, $63 g-2vcpu-8gb). Parsing is pattern-based (whole-row
 * text scans) rather than column-index-based, because the tables use different
 * column counts per family.
 */

// Only the "bundled plan" families, which have a flat monthly cap and match
// the app's existing DigitalOcean families. Deliberately excluded:
//   - v5 (s5-*/g5-*): per-resource hourly billing with NO monthly cap, so a
//     monthly-equivalent rate isn't a like-for-like comparison
//   - -intel / -amd Premium variants: near-duplicate shapes at a higher price
//   - so-* (Storage-Optimized) and gpu-*: different workload classes that the
//     seed catalog doesn't model and that would distort nearest-shape matching
const FAMILY_BY_PREFIX = [
  { prefix: 's-', family: 'Basic Droplet' },
  { prefix: 'c-', family: 'CPU-Optimized Droplet' },
  { prefix: 'g-', family: 'General Purpose Droplet' },
  { prefix: 'm-', family: 'Memory-Optimized Droplet' }
];

// Compute + RAM envelope shared by every provider catalog — the nearest-match
// sizer only compares like-for-like if each provider spans the same range.
const ENVELOPE = [
  { vCpu: 2, ramGb: 4 },
  { vCpu: 2, ramGb: 8 },
  { vCpu: 4, ramGb: 16 },
  { vCpu: 8, ramGb: 32 },
  { vCpu: 16, ramGb: 32 },
  { vCpu: 16, ramGb: 128 },
  { vCpu: 32, ramGb: 128 }
];

const HOURS_PER_MONTH = 730;

function familyFor(slug) {
  const hit = FAMILY_BY_PREFIX.find((f) => slug.startsWith(f.prefix));
  return hit ? hit.family : null;
}

function toNumber(text) {
  return parseFloat(String(text).replace(/,/g, ''));
}

function memoryToGb(text, unit) {
  const value = toNumber(text);
  return /mib/i.test(unit) ? value / 1024 : value;
}

/**
 * Extracts one row per plan from the pricing page's server-rendered tables.
 * Returns raw candidates; selection/dedup happens in fetchDigitalOceanCatalog.
 */
export function parseDropletPricing(html) {
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  const out = [];

  for (const row of rows) {
    // The plan link is the only place the slug and the monthly price coexist.
    // The slug is percent-encoded in the href (`...new%3Fsize%3Dg-32vcpu-128gb`),
    // so accept both the raw and %3D forms.
    const link = row.match(/<a\b[^>]*size(?:=|%3D)([a-z0-9][a-z0-9-]*)[^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const slug = link[1];

    const family = familyFor(slug);
    if (!family) continue;

    // React renders interpolated text as `$<!-- -->1,008.00`; strip tags and
    // comments before reading the price.
    const linkText = link[2].replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '');
    const monthlyMatch = linkText.match(/([\d,]+\.\d{2})/);
    if (!monthlyMatch) continue;
    const monthly = toNumber(monthlyMatch[1]);

    // vCPU, memory and bundled transfer are scanned from the row text rather
    // than read by column index (column counts differ per family table).
    const rowText = row.replace(/<[^>]*>/g, ' ');
    const vCpuMatch = rowText.match(/([\d,]+)\s*vCPUs?\b/i);
    if (!vCpuMatch) continue;
    const vCpu = toNumber(vCpuMatch[1]);

    const sizes = [...rowText.matchAll(/([\d,]+(?:\.\d+)?)\s*(GiB|MiB)\b/gi)];
    if (!sizes.length) continue;
    const ramGb = memoryToGb(sizes[0][1], sizes[0][2]);
    // Memory is always the first <unit> cell; the second is the transfer
    // allowance, when the table has one.
    const transferGb = sizes.length > 1 ? memoryToGb(sizes[1][1], sizes[1][2]) : null;

    if (!(monthly > 0) || !(vCpu > 0) || !(ramGb > 0)) continue;
    out.push({ slug, family, vCpu, ramGb, monthly, transferGb });
  }

  return out;
}

/**
 * Keeps one candidate per (vCPU, RAM) pair, preferring the base "Regular"
 * slug over -intel/-amd Premium duplicates (same shape, higher price) so the
 * engine's nearest-match can't flip between two prices for one shape.
 */
export function dedupeCandidates(candidates) {
  const best = new Map();
  for (const c of candidates) {
    const key = `${c.vCpu}x${c.ramGb}`;
    const premium = /-(intel|amd)\b/.test(c.slug);
    const incumbent = best.get(key);
    if (!incumbent) {
      best.set(key, c);
      continue;
    }
    const incPremium = /-(intel|amd)\b/.test(incumbent.slug);
    if (incPremium && !premium) best.set(key, c);
  }
  return [...best.values()];
}

export async function fetchDigitalOceanCatalog() {
  const html = await fetchText(PRICING_PAGE);
  const parsed = parseDropletPricing(html);

  // Page-shape guard: a redesign that breaks the parser must fall back to seed
  // (the orchestrator handles that) rather than publish a near-empty catalog.
  // Measured on the RAW parse, before dedupe collapses same-shape Premium
  // duplicates — ~25 bundled rows is the expected magnitude.
  if (parsed.length < 20) {
    throw new Error(`DigitalOcean pricing page parse produced too few plans (${parsed.length}) — page structure may have changed`);
  }

  const candidates = dedupeCandidates(parsed);

  // Pick 7 DISTINCT shapes, one per envelope point, excluding already-picked
  // candidates so the min/max vCPU range is still covered where the catalog
  // has gaps.
  const picked = [];
  const remaining = [...candidates];
  for (const target of ENVELOPE) {
    if (!remaining.length) break;
    const match = nearest(remaining, target.vCpu, target.ramGb, (c) => c.vCpu, (c) => c.ramGb);
    if (!match) continue;
    picked.push(match);
    remaining.splice(remaining.indexOf(match), 1);
  }
  if (picked.length < 5) throw new Error(`DigitalOcean envelope mapping produced too few distinct shapes (${picked.length})`);

  const minVcpu = Math.min(...picked.map((c) => c.vCpu));
  const maxVcpu = Math.max(...picked.map((c) => c.vCpu));
  if (minVcpu > 2 || maxVcpu < 32) {
    throw new Error(`DigitalOcean compute envelope too narrow: ${minVcpu}-${maxVcpu} vCPU (need <=2 and >=32)`);
  }

  const compute = picked.map((c) => {
    // CRITICAL: derive the effective rate from the flat monthly price, NOT the
    // page's $/hr column. DigitalOcean's hourly meter is priced ABOVE the
    // monthly-equivalent rate (e.g. g-32vcpu-128gb lists $1.50000/hr but
    // $1,008/mo, i.e. $1.3808/hr) precisely so that running a full month on the
    // hourly meter never undercuts the bundled monthly cap. Using $/hr directly
    // would overstate steady-state cost by ~9%.
    const hourlyOnDemandLinux = round(c.monthly / HOURS_PER_MONTH);
    return {
      family: c.family,
      name: c.slug,
      vCpu: c.vCpu,
      ramGb: round(c.ramGb, 1),
      hourlyOnDemandLinux,
      // No reserved or spot pricing exists on Droplets — every rate is the
      // same flat on-demand rate, gated by PROVIDER_CAPABILITIES.commitments.
      hourly1YrReservedLinux: hourlyOnDemandLinux,
      hourly3YrReservedLinux: hourlyOnDemandLinux,
      hourlySpotLinux: hourlyOnDemandLinux,
      windowsHourlySurcharge: 0 // windowsOs: false — never read; the WINDOWS gate intercepts first
    };
  });

  // Bundled transfer is genuinely per-shape (500 GiB to 10,000+ GiB by plan),
  // but EgressBenchmark models a single flat per-instance allowance. Use the
  // reference shape's allowance and say so, rather than inventing an average.
  const reference = nearest(picked, 4, 16, (c) => c.vCpu, (c) => c.ramGb);
  const bundledEgressGbPerInstance = reference?.transferGb ? Math.round(reference.transferGb) : null;
  if (!bundledEgressGbPerInstance) {
    throw new Error('DigitalOcean pricing page did not expose a transfer allowance for the reference shape');
  }

  return {
    provider: 'DIGITALOCEAN',
    // DO prices Droplets uniformly across regions, so the seeded reference
    // region is kept rather than implying region-specific rates.
    region: 'NYC3 (New York)',
    compute,
    // storage / database / kubernetes are intentionally omitted: Spaces and
    // Managed Databases pricing are not published on this page, and mergeOverSeed
    // keeps the seeded sections when a fetcher omits them.
    networking: {
      bundledEgressGbPerInstance,
      overageEgressPerGb: 0.01, // not published on this page; carried from the seed benchmark
      egressPolicyNote: `Bandwidth is pooled account-wide and bundled per Droplet (${bundledEgressGbPerInstance.toLocaleString('en-US')} GB on the ${reference.slug} reference plan; other plans range higher or lower); overage is billed at a flat $0.01/GB once the allowance is exhausted.`
    }
  };
}

// Exported for fixture-based unit tests only.
export const __internal = {
  parseDropletPricing,
  dedupeCandidates,
  familyFor,
  ENVELOPE,
  HOURS_PER_MONTH,
  PRICING_PAGE
};

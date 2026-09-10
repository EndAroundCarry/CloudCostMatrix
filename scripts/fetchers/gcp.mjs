import { fetchJson, round } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* GCP — Cloud Billing Catalog API (Compute Engine)                    */
/* ------------------------------------------------------------------ */

const GCP_COMPUTE_SERVICE_ID = '6F81-5844-456A';

function computeUrl() {
  const apiKey = process.env.GCP_API_KEY || '';
  return `https://cloudbilling.googleapis.com/v1/services/${GCP_COMPUTE_SERVICE_ID}/skus?currencyCode=USD&pageSize=5000${
    apiKey ? `&key=${apiKey}` : ''
  }`;
}

/**
 * The authoritative GCP Cloud Billing Catalog API requires an API key for
 * anonymous requests. When GCP_API_KEY is absent we honestly skip the live
 * fetch and fall back to cache/seed (the orchestrator handles that) so a
 * keyless run never claims GCP is "live" when it is not.
 */
export async function fetchGcpCatalog() {
  if (!process.env.GCP_API_KEY) {
    throw new Error('No GCP_API_KEY configured — skipping live GCP catalog fetch (app uses seed/cache).');
  }
  const data = await fetchJson(computeUrl());
  const parsed = parseGcpSkus(data.skus || []);
  if (!parsed.compute.length) throw new Error('GCP catalog parse produced no shapes');
  return parsed;
}

export function parseGcpSkus(skus) {
  const shapes = new Map(); // machine-name → { size, cores: [], rams: [] }

  for (const sku of skus) {
    const category = sku.category || {};
    if (category.resourceFamily !== 'Compute') continue;

    const description = sku.description || '';
    // Region-lock to us-east1 for app parity.
    const inUsEast1 =
      /us-east1/i.test(description) ||
      (sku.regionTags || []).some((tag) => /^us-east1/i.test(tag)) ||
      (sku.geo || []).some((g) => /^us-east1/i.test(g.region || ''));
    if (!inUsEast1) continue;

    const m =
      description.match(/^([A-Za-z0-9\-]+)\s+(?:Instance )?(Core|Ram)\s+running/i) ||
      description.match(/^([A-Za-z0-9\-]+)\s+(Core|Ram)\s+/i);
    if (!m) continue;
    const size = m[1];
    const kind = /core/i.test(m[2]) ? 'core' : 'ram';
    if (!/^(e2|n1|n2|c2|n2d|t2d)/i.test(size)) continue;

    const price = sku.pricingInfo?.[0]?.pricingExpression?.tieredRates?.[0]?.unitPrice || {};
    const hourly = (price.units || 0) + (price.nanos || 0) / 1e9;
    if (!(hourly > 0)) continue;

    if (!shapes.has(size)) shapes.set(size, { size, cores: [], rams: [] });
    const entry = shapes.get(size);
    if (kind === 'core') entry.cores.push(hourly);
    else entry.rams.push(hourly);
  }

  const compute = [];
  for (const shape of shapes.values()) {
    const coreRate = shape.cores[0];
    const ramRate = shape.rams[0];
    if (coreRate == null || ramRate == null) continue;
    const vCpuMatch = shape.size.match(/(\d+)$/);
    if (!vCpuMatch) continue;
    const vCpu = parseInt(vCpuMatch[1], 10);

    let ramGb;
    if (/highmem/i.test(shape.size)) ramGb = vCpu * 6.5;
    else if (/highcpu/i.test(shape.size)) ramGb = vCpu * 0.9;
    else ramGb = vCpu * 4;

    const hourlyOnDemand = coreRate * vCpu + ramRate * ramGb;
    if (!(hourlyOnDemand > 0)) continue;

    const family = /highmem/i.test(shape.size)
      ? 'Memory Optimized (m1)'
      : /highcpu|^c2/i.test(shape.size)
        ? 'Compute Optimized (c2)'
        : 'General Purpose (e2/n2)';

    compute.push({
      family,
      name: shape.size,
      vCpu,
      ramGb: round(ramGb, 1),
      hourlyOnDemandLinux: round(hourlyOnDemand),
      hourly1YrReservedLinux: round(hourlyOnDemand * 0.70),
      hourly3YrReservedLinux: round(hourlyOnDemand * 0.55),
      hourlySpotLinux: round(hourlyOnDemand * 0.35),
      windowsHourlySurcharge: 0
    });

    if (compute.length >= 14) break;
  }

  return {
    provider: 'GCP',
    region: 'us-east1 (South Carolina)',
    compute,
    storage: {
      HOT: { tier: 'HOT', costPerGbMonth: 0.02, costPer10kReads: 0.0004, costPer10kWrites: 0.005 },
      COOL: { tier: 'COOL', costPerGbMonth: 0.01, costPer10kReads: 0.001, costPer10kWrites: 0.01 },
      COLD: { tier: 'COLD', costPerGbMonth: 0.004, costPer10kReads: 0.005, costPer10kWrites: 0.013 },
      ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.0012, costPer10kReads: 0.05, costPer10kWrites: 0.03 }
    },
    networking: {
      first10TbPerGb: 0.085,
      next40TbPerGb: 0.08,
      loadBalancerHourly: 0.025,
      staticIpHourly: 0.004
    },
    kubernetes: { managementHourlyFeePerCluster: 0.1, freeFirstCluster: true }
  };
}

import { fetchJson, round } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* Azure — Retail Prices REST API                                      */
/* ------------------------------------------------------------------ */

const AZURE_API = 'https://prices.azure.com/api/retail/prices';

export async function fetchAzureCatalog() {
  const filter = encodeURIComponent(
    "armRegionName eq 'eastus' and priceType eq 'Consumption' and " +
      "(serviceName eq 'Virtual Machines' or serviceName eq 'Bandwidth')"
  );
  let items = [];
  let nextLink = `${AZURE_API}?$filter=${filter}`;

  for (let page = 0; page < 20 && nextLink; page++) {
    const data = await fetchJson(nextLink);
    items = items.concat(data.Items || []);
    nextLink = data.NextPageLink || null;
  }

  // Sku → (vCpu, ramGb). Matches the seeded D/B-series benchmark shapes.
  const vmTierMap = {
    Standard_B2s: { vCpu: 2, ramGb: 4 },
    Standard_D2as_v5: { vCpu: 2, ramGb: 8 },
    Standard_D4as_v5: { vCpu: 4, ramGb: 16 },
    Standard_D8as_v5: { vCpu: 8, ramGb: 32 },
    Standard_D16as_v5: { vCpu: 16, ramGb: 64 },
    Standard_E16as_v5: { vCpu: 16, ramGb: 128 },
    Standard_F16s_v2: { vCpu: 16, ramGb: 32 }
  };

  const compute = [];
  for (const it of items) {
    if (it.serviceName !== 'Virtual Machines') continue;
    const sku = it.skuName || '';
    const match = vmTierMap[sku];
    if (!match) continue;
    // Azure lists separate meters: Linux ("Virtual Machines Dasv5 Series"),
    // Windows ("...Windows"), and software meters. We want the Linux baseline.
    const productName = it.productName || '';
    const meterName = it.meterName || '';
    if (/windows/i.test(productName) || /windows/i.test(meterName)) continue;
    if (/sql server|software/i.test(productName)) continue;
    const rate = parseFloat(it.retailPrice || it.unitPrice || '0');
    if (!(rate > 0)) continue;

    // Same SKU can appear with several sub-meters; keep the cheapest (Linux base).
    const existing = compute.find((c) => c.name === sku && c.vCpu === match.vCpu);
    if (existing) {
      if (rate < existing.hourlyOnDemandLinux) {
        existing.hourlyOnDemandLinux = round(rate);
        existing.hourly1YrReservedLinux = round(rate * 0.60);
        existing.hourly3YrReservedLinux = round(rate * 0.40);
        existing.hourlySpotLinux = round(rate * 0.20);
      }
      continue;
    }

    compute.push({
      family: 'General Purpose (B/D-series)',
      name: sku,
      vCpu: match.vCpu,
      ramGb: match.ramGb,
      hourlyOnDemandLinux: round(rate),
      hourly1YrReservedLinux: round(rate * 0.60),
      hourly3YrReservedLinux: round(rate * 0.40),
      hourlySpotLinux: round(rate * 0.20),
      windowsHourlySurcharge: 0
    });

    if (compute.length >= 10) break;
  }

  if (!compute.length) throw new Error('Azure feed returned no usable compute rows');

  const egressRate = findAzureEgress(items) || 0.087;
  const storage = {
    HOT: { tier: 'HOT', costPerGbMonth: 0.018, costPer10kReads: 0.0004, costPer10kWrites: 0.005 },
    COOL: { tier: 'COOL', costPerGbMonth: 0.01, costPer10kReads: 0.001, costPer10kWrites: 0.01 },
    COLD: { tier: 'COLD', costPerGbMonth: 0.0036, costPer10kReads: 0.005, costPer10kWrites: 0.013 },
    ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.00099, costPer10kReads: 0.05, costPer10kWrites: 0.03 }
  };

  return {
    provider: 'AZURE',
    region: 'East US',
    compute,
    storage,
    networking: {
      first10TbPerGb: egressRate,
      next40TbPerGb: round(egressRate * 0.9),
      loadBalancerHourly: 0.025,
      staticIpHourly: 0.004
    },
    kubernetes: { managementHourlyFeePerCluster: 0.0, freeFirstCluster: true }
  };
}

function findAzureEgress(items) {
  for (const it of items) {
    if (it.serviceName !== 'Bandwidth') continue;
    const name = `${it.productName || ''} ${it.skuName || ''}`.toLowerCase();
    // Azure egress items: "Data Transfer Zone 1" ... "Up to 10 TB"
    if (!/data transfer/.test(name)) continue;
    if (!/zone 1/.test(name)) continue;
    const rate = parseFloat(it.retailPrice || it.unitPrice || '0');
    if (rate > 0) return rate;
  }
  return null;
}

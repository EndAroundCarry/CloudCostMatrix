import { fetchJson, round } from './shared.mjs';

/* ------------------------------------------------------------------ */
/* Oracle Cloud Infrastructure — public cetools price list             */
/* ------------------------------------------------------------------ */

const OCI_API = 'https://apexapps.oracle.com/pls/apex/cetools/api/v1/products/?currencyCode=USD';

// x86 shapes (E-series) bill 1 OCPU = 2 vCPU. Ampere (A-series) shapes bill
// 1 OCPU = 1 vCPU. This fetcher only emits E5 (x86) rows — matching the
// existing seed catalog's 'VM.Standard.E5.Flex' family — so only the x86
// ratio is load-bearing here today. Get this wrong and Oracle compute prices
// at roughly half of reality.
const OCPU_TO_VCPU_X86 = 2;

const PART_NUMBERS = {
  computeOcpu: 'B97384', // Compute - Standard - E5 - OCPU
  computeMemory: 'B97385', // Compute - Standard - E5 - Memory
  ampereOcpu: 'B93297', // Compute - Standard - A1 - OCPU (used only for the sanity tripwire below)
  windowsOcpu: 'B88318', // Compute - Windows OS
  storageHot: 'B91628', // Object Storage - Storage
  storageCool: 'B93000', // Infrequent Access Storage - Storage
  storageArchive: 'B91633', // Archive Storage - Storage
  requests: 'B91627', // Object Storage - Requests
  egress: 'B88327', // Outbound Data Transfer - NA/EU/UK
  loadBalancer: 'B93030' // Load Balancer Base
};

// Compute + RAM envelope shared by every provider's catalog — see
// seeded-pricing-catalog.ts's header comment for why this matters (the
// nearest-match sizer only compares like-for-like if every provider spans
// the same range).
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
 * Returns the MARGINAL (steady-state) USD rate for a part number.
 *
 * CRITICAL: tiered SKUs in this feed lead with a `value: 0` free-allowance
 * tier (confirmed live: 82 of 639 items as of this writing). Taking
 * `prices[0]` naively yields $0 for object storage, egress, load balancers,
 * and Ampere compute — i.e. a catalog that renders Oracle as free. The list
 * price is the tier with the HIGHEST `rangeMin`.
 */
function ociMarginalRate(byPart, partNumber) {
  const item = byPart.get(partNumber);
  if (!item) throw new Error(`OCI part ${partNumber} missing from feed`);
  const usd = (item.currencyCodeLocalizations || []).find((l) => l.currencyCode === 'USD');
  const tiers = (usd?.prices || []).filter((p) => p.model === 'PAY_AS_YOU_GO');
  if (!tiers.length) throw new Error(`OCI part ${partNumber} has no PAY_AS_YOU_GO price`);
  return tiers.reduce((best, t) => ((t.rangeMin ?? 0) >= (best.rangeMin ?? 0) ? t : best), tiers[0]).value;
}

/** rangeMax of the leading value:0 tier = the free monthly allowance, in the SKU's own metric unit (0 if untiered). */
function ociFreeAllowance(byPart, partNumber) {
  const item = byPart.get(partNumber);
  if (!item) return 0;
  const usd = (item.currencyCodeLocalizations || []).find((l) => l.currencyCode === 'USD');
  const zeroTier = (usd?.prices || []).find((p) => p.model === 'PAY_AS_YOU_GO' && p.value === 0);
  return zeroTier?.rangeMax ?? 0;
}

export async function fetchOracleCatalog() {
  const data = await fetchJson(OCI_API);
  const items = data.items || [];

  if (items.length < 300) throw new Error(`OCI feed returned suspiciously few items (${items.length}) — refusing to trust it`);

  const lastUpdated = new Date(data.lastUpdated || 0);
  const ageDays = (Date.now() - lastUpdated.getTime()) / 86_400_000;
  if (!Number.isFinite(ageDays) || ageDays > 60) {
    throw new Error(`OCI feed lastUpdated (${data.lastUpdated}) is missing or more than 60 days old`);
  }

  const byPart = new Map(items.map((i) => [i.partNumber, i]));

  // Sanity tripwire: if Oracle ever changes the Ampere OCPU=vCPU billing
  // model, this description text is expected to change with it. This isn't
  // load-bearing for the E5 (x86) rows emitted below, but it's cheap insurance
  // against silently mis-modeling OCI's billing unit in a future edit that
  // adds Ampere rows.
  const ampereItem = byPart.get(PART_NUMBERS.ampereOcpu);
  if (!ampereItem || !/OCPU.*equate.*vCPU/i.test(ampereItem.description || '')) {
    throw new Error('OCI Ampere OCPU=vCPU billing-model assumption could not be confirmed against the live feed description — Oracle may have changed billing units.');
  }

  const ocpuRate = ociMarginalRate(byPart, PART_NUMBERS.computeOcpu);
  const memRate = ociMarginalRate(byPart, PART_NUMBERS.computeMemory);
  const windowsOcpuRate = ociMarginalRate(byPart, PART_NUMBERS.windowsOcpu);

  if (!(ocpuRate > 0 && ocpuRate < 0.10)) throw new Error(`OCI E5 OCPU rate out of expected range: ${ocpuRate}`);
  if (!(memRate > 0 && memRate < 0.02)) throw new Error(`OCI E5 memory rate out of expected range: ${memRate}`);

  const compute = ENVELOPE.map(({ vCpu, ramGb }) => {
    const hourlyOnDemandLinux = round((vCpu / OCPU_TO_VCPU_X86) * ocpuRate + ramGb * memRate);
    const windowsHourlySurcharge = round((vCpu / OCPU_TO_VCPU_X86) * windowsOcpuRate);
    return {
      family: 'General Purpose (E5.Flex)',
      name: `VM.Standard.E5.Flex-${vCpu}x${ramGb}`,
      vCpu,
      ramGb,
      hourlyOnDemandLinux,
      hourly1YrReservedLinux: round(hourlyOnDemandLinux * 0.75),
      hourly3YrReservedLinux: round(hourlyOnDemandLinux * 0.67),
      hourlySpotLinux: round(hourlyOnDemandLinux * 0.50), // OCI's published preemptible discount
      windowsHourlySurcharge
    };
  });

  // Numeric gate on top of the range checks above: the reference 8 vCPU / 32
  // GB shape must land in a tight, hand-verified band. The OCPU=vCPU
  // modeling error (using ratio 1 instead of 2) would put this at ~0.304 —
  // well outside the band — which is exactly the mistake this guards against.
  const reference = compute.find((c) => c.vCpu === 8 && c.ramGb === 32);
  if (!reference || reference.hourlyOnDemandLinux < 0.15 || reference.hourlyOnDemandLinux > 0.25) {
    throw new Error(`OCI reference 8vCPU/32GB shape (${reference?.hourlyOnDemandLinux}) is outside the expected [0.15, 0.25] band — possible OCPU conversion error`);
  }

  const storageHot = ociMarginalRate(byPart, PART_NUMBERS.storageHot);
  const storageCool = ociMarginalRate(byPart, PART_NUMBERS.storageCool);
  const storageArchive = ociMarginalRate(byPart, PART_NUMBERS.storageArchive);
  const requestsRate = ociMarginalRate(byPart, PART_NUMBERS.requests);

  if (!(storageHot > storageCool && storageCool > storageArchive)) {
    throw new Error(`OCI storage tiers are not in the expected HOT > COOL > ARCHIVE order (${storageHot}, ${storageCool}, ${storageArchive})`);
  }
  if (!(storageHot > 0.005 && storageHot < 0.10)) throw new Error(`OCI HOT storage rate out of expected range: ${storageHot}`);

  // OCI doesn't split request pricing by read vs write, and has no distinct
  // Cold tier (COLD is a clone of Infrequent Access) — both gated by
  // PROVIDER_CAPABILITIES so neither is ever surfaced as a real number.
  const opRate = round(requestsRate, 4);
  const storage = {
    HOT: { tier: 'HOT', costPerGbMonth: round(storageHot), costPer10kReads: opRate, costPer10kWrites: opRate },
    COOL: { tier: 'COOL', costPerGbMonth: round(storageCool), costPer10kReads: opRate, costPer10kWrites: opRate },
    COLD: { tier: 'COLD', costPerGbMonth: round(storageCool), costPer10kReads: opRate, costPer10kWrites: opRate }, // UNSUPPORTED — cloned from COOL, gated by PROVIDER_CAPABILITIES
    ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: round(storageArchive), costPer10kReads: opRate, costPer10kWrites: opRate }
  };

  const egressRate = ociMarginalRate(byPart, PART_NUMBERS.egress);
  const freeEgressGbPerMonth = ociFreeAllowance(byPart, PART_NUMBERS.egress);
  if (!(freeEgressGbPerMonth >= 1024)) throw new Error(`OCI free egress allowance smaller than expected: ${freeEgressGbPerMonth} GB`);
  if (!(egressRate > 0 && egressRate < 0.05)) throw new Error(`OCI egress marginal rate out of expected range: ${egressRate}`);

  const loadBalancerRate = ociMarginalRate(byPart, PART_NUMBERS.loadBalancer);

  return {
    provider: 'ORACLE',
    region: 'us-ashburn-1 (Ashburn)',
    compute,
    storage,
    // OCI's MySQL/Autonomous DB SKUs are priced per ECPU, a different billing
    // unit from this app's per-instance hourlyPostgres/hourlyMySql model —
    // mapping them unambiguously needs more design work. mergeOverSeed falls
    // back to the seeded database rows for an empty array, exactly the
    // pattern fetchAwsCatalog already uses for `compute: []`.
    database: [],
    networking: {
      first10TbPerGb: round(egressRate),
      next40TbPerGb: round(egressRate), // OCI is flat beyond the free tier — no second ladder to fabricate
      loadBalancerHourly: round(loadBalancerRate),
      staticIpHourly: 0.003, // not exposed by this feed; carried from the seed benchmark
      freeEgressGbPerMonth,
      egressPolicyNote: `The first ${(freeEgressGbPerMonth / 1024).toFixed(0)} TB of outbound data transfer is free every month on every OCI tenancy.`
    },
    kubernetes: { managementHourlyFeePerCluster: 0.0, freeFirstCluster: true } // OKE Basic — free control plane
  };
}

// Exported for fixture-based unit tests only.
export const __internal = { ociMarginalRate, ociFreeAllowance, PART_NUMBERS, ENVELOPE, OCPU_TO_VCPU_X86 };

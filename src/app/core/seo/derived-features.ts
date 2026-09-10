import { CloudProvider, PROVIDER_METAS } from '../models/cloud-provider.enum';
import { PROVIDER_CAPABILITIES } from '../models/provider-capabilities.model';
import { EFFECTIVE_CATALOGS } from '../engine/catalog/pricing-catalog.resolver';
import { CostCalculatorEngine } from '../engine/cost-calculator.engine';

export type FeatureWinner = 'A' | 'B' | 'TIE';

export interface DerivedFeatureRow {
  feature: string;
  category: string;
  providerAVal: string;
  providerBVal: string;
  winner: FeatureWinner;
  /** Where the number came from — lets a UI mark editorial rows differently if it wants to. */
  source: 'CATALOG' | 'CAPABILITY';
}

/**
 * Facts about a provider pair computed live from the pricing catalogs and
 * capability flags — never hand-typed. This is what keeps /compare pages from
 * accumulating hardcoded price strings that silently drift from the live sync
 * (the exact failure this replaces: the old AWS egress row hardcoded
 * '$0.090 / GB' while scripts/sync-prices.mjs had already moved the real rate).
 *
 * Every row is symmetric under swapping (a, b) — see derived-features.spec.ts.
 */
export function buildDerivedFeatures(a: CloudProvider, b: CloudProvider): DerivedFeatureRow[] {
  const catA = EFFECTIVE_CATALOGS[a];
  const catB = EFFECTIVE_CATALOGS[b];
  const capA = PROVIDER_CAPABILITIES[a];
  const capB = PROVIDER_CAPABILITIES[b];
  const metaA = PROVIDER_METAS[a];
  const metaB = PROVIDER_METAS[b];

  const rows: DerivedFeatureRow[] = [];

  // --- Egress: effective $/GB for a representative 10 TB/month workload -------
  // Routed through the real engine (not a hand-copied formula) so free tiers,
  // unlimited-egress, and bundled-per-instance allowances are all honored
  // exactly as the calculator applies them elsewhere in the app.
  const egressProbe = { egressGbPerMonth: 10240, loadBalancersCount: 0, staticIpsCount: 0 };
  const egressCostA = CostCalculatorEngine.calculateNetworking(egressProbe, a, 0).monthlyCost;
  const egressCostB = CostCalculatorEngine.calculateNetworking(egressProbe, b, 0).monthlyCost;
  const egressRateA = egressCostA / 10240;
  const egressRateB = egressCostB / 10240;
  rows.push({
    feature: 'Internet egress (10 TB/mo)',
    category: 'Networking',
    providerAVal: fmtEgress(catA.networking.unlimitedEgress, egressCostA, egressRateA),
    providerBVal: fmtEgress(catB.networking.unlimitedEgress, egressCostB, egressRateB),
    winner: lowerWins(egressCostA, egressCostB),
    source: 'CATALOG'
  });

  // --- Free egress allowance ---------------------------------------------------
  const freeA = catA.networking.unlimitedEgress ? Infinity : (catA.networking.freeEgressGbPerMonth ?? 0);
  const freeB = catB.networking.unlimitedEgress ? Infinity : (catB.networking.freeEgressGbPerMonth ?? 0);
  rows.push({
    feature: 'Free egress allowance',
    category: 'Networking',
    providerAVal: fmtFreeAllowance(catA.networking.unlimitedEgress, catA.networking.freeEgressGbPerMonth),
    providerBVal: fmtFreeAllowance(catB.networking.unlimitedEgress, catB.networking.freeEgressGbPerMonth),
    winner: higherWins(freeA, freeB),
    source: 'CATALOG'
  });

  // --- Hot object storage -------------------------------------------------------
  rows.push({
    feature: 'Hot object storage ($/GB-mo)',
    category: 'Storage',
    providerAVal: `$${catA.storage.HOT.costPerGbMonth.toFixed(4)}/GB-mo`,
    providerBVal: `$${catB.storage.HOT.costPerGbMonth.toFixed(4)}/GB-mo`,
    winner: lowerWins(catA.storage.HOT.costPerGbMonth, catB.storage.HOT.costPerGbMonth),
    source: 'CATALOG'
  });

  // --- Archive storage (capability-gated) --------------------------------------
  rows.push(capabilityGatedPriceRow({
    feature: 'Archive storage ($/GB-mo)',
    category: 'Storage',
    offeredA: capA.storageTiers.ARCHIVE,
    offeredB: capB.storageTiers.ARCHIVE,
    valueA: catA.storage.ARCHIVE.costPerGbMonth,
    valueB: catB.storage.ARCHIVE.costPerGbMonth,
    fmt: (v) => `$${v.toFixed(4)}/GB-mo`
  }));

  // --- Storage tier count -------------------------------------------------------
  const tierCountA = Object.values(capA.storageTiers).filter(Boolean).length;
  const tierCountB = Object.values(capB.storageTiers).filter(Boolean).length;
  rows.push({
    feature: 'Object storage tiers offered',
    category: 'Storage',
    providerAVal: `${tierCountA} tier${tierCountA === 1 ? '' : 's'}`,
    providerBVal: `${tierCountB} tier${tierCountB === 1 ? '' : 's'}`,
    winner: higherWins(tierCountA, tierCountB, 0),
    source: 'CAPABILITY'
  });

  // --- Kubernetes control-plane fee (first cluster) ----------------------------
  const k8sFeeA = catA.kubernetes.freeFirstCluster ? 0 : catA.kubernetes.managementHourlyFeePerCluster * 730;
  const k8sFeeB = catB.kubernetes.freeFirstCluster ? 0 : catB.kubernetes.managementHourlyFeePerCluster * 730;
  rows.push({
    feature: 'Managed Kubernetes control plane (1st cluster)',
    category: 'Kubernetes',
    providerAVal: fmtK8sFee(k8sFeeA, catA.kubernetes.freeFirstCluster),
    providerBVal: fmtK8sFee(k8sFeeB, catB.kubernetes.freeFirstCluster),
    winner: lowerWins(k8sFeeA, k8sFeeB, 0),
    source: 'CATALOG'
  });

  // --- Cheapest general-purpose compute (4 vCPU / 16 GB, on-demand Linux) -----
  const spec4x16 = { vCpu: 4, ramGb: 16, os: 'LINUX' as const, count: 1, hoursPerMonth: 730, commitment: 'ON_DEMAND' as const };
  const computeA = CostCalculatorEngine.calculateCompute(spec4x16, a);
  const computeB = CostCalculatorEngine.calculateCompute(spec4x16, b);
  rows.push({
    feature: 'Cheapest 4 vCPU / 16 GB Linux instance',
    category: 'Compute',
    providerAVal: `$${computeA.monthlyCost.toFixed(2)}/mo (${computeA.instanceTypeOrTier})`,
    providerBVal: `$${computeB.monthlyCost.toFixed(2)}/mo (${computeB.instanceTypeOrTier})`,
    winner: lowerWins(computeA.monthlyCost, computeB.monthlyCost),
    source: 'CATALOG'
  });

  // --- Deepest 3-year reserved discount -----------------------------------------
  const reserved3yrSpec = { ...spec4x16, commitment: '3_YEAR_RESERVED' as const };
  const discountA = capA.commitments['3_YEAR_RESERVED']
    ? 1 - CostCalculatorEngine.calculateCompute(reserved3yrSpec, a).monthlyCost / computeA.monthlyCost
    : null;
  const discountB = capB.commitments['3_YEAR_RESERVED']
    ? 1 - CostCalculatorEngine.calculateCompute(reserved3yrSpec, b).monthlyCost / computeB.monthlyCost
    : null;
  rows.push(capabilityGatedPriceRow({
    feature: 'Deepest 3-year reserved discount',
    category: 'Compute',
    offeredA: discountA != null,
    offeredB: discountB != null,
    valueA: discountA ?? 0,
    valueB: discountB ?? 0,
    fmt: (v) => `${Math.round(v * 100)}% off on-demand`,
    higherIsBetter: true
  }));

  // --- Spot / preemptible availability + discount --------------------------------
  const spotA = capA.commitments.SPOT ? EFFECTIVE_CATALOGS[a].compute[0]?.hourlySpotLinux : null;
  const spotB = capB.commitments.SPOT ? EFFECTIVE_CATALOGS[b].compute[0]?.hourlySpotLinux : null;
  const spotRatioA = spotA != null ? spotA / (EFFECTIVE_CATALOGS[a].compute[0]?.hourlyOnDemandLinux || 1) : null;
  const spotRatioB = spotB != null ? spotB / (EFFECTIVE_CATALOGS[b].compute[0]?.hourlyOnDemandLinux || 1) : null;
  rows.push(capabilityGatedPriceRow({
    feature: 'Spot / preemptible instances',
    category: 'Compute',
    offeredA: spotRatioA != null,
    offeredB: spotRatioB != null,
    valueA: spotRatioA ?? 0,
    valueB: spotRatioB ?? 0,
    fmt: (v) => `~${Math.round((1 - v) * 100)}% off on-demand`
  }));

  // --- Managed SQL Server --------------------------------------------------------
  rows.push({
    feature: 'Managed SQL Server',
    category: 'Database',
    providerAVal: capA.dbEngines.SQL_SERVER ? 'Offered' : (capA.notes.dbEngines?.SQL_SERVER ?? 'Not offered'),
    providerBVal: capB.dbEngines.SQL_SERVER ? 'Offered' : (capB.notes.dbEngines?.SQL_SERVER ?? 'Not offered'),
    winner: boolWins(capA.dbEngines.SQL_SERVER, capB.dbEngines.SQL_SERVER),
    source: 'CAPABILITY'
  });

  // --- Windows Server licensing ---------------------------------------------------
  rows.push({
    feature: 'Windows Server on compute',
    category: 'Compute',
    providerAVal: capA.windowsOs ? 'Offered' : (capA.notes.windowsOs ?? 'Not offered'),
    providerBVal: capB.windowsOs ? 'Offered' : (capB.notes.windowsOs ?? 'Not offered'),
    winner: boolWins(capA.windowsOs, capB.windowsOs),
    source: 'CAPABILITY'
  });

  // --- Load balancer -----------------------------------------------------------
  const lbA = catA.networking.loadBalancerHourly * 730;
  const lbB = catB.networking.loadBalancerHourly * 730;
  rows.push({
    feature: 'Load balancer',
    category: 'Networking',
    providerAVal: `$${lbA.toFixed(2)}/mo`,
    providerBVal: `$${lbB.toFixed(2)}/mo`,
    winner: lowerWins(lbA, lbB),
    source: 'CATALOG'
  });

  // --- Static IPv4 ---------------------------------------------------------------
  const ipA = catA.networking.staticIpHourly * 730;
  const ipB = catB.networking.staticIpHourly * 730;
  rows.push({
    feature: 'Static IPv4 address',
    category: 'Networking',
    providerAVal: ipA === 0 ? 'Free' : `$${ipA.toFixed(2)}/mo`,
    providerBVal: ipB === 0 ? 'Free' : `$${ipB.toFixed(2)}/mo`,
    winner: lowerWins(ipA, ipB),
    source: 'CATALOG'
  });

  void metaA; void metaB; // reserved for future rows that want branded names
  return rows;
}

// ---------------------------------------------------------------------------
// Comparators — a tie band avoids the table "flapping" to a new winner every
// time a live-sync fetcher nudges a rate by a fraction of a cent.
// ---------------------------------------------------------------------------

function lowerWins(a: number, b: number, epsilonPct = 3): FeatureWinner {
  if (a === b) return 'TIE';
  const base = Math.max(Math.abs(a), Math.abs(b), 0.0001);
  if ((Math.abs(a - b) / base) * 100 <= epsilonPct) return 'TIE';
  return a < b ? 'A' : 'B';
}

function higherWins(a: number, b: number, epsilonPct = 3): FeatureWinner {
  const r = lowerWins(a, b, epsilonPct);
  return r === 'TIE' ? 'TIE' : r === 'A' ? 'B' : 'A';
}

function boolWins(a: boolean, b: boolean): FeatureWinner {
  if (a === b) return 'TIE';
  return a ? 'A' : 'B';
}

function capabilityGatedPriceRow(opts: {
  feature: string;
  category: string;
  offeredA: boolean;
  offeredB: boolean;
  valueA: number;
  valueB: number;
  fmt: (v: number) => string;
  /** Default: lower value wins (a price). Set true for percentages/discounts where more is better. */
  higherIsBetter?: boolean;
}): DerivedFeatureRow {
  const { feature, category, offeredA, offeredB, valueA, valueB, fmt, higherIsBetter } = opts;
  const providerAVal = offeredA ? fmt(valueA) : 'Not offered';
  const providerBVal = offeredB ? fmt(valueB) : 'Not offered';
  let winner: FeatureWinner;
  if (!offeredA && !offeredB) winner = 'TIE';
  else if (!offeredA) winner = 'B';
  else if (!offeredB) winner = 'A';
  else winner = higherIsBetter ? higherWins(valueA, valueB) : lowerWins(valueA, valueB);
  return { feature, category, providerAVal, providerBVal, winner, source: 'CAPABILITY' };
}

function fmtEgress(unlimited: boolean | undefined, monthlyCost: number, rate: number): string {
  if (unlimited) return 'Unlimited (fair use, free)';
  if (monthlyCost === 0) return 'Free within allowance';
  return `$${rate.toFixed(4)}/GB effective`;
}

function fmtFreeAllowance(unlimited: boolean | undefined, freeGb: number | undefined): string {
  if (unlimited) return 'Unlimited';
  if (!freeGb) return 'None';
  return `${freeGb.toLocaleString()} GB/mo`;
}

function fmtK8sFee(monthlyFee: number, freeFirstCluster: boolean | undefined): string {
  if (monthlyFee === 0) return freeFirstCluster ? 'Free (1st cluster)' : 'Free';
  return `$${monthlyFee.toFixed(2)}/mo`;
}

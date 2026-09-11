import { ALL_PROVIDERS, CloudProvider, PROVIDER_METAS, normalizeSelectedProviders } from '../models/cloud-provider.enum';
import { PROVIDER_CAPABILITIES } from '../models/provider-capabilities.model';
import { ServiceCategory } from '../models/service-category.enum';
import {
  ArchitectureEstimateConfig,
  ComparisonMatrixResult,
  ComputeSpec,
  DatabaseSpec,
  KubernetesSpec,
  NetworkingSpec,
  ProviderTotalCost,
  RegionId,
  REGION_DEFINITIONS,
  ServiceCostBreakdown,
  StorageSpec,
  UnsupportedReason
} from '../models/pricing.model';
import { EFFECTIVE_CATALOGS } from './catalog/pricing-catalog.resolver';
import { ComputeBenchmark, DatabaseBenchmark } from './catalog/seeded-pricing-catalog';

/** Builds the "Not offered" breakdown for a genuinely unsupported combination — never a fabricated cost. */
function notOfferedBreakdown(
  provider: CloudProvider,
  category: ServiceCategory,
  reason: UnsupportedReason,
  note: string | undefined
): ServiceCostBreakdown {
  return {
    provider,
    category,
    supported: false,
    monthlyCost: 0,
    annualCost: 0,
    instanceTypeOrTier: 'Not offered',
    details: [note ?? `${PROVIDER_METAS[provider].shortName} does not offer this combination.`],
    unsupportedReason: reason,
    unsupportedNote: note
  };
}

export class CostCalculatorEngine {
  /**
   * Calculates compute instance cost for a given provider
   */
  public static calculateCompute(spec: ComputeSpec, provider: CloudProvider): ServiceCostBreakdown {
    const catalog = EFFECTIVE_CATALOGS[provider];

    // Find closest match by vCPU and RAM
    const sorted = [...catalog.compute].sort((a, b) => {
      const diffA = Math.abs(a.vCpu - spec.vCpu) * 4 + Math.abs(a.ramGb - spec.ramGb);
      const diffB = Math.abs(b.vCpu - spec.vCpu) * 4 + Math.abs(b.ramGb - spec.ramGb);
      return diffA - diffB;
    });

    const matched: ComputeBenchmark = sorted[0] || catalog.compute[0];

    // Determine hourly rate based on commitment
    let hourlyBase = matched.hourlyOnDemandLinux;
    if (spec.commitment === '1_YEAR_RESERVED') {
      hourlyBase = matched.hourly1YrReservedLinux;
    } else if (spec.commitment === '3_YEAR_RESERVED') {
      hourlyBase = matched.hourly3YrReservedLinux;
    } else if (spec.commitment === 'SPOT') {
      hourlyBase = matched.hourlySpotLinux;
    }

    if (spec.os === 'WINDOWS') {
      hourlyBase += matched.windowsHourlySurcharge;
    }

    const hours = spec.hoursPerMonth || 730;
    const monthlyCost = Number((hourlyBase * hours * spec.count).toFixed(2));
    const annualCost = Number((monthlyCost * 12).toFixed(2));

    const savingsPercentage = Math.round((1 - (hourlyBase / (matched.hourlyOnDemandLinux + (spec.os === 'WINDOWS' ? matched.windowsHourlySurcharge : 0)))) * 100);
    const savingsTips = savingsPercentage > 0
      ? `Saving ${savingsPercentage}% via ${spec.commitment.replace(/_/g, ' ')}`
      : 'Switch to 1-Yr or 3-Yr commitment to save up to 60%';

    return {
      provider,
      category: ServiceCategory.COMPUTE,
      supported: true,
      monthlyCost,
      annualCost,
      instanceTypeOrTier: matched.name,
      details: [
        `${spec.count}x ${matched.name} (${matched.vCpu} vCPU, ${matched.ramGb} GB RAM)`,
        `OS: ${spec.os} | Pricing: ${spec.commitment.replace(/_/g, ' ')}`,
        `$${hourlyBase.toFixed(4)}/hr per instance`
      ],
      savingsTips
    };
  }

  /**
   * Calculates storage cost (capacity + I/O operations)
   */
  public static calculateStorage(spec: StorageSpec, provider: CloudProvider): ServiceCostBreakdown {
    const catalog = EFFECTIVE_CATALOGS[provider];
    const tierPricing = catalog.storage[spec.tier];

    const rawCapacityCost = spec.capacityGb * tierPricing.costPerGbMonth;
    const capacityCost = Math.max(rawCapacityCost, tierPricing.minimumMonthlyFee ?? 0);
    const readCost = (spec.readOpsThousands / 10) * tierPricing.costPer10kReads;
    const writeCost = (spec.writeOpsThousands / 10) * tierPricing.costPer10kWrites;

    const monthlyCost = Number((capacityCost + readCost + writeCost).toFixed(2));
    const annualCost = Number((monthlyCost * 12).toFixed(2));

    const tierLabel = `${PROVIDER_METAS[provider].services.objectStorage} (${spec.tier})`;

    const details = [
      `${spec.capacityGb.toLocaleString('en-US')} GB at $${tierPricing.costPerGbMonth}/GB-mo ($${rawCapacityCost.toFixed(2)})`,
      `${spec.readOpsThousands.toLocaleString('en-US')}k Read ops ($${readCost.toFixed(2)})`,
      `${spec.writeOpsThousands.toLocaleString('en-US')}k Write ops ($${writeCost.toFixed(2)})`
    ];
    if (tierPricing.minimumMonthlyFee && rawCapacityCost < tierPricing.minimumMonthlyFee) {
      details.push(`$${tierPricing.minimumMonthlyFee}/mo minimum storage fee applied`);
    }

    return {
      provider,
      category: ServiceCategory.STORAGE,
      supported: true,
      monthlyCost,
      annualCost,
      instanceTypeOrTier: tierLabel,
      details,
      savingsTips: spec.tier === 'HOT' && spec.capacityGb > 500
        ? 'Enable Lifecycle rules to automatically transition older data to Cool/Cold storage.'
        : undefined
    };
  }

  /**
   * Calculates managed database cost (Instance + Storage + Multi-AZ)
   */
  public static calculateDatabase(spec: DatabaseSpec, provider: CloudProvider): ServiceCostBreakdown {
    const catalog = EFFECTIVE_CATALOGS[provider];

    // Match closest database instance
    const sorted = [...catalog.database].sort((a, b) => {
      const diffA = Math.abs(a.vCpu - spec.vCpu) * 4 + Math.abs(a.ramGb - spec.ramGb);
      const diffB = Math.abs(b.vCpu - spec.vCpu) * 4 + Math.abs(b.ramGb - spec.ramGb);
      return diffA - diffB;
    });
    const matched: DatabaseBenchmark = sorted[0] || catalog.database[0];

    let hourlyRate = matched.hourlyPostgres;
    if (spec.engine === 'MYSQL') hourlyRate = matched.hourlyMySql;
    if (spec.engine === 'SQL_SERVER') hourlyRate = matched.hourlySqlServer;

    if (spec.commitment === '1_YEAR_RESERVED') hourlyRate *= 0.65;
    if (spec.commitment === '3_YEAR_RESERVED') hourlyRate *= 0.45;

    const computeMonthly = hourlyRate * 730 * (spec.multiAz ? matched.multiAzMultiplier : 1.0);
    const storageMonthly = spec.storageGb * matched.storagePerGbMonth * (spec.multiAz ? 2.0 : 1.0);

    const monthlyCost = Number((computeMonthly + storageMonthly).toFixed(2));
    const annualCost = Number((monthlyCost * 12).toFixed(2));

    const dbFamilyLabel = `${PROVIDER_METAS[provider].services.managedDb} ${matched.name}`;

    return {
      provider,
      category: ServiceCategory.DATABASE,
      supported: true,
      monthlyCost,
      annualCost,
      instanceTypeOrTier: dbFamilyLabel,
      details: [
        `Engine: ${spec.engine} | Tier: ${matched.name} (${matched.vCpu} vCPU, ${matched.ramGb} GB RAM)`,
        `Compute: $${computeMonthly.toFixed(2)}/mo | High Availability: ${spec.multiAz ? 'Yes (Multi-AZ)' : 'Single Zone'}`,
        `Storage: ${spec.storageGb} GB SSD ($${storageMonthly.toFixed(2)}/mo)`
      ],
      savingsTips: spec.commitment === 'ON_DEMAND'
        ? 'Reserved database instances yield up to 35% (1-Yr) to 55% (3-Yr) savings.'
        : undefined
    };
  }

  /**
   * Calculates networking & data egress cost.
   *
   * `instanceCount` (compute + Kubernetes worker nodes) drives per-instance
   * bundled bandwidth (DigitalOcean, Linode) — it defaults to 0 so any
   * external caller that predates this parameter keeps compiling and simply
   * sees no bundled allowance applied.
   */
  public static calculateNetworking(spec: NetworkingSpec, provider: CloudProvider, instanceCount: number = 0): ServiceCostBreakdown {
    const catalog = EFFECTIVE_CATALOGS[provider];
    const net = catalog.networking;
    const egressGb = spec.egressGbPerMonth;

    let egressCost = 0;
    let billableGb = egressGb;
    if (net.unlimitedEgress) {
      billableGb = 0;
      egressCost = 0;
    } else {
      const freeAllowance = (net.freeEgressGbPerMonth ?? 0) + (net.bundledEgressGbPerInstance ?? 0) * instanceCount;
      billableGb = Math.max(0, egressGb - freeAllowance);
      if (net.overageEgressPerGb != null) {
        egressCost = billableGb * net.overageEgressPerGb;
      } else if (billableGb <= 10240) {
        egressCost = billableGb * net.first10TbPerGb;
      } else {
        egressCost = (10240 * net.first10TbPerGb) + ((billableGb - 10240) * net.next40TbPerGb);
      }
    }

    const lbCost = spec.loadBalancersCount * net.loadBalancerHourly * 730;
    const staticIpCost = spec.staticIpsCount * net.staticIpHourly * 730;

    const monthlyCost = Number((egressCost + lbCost + staticIpCost).toFixed(2));
    const annualCost = Number((monthlyCost * 12).toFixed(2));

    const details = [
      `${egressGb.toLocaleString('en-US')} GB Internet Egress ($${egressCost.toFixed(2)})`,
      `${spec.loadBalancersCount}x Load Balancers ($${lbCost.toFixed(2)}/mo)`,
      `${spec.staticIpsCount}x Public Static IPv4 ($${staticIpCost.toFixed(2)}/mo)`
    ];
    if (net.egressPolicyNote) details.push(net.egressPolicyNote);

    return {
      provider,
      category: ServiceCategory.NETWORKING,
      supported: true,
      monthlyCost,
      annualCost,
      instanceTypeOrTier: PROVIDER_METAS[provider].services.networking,
      details,
      savingsTips: egressGb > 5000 && !net.unlimitedEgress
        ? `Route traffic via ${PROVIDER_METAS[provider].services.cdn} to cut egress costs by 30-50%.`
        : undefined
    };
  }

  /**
   * Calculates Kubernetes cluster management and control plane cost
   */
  public static calculateKubernetes(spec: KubernetesSpec, provider: CloudProvider): ServiceCostBreakdown {
    const catalog = EFFECTIVE_CATALOGS[provider];

    // Control plane management fee
    let billableClusters = spec.clustersCount;
    if (catalog.kubernetes.freeFirstCluster && billableClusters > 0) {
      billableClusters = Math.max(0, billableClusters - 1);
    }

    const controlPlaneMonthly = billableClusters * catalog.kubernetes.managementHourlyFeePerCluster * 730;

    // Worker nodes compute
    const totalWorkerNodes = spec.clustersCount * spec.workerNodesPerCluster;
    const workerComputeBreakdown = this.calculateCompute({
      vCpu: spec.workerVcpu,
      ramGb: spec.workerRamGb,
      os: 'LINUX',
      count: totalWorkerNodes,
      hoursPerMonth: 730,
      commitment: 'ON_DEMAND'
    }, provider);

    const monthlyCost = Number((controlPlaneMonthly + workerComputeBreakdown.monthlyCost).toFixed(2));
    const annualCost = Number((monthlyCost * 12).toFixed(2));

    const k8sName = PROVIDER_METAS[provider].services.kubernetes;

    return {
      provider,
      category: ServiceCategory.KUBERNETES,
      supported: true,
      monthlyCost,
      annualCost,
      instanceTypeOrTier: `${k8sName} (${totalWorkerNodes} Nodes)`,
      details: [
        `Control Plane: ${spec.clustersCount} Cluster(s) ($${controlPlaneMonthly.toFixed(2)}/mo)`,
        `Worker Nodes: ${totalWorkerNodes}x ${workerComputeBreakdown.instanceTypeOrTier} ($${workerComputeBreakdown.monthlyCost.toFixed(2)}/mo)`,
        `Node Sizing: ${spec.workerVcpu} vCPU, ${spec.workerRamGb} GB RAM per node`
      ],
      savingsTips: PROVIDER_METAS[provider].savingsTips[ServiceCategory.KUBERNETES]
        ?? 'Use Spot or preemptible node pools for non-critical stateless microservices.'
    };
  }

  /**
   * Generates a full side-by-side comparison matrix across every provider this
   * build knows about. All providers are always priced — config.selectedProviders
   * (normalized) is a pure view/ranking filter, never a computation filter, so
   * /compare/:slug pages and diff scenarios always have real numbers regardless
   * of what the user has toggled on in the picker.
   */
  public static calculateFullMatrix(config: ArchitectureEstimateConfig): ComparisonMatrixResult {
    const providers = ALL_PROVIDERS;
    const selectedProviders = normalizeSelectedProviders(config.selectedProviders);
    const breakdowns: ServiceCostBreakdown[] = [];
    const providerTotals: Partial<Record<CloudProvider, ProviderTotalCost>> = {};

    // Determine regional pricing multiplier
    const regionId = (config.region as any) || 'us-east-1';
    const regionDef = REGION_DEFINITIONS[regionId as RegionId] || REGION_DEFINITIONS['us-east-1'];
    const regionalMultiplier = regionDef.pricingMultiplier;
    const scaleFactor = Math.max(1, config.scaleFactor || 1);

    const computeInstances = config.activeCategories[ServiceCategory.COMPUTE] ? config.compute.count * scaleFactor : 0;
    const k8sInstances = config.activeCategories[ServiceCategory.KUBERNETES]
      ? config.kubernetes.clustersCount * config.kubernetes.workerNodesPerCluster * scaleFactor
      : 0;
    const totalInstanceCount = computeInstances + k8sInstances;

    for (const provider of providers) {
      const cap = PROVIDER_CAPABILITIES[provider];
      const categoryTotals: Record<ServiceCategory, number> = {
        [ServiceCategory.COMPUTE]: 0,
        [ServiceCategory.STORAGE]: 0,
        [ServiceCategory.DATABASE]: 0,
        [ServiceCategory.NETWORKING]: 0,
        [ServiceCategory.KUBERNETES]: 0
      };
      const unsupportedCategories: ServiceCategory[] = [];

      const applyMultiplier = (bd: ServiceCostBreakdown) => {
        bd.monthlyCost = Number((bd.monthlyCost * regionalMultiplier).toFixed(2));
        bd.annualCost = Number((bd.monthlyCost * 12).toFixed(2));
      };

      if (config.activeCategories[ServiceCategory.COMPUTE]) {
        const scaledCompute: ComputeSpec = {
          ...config.compute,
          count: config.compute.count * scaleFactor
        };
        let bd: ServiceCostBreakdown;
        if (!cap.categories[ServiceCategory.COMPUTE]) {
          bd = notOfferedBreakdown(provider, ServiceCategory.COMPUTE, 'CATEGORY_NOT_OFFERED', cap.notes.categories?.[ServiceCategory.COMPUTE]);
        } else if (scaledCompute.os === 'WINDOWS' && !cap.windowsOs) {
          bd = notOfferedBreakdown(provider, ServiceCategory.COMPUTE, 'WINDOWS_NOT_OFFERED', cap.notes.windowsOs);
        } else {
          bd = this.calculateCompute(scaledCompute, provider);
          applyMultiplier(bd);
        }
        breakdowns.push(bd);
        if (bd.supported) categoryTotals[ServiceCategory.COMPUTE] = bd.monthlyCost;
        else unsupportedCategories.push(ServiceCategory.COMPUTE);
      }

      if (config.activeCategories[ServiceCategory.STORAGE]) {
        const scaledStorage: StorageSpec = {
          ...config.storage,
          capacityGb: config.storage.capacityGb * scaleFactor,
          readOpsThousands: config.storage.readOpsThousands * scaleFactor,
          writeOpsThousands: config.storage.writeOpsThousands * scaleFactor
        };
        let bd: ServiceCostBreakdown;
        if (!cap.categories[ServiceCategory.STORAGE]) {
          bd = notOfferedBreakdown(provider, ServiceCategory.STORAGE, 'CATEGORY_NOT_OFFERED', cap.notes.categories?.[ServiceCategory.STORAGE]);
        } else if (!cap.storageTiers[scaledStorage.tier]) {
          bd = notOfferedBreakdown(provider, ServiceCategory.STORAGE, 'STORAGE_TIER_NOT_OFFERED', cap.notes.storageTiers?.[scaledStorage.tier]);
        } else {
          bd = this.calculateStorage(scaledStorage, provider);
          applyMultiplier(bd);
        }
        breakdowns.push(bd);
        if (bd.supported) categoryTotals[ServiceCategory.STORAGE] = bd.monthlyCost;
        else unsupportedCategories.push(ServiceCategory.STORAGE);
      }

      if (config.activeCategories[ServiceCategory.DATABASE]) {
        const scaledDb: DatabaseSpec = {
          ...config.database,
          storageGb: config.database.storageGb * scaleFactor
        };
        let bd: ServiceCostBreakdown;
        if (!cap.categories[ServiceCategory.DATABASE]) {
          bd = notOfferedBreakdown(provider, ServiceCategory.DATABASE, 'CATEGORY_NOT_OFFERED', cap.notes.categories?.[ServiceCategory.DATABASE]);
        } else if (!cap.dbEngines[scaledDb.engine]) {
          bd = notOfferedBreakdown(provider, ServiceCategory.DATABASE, 'DB_ENGINE_NOT_OFFERED', cap.notes.dbEngines?.[scaledDb.engine]);
        } else {
          bd = this.calculateDatabase(scaledDb, provider);
          applyMultiplier(bd);
        }
        breakdowns.push(bd);
        if (bd.supported) categoryTotals[ServiceCategory.DATABASE] = bd.monthlyCost;
        else unsupportedCategories.push(ServiceCategory.DATABASE);
      }

      if (config.activeCategories[ServiceCategory.NETWORKING]) {
        const scaledNet: NetworkingSpec = {
          ...config.networking,
          egressGbPerMonth: config.networking.egressGbPerMonth * scaleFactor
        };
        let bd: ServiceCostBreakdown;
        if (!cap.categories[ServiceCategory.NETWORKING]) {
          bd = notOfferedBreakdown(provider, ServiceCategory.NETWORKING, 'CATEGORY_NOT_OFFERED', cap.notes.categories?.[ServiceCategory.NETWORKING]);
        } else {
          bd = this.calculateNetworking(scaledNet, provider, totalInstanceCount);
          applyMultiplier(bd);
        }
        breakdowns.push(bd);
        if (bd.supported) categoryTotals[ServiceCategory.NETWORKING] = bd.monthlyCost;
        else unsupportedCategories.push(ServiceCategory.NETWORKING);
      }

      if (config.activeCategories[ServiceCategory.KUBERNETES]) {
        const scaledK8s: KubernetesSpec = {
          ...config.kubernetes,
          workerNodesPerCluster: config.kubernetes.workerNodesPerCluster * scaleFactor
        };
        let bd: ServiceCostBreakdown;
        if (!cap.categories[ServiceCategory.KUBERNETES]) {
          bd = notOfferedBreakdown(provider, ServiceCategory.KUBERNETES, 'CATEGORY_NOT_OFFERED', cap.notes.categories?.[ServiceCategory.KUBERNETES]);
        } else {
          bd = this.calculateKubernetes(scaledK8s, provider);
          applyMultiplier(bd);
        }
        breakdowns.push(bd);
        if (bd.supported) categoryTotals[ServiceCategory.KUBERNETES] = bd.monthlyCost;
        else unsupportedCategories.push(ServiceCategory.KUBERNETES);
      }

      const monthlyTotal = Number(Object.values(categoryTotals).reduce((sum, val) => sum + val, 0).toFixed(2));
      const annualTotal = Number((monthlyTotal * 12).toFixed(2));
      const threeYearTotal = Number((annualTotal * 3).toFixed(2));

      providerTotals[provider] = {
        provider,
        monthlyTotal,
        annualTotal,
        threeYearTotal,
        categoryBreakdown: categoryTotals,
        highlightNotes: [...PROVIDER_METAS[provider].highlightNotes],
        unsupportedCategories,
        hasCoverageGap: unsupportedCategories.length > 0
      };
    }

    const totals = providerTotals as Record<CloudProvider, ProviderTotalCost>;

    // Rank only over providers the user actually selected, and only the ones
    // that can honestly be compared for this config — a missing line item
    // must never let a provider "win" purely because it couldn't be priced.
    const comparableProviders = selectedProviders.filter((p) => !totals[p].hasCoverageGap);
    const allSelectedHaveGaps = comparableProviders.length === 0;
    const rankPool = allSelectedHaveGaps ? selectedProviders : comparableProviders;

    const sortedByMonthly = [...rankPool].sort((a, b) => totals[a].monthlyTotal - totals[b].monthlyTotal);
    const sortedByAnnual = [...rankPool].sort((a, b) => totals[a].annualTotal - totals[b].annualTotal);

    const cheapestMonthly = sortedByMonthly[0];
    const mostExpensiveMonthly = sortedByMonthly[sortedByMonthly.length - 1];

    const minCost = totals[cheapestMonthly]?.monthlyTotal ?? 0;
    const maxCost = totals[mostExpensiveMonthly]?.monthlyTotal ?? 0;
    const monthlyMaxSavings = Number((maxCost - minCost).toFixed(2));
    const monthlyMaxSavingsPercent = maxCost > 0 ? Math.round((monthlyMaxSavings / maxCost) * 100) : 0;
    const annualMaxSavings = Number((monthlyMaxSavings * 12).toFixed(2));

    return {
      config,
      providers: totals,
      breakdowns,
      selectedProviders,
      comparableProviders,
      allSelectedHaveGaps,
      cheapestMonthlyProvider: cheapestMonthly,
      cheapestAnnualProvider: sortedByAnnual[0],
      mostExpensiveMonthlyProvider: mostExpensiveMonthly,
      monthlyMaxSavings,
      monthlyMaxSavingsPercent,
      annualMaxSavings
    };
  }
}

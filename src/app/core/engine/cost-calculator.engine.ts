import { CloudProvider } from '../models/cloud-provider.enum';
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
  StorageSpec
} from '../models/pricing.model';
import { BENCHMARK_CATALOGS, ComputeBenchmark, DatabaseBenchmark } from './catalog/seeded-pricing-catalog';

export class CostCalculatorEngine {
  /**
   * Calculates compute instance cost for a given provider
   */
  public static calculateCompute(spec: ComputeSpec, provider: CloudProvider): ServiceCostBreakdown {
    const catalog = BENCHMARK_CATALOGS[provider];
    
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
    const catalog = BENCHMARK_CATALOGS[provider];
    const tierPricing = catalog.storage[spec.tier];

    const capacityCost = spec.capacityGb * tierPricing.costPerGbMonth;
    const readCost = (spec.readOpsThousands / 10) * tierPricing.costPer10kReads;
    const writeCost = (spec.writeOpsThousands / 10) * tierPricing.costPer10kWrites;

    const monthlyCost = Number((capacityCost + readCost + writeCost).toFixed(2));
    const annualCost = Number((monthlyCost * 12).toFixed(2));

    const tierLabel = `${provider === CloudProvider.AWS ? 'Amazon S3' : provider === CloudProvider.AZURE ? 'Azure Blob' : 'Google Cloud Storage'} (${spec.tier})`;

    return {
      provider,
      category: ServiceCategory.STORAGE,
      monthlyCost,
      annualCost,
      instanceTypeOrTier: tierLabel,
      details: [
        `${spec.capacityGb.toLocaleString()} GB at $${tierPricing.costPerGbMonth}/GB-mo ($${capacityCost.toFixed(2)})`,
        `${spec.readOpsThousands.toLocaleString()}k Read ops ($${readCost.toFixed(2)})`,
        `${spec.writeOpsThousands.toLocaleString()}k Write ops ($${writeCost.toFixed(2)})`
      ],
      savingsTips: spec.tier === 'HOT' && spec.capacityGb > 500
        ? 'Enable Lifecycle rules to automatically transition older data to Cool/Cold storage.'
        : undefined
    };
  }

  /**
   * Calculates managed database cost (Instance + Storage + Multi-AZ)
   */
  public static calculateDatabase(spec: DatabaseSpec, provider: CloudProvider): ServiceCostBreakdown {
    const catalog = BENCHMARK_CATALOGS[provider];

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

    const dbFamilyLabel = `${provider === CloudProvider.AWS ? 'RDS/Aurora' : provider === CloudProvider.AZURE ? 'Azure Database' : 'Cloud SQL'} ${matched.name}`;

    return {
      provider,
      category: ServiceCategory.DATABASE,
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
   * Calculates networking & data egress cost
   */
  public static calculateNetworking(spec: NetworkingSpec, provider: CloudProvider): ServiceCostBreakdown {
    const catalog = BENCHMARK_CATALOGS[provider];
    const egressGb = spec.egressGbPerMonth;

    let egressCost = 0;
    if (egressGb <= 10240) {
      egressCost = egressGb * catalog.networking.first10TbPerGb;
    } else {
      egressCost = (10240 * catalog.networking.first10TbPerGb) + ((egressGb - 10240) * catalog.networking.next40TbPerGb);
    }

    const lbCost = spec.loadBalancersCount * catalog.networking.loadBalancerHourly * 730;
    const staticIpCost = spec.staticIpsCount * catalog.networking.staticIpHourly * 730;

    const monthlyCost = Number((egressCost + lbCost + staticIpCost).toFixed(2));
    const annualCost = Number((monthlyCost * 12).toFixed(2));

    return {
      provider,
      category: ServiceCategory.NETWORKING,
      monthlyCost,
      annualCost,
      instanceTypeOrTier: `${provider} Data Transfer & Load Balancer`,
      details: [
        `${egressGb.toLocaleString()} GB Internet Egress ($${egressCost.toFixed(2)})`,
        `${spec.loadBalancersCount}x Load Balancers ($${lbCost.toFixed(2)}/mo)`,
        `${spec.staticIpsCount}x Public Static IPv4 ($${staticIpCost.toFixed(2)}/mo)`
      ],
      savingsTips: egressGb > 5000
        ? 'Route traffic via CloudFront/Azure CDN/Cloud CDN to cut egress costs by 30-50%.'
        : undefined
    };
  }

  /**
   * Calculates Kubernetes cluster management and control plane cost
   */
  public static calculateKubernetes(spec: KubernetesSpec, provider: CloudProvider): ServiceCostBreakdown {
    const catalog = BENCHMARK_CATALOGS[provider];
    
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

    const k8sName = provider === CloudProvider.AWS ? 'Amazon EKS' : provider === CloudProvider.AZURE ? 'Azure AKS' : 'Google Cloud GKE';

    return {
      provider,
      category: ServiceCategory.KUBERNETES,
      monthlyCost,
      annualCost,
      instanceTypeOrTier: `${k8sName} (${totalWorkerNodes} Nodes)`,
      details: [
        `Control Plane: ${spec.clustersCount} Cluster(s) ($${controlPlaneMonthly.toFixed(2)}/mo)`,
        `Worker Nodes: ${totalWorkerNodes}x ${workerComputeBreakdown.instanceTypeOrTier} ($${workerComputeBreakdown.monthlyCost.toFixed(2)}/mo)`,
        `Node Sizing: ${spec.workerVcpu} vCPU, ${spec.workerRamGb} GB RAM per node`
      ],
      savingsTips: provider === CloudProvider.AZURE
        ? 'AKS Standard Tier includes free cluster management, providing instant base savings.'
        : 'Use Spot or Graviton/Tau VM node pools for non-critical stateless microservices.'
    };
  }

  /**
   * Generates a full side-by-side comparison matrix for AWS, Azure, and GCP
   */
  public static calculateFullMatrix(config: ArchitectureEstimateConfig): ComparisonMatrixResult {
    const providers = [CloudProvider.AWS, CloudProvider.AZURE, CloudProvider.GCP];
    const breakdowns: ServiceCostBreakdown[] = [];
    const providerTotals: Partial<Record<CloudProvider, ProviderTotalCost>> = {};

    // Determine regional pricing multiplier
    const regionId = (config.region as any) || 'us-east-1';
    const regionDef = REGION_DEFINITIONS[regionId as RegionId] || REGION_DEFINITIONS['us-east-1'];
    const regionalMultiplier = regionDef.pricingMultiplier;
    const scaleFactor = Math.max(1, config.scaleFactor || 1);

    for (const provider of providers) {
      const categoryTotals: Record<ServiceCategory, number> = {
        [ServiceCategory.COMPUTE]: 0,
        [ServiceCategory.STORAGE]: 0,
        [ServiceCategory.DATABASE]: 0,
        [ServiceCategory.NETWORKING]: 0,
        [ServiceCategory.KUBERNETES]: 0
      };

      if (config.activeCategories[ServiceCategory.COMPUTE]) {
        // Adjust for scaleFactor and region
        const scaledCompute: ComputeSpec = {
          ...config.compute,
          count: config.compute.count * scaleFactor
        };
        const bd = this.calculateCompute(scaledCompute, provider);
        bd.monthlyCost = Number((bd.monthlyCost * regionalMultiplier).toFixed(2));
        bd.annualCost = Number((bd.monthlyCost * 12).toFixed(2));
        breakdowns.push(bd);
        categoryTotals[ServiceCategory.COMPUTE] = bd.monthlyCost;
      }

      if (config.activeCategories[ServiceCategory.STORAGE]) {
        const scaledStorage: StorageSpec = {
          ...config.storage,
          capacityGb: config.storage.capacityGb * scaleFactor,
          readOpsThousands: config.storage.readOpsThousands * scaleFactor,
          writeOpsThousands: config.storage.writeOpsThousands * scaleFactor
        };
        const bd = this.calculateStorage(scaledStorage, provider);
        bd.monthlyCost = Number((bd.monthlyCost * regionalMultiplier).toFixed(2));
        bd.annualCost = Number((bd.monthlyCost * 12).toFixed(2));
        breakdowns.push(bd);
        categoryTotals[ServiceCategory.STORAGE] = bd.monthlyCost;
      }

      if (config.activeCategories[ServiceCategory.DATABASE]) {
        const scaledDb: DatabaseSpec = {
          ...config.database,
          storageGb: config.database.storageGb * scaleFactor
        };
        const bd = this.calculateDatabase(scaledDb, provider);
        bd.monthlyCost = Number((bd.monthlyCost * regionalMultiplier).toFixed(2));
        bd.annualCost = Number((bd.monthlyCost * 12).toFixed(2));
        breakdowns.push(bd);
        categoryTotals[ServiceCategory.DATABASE] = bd.monthlyCost;
      }

      if (config.activeCategories[ServiceCategory.NETWORKING]) {
        const scaledNet: NetworkingSpec = {
          ...config.networking,
          egressGbPerMonth: config.networking.egressGbPerMonth * scaleFactor
        };
        const bd = this.calculateNetworking(scaledNet, provider);
        bd.monthlyCost = Number((bd.monthlyCost * regionalMultiplier).toFixed(2));
        bd.annualCost = Number((bd.monthlyCost * 12).toFixed(2));
        breakdowns.push(bd);
        categoryTotals[ServiceCategory.NETWORKING] = bd.monthlyCost;
      }

      if (config.activeCategories[ServiceCategory.KUBERNETES]) {
        const scaledK8s: KubernetesSpec = {
          ...config.kubernetes,
          workerNodesPerCluster: config.kubernetes.workerNodesPerCluster * scaleFactor
        };
        const bd = this.calculateKubernetes(scaledK8s, provider);
        bd.monthlyCost = Number((bd.monthlyCost * regionalMultiplier).toFixed(2));
        bd.annualCost = Number((bd.monthlyCost * 12).toFixed(2));
        breakdowns.push(bd);
        categoryTotals[ServiceCategory.KUBERNETES] = bd.monthlyCost;
      }

      const monthlyTotal = Number(Object.values(categoryTotals).reduce((sum, val) => sum + val, 0).toFixed(2));
      const annualTotal = Number((monthlyTotal * 12).toFixed(2));
      const threeYearTotal = Number((annualTotal * 3).toFixed(2));

      const highlightNotes: string[] = [];
      if (provider === CloudProvider.AWS) {
        highlightNotes.push('Graviton3/4 arm64 processors offer up to 20% lower price/performance.');
        highlightNotes.push('Savings Plans apply flexibly across EC2, Fargate, and Lambda.');
      } else if (provider === CloudProvider.AZURE) {
        highlightNotes.push('Azure Hybrid Benefit cuts up to 40% on Windows & SQL Server licenses.');
        highlightNotes.push('Free AKS cluster management on baseline tier.');
      } else if (provider === CloudProvider.GCP) {
        highlightNotes.push('Custom Machine Types avoid paying for unused vCPUs or RAM.');
        highlightNotes.push('First GKE zonal cluster management fee is completely waived.');
      }

      providerTotals[provider] = {
        provider,
        monthlyTotal,
        annualTotal,
        threeYearTotal,
        categoryBreakdown: categoryTotals,
        highlightNotes
      };
    }

    // Determine cheapest providers
    const sortedByMonthly = [...providers].sort(
      (a, b) => (providerTotals[a]?.monthlyTotal ?? 0) - (providerTotals[b]?.monthlyTotal ?? 0)
    );
    const sortedByAnnual = [...providers].sort(
      (a, b) => (providerTotals[a]?.annualTotal ?? 0) - (providerTotals[b]?.annualTotal ?? 0)
    );

    const cheapestMonthly = sortedByMonthly[0];
    const mostExpensiveMonthly = sortedByMonthly[sortedByMonthly.length - 1];

    const minCost = providerTotals[cheapestMonthly]?.monthlyTotal ?? 0;
    const maxCost = providerTotals[mostExpensiveMonthly]?.monthlyTotal ?? 0;
    const monthlyMaxSavings = Number((maxCost - minCost).toFixed(2));
    const monthlyMaxSavingsPercent = maxCost > 0 ? Math.round((monthlyMaxSavings / maxCost) * 100) : 0;
    const annualMaxSavings = Number((monthlyMaxSavings * 12).toFixed(2));

    return {
      config,
      providers: providerTotals as Record<CloudProvider, ProviderTotalCost>,
      breakdowns,
      cheapestMonthlyProvider: cheapestMonthly,
      cheapestAnnualProvider: sortedByAnnual[0],
      monthlyMaxSavings,
      monthlyMaxSavingsPercent,
      annualMaxSavings
    };
  }
}

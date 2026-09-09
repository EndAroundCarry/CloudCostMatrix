import { CloudProvider } from '../../models/cloud-provider.enum';
import { StorageTier } from '../../models/pricing.model';

export interface ComputeBenchmark {
  family: string;
  name: string;
  vCpu: number;
  ramGb: number;
  hourlyOnDemandLinux: number;
  hourly1YrReservedLinux: number;
  hourly3YrReservedLinux: number;
  hourlySpotLinux: number;
  windowsHourlySurcharge: number;
}

export interface StorageBenchmark {
  tier: StorageTier;
  costPerGbMonth: number;
  costPer10kReads: number;
  costPer10kWrites: number;
  /** Flat monthly floor below a usage threshold, e.g. DigitalOcean/Linode's $5-for-250GB. */
  minimumMonthlyFee?: number;
}

export interface DatabaseBenchmark {
  name: string;
  vCpu: number;
  ramGb: number;
  hourlyPostgres: number;
  hourlyMySql: number;
  hourlySqlServer: number;
  storagePerGbMonth: number;
  multiAzMultiplier: number;
}

export interface EgressBenchmark {
  first10TbPerGb: number;
  next40TbPerGb: number;
  loadBalancerHourly: number;
  staticIpHourly: number;
  /** GB free before metering starts (policy, not a per-instance bundle). OCI: 10240. */
  freeEgressGbPerMonth?: number;
  /** GB bundled per compute instance, pooled account-wide (DigitalOcean, Linode). */
  bundledEgressGbPerInstance?: number;
  /** Flat overage rate once free + bundled allowance is exhausted. */
  overageEgressPerGb?: number;
  /** True when egress is unlimited/free under a fair-use policy (OVHcloud). Boolean, not Infinity — stays JSON/URL-safe. */
  unlimitedEgress?: boolean;
  /** Human copy describing the allowance, surfaced in the networking detail line. */
  egressPolicyNote?: string;
}

export interface KubernetesBenchmark {
  managementHourlyFeePerCluster: number; // EKS: $0.10/hr ($73/mo), AKS: $0 (Standard $0.10), GKE: $0.10/hr ($73/mo after 1 free cluster)
  freeFirstCluster: boolean;
}

export interface ProviderPricingCatalog {
  provider: CloudProvider;
  region: string;
  compute: ComputeBenchmark[];
  storage: Record<StorageTier, StorageBenchmark>;
  database: DatabaseBenchmark[];
  networking: EgressBenchmark;
  kubernetes: KubernetesBenchmark;
}

export const BENCHMARK_CATALOGS: Record<CloudProvider, ProviderPricingCatalog> = {
  [CloudProvider.AWS]: {
    provider: CloudProvider.AWS,
    region: 'us-east-1 (N. Virginia)',
    compute: [
      { family: 'General Purpose (t4g/m6g/m6i)', name: 't4g.small', vCpu: 2, ramGb: 2, hourlyOnDemandLinux: 0.0168, hourly1YrReservedLinux: 0.0106, hourly3YrReservedLinux: 0.0071, hourlySpotLinux: 0.0050, windowsHourlySurcharge: 0.009 },
      { family: 'General Purpose (t4g/m6g/m6i)', name: 't4g.medium', vCpu: 2, ramGb: 4, hourlyOnDemandLinux: 0.0336, hourly1YrReservedLinux: 0.0212, hourly3YrReservedLinux: 0.0141, hourlySpotLinux: 0.0101, windowsHourlySurcharge: 0.018 },
      { family: 'General Purpose (t4g/m6g/m6i)', name: 't4g.xlarge', vCpu: 4, ramGb: 16, hourlyOnDemandLinux: 0.1344, hourly1YrReservedLinux: 0.0847, hourly3YrReservedLinux: 0.0564, hourlySpotLinux: 0.0403, windowsHourlySurcharge: 0.072 },
      { family: 'General Purpose (m6i)', name: 'm6i.2xlarge', vCpu: 8, ramGb: 32, hourlyOnDemandLinux: 0.384, hourly1YrReservedLinux: 0.241, hourly3YrReservedLinux: 0.161, hourlySpotLinux: 0.115, windowsHourlySurcharge: 0.154 },
      { family: 'Compute Optimized (c6i)', name: 'c6i.4xlarge', vCpu: 16, ramGb: 32, hourlyOnDemandLinux: 0.680, hourly1YrReservedLinux: 0.428, hourly3YrReservedLinux: 0.285, hourlySpotLinux: 0.204, windowsHourlySurcharge: 0.308 },
      { family: 'Memory Optimized (r6i)', name: 'r6i.4xlarge', vCpu: 16, ramGb: 128, hourlyOnDemandLinux: 1.008, hourly1YrReservedLinux: 0.635, hourly3YrReservedLinux: 0.423, hourlySpotLinux: 0.302, windowsHourlySurcharge: 0.308 },
      { family: 'High Capacity', name: 'm6i.8xlarge', vCpu: 32, ramGb: 128, hourlyOnDemandLinux: 1.536, hourly1YrReservedLinux: 0.967, hourly3YrReservedLinux: 0.645, hourlySpotLinux: 0.461, windowsHourlySurcharge: 0.615 }
    ],
    storage: {
      HOT: { tier: 'HOT', costPerGbMonth: 0.023, costPer10kReads: 0.004, costPer10kWrites: 0.05 },
      COOL: { tier: 'COOL', costPerGbMonth: 0.0125, costPer10kReads: 0.01, costPer10kWrites: 0.10 },
      COLD: { tier: 'COLD', costPerGbMonth: 0.004, costPer10kReads: 0.05, costPer10kWrites: 0.13 },
      ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.00099, costPer10kReads: 0.50, costPer10kWrites: 0.30 }
    },
    database: [
      { name: 'db.t4g.medium', vCpu: 2, ramGb: 4, hourlyPostgres: 0.068, hourlyMySql: 0.068, hourlySqlServer: 0.178, storagePerGbMonth: 0.115, multiAzMultiplier: 2.0 },
      { name: 'db.m6g.xlarge', vCpu: 4, ramGb: 16, hourlyPostgres: 0.316, hourlyMySql: 0.316, hourlySqlServer: 0.756, storagePerGbMonth: 0.115, multiAzMultiplier: 2.0 },
      { name: 'db.m6g.2xlarge', vCpu: 8, ramGb: 32, hourlyPostgres: 0.632, hourlyMySql: 0.632, hourlySqlServer: 1.512, storagePerGbMonth: 0.115, multiAzMultiplier: 2.0 },
      { name: 'db.r6g.2xlarge', vCpu: 8, ramGb: 64, hourlyPostgres: 0.848, hourlyMySql: 0.848, hourlySqlServer: 1.728, storagePerGbMonth: 0.115, multiAzMultiplier: 2.0 }
    ],
    networking: {
      first10TbPerGb: 0.09,
      next40TbPerGb: 0.085,
      loadBalancerHourly: 0.0225, // ALB ($16.42/mo baseline)
      staticIpHourly: 0.005 // ~$3.65/mo for idle/in-use IPv4
    },
    kubernetes: {
      managementHourlyFeePerCluster: 0.10, // $73/mo
      freeFirstCluster: false
    }
  },

  [CloudProvider.AZURE]: {
    provider: CloudProvider.AZURE,
    region: 'East US',
    compute: [
      { family: 'General Purpose (B/D-series)', name: 'Standard_B2s', vCpu: 2, ramGb: 4, hourlyOnDemandLinux: 0.0416, hourly1YrReservedLinux: 0.0245, hourly3YrReservedLinux: 0.0158, hourlySpotLinux: 0.0083, windowsHourlySurcharge: 0.022 },
      { family: 'General Purpose (B/D-series)', name: 'Standard_D2as_v5', vCpu: 2, ramGb: 8, hourlyOnDemandLinux: 0.096, hourly1YrReservedLinux: 0.0595, hourly3YrReservedLinux: 0.0384, hourlySpotLinux: 0.0192, windowsHourlySurcharge: 0.046 },
      { family: 'General Purpose (D-series)', name: 'Standard_D4as_v5', vCpu: 4, ramGb: 16, hourlyOnDemandLinux: 0.192, hourly1YrReservedLinux: 0.119, hourly3YrReservedLinux: 0.0768, hourlySpotLinux: 0.0384, windowsHourlySurcharge: 0.092 },
      { family: 'General Purpose (D-series)', name: 'Standard_D8as_v5', vCpu: 8, ramGb: 32, hourlyOnDemandLinux: 0.384, hourly1YrReservedLinux: 0.238, hourly3YrReservedLinux: 0.1536, hourlySpotLinux: 0.0768, windowsHourlySurcharge: 0.184 },
      { family: 'Compute Optimized (F-series)', name: 'Standard_F16s_v2', vCpu: 16, ramGb: 32, hourlyOnDemandLinux: 0.677, hourly1YrReservedLinux: 0.426, hourly3YrReservedLinux: 0.271, hourlySpotLinux: 0.135, windowsHourlySurcharge: 0.368 },
      { family: 'Memory Optimized (E-series)', name: 'Standard_E16as_v5', vCpu: 16, ramGb: 128, hourlyOnDemandLinux: 1.024, hourly1YrReservedLinux: 0.635, hourly3YrReservedLinux: 0.4096, hourlySpotLinux: 0.2048, windowsHourlySurcharge: 0.368 },
      { family: 'High Capacity', name: 'Standard_D32as_v5', vCpu: 32, ramGb: 128, hourlyOnDemandLinux: 1.536, hourly1YrReservedLinux: 0.952, hourly3YrReservedLinux: 0.6144, hourlySpotLinux: 0.3072, windowsHourlySurcharge: 0.736 }
    ],
    storage: {
      HOT: { tier: 'HOT', costPerGbMonth: 0.018, costPer10kReads: 0.004, costPer10kWrites: 0.05 },
      COOL: { tier: 'COOL', costPerGbMonth: 0.010, costPer10kReads: 0.01, costPer10kWrites: 0.10 },
      COLD: { tier: 'COLD', costPerGbMonth: 0.0036, costPer10kReads: 0.05, costPer10kWrites: 0.13 },
      ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.00099, costPer10kReads: 0.50, costPer10kWrites: 0.30 }
    },
    database: [
      { name: 'Flexible Server D2ds_v5', vCpu: 2, ramGb: 8, hourlyPostgres: 0.137, hourlyMySql: 0.137, hourlySqlServer: 0.298, storagePerGbMonth: 0.115, multiAzMultiplier: 2.0 },
      { name: 'Flexible Server D4ds_v5', vCpu: 4, ramGb: 16, hourlyPostgres: 0.274, hourlyMySql: 0.274, hourlySqlServer: 0.596, storagePerGbMonth: 0.115, multiAzMultiplier: 2.0 },
      { name: 'Flexible Server D8ds_v5', vCpu: 8, ramGb: 32, hourlyPostgres: 0.548, hourlyMySql: 0.548, hourlySqlServer: 1.192, storagePerGbMonth: 0.115, multiAzMultiplier: 2.0 },
      { name: 'Flexible Server E8ds_v5', vCpu: 8, ramGb: 64, hourlyPostgres: 0.760, hourlyMySql: 0.760, hourlySqlServer: 1.404, storagePerGbMonth: 0.115, multiAzMultiplier: 2.0 }
    ],
    networking: {
      first10TbPerGb: 0.087,
      next40TbPerGb: 0.083,
      loadBalancerHourly: 0.025, // Standard Load Balancer
      staticIpHourly: 0.004
    },
    kubernetes: {
      managementHourlyFeePerCluster: 0.00, // Free cluster management on standard AKS tier
      freeFirstCluster: true
    }
  },

  [CloudProvider.GCP]: {
    provider: CloudProvider.GCP,
    region: 'us-central1 (Iowa)',
    compute: [
      { family: 'General Purpose (e2/n2)', name: 'e2-standard-2', vCpu: 2, ramGb: 8, hourlyOnDemandLinux: 0.067, hourly1YrReservedLinux: 0.0422, hourly3YrReservedLinux: 0.0301, hourlySpotLinux: 0.0201, windowsHourlySurcharge: 0.046 },
      { family: 'General Purpose (e2/n2)', name: 'e2-standard-4', vCpu: 4, ramGb: 16, hourlyOnDemandLinux: 0.134, hourly1YrReservedLinux: 0.0844, hourly3YrReservedLinux: 0.0603, hourlySpotLinux: 0.0402, windowsHourlySurcharge: 0.092 },
      { family: 'General Purpose (n2)', name: 'n2-standard-8', vCpu: 8, ramGb: 32, hourlyOnDemandLinux: 0.388, hourly1YrReservedLinux: 0.244, hourly3YrReservedLinux: 0.174, hourlySpotLinux: 0.081, windowsHourlySurcharge: 0.184 },
      { family: 'Compute Optimized (c2)', name: 'c2-standard-16', vCpu: 16, ramGb: 64, hourlyOnDemandLinux: 0.835, hourly1YrReservedLinux: 0.526, hourly3YrReservedLinux: 0.375, hourlySpotLinux: 0.175, windowsHourlySurcharge: 0.368 },
      { family: 'Memory Optimized (m1)', name: 'n2-highmem-16', vCpu: 16, ramGb: 128, hourlyOnDemandLinux: 1.096, hourly1YrReservedLinux: 0.690, hourly3YrReservedLinux: 0.493, hourlySpotLinux: 0.230, windowsHourlySurcharge: 0.368 },
      { family: 'High Capacity', name: 'n2-standard-32', vCpu: 32, ramGb: 128, hourlyOnDemandLinux: 1.552, hourly1YrReservedLinux: 0.978, hourly3YrReservedLinux: 0.698, hourlySpotLinux: 0.326, windowsHourlySurcharge: 0.736 }
    ],
    storage: {
      HOT: { tier: 'HOT', costPerGbMonth: 0.020, costPer10kReads: 0.004, costPer10kWrites: 0.05 },
      COOL: { tier: 'COOL', costPerGbMonth: 0.010, costPer10kReads: 0.01, costPer10kWrites: 0.10 },
      COLD: { tier: 'COLD', costPerGbMonth: 0.004, costPer10kReads: 0.05, costPer10kWrites: 0.13 },
      ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.0012, costPer10kReads: 0.50, costPer10kWrites: 0.30 }
    },
    database: [
      { name: 'db-custom-2-7680', vCpu: 2, ramGb: 7.5, hourlyPostgres: 0.104, hourlyMySql: 0.104, hourlySqlServer: 0.280, storagePerGbMonth: 0.170, multiAzMultiplier: 2.0 },
      { name: 'db-custom-4-15360', vCpu: 4, ramGb: 15, hourlyPostgres: 0.208, hourlyMySql: 0.208, hourlySqlServer: 0.560, storagePerGbMonth: 0.170, multiAzMultiplier: 2.0 },
      { name: 'db-custom-8-30720', vCpu: 8, ramGb: 30, hourlyPostgres: 0.416, hourlyMySql: 0.416, hourlySqlServer: 1.120, storagePerGbMonth: 0.170, multiAzMultiplier: 2.0 },
      { name: 'db-custom-16-61440', vCpu: 16, ramGb: 60, hourlyPostgres: 0.832, hourlyMySql: 0.832, hourlySqlServer: 2.240, storagePerGbMonth: 0.170, multiAzMultiplier: 2.0 }
    ],
    networking: {
      first10TbPerGb: 0.085,
      next40TbPerGb: 0.080,
      loadBalancerHourly: 0.025,
      staticIpHourly: 0.004
    },
    kubernetes: {
      managementHourlyFeePerCluster: 0.10, // $73/mo, first zonal cluster free
      freeFirstCluster: true
    }
  },

  // ------------------------------------------------------------------
  // Challengers & developer clouds — 2026 benchmark seed catalogs.
  // Every compute[] spans the same 2/4 → 32/128 vCPU/RAM envelope as the
  // big 3 so the nearest-match sizer (cost-calculator.engine.ts) always
  // compares like-for-like instead of matching a request to an undersized
  // shape and looking artificially cheap. Rates are relative-positioning
  // estimates anchored to AWS list price per the sourcing notes in the
  // implementation plan — verify against each provider's pricing page
  // before treating these as anything more than directional benchmarks.
  // ------------------------------------------------------------------

  [CloudProvider.ORACLE]: {
    provider: CloudProvider.ORACLE,
    region: 'us-ashburn-1 (Ashburn)',
    compute: [
      { family: 'General Purpose (E5.Flex / A2.Flex Ampere)', name: 'VM.Standard.E5.Flex-2x4', vCpu: 2, ramGb: 4, hourlyOnDemandLinux: 0.0218, hourly1YrReservedLinux: 0.0164, hourly3YrReservedLinux: 0.0146, hourlySpotLinux: 0.0109, windowsHourlySurcharge: 0.0109 },
      { family: 'General Purpose (E5.Flex / A2.Flex Ampere)', name: 'VM.Standard.E5.Flex-2x8', vCpu: 2, ramGb: 8, hourlyOnDemandLinux: 0.0312, hourly1YrReservedLinux: 0.0234, hourly3YrReservedLinux: 0.0209, hourlySpotLinux: 0.0156, windowsHourlySurcharge: 0.0156 },
      { family: 'General Purpose (E5.Flex)', name: 'VM.Standard.E5.Flex-4x16', vCpu: 4, ramGb: 16, hourlyOnDemandLinux: 0.0874, hourly1YrReservedLinux: 0.0656, hourly3YrReservedLinux: 0.0586, hourlySpotLinux: 0.0437, windowsHourlySurcharge: 0.0437 },
      { family: 'General Purpose (E5.Flex)', name: 'VM.Standard.E5.Flex-8x32', vCpu: 8, ramGb: 32, hourlyOnDemandLinux: 0.2496, hourly1YrReservedLinux: 0.1872, hourly3YrReservedLinux: 0.1672, hourlySpotLinux: 0.1248, windowsHourlySurcharge: 0.1248 },
      { family: 'Compute Optimized (Optimized3.Flex)', name: 'VM.Optimized3.Flex-16x32', vCpu: 16, ramGb: 32, hourlyOnDemandLinux: 0.4420, hourly1YrReservedLinux: 0.3315, hourly3YrReservedLinux: 0.2961, hourlySpotLinux: 0.2210, windowsHourlySurcharge: 0.2210 },
      { family: 'Memory Optimized (E5.Flex)', name: 'VM.Standard.E5.Flex-16x128', vCpu: 16, ramGb: 128, hourlyOnDemandLinux: 0.6552, hourly1YrReservedLinux: 0.4914, hourly3YrReservedLinux: 0.4390, hourlySpotLinux: 0.3276, windowsHourlySurcharge: 0.3276 },
      { family: 'High Capacity (E5.Flex)', name: 'VM.Standard.E5.Flex-32x128', vCpu: 32, ramGb: 128, hourlyOnDemandLinux: 0.9984, hourly1YrReservedLinux: 0.7488, hourly3YrReservedLinux: 0.6689, hourlySpotLinux: 0.4992, windowsHourlySurcharge: 0.4992 }
    ],
    storage: {
      HOT: { tier: 'HOT', costPerGbMonth: 0.0255, costPer10kReads: 0.004, costPer10kWrites: 0.05 },
      COOL: { tier: 'COOL', costPerGbMonth: 0.0100, costPer10kReads: 0.01, costPer10kWrites: 0.10 },
      COLD: { tier: 'COLD', costPerGbMonth: 0.0100, costPer10kReads: 0.05, costPer10kWrites: 0.13 }, // UNSUPPORTED — cloned from COOL; gated by PROVIDER_CAPABILITIES (OCI has no distinct Cold tier)
      ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.0026, costPer10kReads: 0.50, costPer10kWrites: 0.30 }
    },
    database: [
      { name: 'db.standard.e4.2x4', vCpu: 2, ramGb: 4, hourlyPostgres: 0.0442, hourlyMySql: 0.0442, hourlySqlServer: 0.0442, storagePerGbMonth: 0.085, multiAzMultiplier: 2.0 }, // sqlServer UNSUPPORTED — cloned from MySQL, gated by PROVIDER_CAPABILITIES
      { name: 'db.standard.e4.4x16', vCpu: 4, ramGb: 16, hourlyPostgres: 0.2054, hourlyMySql: 0.2054, hourlySqlServer: 0.2054, storagePerGbMonth: 0.085, multiAzMultiplier: 2.0 },
      { name: 'db.standard.e4.8x32', vCpu: 8, ramGb: 32, hourlyPostgres: 0.4108, hourlyMySql: 0.4108, hourlySqlServer: 0.4108, storagePerGbMonth: 0.085, multiAzMultiplier: 2.0 },
      { name: 'db.standard.e4.8x64', vCpu: 8, ramGb: 64, hourlyPostgres: 0.5512, hourlyMySql: 0.5512, hourlySqlServer: 0.5512, storagePerGbMonth: 0.085, multiAzMultiplier: 2.0 }
    ],
    networking: {
      first10TbPerGb: 0.0085,
      next40TbPerGb: 0.0080,
      loadBalancerHourly: 0.0113,
      staticIpHourly: 0.003,
      freeEgressGbPerMonth: 10240,
      egressPolicyNote: 'The first 10 TB of outbound data transfer is free every month on every OCI tenancy.'
    },
    kubernetes: {
      managementHourlyFeePerCluster: 0.00, // OKE Basic clusters — free control plane
      freeFirstCluster: true
    }
  },

  [CloudProvider.IBM]: {
    provider: CloudProvider.IBM,
    region: 'us-east (Washington DC)',
    compute: [
      { family: 'Balanced (bx2)', name: 'bx2-2x4', vCpu: 2, ramGb: 4, hourlyOnDemandLinux: 0.0353, hourly1YrReservedLinux: 0.0265, hourly3YrReservedLinux: 0.0212, hourlySpotLinux: 0.0212, windowsHourlySurcharge: 0.0177 },
      { family: 'Balanced (bx2)', name: 'bx2-2x8', vCpu: 2, ramGb: 8, hourlyOnDemandLinux: 0.0504, hourly1YrReservedLinux: 0.0378, hourly3YrReservedLinux: 0.0302, hourlySpotLinux: 0.0302, windowsHourlySurcharge: 0.0252 },
      { family: 'Balanced (bx2)', name: 'bx2-4x16', vCpu: 4, ramGb: 16, hourlyOnDemandLinux: 0.1411, hourly1YrReservedLinux: 0.1058, hourly3YrReservedLinux: 0.0847, hourlySpotLinux: 0.0847, windowsHourlySurcharge: 0.0706 },
      { family: 'Balanced (bx2)', name: 'bx2-8x32', vCpu: 8, ramGb: 32, hourlyOnDemandLinux: 0.4032, hourly1YrReservedLinux: 0.3024, hourly3YrReservedLinux: 0.2419, hourlySpotLinux: 0.2419, windowsHourlySurcharge: 0.2016 },
      { family: 'Compute (cx2)', name: 'cx2-16x32', vCpu: 16, ramGb: 32, hourlyOnDemandLinux: 0.7140, hourly1YrReservedLinux: 0.5355, hourly3YrReservedLinux: 0.4284, hourlySpotLinux: 0.4284, windowsHourlySurcharge: 0.3570 },
      { family: 'Memory (mx2)', name: 'mx2-16x128', vCpu: 16, ramGb: 128, hourlyOnDemandLinux: 1.0584, hourly1YrReservedLinux: 0.7938, hourly3YrReservedLinux: 0.6350, hourlySpotLinux: 0.6350, windowsHourlySurcharge: 0.5292 },
      { family: 'Memory (mx2)', name: 'mx2-32x128', vCpu: 32, ramGb: 128, hourlyOnDemandLinux: 1.6128, hourly1YrReservedLinux: 1.2096, hourly3YrReservedLinux: 0.9677, hourlySpotLinux: 0.9677, windowsHourlySurcharge: 0.8064 } // no spot — hourlySpotLinux cloned from 3-yr, gated by PROVIDER_CAPABILITIES
    ],
    storage: {
      HOT: { tier: 'HOT', costPerGbMonth: 0.0220, costPer10kReads: 0.004, costPer10kWrites: 0.05 },
      COOL: { tier: 'COOL', costPerGbMonth: 0.0129, costPer10kReads: 0.01, costPer10kWrites: 0.10 },
      COLD: { tier: 'COLD', costPerGbMonth: 0.0071, costPer10kReads: 0.05, costPer10kWrites: 0.13 },
      ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.0026, costPer10kReads: 0.50, costPer10kWrites: 0.30 }
    },
    database: [
      { name: 'bx2-db-2x4', vCpu: 2, ramGb: 4, hourlyPostgres: 0.0714, hourlyMySql: 0.0714, hourlySqlServer: 0.0714, storagePerGbMonth: 0.12, multiAzMultiplier: 2.0 }, // sqlServer UNSUPPORTED — cloned, gated by PROVIDER_CAPABILITIES
      { name: 'bx2-db-4x16', vCpu: 4, ramGb: 16, hourlyPostgres: 0.3318, hourlyMySql: 0.3318, hourlySqlServer: 0.3318, storagePerGbMonth: 0.12, multiAzMultiplier: 2.0 },
      { name: 'bx2-db-8x32', vCpu: 8, ramGb: 32, hourlyPostgres: 0.6636, hourlyMySql: 0.6636, hourlySqlServer: 0.6636, storagePerGbMonth: 0.12, multiAzMultiplier: 2.0 },
      { name: 'bx2-db-8x64', vCpu: 8, ramGb: 64, hourlyPostgres: 0.8904, hourlyMySql: 0.8904, hourlySqlServer: 0.8904, storagePerGbMonth: 0.12, multiAzMultiplier: 2.0 }
    ],
    networking: {
      first10TbPerGb: 0.09,
      next40TbPerGb: 0.085,
      loadBalancerHourly: 0.025,
      staticIpHourly: 0.004
    },
    kubernetes: {
      managementHourlyFeePerCluster: 0.00, // IKS never charges for the control plane
      freeFirstCluster: true
    }
  },

  [CloudProvider.DIGITALOCEAN]: {
    provider: CloudProvider.DIGITALOCEAN,
    region: 'NYC3 (New York)',
    compute: [
      { family: 'Basic Droplet', name: 's-2vcpu-4gb', vCpu: 2, ramGb: 4, hourlyOnDemandLinux: 0.0252, hourly1YrReservedLinux: 0.0252, hourly3YrReservedLinux: 0.0252, hourlySpotLinux: 0.0252, windowsHourlySurcharge: 0.0126 }, // flat rate — no reserved/spot pricing, gated by PROVIDER_CAPABILITIES
      { family: 'Basic Droplet', name: 's-2vcpu-8gb', vCpu: 2, ramGb: 8, hourlyOnDemandLinux: 0.0408, hourly1YrReservedLinux: 0.0408, hourly3YrReservedLinux: 0.0408, hourlySpotLinux: 0.0408, windowsHourlySurcharge: 0.0204 },
      { family: 'General Purpose Droplet', name: 'g-4vcpu-16gb', vCpu: 4, ramGb: 16, hourlyOnDemandLinux: 0.1720, hourly1YrReservedLinux: 0.1720, hourly3YrReservedLinux: 0.1720, hourlySpotLinux: 0.1720, windowsHourlySurcharge: 0.0860 },
      { family: 'General Purpose Droplet', name: 'g-8vcpu-32gb', vCpu: 8, ramGb: 32, hourlyOnDemandLinux: 0.4915, hourly1YrReservedLinux: 0.4915, hourly3YrReservedLinux: 0.4915, hourlySpotLinux: 0.4915, windowsHourlySurcharge: 0.2458 },
      { family: 'CPU-Optimized Droplet', name: 'c-16vcpu-32gb', vCpu: 16, ramGb: 32, hourlyOnDemandLinux: 0.4760, hourly1YrReservedLinux: 0.4760, hourly3YrReservedLinux: 0.4760, hourlySpotLinux: 0.4760, windowsHourlySurcharge: 0.2380 },
      { family: 'Memory-Optimized Droplet', name: 'm-16vcpu-128gb', vCpu: 16, ramGb: 128, hourlyOnDemandLinux: 1.2902, hourly1YrReservedLinux: 1.2902, hourly3YrReservedLinux: 1.2902, hourlySpotLinux: 1.2902, windowsHourlySurcharge: 0.6451 },
      { family: 'Memory-Optimized Droplet', name: 'm-32vcpu-128gb', vCpu: 32, ramGb: 128, hourlyOnDemandLinux: 1.7664, hourly1YrReservedLinux: 1.7664, hourly3YrReservedLinux: 1.7664, hourlySpotLinux: 1.7664, windowsHourlySurcharge: 0.8832 }
    ],
    storage: {
      HOT: { tier: 'HOT', costPerGbMonth: 0.0200, costPer10kReads: 0.004, costPer10kWrites: 0.05, minimumMonthlyFee: 5 },
      COOL: { tier: 'COOL', costPerGbMonth: 0.0200, costPer10kReads: 0.01, costPer10kWrites: 0.10, minimumMonthlyFee: 5 }, // UNSUPPORTED — Spaces has one storage class, cloned from HOT, gated by PROVIDER_CAPABILITIES
      COLD: { tier: 'COLD', costPerGbMonth: 0.0200, costPer10kReads: 0.05, costPer10kWrites: 0.13, minimumMonthlyFee: 5 }, // UNSUPPORTED — cloned from HOT
      ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.0200, costPer10kReads: 0.50, costPer10kWrites: 0.30, minimumMonthlyFee: 5 } // UNSUPPORTED — cloned from HOT
    },
    database: [
      { name: 'db-s-2vcpu-4gb', vCpu: 2, ramGb: 4, hourlyPostgres: 0.0748, hourlyMySql: 0.0748, hourlySqlServer: 0.0748, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 }, // sqlServer UNSUPPORTED — cloned, gated by PROVIDER_CAPABILITIES
      { name: 'db-s-4vcpu-16gb', vCpu: 4, ramGb: 16, hourlyPostgres: 0.3476, hourlyMySql: 0.3476, hourlySqlServer: 0.3476, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 },
      { name: 'db-s-8vcpu-32gb', vCpu: 8, ramGb: 32, hourlyPostgres: 0.6952, hourlyMySql: 0.6952, hourlySqlServer: 0.6952, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 },
      { name: 'db-s-8vcpu-64gb', vCpu: 8, ramGb: 64, hourlyPostgres: 0.9328, hourlyMySql: 0.9328, hourlySqlServer: 0.9328, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 }
    ],
    networking: {
      first10TbPerGb: 0.01,
      next40TbPerGb: 0.01,
      loadBalancerHourly: 0.0164, // $12/mo
      staticIpHourly: 0,
      bundledEgressGbPerInstance: 1024,
      overageEgressPerGb: 0.01,
      egressPolicyNote: 'Bandwidth is pooled account-wide and bundled per Droplet; overage is billed at a flat $0.01/GB once the allowance is exhausted.'
    },
    kubernetes: {
      managementHourlyFeePerCluster: 0.00, // DOKS control plane is always free
      freeFirstCluster: true
    }
  },

  [CloudProvider.ALIBABA]: {
    provider: CloudProvider.ALIBABA,
    region: 'us-west-1 (Silicon Valley)',
    compute: [
      { family: 'Burstable (t6)', name: 'ecs.t6-c1m2.large', vCpu: 2, ramGb: 4, hourlyOnDemandLinux: 0.0286, hourly1YrReservedLinux: 0.0172, hourly3YrReservedLinux: 0.0114, hourlySpotLinux: 0.0057, windowsHourlySurcharge: 0.0143 },
      { family: 'General Purpose (g7)', name: 'ecs.g7.large', vCpu: 2, ramGb: 8, hourlyOnDemandLinux: 0.0408, hourly1YrReservedLinux: 0.0245, hourly3YrReservedLinux: 0.0163, hourlySpotLinux: 0.0082, windowsHourlySurcharge: 0.0204 },
      { family: 'General Purpose (g7)', name: 'ecs.g7.xlarge', vCpu: 4, ramGb: 16, hourlyOnDemandLinux: 0.1142, hourly1YrReservedLinux: 0.0685, hourly3YrReservedLinux: 0.0457, hourlySpotLinux: 0.0228, windowsHourlySurcharge: 0.0571 },
      { family: 'General Purpose (g7)', name: 'ecs.g7.2xlarge', vCpu: 8, ramGb: 32, hourlyOnDemandLinux: 0.3264, hourly1YrReservedLinux: 0.1958, hourly3YrReservedLinux: 0.1306, hourlySpotLinux: 0.0653, windowsHourlySurcharge: 0.1632 },
      { family: 'Compute Optimized (c7)', name: 'ecs.c7.4xlarge', vCpu: 16, ramGb: 32, hourlyOnDemandLinux: 0.5780, hourly1YrReservedLinux: 0.3468, hourly3YrReservedLinux: 0.2312, hourlySpotLinux: 0.1156, windowsHourlySurcharge: 0.2890 },
      { family: 'Memory Optimized (r7)', name: 'ecs.r7.4xlarge', vCpu: 16, ramGb: 128, hourlyOnDemandLinux: 0.8568, hourly1YrReservedLinux: 0.5141, hourly3YrReservedLinux: 0.3427, hourlySpotLinux: 0.1714, windowsHourlySurcharge: 0.4284 },
      { family: 'High Capacity (g7)', name: 'ecs.g7.8xlarge', vCpu: 32, ramGb: 128, hourlyOnDemandLinux: 1.3056, hourly1YrReservedLinux: 0.7834, hourly3YrReservedLinux: 0.5222, hourlySpotLinux: 0.2611, windowsHourlySurcharge: 0.6528 }
    ],
    storage: {
      HOT: { tier: 'HOT', costPerGbMonth: 0.0200, costPer10kReads: 0.004, costPer10kWrites: 0.05 },
      COOL: { tier: 'COOL', costPerGbMonth: 0.0125, costPer10kReads: 0.01, costPer10kWrites: 0.10 },
      COLD: { tier: 'COLD', costPerGbMonth: 0.0033, costPer10kReads: 0.05, costPer10kWrites: 0.13 },
      ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.0018, costPer10kReads: 0.50, costPer10kWrites: 0.30 }
    },
    database: [
      { name: 'ApsaraDB-2x4', vCpu: 2, ramGb: 4, hourlyPostgres: 0.0578, hourlyMySql: 0.0578, hourlySqlServer: 0.1513, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 },
      { name: 'ApsaraDB-4x16', vCpu: 4, ramGb: 16, hourlyPostgres: 0.2686, hourlyMySql: 0.2686, hourlySqlServer: 0.6426, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 },
      { name: 'ApsaraDB-8x32', vCpu: 8, ramGb: 32, hourlyPostgres: 0.5372, hourlyMySql: 0.5372, hourlySqlServer: 1.2852, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 },
      { name: 'ApsaraDB-8x64', vCpu: 8, ramGb: 64, hourlyPostgres: 0.7208, hourlyMySql: 0.7208, hourlySqlServer: 1.4688, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 }
    ],
    networking: {
      first10TbPerGb: 0.081,
      next40TbPerGb: 0.075,
      loadBalancerHourly: 0.0187,
      staticIpHourly: 0.005
    },
    kubernetes: {
      managementHourlyFeePerCluster: 0.00, // ACK Basic — free control plane (Pro tier adds SLA for $0.096/hr)
      freeFirstCluster: true
    }
  },

  [CloudProvider.LINODE]: {
    provider: CloudProvider.LINODE,
    region: 'us-east (Newark)',
    compute: [
      { family: 'Shared CPU (g6)', name: 'g6-shared-2x4', vCpu: 2, ramGb: 4, hourlyOnDemandLinux: 0.0286, hourly1YrReservedLinux: 0.0286, hourly3YrReservedLinux: 0.0286, hourlySpotLinux: 0.0286, windowsHourlySurcharge: 0.0143 }, // flat rate — no reserved/spot pricing, gated by PROVIDER_CAPABILITIES
      { family: 'Shared CPU (g6)', name: 'g6-shared-2x8', vCpu: 2, ramGb: 8, hourlyOnDemandLinux: 0.0408, hourly1YrReservedLinux: 0.0408, hourly3YrReservedLinux: 0.0408, hourlySpotLinux: 0.0408, windowsHourlySurcharge: 0.0204 },
      { family: 'Dedicated CPU (g6)', name: 'g6-dedicated-4x16', vCpu: 4, ramGb: 16, hourlyOnDemandLinux: 0.1411, hourly1YrReservedLinux: 0.1411, hourly3YrReservedLinux: 0.1411, hourlySpotLinux: 0.1411, windowsHourlySurcharge: 0.0706 },
      { family: 'Dedicated CPU (g6)', name: 'g6-dedicated-8x32', vCpu: 8, ramGb: 32, hourlyOnDemandLinux: 0.4032, hourly1YrReservedLinux: 0.4032, hourly3YrReservedLinux: 0.4032, hourlySpotLinux: 0.4032, windowsHourlySurcharge: 0.2016 },
      { family: 'Dedicated CPU (g6)', name: 'g6-dedicated-16x32', vCpu: 16, ramGb: 32, hourlyOnDemandLinux: 0.7480, hourly1YrReservedLinux: 0.7480, hourly3YrReservedLinux: 0.7480, hourlySpotLinux: 0.7480, windowsHourlySurcharge: 0.3740 },
      { family: 'High Memory (g7)', name: 'g7-highmem-16x128', vCpu: 16, ramGb: 128, hourlyOnDemandLinux: 1.1592, hourly1YrReservedLinux: 1.1592, hourly3YrReservedLinux: 1.1592, hourlySpotLinux: 1.1592, windowsHourlySurcharge: 0.5796 },
      { family: 'High Memory (g7)', name: 'g7-highmem-32x128', vCpu: 32, ramGb: 128, hourlyOnDemandLinux: 1.6896, hourly1YrReservedLinux: 1.6896, hourly3YrReservedLinux: 1.6896, hourlySpotLinux: 1.6896, windowsHourlySurcharge: 0.8448 }
    ],
    storage: {
      HOT: { tier: 'HOT', costPerGbMonth: 0.0200, costPer10kReads: 0.004, costPer10kWrites: 0.05, minimumMonthlyFee: 5 },
      COOL: { tier: 'COOL', costPerGbMonth: 0.0200, costPer10kReads: 0.01, costPer10kWrites: 0.10, minimumMonthlyFee: 5 }, // UNSUPPORTED — single storage class, cloned from HOT
      COLD: { tier: 'COLD', costPerGbMonth: 0.0200, costPer10kReads: 0.05, costPer10kWrites: 0.13, minimumMonthlyFee: 5 }, // UNSUPPORTED — cloned from HOT
      ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.0200, costPer10kReads: 0.50, costPer10kWrites: 0.30, minimumMonthlyFee: 5 } // UNSUPPORTED — cloned from HOT
    },
    database: [
      { name: 'linode-db-2x4', vCpu: 2, ramGb: 4, hourlyPostgres: 0.0748, hourlyMySql: 0.0748, hourlySqlServer: 0.0748, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 }, // sqlServer UNSUPPORTED — cloned, gated by PROVIDER_CAPABILITIES
      { name: 'linode-db-4x16', vCpu: 4, ramGb: 16, hourlyPostgres: 0.3476, hourlyMySql: 0.3476, hourlySqlServer: 0.3476, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 },
      { name: 'linode-db-8x32', vCpu: 8, ramGb: 32, hourlyPostgres: 0.6952, hourlyMySql: 0.6952, hourlySqlServer: 0.6952, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 },
      { name: 'linode-db-8x64', vCpu: 8, ramGb: 64, hourlyPostgres: 0.9328, hourlyMySql: 0.9328, hourlySqlServer: 0.9328, storagePerGbMonth: 0.10, multiAzMultiplier: 2.0 }
    ],
    networking: {
      first10TbPerGb: 0.005,
      next40TbPerGb: 0.005,
      loadBalancerHourly: 0.0137, // $10/mo NodeBalancer
      staticIpHourly: 0,
      bundledEgressGbPerInstance: 1024,
      overageEgressPerGb: 0.005,
      egressPolicyNote: 'Transfer is pooled account-wide across every Linode; overage is billed at $0.005/GB — the lowest rate in this comparison.'
    },
    kubernetes: {
      managementHourlyFeePerCluster: 0.00, // LKE control plane is always free, including HA
      freeFirstCluster: true
    }
  },

  [CloudProvider.OVHCLOUD]: {
    provider: CloudProvider.OVHCLOUD,
    region: 'BHS (Beauharnois, Canada)',
    compute: [
      { family: 'Balanced (b3)', name: 'b3-8', vCpu: 2, ramGb: 4, hourlyOnDemandLinux: 0.0161, hourly1YrReservedLinux: 0.0121, hourly3YrReservedLinux: 0.0105, hourlySpotLinux: 0.0105, windowsHourlySurcharge: 0.0081 },
      { family: 'Balanced (b3)', name: 'b3-16', vCpu: 2, ramGb: 8, hourlyOnDemandLinux: 0.0230, hourly1YrReservedLinux: 0.0173, hourly3YrReservedLinux: 0.0150, hourlySpotLinux: 0.0150, windowsHourlySurcharge: 0.0115 },
      { family: 'Balanced (b3)', name: 'b3-32', vCpu: 4, ramGb: 16, hourlyOnDemandLinux: 0.0645, hourly1YrReservedLinux: 0.0484, hourly3YrReservedLinux: 0.0419, hourlySpotLinux: 0.0419, windowsHourlySurcharge: 0.0323 },
      { family: 'Balanced (b3)', name: 'b3-64', vCpu: 8, ramGb: 32, hourlyOnDemandLinux: 0.1843, hourly1YrReservedLinux: 0.1382, hourly3YrReservedLinux: 0.1198, hourlySpotLinux: 0.1198, windowsHourlySurcharge: 0.0922 },
      { family: 'Compute Optimized (c3)', name: 'c3-32', vCpu: 16, ramGb: 32, hourlyOnDemandLinux: 0.3264, hourly1YrReservedLinux: 0.2448, hourly3YrReservedLinux: 0.2122, hourlySpotLinux: 0.2122, windowsHourlySurcharge: 0.1632 },
      { family: 'Memory Optimized (r3)', name: 'r3-128', vCpu: 16, ramGb: 128, hourlyOnDemandLinux: 0.4838, hourly1YrReservedLinux: 0.3629, hourly3YrReservedLinux: 0.3145, hourlySpotLinux: 0.3145, windowsHourlySurcharge: 0.2419 },
      { family: 'Memory Optimized (r3)', name: 'r3-256', vCpu: 32, ramGb: 128, hourlyOnDemandLinux: 0.7373, hourly1YrReservedLinux: 0.5530, hourly3YrReservedLinux: 0.4792, hourlySpotLinux: 0.4792, windowsHourlySurcharge: 0.3687 } // no spot — hourlySpotLinux cloned from 3-yr, gated by PROVIDER_CAPABILITIES
    ],
    storage: {
      HOT: { tier: 'HOT', costPerGbMonth: 0.0122, costPer10kReads: 0.004, costPer10kWrites: 0.05 },
      COOL: { tier: 'COOL', costPerGbMonth: 0.0122, costPer10kReads: 0.01, costPer10kWrites: 0.10 }, // UNSUPPORTED — no separate Cool tier, cloned from HOT
      COLD: { tier: 'COLD', costPerGbMonth: 0.0018, costPer10kReads: 0.05, costPer10kWrites: 0.13 }, // UNSUPPORTED — cloned from ARCHIVE
      ARCHIVE: { tier: 'ARCHIVE', costPerGbMonth: 0.0018, costPer10kReads: 0.50, costPer10kWrites: 0.30 }
    },
    database: [
      { name: 'db1-2-4', vCpu: 2, ramGb: 4, hourlyPostgres: 0.0374, hourlyMySql: 0.0374, hourlySqlServer: 0.0374, storagePerGbMonth: 0.08, multiAzMultiplier: 2.0 }, // sqlServer UNSUPPORTED — cloned, gated by PROVIDER_CAPABILITIES
      { name: 'db1-4-16', vCpu: 4, ramGb: 16, hourlyPostgres: 0.1738, hourlyMySql: 0.1738, hourlySqlServer: 0.1738, storagePerGbMonth: 0.08, multiAzMultiplier: 2.0 },
      { name: 'db1-8-32', vCpu: 8, ramGb: 32, hourlyPostgres: 0.3476, hourlyMySql: 0.3476, hourlySqlServer: 0.3476, storagePerGbMonth: 0.08, multiAzMultiplier: 2.0 },
      { name: 'db1-8-64', vCpu: 8, ramGb: 64, hourlyPostgres: 0.4664, hourlyMySql: 0.4664, hourlySqlServer: 0.4664, storagePerGbMonth: 0.08, multiAzMultiplier: 2.0 }
    ],
    networking: {
      first10TbPerGb: 0,
      next40TbPerGb: 0,
      loadBalancerHourly: 0.0169,
      staticIpHourly: 0.0027,
      unlimitedEgress: true,
      egressPolicyNote: 'Outbound bandwidth is unlimited and free on every OVHcloud Public Cloud plan (fair-use policy).'
    },
    kubernetes: {
      managementHourlyFeePerCluster: 0.00, // No paid control-plane tier at all
      freeFirstCluster: true
    }
  }
};

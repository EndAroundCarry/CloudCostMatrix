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
  }
};

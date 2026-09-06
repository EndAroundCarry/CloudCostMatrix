import { CloudProvider } from './cloud-provider.enum';
import { ServiceCategory } from './service-category.enum';

export type CommitmentType = 'ON_DEMAND' | '1_YEAR_RESERVED' | '3_YEAR_RESERVED' | 'SPOT';
export type OperatingSystem = 'LINUX' | 'WINDOWS';
export type StorageTier = 'HOT' | 'COOL' | 'COLD' | 'ARCHIVE';
export type DbEngine = 'POSTGRES' | 'MYSQL' | 'SQL_SERVER';

export interface ComputeSpec {
  vCpu: number;
  ramGb: number;
  os: OperatingSystem;
  count: number;
  hoursPerMonth: number; // default 730
  commitment: CommitmentType;
}

export interface StorageSpec {
  capacityGb: number;
  tier: StorageTier;
  readOpsThousands: number;
  writeOpsThousands: number;
}

export interface DatabaseSpec {
  engine: DbEngine;
  vCpu: number;
  ramGb: number;
  storageGb: number;
  multiAz: boolean;
  commitment: CommitmentType;
}

export interface NetworkingSpec {
  egressGbPerMonth: number;
  loadBalancersCount: number;
  staticIpsCount: number;
}

export interface KubernetesSpec {
  clustersCount: number;
  workerNodesPerCluster: number;
  workerVcpu: number;
  workerRamGb: number;
}

export interface ArchitectureEstimateConfig {
  id?: string;
  name: string;
  region: string;
  compute: ComputeSpec;
  storage: StorageSpec;
  database: DatabaseSpec;
  networking: NetworkingSpec;
  kubernetes: KubernetesSpec;
  activeCategories: Record<ServiceCategory, boolean>;
}

export interface ServiceCostBreakdown {
  provider: CloudProvider;
  category: ServiceCategory;
  monthlyCost: number;
  annualCost: number;
  instanceTypeOrTier: string;
  details: string[];
  savingsTips?: string;
}

export interface ProviderTotalCost {
  provider: CloudProvider;
  monthlyTotal: number;
  annualTotal: number;
  threeYearTotal: number;
  categoryBreakdown: Record<ServiceCategory, number>;
  highlightNotes: string[];
}

export interface ComparisonMatrixResult {
  config: ArchitectureEstimateConfig;
  providers: Record<CloudProvider, ProviderTotalCost>;
  breakdowns: ServiceCostBreakdown[];
  cheapestMonthlyProvider: CloudProvider;
  cheapestAnnualProvider: CloudProvider;
  monthlyMaxSavings: number; // Difference between highest and lowest
  monthlyMaxSavingsPercent: number;
  annualMaxSavings: number;
}

import { CloudProvider } from './cloud-provider.enum';
import { ServiceCategory } from './service-category.enum';

export type CommitmentType = 'ON_DEMAND' | '1_YEAR_RESERVED' | '3_YEAR_RESERVED' | 'SPOT';
export type OperatingSystem = 'LINUX' | 'WINDOWS';
export type StorageTier = 'HOT' | 'COOL' | 'COLD' | 'ARCHIVE';
export type DbEngine = 'POSTGRES' | 'MYSQL' | 'SQL_SERVER';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'INR';

export interface CurrencyDefinition {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateAgainstUsd: number; // 1 USD = rate * currency
}

export const CURRENCY_DEFINITIONS: Record<CurrencyCode, CurrencyDefinition> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateAgainstUsd: 1.0 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateAgainstUsd: 0.92 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateAgainstUsd: 0.78 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', rateAgainstUsd: 1.36 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateAgainstUsd: 1.52 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateAgainstUsd: 155.0 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateAgainstUsd: 83.5 }
};

export type RegionId = 'us-east-1' | 'us-west-2' | 'eu-central-1' | 'ap-northeast-1' | 'sa-east-1';

export interface RegionDefinition {
  id: RegionId;
  name: string;
  shortLocation: string;
  pricingMultiplier: number; // Baseline us-east-1 is 1.0
  flag: string;
}

export const REGION_DEFINITIONS: Record<RegionId, RegionDefinition> = {
  'us-east-1': {
    id: 'us-east-1',
    name: 'US-East (Virginia / N. Virginia)',
    shortLocation: 'US East',
    pricingMultiplier: 1.0,
    flag: '🇺🇸'
  },
  'us-west-2': {
    id: 'us-west-2',
    name: 'US-West (Oregon / California)',
    shortLocation: 'US West',
    pricingMultiplier: 1.02,
    flag: '🇺🇸'
  },
  'eu-central-1': {
    id: 'eu-central-1',
    name: 'Europe (Frankfurt / Dublin)',
    shortLocation: 'Europe',
    pricingMultiplier: 1.10,
    flag: '🇪🇺'
  },
  'ap-northeast-1': {
    id: 'ap-northeast-1',
    name: 'Asia Pacific (Tokyo / Singapore)',
    shortLocation: 'Asia Pacific',
    pricingMultiplier: 1.16,
    flag: '🇯🇵'
  },
  'sa-east-1': {
    id: 'sa-east-1',
    name: 'South America (São Paulo)',
    shortLocation: 'South America',
    pricingMultiplier: 1.30,
    flag: '🇧🇷'
  }
};

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
  scaleFactor?: number; // 1x baseline, 2x, 5x, 10x
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

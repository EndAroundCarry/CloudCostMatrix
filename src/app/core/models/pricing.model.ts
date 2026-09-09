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
  region: RegionId;
  scaleFactor?: number; // 1x baseline, 2x, 5x, 10x
  compute: ComputeSpec;
  storage: StorageSpec;
  database: DatabaseSpec;
  networking: NetworkingSpec;
  kubernetes: KubernetesSpec;
  activeCategories: Record<ServiceCategory, boolean>;
  /**
   * Which providers to compare/rank. Optional so every pre-existing share link,
   * saved estimate, and blueprint config keeps parsing unchanged — always read
   * this through normalizeSelectedProviders(), never directly, since a raw
   * value may be missing, stale, or carry an id this build doesn't recognize.
   */
  selectedProviders?: CloudProvider[];
}

export type UnsupportedReason =
  | 'CATEGORY_NOT_OFFERED'
  | 'STORAGE_TIER_NOT_OFFERED'
  | 'DB_ENGINE_NOT_OFFERED'
  | 'WINDOWS_NOT_OFFERED';

export interface ServiceCostBreakdown {
  provider: CloudProvider;
  category: ServiceCategory;
  /** false when this provider genuinely does not sell this combination. */
  supported: boolean;
  monthlyCost: number; // 0 when !supported — never a fabricated number
  annualCost: number; // 0 when !supported
  instanceTypeOrTier: string; // 'Not offered' when !supported
  details: string[];
  savingsTips?: string;
  unsupportedReason?: UnsupportedReason;
  unsupportedNote?: string;
}

export interface ProviderTotalCost {
  provider: CloudProvider;
  monthlyTotal: number;
  annualTotal: number;
  threeYearTotal: number;
  categoryBreakdown: Record<ServiceCategory, number>;
  highlightNotes: string[];
  /** ACTIVE categories (per config.activeCategories) this provider could not price. */
  unsupportedCategories: ServiceCategory[];
  /** true when unsupportedCategories is non-empty — this total is NOT a fair comparison. */
  hasCoverageGap: boolean;
}

export interface ComparisonMatrixResult {
  config: ArchitectureEstimateConfig;
  /** Always all providers this build knows about — never partial. selectedProviders is the view filter. */
  providers: Record<CloudProvider, ProviderTotalCost>;
  breakdowns: ServiceCostBreakdown[];
  /** The user's chosen comparison set (normalized — see normalizeSelectedProviders). */
  selectedProviders: CloudProvider[];
  /** selectedProviders minus any with a coverage gap for this config — what ranking is computed over. */
  comparableProviders: CloudProvider[];
  /** true when every selected provider has a coverage gap — ranking falls back to the full selection. */
  allSelectedHaveGaps: boolean;
  cheapestMonthlyProvider: CloudProvider;
  cheapestAnnualProvider: CloudProvider;
  mostExpensiveMonthlyProvider: CloudProvider;
  monthlyMaxSavings: number; // Difference between highest and lowest
  monthlyMaxSavingsPercent: number;
  annualMaxSavings: number;
}

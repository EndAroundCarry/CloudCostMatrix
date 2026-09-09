import { CloudProvider } from './cloud-provider.enum';
import { ServiceCategory } from './service-category.enum';
import { CommitmentType, DbEngine, StorageTier } from './pricing.model';

/**
 * Structural facts about what a provider actually sells — never prices.
 * Kept deliberately separate from ProviderPricingCatalog: the sync script
 * (scripts/sync-prices.mjs) merges fetched JSON over the seeded catalog, and a
 * capability living there could be silently flipped by a scraper bug. These
 * flags are hand-curated and outside the sync merge path, permanently.
 *
 * `Record<CloudProvider, …>` below forces a compile error the moment a new
 * enum member is added until this file is updated — the same forcing
 * function BENCHMARK_CATALOGS and PROVIDER_METAS already give.
 */
export interface ProviderCapabilities {
  provider: CloudProvider;
  /** Categories this provider offers at all. All nine offer all five today. */
  categories: Record<ServiceCategory, boolean>;
  /** Object-storage tiers with a real published SKU (vs. a cloned placeholder). */
  storageTiers: Record<StorageTier, boolean>;
  /** First-party managed relational engines. */
  dbEngines: Record<DbEngine, boolean>;
  /** Purchase models actually sold. Unsupported ones price at the on-demand rate. */
  commitments: Record<CommitmentType, boolean>;
  /** Whether Windows Server licensing is sold on compute at all. */
  windowsOs: boolean;
  /** Tooltip / detail-line copy shown wherever a gate above is false. */
  notes: {
    categories?: Partial<Record<ServiceCategory, string>>;
    storageTiers?: Partial<Record<StorageTier, string>>;
    dbEngines?: Partial<Record<DbEngine, string>>;
    commitments?: Partial<Record<CommitmentType, string>>;
    windowsOs?: string;
  };
}

const ALL_TRUE_CATEGORIES: Record<ServiceCategory, boolean> = {
  [ServiceCategory.COMPUTE]: true,
  [ServiceCategory.STORAGE]: true,
  [ServiceCategory.DATABASE]: true,
  [ServiceCategory.NETWORKING]: true,
  [ServiceCategory.KUBERNETES]: true
};

const ALL_TRUE_STORAGE_TIERS: Record<StorageTier, boolean> = {
  HOT: true,
  COOL: true,
  COLD: true,
  ARCHIVE: true
};

const ALL_TRUE_DB_ENGINES: Record<DbEngine, boolean> = {
  POSTGRES: true,
  MYSQL: true,
  SQL_SERVER: true
};

const ALL_TRUE_COMMITMENTS: Record<CommitmentType, boolean> = {
  ON_DEMAND: true,
  '1_YEAR_RESERVED': true,
  '3_YEAR_RESERVED': true,
  SPOT: true
};

export const PROVIDER_CAPABILITIES: Record<CloudProvider, ProviderCapabilities> = {
  [CloudProvider.AWS]: {
    provider: CloudProvider.AWS,
    categories: { ...ALL_TRUE_CATEGORIES },
    storageTiers: { ...ALL_TRUE_STORAGE_TIERS },
    dbEngines: { ...ALL_TRUE_DB_ENGINES },
    commitments: { ...ALL_TRUE_COMMITMENTS },
    windowsOs: true,
    notes: {}
  },
  [CloudProvider.AZURE]: {
    provider: CloudProvider.AZURE,
    categories: { ...ALL_TRUE_CATEGORIES },
    storageTiers: { ...ALL_TRUE_STORAGE_TIERS },
    dbEngines: { ...ALL_TRUE_DB_ENGINES },
    commitments: { ...ALL_TRUE_COMMITMENTS },
    windowsOs: true,
    notes: {}
  },
  [CloudProvider.GCP]: {
    provider: CloudProvider.GCP,
    categories: { ...ALL_TRUE_CATEGORIES },
    storageTiers: { ...ALL_TRUE_STORAGE_TIERS },
    dbEngines: { ...ALL_TRUE_DB_ENGINES },
    commitments: { ...ALL_TRUE_COMMITMENTS },
    windowsOs: true,
    notes: {}
  },

  [CloudProvider.ORACLE]: {
    provider: CloudProvider.ORACLE,
    categories: { ...ALL_TRUE_CATEGORIES },
    storageTiers: { HOT: true, COOL: true, COLD: false, ARCHIVE: true },
    dbEngines: { POSTGRES: true, MYSQL: true, SQL_SERVER: false },
    commitments: { ...ALL_TRUE_COMMITMENTS },
    windowsOs: true,
    notes: {
      storageTiers: { COLD: 'OCI does not publish a distinct Cold tier — Infrequent Access and Archive cover that range.' },
      dbEngines: { SQL_SERVER: 'OCI Database Service supports MySQL and PostgreSQL; SQL Server is BYOL-on-Compute only, not a managed offering.' }
    }
  },
  [CloudProvider.IBM]: {
    provider: CloudProvider.IBM,
    categories: { ...ALL_TRUE_CATEGORIES },
    storageTiers: { ...ALL_TRUE_STORAGE_TIERS },
    dbEngines: { POSTGRES: true, MYSQL: true, SQL_SERVER: false },
    commitments: { ON_DEMAND: true, '1_YEAR_RESERVED': true, '3_YEAR_RESERVED': true, SPOT: false },
    windowsOs: true,
    notes: {
      dbEngines: { SQL_SERVER: 'IBM Cloud Databases covers PostgreSQL, MySQL, and Db2 — SQL Server is not offered as a managed service.' },
      commitments: { SPOT: 'IBM Cloud Virtual Servers has no spot/preemptible pricing model.' }
    }
  },
  [CloudProvider.DIGITALOCEAN]: {
    provider: CloudProvider.DIGITALOCEAN,
    categories: { ...ALL_TRUE_CATEGORIES },
    storageTiers: { HOT: true, COOL: false, COLD: false, ARCHIVE: false },
    dbEngines: { POSTGRES: true, MYSQL: true, SQL_SERVER: false },
    commitments: { ON_DEMAND: true, '1_YEAR_RESERVED': false, '3_YEAR_RESERVED': false, SPOT: false },
    windowsOs: false,
    notes: {
      storageTiers: { COOL: 'Spaces has a single storage class — no Cool/Cold/Archive tiering.', COLD: 'Spaces has a single storage class — no Cool/Cold/Archive tiering.', ARCHIVE: 'Spaces has a single storage class — no Cool/Cold/Archive tiering.' },
      dbEngines: { SQL_SERVER: 'DigitalOcean Managed Databases covers PostgreSQL, MySQL, and a few others — no SQL Server.' },
      commitments: { '1_YEAR_RESERVED': 'DigitalOcean has no reserved-instance pricing — shown at the flat on-demand rate.', '3_YEAR_RESERVED': 'DigitalOcean has no reserved-instance pricing — shown at the flat on-demand rate.', SPOT: 'DigitalOcean has no spot/preemptible Droplets.' },
      windowsOs: 'DigitalOcean does not sell Windows Server licensing on Droplets.'
    }
  },
  [CloudProvider.ALIBABA]: {
    provider: CloudProvider.ALIBABA,
    categories: { ...ALL_TRUE_CATEGORIES },
    storageTiers: { ...ALL_TRUE_STORAGE_TIERS },
    dbEngines: { ...ALL_TRUE_DB_ENGINES },
    commitments: { ...ALL_TRUE_COMMITMENTS },
    windowsOs: true,
    notes: {}
  },
  [CloudProvider.LINODE]: {
    provider: CloudProvider.LINODE,
    categories: { ...ALL_TRUE_CATEGORIES },
    storageTiers: { HOT: true, COOL: false, COLD: false, ARCHIVE: false },
    dbEngines: { POSTGRES: true, MYSQL: true, SQL_SERVER: false },
    commitments: { ON_DEMAND: true, '1_YEAR_RESERVED': false, '3_YEAR_RESERVED': false, SPOT: false },
    windowsOs: false,
    notes: {
      storageTiers: { COOL: 'Linode Object Storage has a single class — no Cool/Cold/Archive tiering.', COLD: 'Linode Object Storage has a single class — no Cool/Cold/Archive tiering.', ARCHIVE: 'Linode Object Storage has a single class — no Cool/Cold/Archive tiering.' },
      dbEngines: { SQL_SERVER: 'Linode Managed Databases covers PostgreSQL and MySQL only.' },
      commitments: { '1_YEAR_RESERVED': 'Linode has no reserved-instance pricing — shown at the flat on-demand rate.', '3_YEAR_RESERVED': 'Linode has no reserved-instance pricing — shown at the flat on-demand rate.', SPOT: 'Linode has no spot/preemptible instance type.' },
      windowsOs: 'Linode does not sell Windows Server licensing on compute instances.'
    }
  },
  [CloudProvider.OVHCLOUD]: {
    provider: CloudProvider.OVHCLOUD,
    categories: { ...ALL_TRUE_CATEGORIES },
    storageTiers: { HOT: true, COOL: false, COLD: false, ARCHIVE: true },
    dbEngines: { POSTGRES: true, MYSQL: true, SQL_SERVER: false },
    commitments: { ON_DEMAND: true, '1_YEAR_RESERVED': true, '3_YEAR_RESERVED': true, SPOT: false },
    windowsOs: true,
    notes: {
      storageTiers: { COOL: 'OVHcloud Object Storage offers Standard and Archive only — no separate Cool tier.' },
      dbEngines: { SQL_SERVER: 'OVHcloud Public Cloud Databases covers PostgreSQL and MySQL — no managed SQL Server.' },
      commitments: { SPOT: 'OVHcloud Public Cloud has no spot/preemptible instance type.' }
    }
  }
};

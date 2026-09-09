export enum ServiceCategory {
  COMPUTE = 'COMPUTE',
  STORAGE = 'STORAGE',
  DATABASE = 'DATABASE',
  NETWORKING = 'NETWORKING',
  KUBERNETES = 'KUBERNETES'
}

export interface ServiceCategoryMeta {
  id: ServiceCategory;
  name: string;
  /** Compact label for narrow table columns — e.g. transposed matrix headers. */
  shortName: string;
  icon: string;
  description: string;
  unitLabel: string;
}

export const SERVICE_CATEGORY_METAS: Record<ServiceCategory, ServiceCategoryMeta> = {
  [ServiceCategory.COMPUTE]: {
    id: ServiceCategory.COMPUTE,
    name: 'Virtual Machines / Compute',
    shortName: 'Compute',
    icon: 'memory',
    description: 'Provider-branded virtual machine / instance pricing (e.g. EC2, Virtual Machines, Compute Engine, Droplets).',
    unitLabel: 'Instances'
  },
  [ServiceCategory.STORAGE]: {
    id: ServiceCategory.STORAGE,
    name: 'Object & Block Storage',
    shortName: 'Storage',
    icon: 'inventory_2',
    description: 'Tiered object storage pricing across each provider’s equivalent service.',
    unitLabel: 'GB/Month'
  },
  [ServiceCategory.DATABASE]: {
    id: ServiceCategory.DATABASE,
    name: 'Managed Relational Database',
    shortName: 'Database',
    icon: 'database',
    description: 'Managed PostgreSQL / MySQL / SQL Server pricing across each provider’s equivalent service.',
    unitLabel: 'Databases'
  },
  [ServiceCategory.NETWORKING]: {
    id: ServiceCategory.NETWORKING,
    name: 'Networking & Data Egress',
    shortName: 'Network',
    icon: 'public',
    description: 'Outbound data transfer, load balancers, and static IPs.',
    unitLabel: 'GB Egress'
  },
  [ServiceCategory.KUBERNETES]: {
    id: ServiceCategory.KUBERNETES,
    name: 'Managed Kubernetes',
    shortName: 'Kubernetes',
    icon: 'hub',
    description: 'Managed Kubernetes control-plane and worker-node pricing across each provider’s equivalent service.',
    unitLabel: 'Clusters'
  }
};

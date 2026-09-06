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
  icon: string;
  description: string;
  unitLabel: string;
}

export const SERVICE_CATEGORY_METAS: Record<ServiceCategory, ServiceCategoryMeta> = {
  [ServiceCategory.COMPUTE]: {
    id: ServiceCategory.COMPUTE,
    name: 'Virtual Machines / Compute',
    icon: 'memory',
    description: 'EC2 vs Azure Virtual Machines vs Google Compute Engine',
    unitLabel: 'Instances'
  },
  [ServiceCategory.STORAGE]: {
    id: ServiceCategory.STORAGE,
    name: 'Object & Block Storage',
    icon: 'inventory_2',
    description: 'Amazon S3 vs Azure Blob Storage vs Google Cloud Storage',
    unitLabel: 'GB/Month'
  },
  [ServiceCategory.DATABASE]: {
    id: ServiceCategory.DATABASE,
    name: 'Managed Relational Database',
    icon: 'database',
    description: 'AWS RDS/Aurora vs Azure SQL/Cosmos vs Google Cloud SQL',
    unitLabel: 'Databases'
  },
  [ServiceCategory.NETWORKING]: {
    id: ServiceCategory.NETWORKING,
    name: 'Networking & Data Egress',
    icon: 'public',
    description: 'Outbound data transfer, CDN bandwidth, and Load Balancers',
    unitLabel: 'GB Egress'
  },
  [ServiceCategory.KUBERNETES]: {
    id: ServiceCategory.KUBERNETES,
    name: 'Managed Kubernetes',
    icon: 'hub',
    description: 'Amazon EKS vs Azure AKS vs Google GKE cluster management & control plane',
    unitLabel: 'Clusters'
  }
};

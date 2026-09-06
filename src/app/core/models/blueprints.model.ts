import { ArchitectureEstimateConfig } from '../models/pricing.model';
import { ServiceCategory } from '../models/service-category.enum';

export interface ArchitectureBlueprint {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  recommendedFor: string;
  config: ArchitectureEstimateConfig;
}

export const ARCHITECTURE_BLUEPRINTS: ArchitectureBlueprint[] = [
  {
    id: 'saas-starter',
    slug: 'saas-starter-mvp',
    name: 'SaaS Starter MVP',
    tagline: 'Ideal for early-stage startups and production web apps with up to 25k monthly active users.',
    description: 'A resilient, scalable 2-tier setup featuring 2 compute instances for high availability, 250 GB managed Postgres database with automated backups, 500 GB object storage for media, and load balancing.',
    icon: 'rocket_launch',
    recommendedFor: 'Early startups, MVPs, B2B SaaS applications',
    config: {
      name: 'SaaS Starter MVP',
      region: 'US-East (Virginia)',
      activeCategories: {
        [ServiceCategory.COMPUTE]: true,
        [ServiceCategory.STORAGE]: true,
        [ServiceCategory.DATABASE]: true,
        [ServiceCategory.NETWORKING]: true,
        [ServiceCategory.KUBERNETES]: false
      },
      compute: {
        vCpu: 2,
        ramGb: 4,
        os: 'LINUX',
        count: 2,
        hoursPerMonth: 730,
        commitment: 'ON_DEMAND'
      },
      storage: {
        capacityGb: 500,
        tier: 'HOT',
        readOpsThousands: 250,
        writeOpsThousands: 50
      },
      database: {
        engine: 'POSTGRES',
        vCpu: 2,
        ramGb: 4,
        storageGb: 100,
        multiAz: false,
        commitment: 'ON_DEMAND'
      },
      networking: {
        egressGbPerMonth: 1500,
        loadBalancersCount: 1,
        staticIpsCount: 1
      },
      kubernetes: {
        clustersCount: 0,
        workerNodesPerCluster: 0,
        workerVcpu: 2,
        workerRamGb: 4
      }
    }
  },
  {
    id: 'ecommerce-scale',
    slug: 'ecommerce-high-traffic',
    name: 'High-Traffic E-Commerce',
    tagline: 'Engineered for high concurrent checkouts, product catalogs, and intensive flash sales.',
    description: 'High-availability architecture with 6 medium instances, Multi-AZ relational database with read replication capacity, 2 TB hot storage with global CDN egress, and redundant load balancing.',
    icon: 'shopping_cart',
    recommendedFor: 'Online retail, flash-sale platforms, payment processing',
    config: {
      name: 'High-Traffic E-Commerce',
      region: 'US-East (Virginia)',
      activeCategories: {
        [ServiceCategory.COMPUTE]: true,
        [ServiceCategory.STORAGE]: true,
        [ServiceCategory.DATABASE]: true,
        [ServiceCategory.NETWORKING]: true,
        [ServiceCategory.KUBERNETES]: false
      },
      compute: {
        vCpu: 4,
        ramGb: 16,
        os: 'LINUX',
        count: 6,
        hoursPerMonth: 730,
        commitment: '1_YEAR_RESERVED'
      },
      storage: {
        capacityGb: 2000,
        tier: 'HOT',
        readOpsThousands: 1500,
        writeOpsThousands: 300
      },
      database: {
        engine: 'POSTGRES',
        vCpu: 4,
        ramGb: 16,
        storageGb: 500,
        multiAz: true,
        commitment: '1_YEAR_RESERVED'
      },
      networking: {
        egressGbPerMonth: 8000,
        loadBalancersCount: 2,
        staticIpsCount: 2
      },
      kubernetes: {
        clustersCount: 0,
        workerNodesPerCluster: 0,
        workerVcpu: 4,
        workerRamGb: 16
      }
    }
  },
  {
    id: 'enterprise-k8s',
    slug: 'enterprise-microservices-k8s',
    name: 'Enterprise Microservices (K8s)',
    tagline: 'Multi-service containerized architecture with managed Kubernetes clusters and service mesh.',
    description: 'Managed Kubernetes cluster (EKS/AKS/GKE) with 8 worker nodes (4 vCPU / 16 GB RAM each), dedicated multi-AZ database, 5 TB object storage, and heavy data transfer across private services.',
    icon: 'view_in_ar',
    recommendedFor: 'Microservices, FinTech, high-availability multi-tenant platforms',
    config: {
      name: 'Enterprise Microservices (K8s)',
      region: 'US-East (Virginia)',
      activeCategories: {
        [ServiceCategory.COMPUTE]: false,
        [ServiceCategory.STORAGE]: true,
        [ServiceCategory.DATABASE]: true,
        [ServiceCategory.NETWORKING]: true,
        [ServiceCategory.KUBERNETES]: true
      },
      compute: {
        vCpu: 4,
        ramGb: 16,
        os: 'LINUX',
        count: 0,
        hoursPerMonth: 730,
        commitment: 'ON_DEMAND'
      },
      storage: {
        capacityGb: 5000,
        tier: 'HOT',
        readOpsThousands: 3000,
        writeOpsThousands: 800
      },
      database: {
        engine: 'POSTGRES',
        vCpu: 8,
        ramGb: 32,
        storageGb: 1000,
        multiAz: true,
        commitment: '1_YEAR_RESERVED'
      },
      networking: {
        egressGbPerMonth: 12000,
        loadBalancersCount: 3,
        staticIpsCount: 3
      },
      kubernetes: {
        clustersCount: 1,
        workerNodesPerCluster: 8,
        workerVcpu: 4,
        workerRamGb: 16
      }
    }
  },
  {
    id: 'ai-inference',
    slug: 'ai-ml-inference-cluster',
    name: 'AI / ML Inference & Pipeline',
    tagline: 'Compute and memory-optimized instances designed for low-latency LLM serving and vector retrieval.',
    description: 'High-throughput architecture featuring high-capacity compute instances, scalable object storage for model weights and dataset embeddings, managed database for metadata, and high bandwidth egress.',
    icon: 'psychology',
    recommendedFor: 'GenAI applications, model hosting, real-time embeddings search',
    config: {
      name: 'AI / ML Inference & Pipeline',
      region: 'US-East (Virginia)',
      activeCategories: {
        [ServiceCategory.COMPUTE]: true,
        [ServiceCategory.STORAGE]: true,
        [ServiceCategory.DATABASE]: true,
        [ServiceCategory.NETWORKING]: true,
        [ServiceCategory.KUBERNETES]: false
      },
      compute: {
        vCpu: 16,
        ramGb: 64,
        os: 'LINUX',
        count: 4,
        hoursPerMonth: 730,
        commitment: '1_YEAR_RESERVED'
      },
      storage: {
        capacityGb: 8000,
        tier: 'HOT',
        readOpsThousands: 5000,
        writeOpsThousands: 1200
      },
      database: {
        engine: 'POSTGRES',
        vCpu: 8,
        ramGb: 32,
        storageGb: 500,
        multiAz: true,
        commitment: '1_YEAR_RESERVED'
      },
      networking: {
        egressGbPerMonth: 15000,
        loadBalancersCount: 2,
        staticIpsCount: 2
      },
      kubernetes: {
        clustersCount: 0,
        workerNodesPerCluster: 0,
        workerVcpu: 16,
        workerRamGb: 64
      }
    }
  }
];

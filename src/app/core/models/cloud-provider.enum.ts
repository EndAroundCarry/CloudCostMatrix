import { ServiceCategory } from './service-category.enum';

export enum CloudProvider {
  AWS = 'AWS',
  AZURE = 'AZURE',
  GCP = 'GCP',
  ORACLE = 'ORACLE',
  IBM = 'IBM',
  DIGITALOCEAN = 'DIGITALOCEAN',
  ALIBABA = 'ALIBABA',
  LINODE = 'LINODE',
  OVHCLOUD = 'OVHCLOUD'
}

/** Every provider id the app knows about, in display/ranking priority order. */
export const ALL_PROVIDERS: CloudProvider[] = Object.values(CloudProvider);

/** Pre-selected on first load and whenever a legacy payload carries no selection. */
export const DEFAULT_SELECTED_PROVIDERS: readonly CloudProvider[] = [
  CloudProvider.AWS,
  CloudProvider.AZURE,
  CloudProvider.GCP
] as const;

/**
 * Provider-branded display names for each of the five priced service categories,
 * e.g. AWS's object storage is "Amazon S3", Azure's is "Azure Blob Storage".
 * Centralizing these kills a family of provider === X ? ... : ... ternaries in
 * the cost engine that would otherwise mislabel every provider added later.
 */
export interface ProviderServiceNames {
  compute: string;
  objectStorage: string;
  managedDb: string;
  kubernetes: string;
  networking: string;
  cdn: string;
}

export interface ProviderOptimizationTip {
  title: string;
  body: string;
  footnote: string;
}

export interface ProviderMeta {
  id: CloudProvider;
  name: string;
  shortName: string;
  /** Permanent URL segment (used in /compare/:slug pairs) — never derive from the enum. */
  slug: string;
  tier: 'HYPERSCALER' | 'CHALLENGER' | 'DEVELOPER';
  primaryColor: string;
  badgeBg: string;
  badgeBorder: string;
  icon: string;
  headline: string;
  services: ProviderServiceNames;
  /** Exactly two — rendered as the top highlight bullets on the summary card. */
  highlightNotes: [string, string];
  optimizationTip: ProviderOptimizationTip;
  /** Per-category savings copy where it's genuinely provider-specific (K8s, CDN/egress). */
  savingsTips: Partial<Record<ServiceCategory, string>>;
  pricingUrl: string;
}

export const PROVIDER_METAS: Record<CloudProvider, ProviderMeta> = {
  [CloudProvider.AWS]: {
    id: CloudProvider.AWS,
    name: 'Amazon Web Services',
    shortName: 'AWS',
    slug: 'aws',
    tier: 'HYPERSCALER',
    primaryColor: '#FF9900',
    badgeBg: 'rgba(255, 153, 0, 0.1)',
    badgeBorder: '#FF9900',
    icon: 'cloud_queue',
    headline: 'Market leader with broad services and reserved instances.',
    services: {
      compute: 'Amazon EC2',
      objectStorage: 'Amazon S3',
      managedDb: 'RDS/Aurora',
      kubernetes: 'Amazon EKS',
      networking: 'AWS Data Transfer & ELB',
      cdn: 'CloudFront'
    },
    highlightNotes: [
      'Graviton3/4 arm64 processors offer up to 20% lower price/performance.',
      'Savings Plans apply flexibly across EC2, Fargate, and Lambda.'
    ],
    optimizationTip: {
      title: 'AWS Graviton & Savings',
      body: 'Migrate general-purpose workloads to AWS Graviton3/4 processors for up to 20% better price/performance compared to standard x86 instances.',
      footnote: 'Combine with Compute Savings Plans for cross-region flexibility.'
    },
    savingsTips: {
      [ServiceCategory.KUBERNETES]: 'Use Spot or Graviton node pools for non-critical stateless microservices.',
      [ServiceCategory.NETWORKING]: 'Route traffic via CloudFront to cut egress costs by 30-50%.'
    },
    pricingUrl: 'https://aws.amazon.com/pricing/'
  },
  [CloudProvider.AZURE]: {
    id: CloudProvider.AZURE,
    name: 'Microsoft Azure',
    shortName: 'Azure',
    slug: 'azure',
    tier: 'HYPERSCALER',
    primaryColor: '#0078D4',
    badgeBg: 'rgba(0, 120, 212, 0.1)',
    badgeBorder: '#0078D4',
    icon: 'window',
    headline: 'Enterprise standard with Azure Hybrid Benefit and deep Windows integration.',
    services: {
      compute: 'Azure Virtual Machines',
      objectStorage: 'Azure Blob Storage',
      managedDb: 'Azure Database',
      kubernetes: 'Azure AKS',
      networking: 'Azure Data Transfer & Load Balancer',
      cdn: 'Azure CDN'
    },
    highlightNotes: [
      'Azure Hybrid Benefit cuts up to 40% on Windows & SQL Server licenses.',
      'Free AKS cluster management on baseline tier.'
    ],
    optimizationTip: {
      title: 'Azure Hybrid Benefit',
      body: 'If your organization owns on-premises Windows Server or SQL Server licenses with Software Assurance, apply them to Azure VMs for up to 40% savings.',
      footnote: 'AKS standard tier also waives cluster management fees.'
    },
    savingsTips: {
      [ServiceCategory.KUBERNETES]: 'AKS Standard Tier includes free cluster management, providing instant base savings.',
      [ServiceCategory.NETWORKING]: 'Route traffic via Azure CDN to cut egress costs by 30-50%.'
    },
    pricingUrl: 'https://azure.microsoft.com/pricing/'
  },
  [CloudProvider.GCP]: {
    id: CloudProvider.GCP,
    name: 'Google Cloud Platform',
    shortName: 'GCP',
    slug: 'gcp',
    tier: 'HYPERSCALER',
    primaryColor: '#4285F4',
    badgeBg: 'rgba(66, 133, 244, 0.1)',
    badgeBorder: '#4285F4',
    icon: 'hub',
    headline: 'Pioneer in Kubernetes, big data, custom machine types and sustained use discounts.',
    services: {
      compute: 'Google Compute Engine',
      objectStorage: 'Google Cloud Storage',
      managedDb: 'Cloud SQL',
      kubernetes: 'Google Cloud GKE',
      networking: 'Google Cloud Data Transfer & Load Balancer',
      cdn: 'Cloud CDN'
    },
    highlightNotes: [
      'Custom Machine Types avoid paying for unused vCPUs or RAM.',
      'First GKE zonal cluster management fee is completely waived.'
    ],
    optimizationTip: {
      title: 'GCP Custom Sizing',
      body: 'Avoid paying for predefined instance shapes. Google Cloud allows custom vCPU & memory ratios tailored specifically to your exact application footprint.',
      footnote: 'First GKE zonal cluster management is completely free.'
    },
    savingsTips: {
      [ServiceCategory.KUBERNETES]: 'Use Spot or Tau VM node pools for non-critical stateless microservices.',
      [ServiceCategory.NETWORKING]: 'Route traffic via Cloud CDN to cut egress costs by 30-50%.'
    },
    pricingUrl: 'https://cloud.google.com/pricing'
  },
  [CloudProvider.ORACLE]: {
    id: CloudProvider.ORACLE,
    name: 'Oracle Cloud Infrastructure',
    shortName: 'Oracle',
    slug: 'oracle',
    tier: 'CHALLENGER',
    primaryColor: '#C74634',
    badgeBg: 'rgba(199, 70, 52, 0.1)',
    badgeBorder: '#C74634',
    icon: 'dns',
    headline: 'Enterprise-grade hyperscaler with the deepest free-tier egress allowance and Arm-based Ampere pricing.',
    services: {
      compute: 'OCI Compute',
      objectStorage: 'OCI Object Storage',
      managedDb: 'OCI Database Service',
      kubernetes: 'OCI OKE',
      networking: 'OCI Data Transfer & Load Balancer',
      cdn: 'OCI CDN'
    },
    highlightNotes: [
      'Always Free tier + 10 TB/month egress free makes OCI the cheapest hyperscaler for content-heavy workloads.',
      'Ampere Arm-based compute offers the deepest price/performance of any major cloud.'
    ],
    optimizationTip: {
      title: 'Oracle Always-Free Egress',
      body: 'OCI bundles 10 TB of outbound data transfer free every month — for egress-heavy workloads that alone can beat every other hyperscaler’s bill.',
      footnote: 'Pair with Ampere Arm compute for the best price/performance ratio in the catalog.'
    },
    savingsTips: {
      [ServiceCategory.KUBERNETES]: 'OKE Basic clusters never bill for the control plane — only the underlying compute.',
      [ServiceCategory.NETWORKING]: 'The first 10 TB/month of egress is free on every OCI tenancy — size workloads to stay under it.'
    },
    pricingUrl: 'https://www.oracle.com/cloud/costestimator.html'
  },
  [CloudProvider.IBM]: {
    id: CloudProvider.IBM,
    name: 'IBM Cloud',
    shortName: 'IBM',
    slug: 'ibm',
    tier: 'CHALLENGER',
    primaryColor: '#8A3FFC',
    badgeBg: 'rgba(138, 63, 252, 0.1)',
    badgeBorder: '#8A3FFC',
    icon: 'workspaces',
    headline: 'Hybrid-cloud leader with deep Red Hat OpenShift integration for regulated enterprises.',
    services: {
      compute: 'IBM Cloud Virtual Servers',
      objectStorage: 'IBM Cloud Object Storage',
      managedDb: 'IBM Cloud Databases',
      kubernetes: 'IBM Cloud Kubernetes Service',
      networking: 'IBM Cloud Data Transfer & Load Balancer',
      cdn: 'IBM Cloud CDN'
    },
    highlightNotes: [
      'Deep enterprise integration with Red Hat OpenShift and hybrid-cloud tooling.',
      'IBM Cloud Kubernetes Service never charges for the control plane.'
    ],
    optimizationTip: {
      title: 'IBM Cloud Hybrid Tooling',
      body: 'Deep Red Hat OpenShift integration lets you run the same Kubernetes stack on-prem and in IBM Cloud, simplifying hybrid and multi-cloud governance.',
      footnote: 'IKS never bills for the control plane, on any tier.'
    },
    savingsTips: {
      [ServiceCategory.KUBERNETES]: 'IBM Cloud Kubernetes Service (IKS) never charges a control-plane fee, even on multi-zone clusters.',
      [ServiceCategory.NETWORKING]: 'Consolidate load balancers per region — IBM prices them individually with no bundled allowance.'
    },
    pricingUrl: 'https://www.ibm.com/cloud/pricing'
  },
  [CloudProvider.DIGITALOCEAN]: {
    id: CloudProvider.DIGITALOCEAN,
    name: 'DigitalOcean',
    shortName: 'DigitalOcean',
    slug: 'digitalocean',
    tier: 'DEVELOPER',
    primaryColor: '#0080FF',
    badgeBg: 'rgba(0, 128, 255, 0.1)',
    badgeBorder: '#0080FF',
    icon: 'water_drop',
    headline: 'Developer-first cloud with flat, predictable Droplet pricing and zero commitment complexity.',
    services: {
      compute: 'DigitalOcean Droplets',
      objectStorage: 'DigitalOcean Spaces',
      managedDb: 'DigitalOcean Managed Databases',
      kubernetes: 'DigitalOcean Kubernetes (DOKS)',
      networking: 'DigitalOcean Data Transfer & Load Balancer',
      cdn: 'Spaces CDN'
    },
    highlightNotes: [
      'Flat, predictable pricing with zero reserved-instance complexity — what you see is what you pay.',
      'Bundled outbound transfer per Droplet keeps small workloads exceptionally cheap.'
    ],
    optimizationTip: {
      title: 'DigitalOcean Flat-Rate Simplicity',
      body: 'No reserved instances, no commitment tiers — Droplet pricing is flat and predictable, which makes budgeting trivial for small and mid-size teams.',
      footnote: 'Bundled per-Droplet bandwidth keeps typical web workloads free of egress surprises.'
    },
    savingsTips: {
      [ServiceCategory.KUBERNETES]: 'DOKS control planes are free on every cluster — pay only for worker Droplets.',
      [ServiceCategory.NETWORKING]: 'Outbound transfer is pooled and bundled per Droplet — consolidate instances to raise your free allowance.'
    },
    pricingUrl: 'https://www.digitalocean.com/pricing'
  },
  [CloudProvider.ALIBABA]: {
    id: CloudProvider.ALIBABA,
    name: 'Alibaba Cloud',
    shortName: 'Alibaba',
    slug: 'alibaba',
    tier: 'CHALLENGER',
    primaryColor: '#FF6A00',
    badgeBg: 'rgba(255, 106, 0, 0.1)',
    badgeBorder: '#FF6A00',
    icon: 'storefront',
    headline: 'Asia-Pacific leader with full SQL Server support and the deepest reserved-instance discounts.',
    services: {
      compute: 'Alibaba Cloud ECS',
      objectStorage: 'Alibaba Cloud OSS',
      managedDb: 'ApsaraDB RDS',
      kubernetes: 'Alibaba Cloud ACK',
      networking: 'Alibaba Cloud Data Transfer & SLB',
      cdn: 'Alibaba Cloud CDN'
    },
    highlightNotes: [
      'Only challenger cloud with full managed SQL Server support alongside Postgres/MySQL.',
      'Deepest reserved-instance discounts of any provider — up to 60% off 3-year commitments.'
    ],
    optimizationTip: {
      title: 'Alibaba Cloud Deep Commitments',
      body: 'Alibaba offers the steepest reserved-instance discounts in this comparison — up to 60% off on 3-year terms — plus full SQL Server support other challengers lack.',
      footnote: 'Preemptible instances price as low as 20% of on-demand for fault-tolerant batch jobs.'
    },
    savingsTips: {
      [ServiceCategory.KUBERNETES]: 'ACK Basic clusters have no control-plane fee — upgrade to Pro only when you need SLA-backed masters.',
      [ServiceCategory.NETWORKING]: 'Route traffic via Alibaba Cloud CDN to cut egress costs by 30-50%.'
    },
    pricingUrl: 'https://www.alibabacloud.com/pricing'
  },
  [CloudProvider.LINODE]: {
    id: CloudProvider.LINODE,
    name: 'Linode (Akamai)',
    shortName: 'Linode',
    slug: 'linode',
    tier: 'DEVELOPER',
    primaryColor: '#00A95C',
    badgeBg: 'rgba(0, 169, 92, 0.1)',
    badgeBorder: '#00A95C',
    icon: 'terminal',
    headline: 'Akamai-backed developer cloud with simple pricing and the lowest bandwidth overage rates.',
    services: {
      compute: 'Linode Compute Instances',
      objectStorage: 'Linode Object Storage',
      managedDb: 'Linode Managed Databases',
      kubernetes: 'Linode Kubernetes Engine (LKE)',
      networking: 'Linode Data Transfer & NodeBalancer',
      cdn: 'Akamai CDN'
    },
    highlightNotes: [
      'Simple, developer-friendly pricing with the lowest egress overage rate in the industry.',
      'Free control plane on every Kubernetes cluster, including production-grade LKE Enterprise.'
    ],
    optimizationTip: {
      title: 'Linode Predictable Egress',
      body: 'Akamai’s global network gives Linode the lowest per-GB overage rate of any provider here, once your pooled bandwidth allowance is used up.',
      footnote: 'LKE control planes are free on every tier, including production HA clusters.'
    },
    savingsTips: {
      [ServiceCategory.KUBERNETES]: 'LKE control planes are free, even for high-availability clusters.',
      [ServiceCategory.NETWORKING]: 'Transfer is pooled account-wide across every Linode — consolidate instances to avoid overage.'
    },
    pricingUrl: 'https://www.linode.com/pricing/'
  },
  [CloudProvider.OVHCLOUD]: {
    id: CloudProvider.OVHCLOUD,
    name: 'OVHcloud',
    shortName: 'OVHcloud',
    slug: 'ovhcloud',
    tier: 'DEVELOPER',
    primaryColor: '#E0347C',
    badgeBg: 'rgba(224, 52, 124, 0.1)',
    badgeBorder: '#E0347C',
    icon: 'shield',
    headline: 'EU-sovereign cloud offering unlimited free egress and transparent, no-surprise billing.',
    services: {
      compute: 'OVHcloud Public Cloud Instances',
      objectStorage: 'OVHcloud Object Storage',
      managedDb: 'OVHcloud Public Cloud Databases',
      kubernetes: 'OVHcloud Managed Kubernetes',
      networking: 'OVHcloud Data Transfer & Load Balancer',
      cdn: 'OVHcloud CDN'
    },
    highlightNotes: [
      'Unlimited free egress on every plan — the biggest single savings lever for data-heavy or CDN-style workloads.',
      'EU-sovereign infrastructure with no hidden data-transfer fees.'
    ],
    optimizationTip: {
      title: 'OVHcloud Unlimited Egress',
      body: 'Every OVHcloud Public Cloud plan ships with fair-use unlimited outbound bandwidth — for data-heavy or CDN-style workloads this alone can be the deciding factor.',
      footnote: 'EU-sovereign data residency with no hidden cross-region transfer fees.'
    },
    savingsTips: {
      [ServiceCategory.KUBERNETES]: 'Managed Kubernetes control planes are free on every OVHcloud plan.',
      [ServiceCategory.NETWORKING]: 'Egress is unlimited and free (fair use) — there is no CDN offload to optimize here.'
    },
    pricingUrl: 'https://www.ovhcloud.com/en/public-cloud/prices/'
  }
};

/**
 * Filters an arbitrary (e.g. decoded-from-URL, or read-from-Firestore) value down
 * to a valid, de-duplicated provider selection, falling back to the big 3 when the
 * input is missing, empty, or contains only unrecognized ids. This is what lets an
 * old share link / saved estimate / hand-edited URL always render safely:
 *  - no field at all (pre-selection-feature payload)  -> big 3
 *  - a future provider id this build doesn't know      -> dropped, not crashed
 *  - every id filtered out                             -> big 3 (never an empty matrix)
 */
export function normalizeSelectedProviders(raw: unknown): CloudProvider[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SELECTED_PROVIDERS];
  const known = new Set<string>(ALL_PROVIDERS);
  const clean = [...new Set(raw.filter((p): p is CloudProvider => typeof p === 'string' && known.has(p)))];
  return clean.length ? clean : [...DEFAULT_SELECTED_PROVIDERS];
}

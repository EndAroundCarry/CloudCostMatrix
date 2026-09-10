import { ArchitectureEstimateConfig } from '../../core/models/pricing.model';
import { CloudProvider } from '../../core/models/cloud-provider.enum';
import { ARCHITECTURE_BLUEPRINTS } from '../../core/models/blueprints.model';

/** A hand-authored, qualitative row that genuinely isn't derivable from the catalogs. */
export interface EditorialFeatureRow {
  feature: string;
  category: string;
  providerAVal: string;
  providerBVal: string;
  winner: 'A' | 'B' | 'TIE';
}

export interface ComparisonPageData {
  slug: string;
  slugTitle: string;
  /** Short label for the tab strip — kept separate from slugTitle so tabs can stay compact. */
  tabLabel: string;
  headline: string;
  summary: string;
  metaDescription: string;
  keywords: string[];
  providerA?: CloudProvider;
  providerB?: CloudProvider;
  /** Hand-written qualitative rows layered on top of the derived (catalog-computed) ones. */
  editorialFeatures?: EditorialFeatureRow[];
  faqs: { question: string; answer: string }[];
  /**
   * The workload every number on this page is scored against — page-scoped and
   * stable, independent of whatever the visitor last configured in the live
   * estimator elsewhere on the site. Defaults to COMPARISON_REFERENCE_CONFIG
   * (the SaaS Starter MVP blueprint) so an unmodified page renders identically
   * to before this field existed. Egress-focused pages override it with a
   * higher-egress workload — that override is what makes those pages say
   * something a generic comparison can't.
   */
  referenceConfig?: ArchitectureEstimateConfig;
}

/** Default reference workload for every /compare page that doesn't specify its own. */
export const COMPARISON_REFERENCE_CONFIG: ArchitectureEstimateConfig = ARCHITECTURE_BLUEPRINTS[0].config;

function egressHeavyConfig(egressGbPerMonth: number, name: string): ArchitectureEstimateConfig {
  // Derived from the E-Commerce blueprint (already egress-leaning) with the
  // transfer volume bumped to make the egress-policy delta the whole story.
  const base = ARCHITECTURE_BLUEPRINTS[1].config;
  return {
    ...base,
    name,
    networking: { ...base.networking, egressGbPerMonth }
  };
}

export const COMPARISON_PAGES: Record<string, ComparisonPageData> = {
  'aws-vs-azure': {
    slug: 'aws-vs-azure',
    slugTitle: 'AWS vs Azure',
    tabLabel: 'AWS vs Azure',
    headline: 'AWS vs Azure: Detailed Cloud Infrastructure Pricing & TCO Comparison (2026)',
    summary: 'A comprehensive, line-by-line comparison of Amazon Web Services (AWS) and Microsoft Azure across Compute (EC2 vs Azure Virtual Machines), Object Storage (S3 vs Azure Blob), Managed Databases (RDS/Aurora vs Azure SQL Database), Networking egress fees, and managed Kubernetes (EKS vs AKS).',
    metaDescription: 'Compare AWS vs Azure pricing in 2026. Side-by-side cost analysis of EC2 vs Azure VMs, S3 vs Blob Storage, RDS vs Azure SQL, EKS vs AKS, and data egress. Free TCO calculator.',
    keywords: ['AWS vs Azure', 'AWS vs Azure pricing', 'EC2 vs Azure VM', 'S3 vs Azure Blob', 'RDS vs Azure SQL', 'EKS vs AKS', 'cloud cost comparison 2026'],
    providerA: CloudProvider.AWS,
    providerB: CloudProvider.AZURE,
    editorialFeatures: [
      { feature: 'ARM Processor Option', category: 'Compute', providerAVal: 'AWS Graviton3 / Graviton4 (Up to 20% price-perf)', providerBVal: 'Azure Cobalt 100 & Ampere Altra', winner: 'A' },
      { feature: 'Spot / Preemptible Eviction Notice', category: 'Compute', providerAVal: '2-minute warning via EventBridge', providerBVal: '30-second warning via Azure Scheduled Events', winner: 'A' },
      { feature: 'Enterprise License Portability', category: 'Licensing', providerAVal: 'BYOL with dedicated hosts or license manager', providerBVal: 'Azure Hybrid Benefit (Save up to 40-55% with Windows/SQL)', winner: 'B' }
    ],
    faqs: [
      {
        question: 'Which is cheaper overall: AWS or Azure?',
        answer: 'For general-purpose Linux compute, AWS and Azure are closely priced. AWS Graviton processors offer better price-performance for ARM-compatible workloads. Azure provides significant savings through Azure Hybrid Benefit if you bring existing Windows Server or SQL Server licenses. For managed Kubernetes, AKS provides free cluster management on the standard tier, while EKS charges $73/month per cluster.'
      },
      {
        question: 'How do AWS Savings Plans compare to Azure Reserved Instances?',
        answer: 'AWS Compute Savings Plans offer greater flexibility — they apply across EC2 instance families, sizes, regions, and even Fargate/Lambda. Azure Reserved Instances are tied to specific VM sizes but offer comparable discount depths (up to 72% for 3-year). Azure also supports monthly payment options without upfront commitment penalty.'
      },
      {
        question: 'What is the egress bandwidth pricing difference between AWS and Azure?',
        answer: 'AWS charges $0.09/GB for the first 10 TB of internet egress in us-east-1. Azure charges $0.087/GB for the same tier. Both providers significantly reduce costs when traffic is routed through their CDN services (CloudFront or Azure Front Door). For inter-region transfer, Azure tends to be slightly cheaper.'
      },
      {
        question: 'Which is better for Windows workloads: AWS or Azure?',
        answer: 'Azure has a clear advantage for Windows workloads due to Azure Hybrid Benefit (AHUB), which allows you to use existing Windows Server and SQL Server licenses with Software Assurance, saving up to 40-55% compared to pay-as-you-go pricing. AWS requires purchasing Windows licenses as part of the hourly instance rate.'
      }
    ]
  },
  'aws-vs-gcp': {
    slug: 'aws-vs-gcp',
    slugTitle: 'AWS vs GCP',
    tabLabel: 'AWS vs GCP',
    headline: 'AWS vs Google Cloud (GCP): Complete Cost & Performance Analysis (2026)',
    summary: 'Compare Amazon Web Services and Google Cloud Platform across Compute (EC2 vs Google Compute Engine), Storage (S3 vs Google Cloud Storage), Databases (RDS vs Cloud SQL), Kubernetes (EKS vs GKE), and data egress pricing with real-time TCO modeling.',
    metaDescription: 'AWS vs GCP pricing comparison 2026. Compare EC2 vs Compute Engine, S3 vs Cloud Storage, RDS vs Cloud SQL, EKS vs GKE costs. Free real-time TCO calculator.',
    keywords: ['AWS vs GCP', 'AWS vs Google Cloud', 'EC2 vs Compute Engine', 'S3 vs Cloud Storage', 'RDS vs Cloud SQL', 'EKS vs GKE', 'cloud pricing comparison'],
    providerA: CloudProvider.AWS,
    providerB: CloudProvider.GCP,
    editorialFeatures: [
      { feature: 'Automatic Sustained Use Discounts (SUD)', category: 'Compute', providerAVal: 'Requires upfront Savings Plan commitment', providerBVal: 'Automatic up to 30% discount on always-on VMs', winner: 'B' },
      { feature: 'Custom Machine Sizing', category: 'Compute', providerAVal: 'Fixed predefined instance types only', providerBVal: 'Custom vCPU and RAM ratios without waste', winner: 'B' },
      { feature: 'Breadth of Specialized Instances', category: 'Compute', providerAVal: 'Largest catalog (P5, Inf2, Trn1, X2gd, Mac)', providerBVal: 'Strong AI/TPU catalog but fewer niche general types', winner: 'A' }
    ],
    faqs: [
      {
        question: 'Is Google Cloud cheaper than AWS?',
        answer: 'GCP is often 5-15% cheaper than AWS for sustained, always-on workloads due to Google\'s automatic Sustained Use Discounts (SUDs) that apply without any upfront commitment. GCP also offers custom machine types that let you specify exact vCPU and RAM ratios, avoiding the waste of predefined instance sizes. However, AWS has a broader range of specialized instance types and deeper Savings Plan flexibility.'
      },
      {
        question: 'How does GKE compare to EKS in pricing?',
        answer: 'Both GKE and EKS charge $0.10/hour ($73/month) for cluster management. However, GKE waives this fee for the first zonal cluster, making it effectively free for small deployments. EKS charges from the first cluster. For worker nodes, pricing depends on the underlying compute instances, which are comparably priced across both providers.'
      },
      {
        question: 'What is the difference between AWS and GCP data egress pricing?',
        answer: 'AWS charges $0.09/GB for the first 10 TB of internet egress, while GCP charges $0.085/GB for the same tier — roughly 5% cheaper. Both providers offer CDN services (CloudFront vs Cloud CDN) that substantially reduce egress costs. GCP also offers free egress to other Google services and between zones within the same region.'
      },
      {
        question: 'Which cloud provider is better for AI and machine learning workloads?',
        answer: 'GCP has strong advantages for AI/ML workloads with TPU (Tensor Processing Unit) availability, Vertex AI integration, and competitive GPU instance pricing. AWS counters with a broader selection of GPU instances (P5, Inf2, Trn1), SageMaker, and Bedrock for generative AI. The cost difference depends heavily on the specific ML framework and inference vs. training workload patterns.'
      }
    ]
  },
  'azure-vs-gcp': {
    slug: 'azure-vs-gcp',
    slugTitle: 'Azure vs GCP',
    tabLabel: 'Azure vs GCP',
    headline: 'Azure vs Google Cloud (GCP): Head-to-Head Pricing & TCO Analysis (2026)',
    summary: 'Detailed cost comparison of Microsoft Azure and Google Cloud Platform across Virtual Machines (Azure VMs vs Compute Engine), Object Storage (Azure Blob vs Cloud Storage), Managed Databases (Azure SQL vs Cloud SQL), Kubernetes (AKS vs GKE), and internet data egress.',
    metaDescription: 'Azure vs GCP pricing comparison 2026. Compare Azure VMs vs Compute Engine, Blob vs Cloud Storage, Azure SQL vs Cloud SQL, AKS vs GKE costs. Free TCO calculator.',
    keywords: ['Azure vs GCP', 'Azure vs Google Cloud', 'Azure VM vs Compute Engine', 'Azure Blob vs Cloud Storage', 'Azure SQL vs Cloud SQL', 'AKS vs GKE'],
    providerA: CloudProvider.AZURE,
    providerB: CloudProvider.GCP,
    editorialFeatures: [
      { feature: 'Windows Licensing Advantages', category: 'Licensing', providerAVal: 'Azure Hybrid Benefit cuts up to 55% with existing EA', providerBVal: 'Standard Windows Server hourly license surcharge', winner: 'A' },
      { feature: 'Automatic Volume Discounts', category: 'Compute', providerAVal: 'Reserved Instances required', providerBVal: 'Automatic Sustained Use Discounts (up to 30%)', winner: 'B' },
      { feature: 'Custom VM Configurations', category: 'Compute', providerAVal: 'Pre-packaged VM sizes only', providerBVal: 'Custom Machine Types (exact vCPU & RAM)', winner: 'B' }
    ],
    faqs: [
      {
        question: 'Is Azure or GCP cheaper for virtual machines?',
        answer: 'For standard on-demand Linux instances, Azure and GCP are closely priced. GCP\'s automatic Sustained Use Discounts give it an edge for always-on workloads (5-15% cheaper without any commitment). Azure\'s advantage is Azure Hybrid Benefit for Windows and SQL Server workloads, which can cut costs by 40-55%. GCP\'s custom machine types also help avoid paying for unused CPU or RAM.'
      },
      {
        question: 'Which has better Kubernetes pricing: AKS or GKE?',
        answer: 'AKS (Azure Kubernetes Service) provides free cluster management on the standard tier — the control plane costs $0. GKE charges $0.10/hour ($73/month) per cluster but waives this for the first zonal cluster. For multi-cluster enterprise deployments, AKS is typically cheaper on management fees, while GKE excels in Kubernetes-native tooling and Autopilot mode.'
      },
      {
        question: 'How do Azure and GCP storage costs compare?',
        answer: 'Azure Blob Hot tier costs ~$0.018/GB-month vs Google Cloud Storage Standard at ~$0.020/GB-month in comparable regions. For archive storage, both converge near $0.001/GB-month. Azure offers ZRS (Zone-Redundant Storage) at modest premium, while GCP provides dual-region and multi-region options. Operation costs (reads/writes) are similar across both platforms.'
      },
      {
        question: 'Which provider is better for enterprise organizations?',
        answer: 'Azure has a strong enterprise advantage through deep Microsoft 365, Active Directory, and Windows Server integration. Organizations with existing Microsoft Enterprise Agreements often receive significant Azure credits. GCP appeals to data-engineering-heavy enterprises with BigQuery, Dataflow, and superior Kubernetes tooling. The choice typically depends on existing technology ecosystem investment.'
      }
    ]
  },
  'ec2-vs-azure-vm-vs-compute-engine': {
    slug: 'ec2-vs-azure-vm-vs-compute-engine',
    slugTitle: 'EC2 vs Azure VM vs Compute Engine',
    tabLabel: 'EC2 vs VMs vs Compute Engine',
    headline: 'EC2 vs Azure VM vs Google Compute Engine: Virtual Machine Pricing Comparison (2026)',
    summary: 'Direct compute pricing comparison of Amazon EC2, Azure Virtual Machines, and Google Compute Engine across general-purpose, compute-optimized, and memory-optimized instance families with On-Demand, Reserved, and Spot pricing models.',
    metaDescription: 'Compare EC2 vs Azure VM vs Google Compute Engine pricing 2026. On-Demand, Reserved, Spot instance costs. General-purpose, compute-optimized, memory-optimized families.',
    keywords: ['EC2 pricing', 'Azure VM pricing', 'Compute Engine pricing', 'cloud compute comparison', 'virtual machine pricing', 'spot instance pricing', 'reserved instance comparison'],
    faqs: [
      {
        question: 'Which cloud provider offers the cheapest virtual machines?',
        answer: 'For general-purpose Linux instances with 4 vCPU and 16 GB RAM, on-demand pricing is roughly: AWS EC2 t4g.xlarge at $0.134/hr, Azure Standard_D4as_v5 at $0.192/hr, and GCP e2-standard-4 at $0.134/hr. AWS Graviton and GCP E2 instances tend to be the cheapest for ARM/standard workloads. Azure excels when Windows licensing is factored in via Hybrid Benefit.'
      },
      {
        question: 'How do spot instance prices compare across EC2, Azure, and GCP?',
        answer: 'Spot/Preemptible instance savings range from 60-90% off on-demand across all three providers. GCP Spot VMs often offer the deepest discounts but with potentially shorter interruption notice. AWS Spot Instances provide a 2-minute warning before termination, while Azure Spot VMs offer a 30-second eviction notice. Availability varies significantly by instance type and region.'
      }
    ]
  },
  's3-vs-azure-blob-vs-google-cloud-storage': {
    slug: 's3-vs-azure-blob-vs-google-cloud-storage',
    slugTitle: 'S3 vs Azure Blob vs Cloud Storage',
    tabLabel: 'S3 vs Blob vs Cloud Storage',
    headline: 'S3 vs Azure Blob Storage vs Google Cloud Storage: Object Storage Pricing (2026)',
    summary: 'Comprehensive object storage pricing comparison across Amazon S3, Azure Blob Storage, and Google Cloud Storage — covering Standard/Hot, Cool/Infrequent Access, Cold/Archive tiers, read/write operation costs, and data retrieval fees.',
    metaDescription: 'Compare S3 vs Azure Blob vs Google Cloud Storage pricing 2026. Standard, Cool, Archive tiers. Read/write operations, egress costs. Free storage cost calculator.',
    keywords: ['S3 pricing', 'Azure Blob pricing', 'Cloud Storage pricing', 'object storage comparison', 'cloud storage cost', 'S3 vs Blob vs GCS', 'archive storage pricing'],
    faqs: [
      {
        question: 'Which cloud provider has the cheapest object storage?',
        answer: 'For standard/hot tier storage in primary US regions: Azure Blob Hot is cheapest at ~$0.018/GB-month, followed by GCP Standard at ~$0.020/GB-month, and AWS S3 Standard at ~$0.023/GB-month. However, total cost depends heavily on read/write operation volume and egress bandwidth — not just storage capacity.'
      },
      {
        question: 'How do archive storage prices compare?',
        answer: 'Archive tier pricing converges across all three providers: AWS S3 Glacier Deep Archive at ~$0.00099/GB-month, Azure Archive at ~$0.00099/GB-month, and Google Archive at ~$0.0012/GB-month. The main cost difference is in data retrieval fees — AWS Glacier Deep Archive charges the highest retrieval fees, while Azure Archive offers more predictable retrieval pricing.'
      }
    ]
  },

  // ------------------------------------------------------------------
  // Content pivot — budget-cloud and egress-pricing niches (see plan
  // "W7 — Content pivot"). Unlike the five pages above, these carry no
  // hand-typed price strings: every number in the feature matrix comes from
  // buildDerivedFeatures() against the live catalogs. Only the qualitative
  // editorialFeatures rows and FAQ prose are authored.
  // ------------------------------------------------------------------

  'oracle-vs-aws-egress': {
    slug: 'oracle-vs-aws-egress',
    slugTitle: 'Oracle Cloud vs AWS Egress Pricing',
    tabLabel: 'Oracle vs AWS Egress',
    headline: 'Oracle Cloud vs AWS: The Egress Bandwidth Cost Comparison Nobody Else Runs (2026)',
    summary: 'Every hyperscaler charges for outbound data transfer — except one. Oracle Cloud Infrastructure includes 10 TB of free egress every month on every tenancy; AWS starts billing from the first gigabyte. For content-serving, API-heavy, or backup-and-restore workloads, this single policy difference can be the largest line item in the whole comparison.',
    metaDescription: 'Oracle Cloud vs AWS egress pricing compared: OCI\'s 10 TB/month free tier vs AWS\'s $0.09/GB from byte one. See the real monthly cost difference for high-bandwidth workloads.',
    keywords: ['Oracle Cloud vs AWS', 'OCI egress pricing', 'AWS data transfer cost', 'cloud egress pricing 2026', 'Oracle free egress', 'cheapest cloud for bandwidth'],
    providerA: CloudProvider.ORACLE,
    providerB: CloudProvider.AWS,
    referenceConfig: egressHeavyConfig(20480, 'Egress-Heavy Content Service (20 TB/mo)'),
    editorialFeatures: [
      { feature: 'Published Egress Policy', category: 'Networking', providerAVal: 'First 10 TB/month free on every tenancy, no opt-in required', providerBVal: 'Billed from the first GB, tiered discounts only past 10 TB', winner: 'A' },
      { feature: 'Compute Architecture Option', category: 'Compute', providerAVal: 'Ampere Arm-based OCPUs at a steep discount to x86', providerBVal: 'Graviton Arm instances at a smaller discount to x86', winner: 'TIE' }
    ],
    faqs: [
      {
        question: 'How much egress does Oracle Cloud actually give away for free?',
        answer: 'Oracle publishes a standing policy of 10 TB (10,240 GB) of free outbound data transfer per month on every OCI tenancy, with no minimum spend or opt-in required. AWS has no equivalent free tier — internet egress is billed from the first gigabyte at roughly $0.09/GB in us-east-1, dropping only at much higher volume tiers.'
      },
      {
        question: 'At what point does Oracle\'s free egress tier stop mattering?',
        answer: 'Once a workload\'s outbound transfer exceeds Oracle\'s 10 TB/month allowance, the comparison becomes an ordinary per-GB rate comparison again — and Oracle\'s published overage rate is still meaningfully below AWS\'s. For anything under 10 TB/month, though, the entire egress line item on Oracle is $0.'
      },
      {
        question: 'Is this a fair comparison for every workload?',
        answer: 'No — it\'s specifically relevant to egress-heavy patterns: API backends serving lots of response payload, content or file downloads, backup/restore and DR replication, and services with a lot of client-facing traffic. Compute-bound or storage-bound workloads with modest network traffic won\'t see this delta matter much; use the live calculator above with your own egress volume to check.'
      }
    ]
  },
  'ovhcloud-vs-aws-egress': {
    slug: 'ovhcloud-vs-aws-egress',
    slugTitle: 'OVHcloud vs AWS Egress Pricing',
    tabLabel: 'OVHcloud vs AWS Egress',
    headline: 'OVHcloud vs AWS: Unlimited Free Egress vs Metered Data Transfer (2026)',
    summary: 'OVHcloud\'s Public Cloud plans ship with fair-use unlimited outbound bandwidth on every instance — no allowance to track, no overage tier. AWS meters every gigabyte leaving the network from the first byte. For data-heavy, CDN-adjacent, or high-traffic EU-facing workloads, this is the single biggest lever in the whole cost comparison.',
    metaDescription: 'OVHcloud vs AWS egress pricing: unlimited free bandwidth vs $0.09/GB metered transfer. See the real monthly savings for high-bandwidth, EU-hosted workloads.',
    keywords: ['OVHcloud vs AWS', 'OVHcloud free egress', 'AWS data transfer cost', 'unlimited bandwidth cloud', 'EU cloud egress pricing', 'cheapest bandwidth cloud provider'],
    providerA: CloudProvider.OVHCLOUD,
    providerB: CloudProvider.AWS,
    referenceConfig: egressHeavyConfig(51200, 'High-Bandwidth EU Service (50 TB/mo)'),
    editorialFeatures: [
      { feature: 'Data Sovereignty', category: 'Compliance', providerAVal: 'EU-headquartered, EU-hosted regions by default', providerBVal: 'US-headquartered; EU regions available but not EU-domiciled', winner: 'A' },
      { feature: 'Billing Predictability', category: 'Networking', providerAVal: 'Flat fee — bandwidth never appears as a variable line item', providerBVal: 'Variable line item that scales directly with traffic', winner: 'A' }
    ],
    faqs: [
      {
        question: 'Is OVHcloud egress really unlimited?',
        answer: 'OVHcloud\'s published Public Cloud policy is unlimited outbound bandwidth under a fair-use policy — there is no metered allowance and no per-GB overage rate to model. AWS, by contrast, bills every gigabyte of internet egress from the first byte, at roughly $0.09/GB in us-east-1.'
      },
      {
        question: 'What workloads benefit most from unlimited egress?',
        answer: 'Anything where outbound bandwidth scales with usage rather than staying flat: media/CDN-adjacent delivery, high-traffic public APIs, large file downloads, and backup or disaster-recovery replication. At high transfer volumes the egress line item alone can exceed the compute cost on a metered provider.'
      },
      {
        question: 'Does OVHcloud\'s EU location matter beyond bandwidth pricing?',
        answer: 'For organizations with GDPR data-residency requirements, OVHcloud\'s EU headquarters and EU-domiciled default regions (including BHS in Canada and multiple EU sites) can simplify compliance in ways a US-headquartered provider\'s EU region alone does not fully address. That\'s a legal/compliance question, not a pricing one — verify against your specific regulatory obligations.'
      }
    ]
  },
  'digitalocean-vs-linode': {
    slug: 'digitalocean-vs-linode',
    slugTitle: 'DigitalOcean vs Linode',
    tabLabel: 'DigitalOcean vs Linode',
    headline: 'DigitalOcean vs Linode (Akamai): The Developer Cloud Head-to-Head (2026)',
    summary: 'The two most established "boring, predictable, cheap" clouds for indie developers and small teams — DigitalOcean Droplets vs Linode Compute Instances (now part of Akamai). Both skip reserved-instance complexity entirely and price everything flat. The differences show up in storage tiering, bandwidth overage rates, and managed Kubernetes.',
    metaDescription: 'DigitalOcean vs Linode pricing compared: Droplets vs Linode Compute Instances, object storage, managed databases, DOKS vs LKE, and bandwidth overage rates. Free TCO calculator.',
    keywords: ['DigitalOcean vs Linode', 'Droplet pricing', 'Linode pricing', 'Akamai cloud pricing', 'developer cloud comparison', 'cheap VPS pricing 2026', 'DOKS vs LKE'],
    providerA: CloudProvider.DIGITALOCEAN,
    providerB: CloudProvider.LINODE,
    editorialFeatures: [
      { feature: 'Company / Backing', category: 'Platform', providerAVal: 'Independent, NYSE-listed (DOCN)', providerBVal: 'Acquired by Akamai (2022) — backed by Akamai\'s global edge network', winner: 'TIE' },
      { feature: 'Marketplace / 1-Click Apps', category: 'Ecosystem', providerAVal: 'Large marketplace, broad community tutorial base', providerBVal: 'Solid marketplace, deep Linux/sysadmin community (est. 2003)', winner: 'TIE' }
    ],
    faqs: [
      {
        question: 'Is DigitalOcean or Linode cheaper?',
        answer: 'On flat, on-demand compute the two are close — both price Droplets/Linodes without any reserved-instance layer, so what you see is what you pay. The real differentiator is bandwidth overage: Linode\'s published overage rate is lower per GB once a plan\'s pooled transfer allowance is exhausted, which matters more as account-wide traffic grows. Use the live calculator above to compare your own instance size and bandwidth volume.'
      },
      {
        question: 'How do the bandwidth allowances work on each?',
        answer: 'Both bundle a pooled outbound-transfer allowance per instance, shared account-wide rather than tracked per-server — so ten small instances and one large instance with the same total allowance cost the same to run at the same traffic level. Overage beyond the bundle is billed per GB, and that per-GB rate is where the two providers diverge.'
      },
      {
        question: 'How does managed Kubernetes compare — DOKS vs LKE?',
        answer: 'Both DigitalOcean Kubernetes (DOKS) and Linode Kubernetes Engine (LKE) offer a free control plane on every cluster — neither charges a per-hour management fee the way AWS EKS does. The cost difference is entirely in the underlying worker-node compute pricing, which the calculator above breaks down per node shape.'
      }
    ]
  },
  'digitalocean-vs-aws': {
    slug: 'digitalocean-vs-aws',
    slugTitle: 'DigitalOcean vs AWS',
    tabLabel: 'DigitalOcean vs AWS',
    headline: 'DigitalOcean vs AWS: When Does a Droplet Stop Being Cheaper Than EC2? (2026)',
    summary: 'DigitalOcean is the developer cloud built around one promise: flat, predictable pricing with none of AWS\'s reserved-instance and Savings Plan complexity. That promise holds cleanly at small scale — but AWS\'s Graviton and Savings Plans pricing can close the gap, or invert it, at larger and more committed workloads. This page uses the live calculator to find where that crossover actually sits for a given spec.',
    metaDescription: 'DigitalOcean vs AWS pricing compared: flat Droplet pricing vs EC2 On-Demand/Reserved/Spot. Find the exact workload size where AWS becomes cheaper than DigitalOcean.',
    keywords: ['DigitalOcean vs AWS', 'Droplet vs EC2', 'DigitalOcean pricing 2026', 'AWS vs DigitalOcean cost', 'cheap cloud hosting comparison', 'EC2 alternative pricing'],
    providerA: CloudProvider.DIGITALOCEAN,
    providerB: CloudProvider.AWS,
    editorialFeatures: [
      { feature: 'Commitment Model', category: 'Compute', providerAVal: 'Flat on-demand rate only — no reserved tier to manage', providerBVal: 'On-Demand, 1-Yr, 3-Yr Reserved, and Spot — deeper discounts require commitment', winner: 'A' },
      { feature: 'Service Catalog Breadth', category: 'Platform', providerAVal: 'Focused catalog: Droplets, Spaces, Managed DBs, DOKS', providerBVal: 'Hundreds of services across every infrastructure category', winner: 'B' }
    ],
    faqs: [
      {
        question: 'Is DigitalOcean always cheaper than AWS?',
        answer: 'Not always — it depends on instance shape and commitment. DigitalOcean\'s flat on-demand Droplet pricing is straightforward to reason about, but AWS\'s Graviton (Arm) instances and multi-year Savings Plans can undercut a flat rate once you\'re willing to commit. The live calculator above shows the actual crossover for your specific vCPU/RAM shape and commitment choice.'
      },
      {
        question: 'Why doesn\'t DigitalOcean offer reserved pricing?',
        answer: 'DigitalOcean\'s positioning is explicitly simplicity-first: one published rate per Droplet size, no reserved-instance marketplace to navigate, no Savings Plan math. That\'s a real advantage for predictable budgeting, but it means DigitalOcean can\'t match AWS\'s 3-year-reserved or Spot pricing on workloads that can tolerate that kind of commitment or interruption risk.'
      },
      {
        question: 'What about egress and storage — does the gap change there?',
        answer: 'DigitalOcean bundles outbound transfer per Droplet, pooled account-wide, with a flat overage rate once exhausted. AWS meters egress from the first GB at a higher per-GB rate but has no bundled allowance at all. For storage, DigitalOcean Spaces has one flat tier; AWS S3 offers four tiers, which can be cheaper for cold/archival data specifically. See the full breakdown in the live matrix above.'
      }
    ]
  },
  'oracle-vs-aws': {
    slug: 'oracle-vs-aws',
    slugTitle: 'Oracle Cloud vs AWS',
    tabLabel: 'Oracle vs AWS',
    headline: 'Oracle Cloud Infrastructure vs AWS: The Full Pricing Comparison (2026)',
    summary: 'Oracle Cloud Infrastructure is the least-covered hyperscaler in most cost comparisons, despite competing directly on every service category AWS offers — compute, storage, managed databases, Kubernetes, and networking. This page runs the full side-by-side across all five, using OCI\'s published Ampere Arm and free-egress pricing against AWS\'s catalog.',
    metaDescription: 'Oracle Cloud Infrastructure (OCI) vs AWS pricing compared across Compute, Storage, Database, Kubernetes, and Egress. Ampere Arm pricing, 10 TB free egress, and full TCO breakdown.',
    keywords: ['Oracle Cloud vs AWS', 'OCI vs AWS pricing', 'Oracle Cloud Infrastructure pricing 2026', 'Ampere Arm pricing', 'OCI cost comparison', 'AWS alternative pricing'],
    providerA: CloudProvider.ORACLE,
    providerB: CloudProvider.AWS,
    editorialFeatures: [
      { feature: 'Always Free Tier', category: 'Platform', providerAVal: 'Permanent free-tier compute, storage and database instances', providerBVal: 'Free Tier limited to 12 months on most services', winner: 'A' },
      { feature: 'Enterprise Database Heritage', category: 'Database', providerAVal: 'Native Oracle Database service (Autonomous Database)', providerBVal: 'RDS supports third-party engines; no native Oracle DB service', winner: 'A' }
    ],
    faqs: [
      {
        question: 'Why is Oracle Cloud rarely included in cloud cost comparisons?',
        answer: 'Oracle Cloud Infrastructure has historically been associated with Oracle\'s legacy enterprise database licensing rather than general-purpose cloud infrastructure, so it\'s often left out of "AWS vs Azure vs GCP"-style comparisons by default. On raw infrastructure pricing, though, OCI competes directly across compute, storage, managed databases, Kubernetes and networking — see the full matrix above for a like-for-like comparison.'
      },
      {
        question: 'What is Oracle Ampere compute and how does it price?',
        answer: 'Oracle\'s Ampere shapes are Arm-based compute instances, comparable in category to AWS Graviton — both trade x86 compatibility for a lower per-vCPU rate. OCI publishes Ampere pricing per OCPU (Oracle\'s billing unit, not identical to a vCPU) — the calculator above converts to a per-vCPU basis for direct comparison against Graviton and standard x86 instances.'
      },
      {
        question: 'Does Oracle Cloud support managed Kubernetes?',
        answer: 'Yes — Oracle Container Engine for Kubernetes (OKE) offers a Basic tier with no control-plane management fee, comparable to how GKE waives the fee for a first cluster and how AKS waives it entirely on its standard tier. AWS EKS is the only provider in this comparison that charges a control-plane fee from the very first cluster.'
      }
    ]
  },

  'ovhcloud-vs-digitalocean': {
    slug: 'ovhcloud-vs-digitalocean',
    slugTitle: 'OVHcloud vs DigitalOcean',
    tabLabel: 'OVHcloud vs DigitalOcean',
    headline: 'OVHcloud vs DigitalOcean: EU-Sovereign vs US Developer Cloud (2026)',
    summary: 'Two budget-friendly clouds with very different centers of gravity: OVHcloud is EU-headquartered with unlimited free egress and EU data residency by default, while DigitalOcean is the US-based developer favorite with the larger community and marketplace. This page compares them purely on published infrastructure pricing.',
    metaDescription: 'OVHcloud vs DigitalOcean pricing compared: unlimited egress vs bundled bandwidth, EU vs US data residency, compute, storage and managed Kubernetes costs.',
    keywords: ['OVHcloud vs DigitalOcean', 'EU cloud vs US cloud pricing', 'OVHcloud pricing 2026', 'DigitalOcean pricing 2026', 'cheapest EU cloud provider', 'GDPR cloud hosting comparison'],
    providerA: CloudProvider.OVHCLOUD,
    providerB: CloudProvider.DIGITALOCEAN,
    editorialFeatures: [
      { feature: 'Data Residency', category: 'Compliance', providerAVal: 'EU-headquartered, EU-domiciled regions by default', providerBVal: 'US-headquartered; EU regions available (Amsterdam, Frankfurt, London)', winner: 'A' },
      { feature: 'Community & Tutorials', category: 'Ecosystem', providerAVal: 'Smaller English-language community footprint', providerBVal: 'Large tutorial library and community forum', winner: 'B' }
    ],
    faqs: [
      {
        question: 'Which is cheaper for a small VPS-style workload — OVHcloud or DigitalOcean?',
        answer: 'Both target the same budget-conscious developer segment, and published on-demand compute rates are close for comparable shapes. The bigger differentiator at scale is bandwidth: OVHcloud\'s unlimited fair-use egress has no ceiling, while DigitalOcean bundles a per-Droplet allowance with a flat overage rate. Use the live calculator above with your own compute and bandwidth needs.'
      },
      {
        question: 'Is OVHcloud a realistic alternative for a US-based team?',
        answer: 'OVHcloud operates regions in North America (including Canada) alongside its EU footprint, so latency to US users is workable depending on target region — but its center of gravity, support hours, and community are more EU-oriented than DigitalOcean\'s. For teams with EU customers or GDPR data-residency requirements, that orientation is an advantage rather than a drawback.'
      }
    ]
  },
  'linode-vs-aws': {
    slug: 'linode-vs-aws',
    slugTitle: 'Linode vs AWS',
    tabLabel: 'Linode vs AWS',
    headline: 'Linode (Akamai) vs AWS: Simple Pricing vs the Full Hyperscaler Catalog (2026)',
    summary: 'Linode — now part of Akamai — competes on the same pitch as DigitalOcean: flat, predictable compute pricing without AWS\'s reserved-instance complexity, backed by Akamai\'s global network for the lowest published bandwidth overage rate in this comparison. This page runs it against AWS EC2 across compute, storage, database, and Kubernetes.',
    metaDescription: 'Linode vs AWS pricing compared: flat compute pricing vs EC2 On-Demand/Reserved/Spot, LKE vs EKS, and Akamai\'s bandwidth overage rate against AWS data transfer.',
    keywords: ['Linode vs AWS', 'Linode pricing 2026', 'Akamai cloud pricing', 'LKE vs EKS', 'AWS alternative for small teams', 'cheap cloud hosting comparison'],
    providerA: CloudProvider.LINODE,
    providerB: CloudProvider.AWS,
    editorialFeatures: [
      { feature: 'Backing Network', category: 'Platform', providerAVal: 'Akamai global edge/CDN network', providerBVal: 'AWS global backbone + CloudFront CDN', winner: 'TIE' },
      { feature: 'Pricing Model Complexity', category: 'Compute', providerAVal: 'Single flat rate per instance size', providerBVal: 'On-Demand, 1-Yr/3-Yr Reserved, Savings Plans, and Spot', winner: 'A' }
    ],
    faqs: [
      {
        question: 'How does Linode\'s Akamai backing affect pricing or performance?',
        answer: 'Since Akamai\'s 2022 acquisition of Linode, Linode instances run on Akamai\'s infrastructure and can route through Akamai\'s global edge network. Published compute pricing has stayed in the same flat, predictable model Linode was known for beforehand — the acquisition\'s effect shows up more in network reach than in the pricing structure itself.'
      },
      {
        question: 'What is Linode\'s bandwidth overage rate compared to AWS?',
        answer: 'Linode publishes one of the lowest per-GB bandwidth overage rates of any provider in this comparison, applied once a Linode\'s pooled transfer allowance is exhausted. AWS has no equivalent bundled allowance — internet egress is metered from the first gigabyte at a materially higher published rate. See the live matrix above for the exact current rates.'
      },
      {
        question: 'Does Linode offer the same breadth of managed services as AWS?',
        answer: 'No — Linode\'s catalog is deliberately narrower: compute, object storage, managed databases (PostgreSQL/MySQL), and Kubernetes (LKE). AWS spans hundreds of services across every infrastructure and platform category. For teams whose needs fit Linode\'s core catalog, that focus translates into simpler pricing and operations; for anything requiring AWS-specific managed services, there\'s no substitute.'
      }
    ]
  }
};

/** Every curated slug, derived — this is the single source of truth for the tab strip, sitemap, and prerender param list. */
export const COMPARISON_SLUGS: string[] = Object.keys(COMPARISON_PAGES);

export const COMPARISON_TABS: { slug: string; label: string }[] = COMPARISON_SLUGS.map((slug) => ({
  slug,
  label: COMPARISON_PAGES[slug].tabLabel
}));

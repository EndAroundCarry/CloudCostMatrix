import { ArchitectureEstimateConfig } from '../../core/models/pricing.model';
import { ALL_PROVIDERS, CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { ARCHITECTURE_BLUEPRINTS } from '../../core/models/blueprints.model';
import { canonicalPairSlug } from '../../core/seo/comparison-slug';

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
    metaDescription: 'Compare AWS vs Azure pricing in 2026: EC2 vs Azure VMs, S3 vs Blob Storage, RDS vs Azure SQL, EKS vs AKS and data egress, scored side-by-side by one engine.',
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
    metaDescription: 'Oracle Cloud vs AWS egress pricing: OCI\'s 10 TB/month free allowance vs AWS\'s $0.09/GB from byte one — the monthly cost for bandwidth-heavy workloads.',
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
    metaDescription: 'DigitalOcean vs Linode pricing: Droplets vs Compute Instances, object storage, managed databases, DOKS vs LKE and bandwidth overage rates.',
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
    metaDescription: 'Oracle Cloud vs AWS pricing across compute, storage, database, Kubernetes and egress — Ampere Arm pricing, the free egress allowance and full TCO.',
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
  },

  'digitalocean-vs-vultr': {
    slug: 'digitalocean-vs-vultr',
    slugTitle: 'DigitalOcean vs Vultr',
    tabLabel: 'DigitalOcean vs Vultr',
    headline: 'DigitalOcean vs Vultr: Two Flat-Rate Developer Clouds Compared (2026)',
    summary: 'Both clouds target the same audience — developers who want predictable, flat hourly pricing without reserved-instance math — and both include a managed-Kubernetes control plane at no charge. Vultr counters DigitalOcean\'s larger community and marketplace with a wider global footprint, a broader instance catalog spanning shared to dedicated and GPU, and Windows support the Droplet lineup lacks. This page compares them on published infrastructure pricing.',
    metaDescription: 'DigitalOcean vs Vultr pricing: Droplets vs Cloud Compute, object storage, managed databases, DOKS vs VKE control-plane fees and egress rates.',
    keywords: ['DigitalOcean vs Vultr', 'Vultr vs DigitalOcean', 'Droplet vs Vultr Cloud Compute', 'Vultr pricing 2026', 'developer cloud comparison', 'DOKS vs VKE', 'cheap cloud server pricing 2026'],
    providerA: CloudProvider.DIGITALOCEAN,
    providerB: CloudProvider.VULTR,
    editorialFeatures: [
      { feature: 'Global Region Footprint', category: 'Platform', providerAVal: 'Regions across North America, Europe, and Asia-Pacific', providerBVal: '33 published cloud data-center regions worldwide', winner: 'B' },
      { feature: 'Instance Lineup Breadth', category: 'Compute', providerAVal: 'Basic plus CPU-, General-Purpose-, and Memory-Optimized Droplets', providerBVal: 'Shared, High Frequency/High Performance, dedicated Optimized, GPU, and bare metal', winner: 'B' },
      { feature: 'Windows Server Licensing', category: 'Compute', providerAVal: 'Not offered on Droplets', providerBVal: 'Windows Server available on Cloud Compute', winner: 'B' },
      { feature: 'Per-GB Bandwidth Overage', category: 'Networking', providerAVal: '$0.01/GB once the pooled Droplet bundle is exhausted', providerBVal: '$0.01/GB in North America/Europe once the instance bundle is exhausted', winner: 'TIE' },
      { feature: 'Community & Documentation', category: 'Ecosystem', providerAVal: 'Large tutorial library and active community forum', providerBVal: 'Solid documentation, smaller community footprint', winner: 'A' }
    ],
    faqs: [
      {
        question: 'Is DigitalOcean or Vultr cheaper?',
        answer: 'Both price compute flat and hourly with no reserved-instance layer, so the headline rates are close for comparable shapes. The differences show up in catalog breadth and footprint: Vultr spans a wider range of sizes and regions (including dedicated and GPU shapes), while DigitalOcean concentrates on a smaller, simpler lineup. Run the live calculator above with your own vCPU/RAM shape and bandwidth volume for an exact answer.'
      },
      {
        question: 'How do the managed Kubernetes control-plane fees compare?',
        answer: 'Neither DigitalOcean Kubernetes (DOKS) nor Vultr Kubernetes Engine (VKE) charges for the control plane — both include it on every cluster, so the only Kubernetes cost is the underlying worker-node compute plus any attached storage or load balancers. That is materially cheaper than AWS EKS, which bills a per-cluster control-plane fee from the first cluster.'
      },
      {
        question: 'How does object storage compare?',
        answer: 'Both providers offer a single object-storage class rather than the hot/cool/cold/archive tiering a hyperscaler sells — DigitalOcean Spaces and Vultr Object Storage each publish one capacity rate, so there is no lifecycle tiering to model on either side. See the live matrix above for the current per-GB figures.'
      },
      {
        question: 'Does either provider offer Windows or GPU instances?',
        answer: 'Vultr sells Windows Server on its Cloud Compute plans and a broad Cloud GPU lineup (NVIDIA and AMD), while DigitalOcean\'s Droplet lineup is Linux-only with no GPU shapes. For Windows or GPU-dependent workloads, Vultr is the option of the two.'
      }
    ]
  },
  'linode-vs-vultr': {
    slug: 'linode-vs-vultr',
    slugTitle: 'Linode vs Vultr',
    tabLabel: 'Linode vs Vultr',
    headline: 'Linode (Akamai) vs Vultr: Independent Developer Clouds Head-to-Head (2026)',
    summary: 'Linode — now backed by Akamai\'s global network — and Vultr both compete on flat, predictable compute pricing, a free Kubernetes control plane, and no reserved-instance complexity. Linode publishes the lowest bandwidth overage rate in this comparison; Vultr answers with a much larger region footprint and a catalog that extends further into dedicated, GPU, and bare-metal territory.',
    metaDescription: 'Linode vs Vultr pricing compared: flat compute, object storage, managed databases, LKE vs VKE, Akamai\'s low bandwidth overage rate against Vultr\'s 33 global regions.',
    keywords: ['Linode vs Vultr', 'Vultr vs Linode', 'LKE vs VKE', 'Akamai cloud pricing', 'Vultr pricing 2026', 'cheap cloud server comparison', 'developer cloud pricing'],
    providerA: CloudProvider.LINODE,
    providerB: CloudProvider.VULTR,
    editorialFeatures: [
      { feature: 'Backing Network', category: 'Platform', providerAVal: 'Akamai global edge/CDN network', providerBVal: 'Own global backbone across 33 regions', winner: 'TIE' },
      { feature: 'Per-GB Bandwidth Overage', category: 'Networking', providerAVal: '$0.005/GB — the lowest rate in this comparison', providerBVal: '$0.01/GB in North America/Europe', winner: 'A' },
      { feature: 'Global Region Footprint', category: 'Platform', providerAVal: 'Smaller, established footprint', providerBVal: '33 published cloud data-center regions worldwide', winner: 'B' },
      { feature: 'Instance Lineup Breadth', category: 'Compute', providerAVal: 'Shared, dedicated, and high-memory compute', providerBVal: 'Shared, High Frequency/High Performance, dedicated Optimized, GPU, and bare metal', winner: 'B' }
    ],
    faqs: [
      {
        question: 'Is Linode or Vultr cheaper?',
        answer: 'For comparable shared-CPU shapes the two are close — both price flat, hourly, and without a reserved-instance layer. The clearest published difference is bandwidth overage: Linode\'s per-GB rate once an instance\'s pooled transfer allowance is exhausted is the lowest of any provider in this comparison, which matters most for transfer-heavy workloads. Use the live calculator above for your own shape and traffic volume.'
      },
      {
        question: 'How does Akamai\'s ownership of Linode affect the comparison?',
        answer: 'Since Akamai acquired Linode in 2022, Linode instances run on Akamai\'s infrastructure and can route through Akamai\'s global edge network, while keeping the flat, predictable pricing model Linode was known for. The acquisition\'s effect shows up more in network reach than in the pricing structure itself, so it does not materially change a like-for-like compute comparison.'
      },
      {
        question: 'Do both offer a free managed-Kubernetes control plane?',
        answer: 'Yes — Linode Kubernetes Engine (LKE) and Vultr Kubernetes Engine (VKE) both include the control plane at no charge on every cluster, so only worker nodes and attached storage or load balancers are billable. Neither charges the per-cluster control-plane fee that AWS EKS does.'
      }
    ]
  },
  'ovhcloud-vs-vultr': {
    slug: 'ovhcloud-vs-vultr',
    slugTitle: 'OVHcloud vs Vultr',
    tabLabel: 'OVHcloud vs Vultr',
    headline: 'OVHcloud vs Vultr: EU-Sovereign Cloud vs the Independent Global Challenger (2026)',
    summary: 'OVHcloud and Vultr both undercut the hyperscalers on flat, commitment-free pricing, but they optimise for different things: OVHcloud is EU-headquartered with unlimited free egress and EU data residency by default, while Vultr offers a far wider global footprint with a low, metered $0.01/GB overage. This page compares them purely on published infrastructure pricing.',
    metaDescription: 'OVHcloud vs Vultr pricing compared: unlimited EU egress vs Vultr\'s low metered overage, EU data residency vs 33 global regions, compute, storage, and managed Kubernetes.',
    keywords: ['OVHcloud vs Vultr', 'Vultr vs OVHcloud', 'unlimited egress vs metered', 'EU cloud data residency', 'Vultr pricing 2026', 'cheapest bandwidth cloud provider'],
    providerA: CloudProvider.OVHCLOUD,
    providerB: CloudProvider.VULTR,
    referenceConfig: egressHeavyConfig(51200, 'High-Bandwidth EU Service (50 TB/mo)'),
    editorialFeatures: [
      { feature: 'Data Residency', category: 'Compliance', providerAVal: 'EU-headquartered, EU-domiciled regions by default', providerBVal: 'US-headquartered; EU regions available but not EU-domiciled', winner: 'A' },
      { feature: 'Egress Model', category: 'Networking', providerAVal: 'Unlimited and free under a fair-use policy — no metered line item', providerBVal: 'Bundled per-instance allowance with a low $0.01/GB overage', winner: 'A' },
      { feature: 'Global Region Footprint', category: 'Platform', providerAVal: 'EU-centric footprint with North America and APAC regions', providerBVal: '33 published cloud data-center regions worldwide', winner: 'B' },
      { feature: 'Managed Kubernetes Control Plane', category: 'Kubernetes', providerAVal: 'Free on every Public Cloud plan', providerBVal: 'VKE control plane free on every cluster', winner: 'TIE' }
    ],
    faqs: [
      {
        question: 'Which is cheaper for a bandwidth-heavy workload — OVHcloud or Vultr?',
        answer: 'OVHcloud\'s published Public Cloud policy is unlimited outbound bandwidth under a fair-use policy, so egress never appears as a variable line item. Vultr bundles a per-instance transfer allowance (varying by plan) and bills a low $0.01/GB overage beyond it. At high transfer volumes the egress line alone can exceed compute, which favours OVHcloud; at moderate volumes the two are much closer. The calculator above models a 50 TB/month workload.'
      },
      {
        question: 'Does the choice matter for GDPR / EU data residency?',
        answer: 'For organizations with EU data-residency requirements, OVHcloud\'s EU headquarters and EU-domiciled default regions can simplify compliance in ways a US-headquartered provider\'s EU region does not fully address. Vultr offers EU regions (including Frankfurt, Amsterdam, London, Paris, Madrid, and Warsaw) but is a US-headquartered company. Verify against your specific regulatory obligations — that is a legal question, not a pricing one.'
      },
      {
        question: 'How do the two compare on global reach and instance choice?',
        answer: 'Vultr spans 33 published regions and a broad catalog including shared, high-frequency/high-performance, dedicated Optimized, GPU, and bare-metal shapes, whereas OVHcloud\'s footprint is more EU-centric with a narrower instance lineup. For teams needing many regions or GPU/bare-metal options, Vultr has the wider reach; for EU-sovereign, low-egress workloads, OVHcloud is the stronger fit.'
      }
    ]
  },

  // ------------------------------------------------------------------
  // Pair coverage — the pairs that previously had no authored page. Same
  // convention as the budget-cloud block above: every price-bearing row is
  // computed by buildDerivedFeatures() against the live catalogs, so only the
  // qualitative rows and the prose are authored here.
  // ------------------------------------------------------------------

  'azure-vs-oracle': {
    slug: 'azure-vs-oracle',
    slugTitle: 'Azure vs Oracle Cloud',
    tabLabel: 'Azure vs Oracle',
    headline: 'Azure vs Oracle Cloud: Where the Hyperscaler Premium Actually Shows Up (2026)',
    summary: 'Microsoft Azure and Oracle Cloud Infrastructure sell the same five primitives with very different economics. Azure competes on enterprise integration and licence portability; Oracle competes on list price and on a standing free monthly egress allowance that no other hyperscaler in this catalog matches. This comparison scores both against one reference workload, so the premium — or the absence of it — is a number rather than an argument.',
    metaDescription: 'Azure vs Oracle Cloud pricing compared: Azure VMs vs OCI compute, Blob vs Object Storage, AKS vs OKE, and the egress allowance that changes the total.',
    keywords: ['Azure vs Oracle Cloud', 'OCI vs Azure pricing', 'OKE vs AKS cost', 'Oracle Cloud free egress', 'cloud cost comparison 2026'],
    providerA: CloudProvider.AZURE,
    providerB: CloudProvider.ORACLE,
    editorialFeatures: [
      { feature: 'Licence portability', category: 'Licensing', providerAVal: 'Azure Hybrid Benefit applies existing Windows Server / SQL Server licences (up to 40%)', providerBVal: 'BYOL on compute only — no managed SQL Server', winner: 'A' },
      { feature: 'Kubernetes control plane', category: 'Kubernetes', providerAVal: 'Free on the AKS standard tier', providerBVal: 'Free on OKE Basic clusters', winner: 'TIE' },
      { feature: 'Enterprise ecosystem', category: 'Platform', providerAVal: 'Deep Microsoft 365, Entra ID and Windows Server integration', providerBVal: 'Oracle Database and ERP estates, with a strong autonomous-database story', winner: 'A' },
      { feature: 'Commercial model', category: 'Billing', providerAVal: 'Enterprise Agreements routinely carry Azure commitments', providerBVal: 'Straightforward list pricing with an open-ended Always Free tier', winner: 'B' }
    ],
    faqs: [
      {
        question: 'Is Oracle Cloud cheaper than Azure?',
        answer: 'On published list prices for compute, Oracle Cloud Infrastructure is generally the cheaper of the two, and Ampere arm64 shapes widen that gap on price/performance. The difference that is harder to argue away is egress: Oracle includes a large free monthly transfer allowance on every tenancy, while Azure meters internet egress from the first gigabyte. Azure has one compensating lever that can be worth more than all of that — Azure Hybrid Benefit applies existing Windows Server and SQL Server licences, which is up to 40% off the instance rate for the workloads that qualify. The reference workload totals above show what each effect is worth on a specific architecture.'
      },
      {
        question: 'Do Azure and Oracle charge for managed Kubernetes control planes?',
        answer: 'Neither charges for a first cluster in the configuration modelled here: AKS is free on the standard tier, and OKE Basic clusters never bill for the control plane. That removes a fixed monthly cost that EKS and GKE both charge from the first cluster, and it matters most early on and to anyone running staging alongside production.'
      },
      {
        question: 'What is the largest single cost difference between Azure and Oracle Cloud?',
        answer: 'For data-heavy workloads it is outbound bandwidth, and it is not close. A workload that ships tens of terabytes a month outward pays Oracle nothing for that transfer and pays Azure for every gigabyte, which can exceed the entire compute line item. For workloads that do not move much data outward, the difference shifts back to compute and licensing — which is exactly why the totals here are computed rather than summarised in one sentence.'
      },
      {
        question: 'Which should an organisation already standardized on Microsoft choose?',
        answer: 'Azure, in most cases — identity, Windows and SQL Server licensing, existing Enterprise Agreement commitments, and operational familiarity are all real costs that a cheaper list price does not offset. Oracle Cloud becomes the better answer when the workload profile is dominated by egress, when Oracle Database or ERP is already in the estate, or when a new greenfield service is being priced without any Microsoft-specific dependency. Both pages here price the same architecture, so the comparison is at least an apples-to-apples starting point.'
      }
    ]
  },

  'gcp-vs-oracle': {
    slug: 'gcp-vs-oracle',
    slugTitle: 'GCP vs Oracle Cloud',
    tabLabel: 'GCP vs Oracle',
    headline: 'Google Cloud vs Oracle Cloud: Two Opposite Theories of Discounting (2026)',
    summary: 'Google Cloud discounts automatically as instances run longer and lets you buy exactly the vCPU and memory ratio you need. Oracle Cloud discounts structurally instead — the cheapest hyperscaler list prices in this catalog, plus a standing free monthly egress allowance on every tenancy. Both give away the first Kubernetes control plane, and both are scored here against one reference workload.',
    metaDescription: 'Google Cloud vs Oracle Cloud pricing compared: Compute Engine vs OCI compute, GKE vs OKE, storage tiers and the free egress allowance, one engine, one workload.',
    keywords: ['GCP vs Oracle Cloud', 'Google Cloud vs OCI pricing', 'GKE vs OKE cost', 'Oracle free egress vs GCP', 'cloud cost comparison 2026'],
    providerA: CloudProvider.GCP,
    providerB: CloudProvider.ORACLE,
    editorialFeatures: [
      { feature: 'Discount mechanism', category: 'Compute', providerAVal: 'Automatic sustained-use discounts, no commitment required', providerBVal: 'Deep reserved-instance discounts, but only by committing', winner: 'A' },
      { feature: 'Machine sizing', category: 'Compute', providerAVal: 'Custom vCPU and memory ratios', providerBVal: 'Fixed shapes, including Ampere arm64', winner: 'A' },
      { feature: 'Managed SQL Server', category: 'Database', providerAVal: 'Cloud SQL for SQL Server available', providerBVal: 'Not offered as a managed service — BYOL on compute only', winner: 'A' },
      { feature: 'Egress policy', category: 'Networking', providerAVal: 'Metered from the first gigabyte, with a CDN offload path', providerBVal: 'Standing free monthly allowance on every tenancy', winner: 'B' }
    ],
    faqs: [
      {
        question: 'Is Oracle Cloud cheaper than Google Cloud?',
        answer: 'On compute list prices, usually yes — Oracle Cloud Infrastructure prices at the bottom of the four hyperscalers in this catalog, and its Ampere arm64 shapes are the cheapest arm64 capacity here. Google Cloud closes part of the gap automatically through sustained-use discounts, which apply without any commitment and reward always-on workloads. The decisive difference for data-heavy workloads is egress: Oracle gives away a large monthly transfer allowance where Google Cloud meters from the first gigabyte.'
      },
      {
        question: 'How do GKE and OKE control-plane fees compare?',
        answer: 'Both waive the fee for a first cluster — GKE on a zonal cluster, OKE on Basic clusters — so a small deployment pays nothing for cluster management on either side. The comparison diverges as you scale out: additional clusters are billed on both platforms, and OKE offers no spot tier, so fault-tolerant batch work has no interruption-discount path on Oracle Cloud.'
      },
      {
        question: 'Which is better for data and analytics workloads?',
        answer: 'Google Cloud, and it is not particularly close: BigQuery, Dataflow and the surrounding tooling are the reason many data teams choose it, and the pricing engine here models the infrastructure those jobs run on rather than the query costs themselves. Oracle counters with Autonomous Database and a deeply integrated Oracle stack, which is compelling when your data already lives in Oracle. Note that this comparison scores infrastructure, not managed analytics service pricing — check each provider\u2019s own calculators for the service layer.'
      },
      {
        question: 'Do sustained-use discounts or reserved instances save more?',
        answer: 'They solve different problems. Sustained-use discounts require nothing from you and apply automatically to always-on instances, which makes them the better fit for variable or hard-to-forecast fleets. Reserved and committed pricing is deeper where it applies, but only pays off if the capacity really stays in use for the commitment term — and on Oracle Cloud specifically, the deepest discounts are the longest commitments. The commitment selector in the live calculator below lets you price both against your own utilisation rather than a rule of thumb.'
      }
    ]
  },

  'aws-vs-ibm': {
    slug: 'aws-vs-ibm',
    slugTitle: 'AWS vs IBM Cloud',
    tabLabel: 'AWS vs IBM',
    headline: 'AWS vs IBM Cloud: Catalog Breadth Against Hybrid Integration (2026)',
    summary: 'AWS and IBM Cloud rarely appear on the same shortlist, which is exactly what makes the cost comparison worth running: AWS competes on catalog breadth and discount machinery, IBM on hybrid-cloud parity and a managed Kubernetes service that never bills for the control plane. Both are priced here against the same reference workload.',
    metaDescription: 'AWS vs IBM Cloud pricing compared: EC2 vs VPC Virtual Servers, S3 vs Cloud Object Storage, EKS vs IKS control-plane fees and egress, computed live.',
    keywords: ['AWS vs IBM Cloud', 'IBM Cloud vs AWS pricing', 'IKS vs EKS cost', 'IBM Cloud Kubernetes pricing', 'hybrid cloud cost comparison 2026'],
    providerA: CloudProvider.AWS,
    providerB: CloudProvider.IBM,
    editorialFeatures: [
      { feature: 'Kubernetes control plane', category: 'Kubernetes', providerAVal: 'Billed per cluster, from the first cluster', providerBVal: 'Never billed, on any tier, including multi-zone', winner: 'B' },
      { feature: 'Spot / preemptible tier', category: 'Compute', providerAVal: 'Spot instances with a two-minute interruption warning', providerBVal: 'No spot or preemptible tier at all', winner: 'A' },
      { feature: 'Hybrid and on-premises parity', category: 'Platform', providerAVal: 'Outposts and EKS Anywhere for edge and on-prem', providerBVal: 'The same OpenShift and Kubernetes stack on-prem and in IBM Cloud', winner: 'B' },
      { feature: 'Managed SQL Server', category: 'Database', providerAVal: 'RDS for SQL Server', providerBVal: 'Not offered — IBM Cloud Databases covers PostgreSQL, MySQL and Db2', winner: 'A' }
    ],
    faqs: [
      {
        question: 'Is IBM Cloud cheaper than AWS?',
        answer: 'On compute list prices IBM generally lands between AWS and the developer clouds, and the reference workload totals above show where that puts a specific architecture. IBM\u2019s strongest structural advantage is a fee it does not charge: the managed Kubernetes control plane is free on every tier, including multi-zone clusters, where AWS bills per cluster from the first one. AWS counters with a deeper discount ladder — Savings Plans and Spot — that IBM partially lacks.'
      },
      {
        question: 'Does IBM Cloud have spot or preemptible instances?',
        answer: 'No. IBM Cloud Virtual Servers offers on-demand, one-year and three-year reserved pricing, but no interruption-based tier. That removes a discount path AWS, Azure, Google Cloud, Oracle and Alibaba all offer for fault-tolerant work, so batch and rendering workloads that would normally ride spot capacity have no equivalent on IBM Cloud — a gap worth pricing explicitly before shortlisting it.'
      },
      {
        question: 'What does IBM Cloud do better than AWS?',
        answer: 'Two things stand out in this comparison. The first is hybrid parity: the same Red Hat OpenShift and Kubernetes tooling runs on-premises and in IBM Cloud data centres, which is a real operational saving when a platform team has to run both. The second is the free Kubernetes control plane on every tier — for a fleet of clusters that is a fixed monthly cost that simply does not exist.'
      },
      {
        question: 'Which should a regulated enterprise choose?',
        answer: 'Both are credible, and the deciding factor is usually the platform rather than the bill: IBM Cloud for organizations already running OpenShift or Db2 and needing the same stack on-premises, AWS for organizations that need the widest managed-service catalog, the deepest discount machinery, or a specific service IBM does not offer. The workload totals here are the starting point, not the verdict — governance, support and contract terms typically dominate the final number.'
      }
    ]
  },

  'digitalocean-vs-azure': {
    slug: 'digitalocean-vs-azure',
    slugTitle: 'DigitalOcean vs Azure',
    tabLabel: 'DigitalOcean vs Azure',
    headline: 'DigitalOcean vs Azure: Flat Developer Pricing Against Enterprise Economics (2026)',
    summary: 'DigitalOcean sells one flat rate per size with transfer bundled per Droplet; Azure sells a ladder of on-demand, reserved, spot and licence-ported prices inside the broadest enterprise ecosystem here. The gap between them is smallest for small, steady workloads and widest once Windows licensing, compliance, or catalog breadth enters the picture — so both are priced here on the same reference architecture.',
    metaDescription: 'DigitalOcean vs Azure pricing compared: Droplets vs Azure VMs, Spaces vs Blob Storage, DOKS vs AKS and egress, computed by one engine on one workload.',
    keywords: ['DigitalOcean vs Azure', 'Droplet vs Azure VM pricing', 'DOKS vs AKS cost', 'DigitalOcean vs Azure cloud cost', 'cloud cost comparison 2026'],
    providerA: CloudProvider.DIGITALOCEAN,
    providerB: CloudProvider.AZURE,
    editorialFeatures: [
      { feature: 'Commitment options', category: 'Compute', providerAVal: 'None — flat rates, no reserved layer', providerBVal: 'Reserved instances, savings plans and spot', winner: 'B' },
      { feature: 'Windows Server licensing', category: 'Licensing', providerAVal: 'Not sold on Droplets', providerBVal: 'Hourly Windows licence or Azure Hybrid Benefit for existing licences', winner: 'B' },
      { feature: 'Kubernetes control plane', category: 'Kubernetes', providerAVal: 'Free on every cluster', providerBVal: 'Free on the standard tier', winner: 'TIE' },
      { feature: 'Region and compliance footprint', category: 'Platform', providerAVal: 'A handful of developer-centric regions', providerBVal: 'Global footprint with compliance-scoped regions and certifications', winner: 'B' }
    ],
    faqs: [
      {
        question: 'Is DigitalOcean cheaper than Azure?',
        answer: 'For small and mid-size Linux workloads, generally yes — and the gap is widest at entry level, where the flat Droplet rate and bundled per-instance transfer both work in DigitalOcean\u2019s favour. The picture changes as soon as the workload needs something DigitalOcean does not sell: Windows Server licensing, managed SQL Server, a wide choice of specialized instance types, or compliance coverage in a specific jurisdiction. At that point the correct comparison is between Azure and the other hyperscalers, not against a developer cloud.'
      },
      {
        question: 'How do DOKS and AKS control-plane fees compare?',
        answer: 'Both are free for the configurations modelled here — DOKS control planes carry no charge on any cluster, and AKS is free on the standard tier. That removes the per-cluster management fee that EKS and GKE both charge from the first cluster, and it makes both platforms comparatively cheap to run as multiple small clusters rather than one large one.'
      },
      {
        question: 'What is the egress difference between DigitalOcean and Azure?',
        answer: 'DigitalOcean bundles a monthly transfer allowance with each Droplet, pooled at the account level, with a published overage rate beyond it. Azure meters internet egress from the first gigabyte and instead prices a CDN path as the mitigation. Which is cheaper depends entirely on volume and shape: bundled allowances reward a small number of larger instances, while metered egress punishes data-heavy workloads that cannot be fronted by a CDN.'
      },
      {
        question: 'When does Azure start to pay off over DigitalOcean?',
        answer: 'Three triggers, in practice: Windows or SQL Server workloads where Azure Hybrid Benefit or an hourly licence is required at all; enterprise requirements — compliance certifications, private networking, identity integration — that a developer cloud does not carry; and scale, where reserved and spot pricing on Azure starts to beat a flat rate that has no discount layer. If none of those apply, the flat rate is usually the better deal.'
      }
    ]
  },

  'digitalocean-vs-gcp': {
    slug: 'digitalocean-vs-gcp',
    slugTitle: 'DigitalOcean vs GCP',
    tabLabel: 'DigitalOcean vs GCP',
    headline: 'DigitalOcean vs Google Cloud: Small-Team Simplicity Against Automatic Discounts (2026)',
    summary: 'Google Cloud rewards steady utilisation automatically and sells custom machine shapes; DigitalOcean charges one flat rate and bundles transfer with each Droplet. Which one wins depends almost entirely on how predictable the workload is — so both are scored here on the same reference architecture rather than on rate cards.',
    metaDescription: 'DigitalOcean vs Google Cloud pricing compared: Droplets vs Compute Engine, Spaces vs Cloud Storage, DOKS vs GKE and egress, computed on one workload.',
    keywords: ['DigitalOcean vs GCP', 'Droplet vs Compute Engine pricing', 'DigitalOcean vs Google Cloud cost', 'DOKS vs GKE', 'cloud cost comparison 2026'],
    providerA: CloudProvider.DIGITALOCEAN,
    providerB: CloudProvider.GCP,
    editorialFeatures: [
      { feature: 'Automatic discounts', category: 'Compute', providerAVal: 'None — the flat rate is the rate', providerBVal: 'Sustained-use discounts applied without any commitment', winner: 'B' },
      { feature: 'Machine sizing', category: 'Compute', providerAVal: 'Fixed Droplet sizes', providerBVal: 'Custom vCPU and memory ratios', winner: 'B' },
      { feature: 'Bundled transfer', category: 'Networking', providerAVal: 'Transfer bundled per Droplet and pooled account-wide', providerBVal: 'Metered egress with CDN offload as the mitigation', winner: 'A' },
      { feature: 'Cost governance', category: 'Platform', providerAVal: 'Deliberately small catalog — few ways to overspend', providerBVal: 'Very large catalog that needs policy and budgets to stay controlled', winner: 'A' }
    ],
    faqs: [
      {
        question: 'Is DigitalOcean cheaper than Google Cloud?',
        answer: 'At entry level, usually — a flat Droplet rate with bundled transfer is hard to beat on small, steady workloads, and there is no minimum commitment to reach it. Google Cloud closes the gap as utilisation becomes steady, because sustained-use discounts apply automatically, and it can pass DigitalOcean on large workloads where custom machine shapes avoid paying for unused vCPU or memory. The workload totals above show which side of that crossover a specific architecture sits on.'
      },
      {
        question: 'How do DOKS and GKE compare on cost?',
        answer: 'Both give away a first control plane — DOKS on every cluster, GKE on a zonal cluster — so neither charges a management fee before there is any workload to run. Beyond the first cluster the models converge on billing per cluster, and the real cost driver becomes the worker nodes, which are ordinary compute on both platforms.'
      },
      {
        question: 'Which is better for a team without a cloud engineer?',
        answer: 'DigitalOcean, on operational grounds rather than price. A deliberately small catalog with flat pricing is far harder to overspend on accidentally, and there is no commitment layer or automatic-discount machinery to reason about. Google Cloud is the better choice when the team will actually use what it is paying for — managed Kubernetes at scale, the data stack, or custom machine sizing — because those are where the extra catalog earns its complexity.'
      },
      {
        question: 'How does egress differ between DigitalOcean and Google Cloud?',
        answer: 'DigitalOcean bundles transfer per Droplet and pools it account-wide, so a fleet of instances carries a meaningful free allowance and a published overage rate beyond it. Google Cloud meters internet egress from the first gigabyte, with a free tier on some internal paths and CDN offload as the standard mitigation. For content-heavy workloads, price the actual transfer volume — this is the line item most likely to decide the comparison.'
      }
    ]
  },

  'linode-vs-azure': {
    slug: 'linode-vs-azure',
    slugTitle: 'Linode vs Azure',
    tabLabel: 'Linode vs Azure',
    headline: 'Linode vs Azure: Bandwidth Economics Against Enterprise Reach (2026)',
    summary: 'Linode (Akamai) competes on bandwidth — transfer pooled across the account, with the lowest overage rate in this catalog — while Azure competes on reach, compliance and licence portability. For workloads that ship data outward the bandwidth term can settle the comparison on its own, which is why both are priced here on the same reference architecture.',
    metaDescription: 'Linode vs Azure pricing compared: Linode instances vs Azure VMs, Object Storage vs Blob, LKE vs AKS and pooled bandwidth, computed by one engine.',
    keywords: ['Linode vs Azure', 'Akamai Linode vs Azure pricing', 'LKE vs AKS cost', 'cloud bandwidth pricing comparison', 'cloud cost comparison 2026'],
    providerA: CloudProvider.LINODE,
    providerB: CloudProvider.AZURE,
    editorialFeatures: [
      { feature: 'Bandwidth model', category: 'Networking', providerAVal: 'Pooled account-wide allowance, lowest overage rate in the catalog', providerBVal: 'Metered egress from the first gigabyte, CDN offload as mitigation', winner: 'A' },
      { feature: 'Commitment discounts', category: 'Compute', providerAVal: 'None', providerBVal: 'Reserved instances, spot and Azure Hybrid Benefit', winner: 'B' },
      { feature: 'Managed database engines', category: 'Database', providerAVal: 'PostgreSQL and MySQL only', providerBVal: 'PostgreSQL, MySQL and SQL Server', winner: 'B' },
      { feature: 'Compliance portfolio', category: 'Compliance', providerAVal: 'Developer-cloud compliance posture', providerBVal: 'Broadest certification and region portfolio in this comparison', winner: 'B' }
    ],
    faqs: [
      {
        question: 'Is Linode cheaper than Azure?',
        answer: 'On compute, Linode generally prices below Azure, and the flat rate has no commitment requirement attached to it. The larger difference is bandwidth: Linode pools transfer across the whole account and publishes the lowest overage rate in this catalog, while Azure meters internet egress from the first gigabyte. On a compute-only workload the gap is modest; on a data-heavy one it can be the whole comparison.'
      },
      {
        question: 'Does Linode offer reserved or spot instances?',
        answer: 'Neither. Linode prices on-demand only — no reserved tier, no spot or preemptible market — so there is no commitment discount to weigh and no interruption-priced capacity to exploit. That keeps budgeting simple, but it means Linode cannot match the deep three-year pricing Azure, AWS and Alibaba all publish, which matters once a workload is large enough that commitment discounts would apply.'
      },
      {
        question: 'How do LKE and AKS control-plane fees compare?',
        answer: 'Both are free for a first cluster: Linode Kubernetes Engine never bills for the control plane, on any tier including high-availability clusters, and AKS is free on the standard tier. For a platform running several small clusters rather than one large one, that removes a fixed monthly cost that EKS and GKE both charge from the first cluster.'
      },
      {
        question: 'When should an EU team pick Azure over Linode?',
        answer: 'When the requirement is contractual rather than technical: EU data boundaries, specific certifications, private connectivity, or an existing Microsoft Enterprise Agreement. Linode — now part of Akamai — offers EU regions, but it is US-headquartered, so an EU data-residency analysis has to account for corporate control and legal process, not just where the servers sit. That distinction is covered in more detail in the EU residency guide.'
      }
    ]
  },

  'ovhcloud-vs-azure': {
    slug: 'ovhcloud-vs-azure',
    slugTitle: 'OVHcloud vs Azure',
    tabLabel: 'OVHcloud vs Azure',
    headline: 'OVHcloud vs Azure: EU Sovereignty Against Enterprise Integration (2026)',
    summary: 'OVHcloud is the only EU-headquartered provider in this catalog and the only one that includes unlimited outbound bandwidth as standard. Azure is the opposite proposition: US-headquartered, with EU regions, an EU data boundary, and the broadest enterprise stack here. This page prices both against one workload — and keeps the residency question separate from the cost one, because they have different answers.',
    metaDescription: 'OVHcloud vs Azure pricing compared: OVHcloud instances vs Azure VMs, object storage, Kubernetes and unlimited egress, plus the EU residency trade-offs.',
    keywords: ['OVHcloud vs Azure', 'EU cloud provider vs Azure', 'OVHcloud pricing comparison', 'GDPR cloud hosting cost', 'cloud cost comparison 2026'],
    providerA: CloudProvider.OVHCLOUD,
    providerB: CloudProvider.AZURE,
    editorialFeatures: [
      { feature: 'Corporate domicile', category: 'Compliance', providerAVal: 'EU-headquartered (France)', providerBVal: 'US-headquartered, with EU regions and an EU data boundary', winner: 'A' },
      { feature: 'Outbound bandwidth', category: 'Networking', providerAVal: 'Unlimited and free on every plan (fair use)', providerBVal: 'Metered from the first gigabyte', winner: 'A' },
      { feature: 'Managed service breadth', category: 'Platform', providerAVal: 'Narrower catalog and fewer managed engines', providerBVal: 'Very broad catalog including managed SQL Server', winner: 'B' },
      { feature: 'Currency of record', category: 'Billing', providerAVal: 'EUR list prices, shown here FX-converted at the ECB reference rate', providerBVal: 'USD list prices', winner: 'TIE' }
    ],
    faqs: [
      {
        question: 'Is OVHcloud cheaper than Azure?',
        answer: 'On compute it prices at the developer-cloud end of the catalog rather than the hyperscaler end, and on bandwidth the comparison stops being close: outbound transfer is unlimited and free on every OVHcloud Public Cloud plan, where Azure meters from the first gigabyte. Two caveats belong in the same sentence — OVHcloud publishes in EUR, and the figures here are converted at the ECB reference rate recorded at sync time, which is why this provider carries an FX-converted label rather than a plain live one.'
      },
      {
        question: 'Does an EU-headquartered provider settle GDPR compliance?',
        answer: 'It removes a class of question rather than answering all of them. Being EU-headquartered means corporate control, support access and legal process sit inside the EU, which is the part that a US provider\u2019s EU region does not change. It does not by itself determine whether your processing is lawful — contracts, sub-processors, data categories and your regulator all still matter. What it can do is make the analysis shorter. This is a pricing site, not legal advice; confirm the current position with the providers themselves.'
      },
      {
        question: 'What does Azure offer that OVHcloud does not?',
        answer: 'Breadth, and the enterprise machinery around it: managed SQL Server, a much larger catalog of specialized instance types, identity integration with Entra ID, the widest compliance certification portfolio in this comparison, and hybrid tooling for on-premises estates. If any of those are hard requirements, Azure is the answer regardless of the price delta — the honest comparison is then between Azure and the other hyperscalers.'
      },
      {
        question: 'Which is better for a data-heavy European workload?',
        answer: 'If the workload ships large volumes outward and does not depend on Microsoft-specific services, OVHcloud\u2019s unlimited egress plus EU domicile is a hard combination to beat, and it removes work as well as cost — there is no CDN offload to justify. If the workload depends on managed services OVHcloud does not offer, or on hyperscaler-grade compliance artifacts, the savings rarely justify rebuilding the stack.'
      }
    ]
  },

  'aws-vs-alibaba': {
    slug: 'aws-vs-alibaba',
    slugTitle: 'AWS vs Alibaba Cloud',
    tabLabel: 'AWS vs Alibaba',
    headline: 'AWS vs Alibaba Cloud: The West\u2019s Default Against Asia-Pacific Pricing (2026)',
    summary: 'AWS and Alibaba Cloud overlap on the core primitives and diverge nearly everywhere else. AWS brings the deepest catalog and the most flexible discount instruments in this comparison; Alibaba brings the steepest three-year reserved discounts and the strongest footprint across Asia-Pacific. Both are scored here against the same reference workload.',
    metaDescription: 'AWS vs Alibaba Cloud pricing compared: EC2 vs ECS, S3 vs OSS, EKS vs ACK and egress — including Alibaba\u2019s deeper reserved-instance discounts.',
    keywords: ['AWS vs Alibaba Cloud', 'ECS vs EC2 pricing', 'Alibaba Cloud vs AWS cost', 'Asia Pacific cloud pricing', 'cloud cost comparison 2026'],
    providerA: CloudProvider.AWS,
    providerB: CloudProvider.ALIBABA,
    editorialFeatures: [
      { feature: 'Commitment structure', category: 'Compute', providerAVal: 'Savings Plans flex across instance families, regions and services', providerBVal: 'Reserved instances tied to specific configurations', winner: 'A' },
      { feature: 'Regional strength', category: 'Platform', providerAVal: 'Broadest global footprint', providerBVal: 'Deepest Asia-Pacific coverage and network paths', winner: 'B' },
      { feature: 'Pricing provenance', category: 'Transparency', providerAVal: 'Object storage synced live from the published price list API', providerBVal: 'Reconciled benchmark — the pricing API requires signed requests', winner: 'A' },
      { feature: 'Managed SQL Server', category: 'Database', providerAVal: 'RDS for SQL Server', providerBVal: 'ApsaraDB RDS for SQL Server', winner: 'TIE' }
    ],
    faqs: [
      {
        question: 'Is Alibaba Cloud cheaper than AWS?',
        answer: 'At list prices it generally undercuts AWS, and on three-year commitments the gap widens further — Alibaba\u2019s reserved-instance discounts are the steepest in this catalog, up to roughly 60% off on-demand, though they are tied to specific configurations rather than the broader flexibility AWS Savings Plans allow. One honest caveat on the numbers here: Alibaba Cloud is the only provider in the catalog still priced from a reconciled benchmark rather than a live sync, because its pricing API requires signed requests. Check the freshness badge before treating a small gap as decisive.'
      },
      {
        question: 'When does Alibaba Cloud make sense for a non-Asian company?',
        answer: 'When the users are in Asia-Pacific. Latency and network paths to mainland China, Hong Kong, Singapore and Japan are the reason most western teams consider it at all, and no amount of global footprint on AWS substitutes for being physically close to the audience. It is also the only challenger in this catalog that sells managed SQL Server alongside PostgreSQL and MySQL, which occasionally matters for porting an existing estate without re-platforming.'
      },
      {
        question: 'How do the discount instruments compare?',
        answer: 'Differently in kind, not just in depth. AWS Savings Plans apply flexibly across instance families, regions and even services such as Fargate and Lambda, which makes them usable before your architecture has settled. Alibaba\u2019s reserved instances are configuration-specific but deeper — the trade is flexibility for rate. On volatile workloads AWS\u2019s flexibility usually wins; on a fixed, well-understood fleet the deeper commitment discount can be worth more.'
      },
      {
        question: 'What should be checked before migrating between them?',
        answer: 'Four things, in this order: which managed services the workload actually depends on, because catalog overlap is partial in both directions; data-residency and legal-process implications, which differ materially between the two jurisdictions; the network path to your users, which is usually the reason to move at all; and the commitment terms, since the deepest discounts on both sides require locking in capacity for years. The workload totals here tell you what the infrastructure costs — they do not tell you what the migration costs.'
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

// ---------------------------------------------------------------------------
// Pair coverage — which URL of the 45 pair pages is the indexable one.
// ---------------------------------------------------------------------------

/** Order-independent key for a provider pair, so `aws-vs-oracle` and `oracle-vs-aws` collide. */
function pairKey(a: CloudProvider, b: CloudProvider): string {
  return [PROVIDER_METAS[a].slug, PROVIDER_METAS[b].slug].sort().join('|');
}

/**
 * Curated pages that cover exactly one provider pair, keyed order-independently.
 * Topical (`…-egress`) and three-provider curated pages are absent by design:
 * they own their URL without claiming a pair's canonical slot.
 */
const CURATED_PAIR_SLUGS: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const page of Object.values(COMPARISON_PAGES)) {
    if (page.providerA && page.providerB) map.set(pairKey(page.providerA, page.providerB), page.slug);
  }
  return map;
})();

/**
 * The single indexable `/compare/:slug` for a provider pair: the curated page
 * when one exists (in whichever order it was authored — several are deliberately
 * reverse-ordered), otherwise the canonical forward slug.
 *
 * Every other ordering of the same pair is still prerendered, but `noindex` +
 * canonical to this URL — so a pair can never split its ranking across two
 * competing pages, and adding a curated page later silently promotes it.
 */
export function indexableSlugForPair(a: CloudProvider, b: CloudProvider): string {
  return CURATED_PAIR_SLUGS.get(pairKey(a, b)) ?? canonicalPairSlug(a, b);
}

/**
 * Internal-link targets for a comparison page: the curated pages featuring
 * either provider first (richest content), then the other pairs involving them
 * at their own indexable URLs. Never links back to the page it is rendered on.
 */
export function relatedComparisons(
  a: CloudProvider,
  b: CloudProvider,
  currentSlug: string,
  limit = 8
): { slug: string; label: string }[] {
  const out: { slug: string; label: string }[] = [];
  const seen = new Set<string>([currentSlug]);

  const push = (slug: string, label: string) => {
    if (seen.has(slug) || out.length >= limit) return;
    seen.add(slug);
    out.push({ slug, label });
  };

  for (const page of Object.values(COMPARISON_PAGES)) {
    if ([page.providerA, page.providerB].includes(a) || [page.providerA, page.providerB].includes(b)) {
      push(page.slug, page.tabLabel);
    }
  }

  for (const other of ALL_PROVIDERS) {
    if (other === a || other === b) continue;
    pushPair(other, a);
    pushPair(other, b);
  }

  function pushPair(x: CloudProvider, y: CloudProvider): void {
    const slug = indexableSlugForPair(x, y);
    const curated = COMPARISON_PAGES[slug];
    // Name the target the way the target itself is titled, not the way this
    // page happens to hold the provider order.
    const [first, second] =
      ALL_PROVIDERS.indexOf(x) <= ALL_PROVIDERS.indexOf(y) ? [x, y] : [y, x];
    push(slug, curated ? curated.tabLabel : `${PROVIDER_METAS[first].shortName} vs ${PROVIDER_METAS[second].shortName}`);
  }

  return out;
}

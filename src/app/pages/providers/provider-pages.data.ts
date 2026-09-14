import { ALL_PROVIDERS, CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { PROVIDER_CAPABILITIES } from '../../core/models/provider-capabilities.model';
import { DbEngine, StorageTier } from '../../core/models/pricing.model';
import { ServiceCategory, SERVICE_CATEGORY_METAS } from '../../core/models/service-category.enum';
import { ARCHITECTURE_BLUEPRINTS } from '../../core/models/blueprints.model';
import { CostCalculatorEngine } from '../../core/engine/cost-calculator.engine';
import { EFFECTIVE_CATALOGS } from '../../core/engine/catalog/pricing-catalog.resolver';
import { getProviderFreshness } from '../../core/engine/catalog/provider-verification';
import { rankProviders } from '../../core/seo/provider-rankings';
import { indexableSlugForPair } from '../programmatic/comparison-pages.data';

/**
 * Everything a `/providers/:slug` page needs.
 *
 * Only the qualitative framing is authored here (title, description, intro,
 * positioning FAQs). Every number — instance rates, storage tiers, database
 * prices, egress policy, control-plane fees, workload totals, rankings — is
 * derived from the same catalogs the estimator uses, so a price-sync can never
 * leave these pages quoting a stale rate.
 */

export interface ProviderPageCopy {
  /** Kept short: SeoService appends ' | CloudCostMatrix' (17 chars). */
  title: string;
  metaDescription: string;
  keywords: string[];
  /** Two or three sentences of framing, rendered under the H1. */
  intro: string;
  /** Positioning questions only — anything numeric is derived below so it cannot drift. */
  faqs: { question: string; answer: string }[];
}

export interface ProviderTableRow {
  label: string;
  value: string;
  note?: string;
}

export interface ProviderComputeRow {
  name: string;
  family: string;
  shape: string;
  onDemand: string;
  oneYear: string;
  threeYear: string;
  spot: string;
}

export interface ProviderWorkloadRow {
  name: string;
  description: string;
  monthly: string;
  annual: string;
  breakdown: ProviderTableRow[];
  unsupported: string;
}

export const PROVIDER_PAGE_SLUGS: string[] = ALL_PROVIDERS.map((p) => PROVIDER_METAS[p].slug);

export function providerFromSlug(slug: string): CloudProvider | null {
  const match = ALL_PROVIDERS.find((p) => PROVIDER_METAS[p].slug === slug.toLowerCase().trim());
  return match ?? null;
}

const PROVIDER_PAGE_COPY: Record<CloudProvider, ProviderPageCopy> = {
  [CloudProvider.AWS]: {
    title: 'AWS Pricing & Cost Calculator (2026)',
    metaDescription:
      'AWS list pricing for EC2, S3, RDS, EKS and internet egress — with computed totals for four reference workloads and a side-by-side against nine other clouds.',
    keywords: ['AWS pricing calculator', 'EC2 pricing', 'S3 pricing 2026', 'EKS cost', 'AWS cost estimator'],
    intro:
      'Amazon Web Services is the broadest catalog in this comparison and the most complex to price: instance families, Savings Plans, Spot markets, and separate object-storage request meters all land on the same bill. Everything below is computed from AWS published list rates by the same engine as the live estimator.',
    faqs: [
      {
        question: 'Is AWS expensive compared with other cloud providers?',
        answer:
          'AWS prices at the hyperscaler end of the catalog: for comparable general-purpose instances it sits alongside Microsoft Azure and Google Cloud, above the developer clouds and the challengers. What AWS sells on top of the raw rate is breadth — the widest instance and managed-service catalog in this comparison — plus the deepest discount machinery, so the on-demand rate is rarely the rate a committed customer actually pays.'
      },
      {
        question: 'What is the cheapest way to run a workload on AWS?',
        answer:
          'Three levers do most of the work. Move general-purpose workloads to Graviton arm64 instances, which offer up to 20% better price/performance than the equivalent x86 shapes. Cover steady-state capacity with Compute Savings Plans, which apply flexibly across EC2, Fargate, and Lambda rather than locking you to one instance family. And route outbound traffic through CloudFront, because AWS meters internet egress from the first gigabyte and a CDN in front of it is usually the largest single saving available.'
      },
      {
        question: 'Who is AWS the right choice for?',
        answer:
          'Teams that will genuinely consume the breadth: multiple managed database engines, specialized compute (GPU, inference, memory-optimized), a global region footprint, and enterprise support and compliance programs. If your workload is compute, object storage, one managed Postgres and a Kubernetes control plane, you are paying a premium for catalog you may not use — the comparison tables and workload totals below make that premium explicit.'
      }
    ]
  },
  [CloudProvider.AZURE]: {
    title: 'Azure Pricing & Cost Calculator (2026)',
    metaDescription:
      'Microsoft Azure list pricing for Virtual Machines, Blob Storage, Azure SQL, AKS and egress — computed workload totals plus a comparison against nine other clouds.',
    keywords: ['Azure pricing calculator', 'Azure VM pricing', 'Azure Blob Storage pricing', 'AKS cost', 'Azure cost estimator'],
    intro:
      'Microsoft Azure competes on enterprise fit more than on headline rate: the on-demand VM price is close to AWS and Google Cloud, but Azure Hybrid Benefit and free AKS cluster management change the arithmetic for teams with the right licenses. Every figure below is computed from Azure list rates by the same engine as the live estimator.',
    faqs: [
      {
        question: 'Is Azure cheaper than AWS or Google Cloud?',
        answer:
          'For plain on-demand Linux virtual machines the three hyperscalers are closely priced, and the reference workload totals below show the gap in dollars rather than in adjectives. Azure pulls ahead when you already own Windows Server or SQL Server licenses with Software Assurance — Azure Hybrid Benefit is worth up to 40% on those workloads — and when you count Kubernetes control planes, because free cluster management on the standard tier is a saving AWS and Google Cloud do not match on the first cluster.'
      },
      {
        question: 'What is the cheapest way to run a workload on Azure?',
        answer:
          'Apply Azure Hybrid Benefit first if your organization holds eligible Windows Server or SQL Server licenses — it is the largest and least disruptive saving available, and it applies to existing deployments. Then cover steady-state capacity with reserved VM instances, and keep clusters on the free standard tier unless you specifically need the uptime SLA. Route outbound traffic through Azure CDN or Front Door, since internet egress is metered from the first gigabyte.'
      },
      {
        question: 'Who is Azure the right choice for?',
        answer:
          'Organizations already standardized on Microsoft: Active Directory and Microsoft 365 estates, Windows Server and SQL Server workloads, and enterprises with Enterprise Agreements that carry Azure commitments. Azure is also the strongest fit in this comparison for hybrid estates that need consistent identity and policy across on-premises and cloud.'
      }
    ]
  },
  [CloudProvider.GCP]: {
    title: 'Google Cloud Pricing & Calculator (2026)',
    metaDescription:
      'Google Cloud list pricing for Compute Engine, Cloud Storage, Cloud SQL, GKE and egress — computed workload totals and a comparison against nine other clouds.',
    keywords: ['Google Cloud pricing', 'GCP pricing calculator', 'Compute Engine pricing', 'GKE cost', 'Cloud Storage pricing'],
    intro:
      'Google Cloud is the hyperscaler that discounts without asking: sustained use discounts apply automatically to always-on instances, and custom machine types mean you buy the vCPU and memory ratio your workload actually needs instead of the nearest predefined shape. Every figure below is computed from GCP list rates by the same engine as the live estimator.',
    faqs: [
      {
        question: 'Is Google Cloud cheaper than AWS?',
        answer:
          'For always-on, steady workloads it is usually the cheaper of the two hyperscalers, and the reason is structural rather than promotional: sustained use discounts apply automatically without any upfront commitment, so an idle-but-running fleet is not paying the full on-demand rate. Custom machine types widen that gap by removing the waste of predefined shapes. The reference workload totals below show what that difference is worth for a specific architecture.'
      },
      {
        question: 'What is the cheapest way to run a workload on GKE?',
        answer:
          'Keep the first cluster zonal — GKE waives the control-plane fee there, which makes it free in practice for small deployments. Use Spot node pools for stateless and fault-tolerant workloads, since GKE Spot VMs carry the deepest interruption discounts in this comparison. And size worker nodes with custom machine types rather than predefined shapes, so the cluster is not paying for vCPU or memory the scheduler never allocates.'
      },
      {
        question: 'Who is Google Cloud the right choice for?',
        answer:
          'Kubernetes-heavy teams first, because GKE is the most mature managed Kubernetes offering here and its free first zonal cluster makes small deployments cheap to run. Then data engineering, where BigQuery and the surrounding tooling are the differentiator, and teams that want automatic discounts without signing a commitment.'
      }
    ]
  },
  [CloudProvider.ORACLE]: {
    title: 'Oracle Cloud Pricing & Calculator (2026)',
    metaDescription:
      'Oracle Cloud Infrastructure list pricing for OCI Compute, Object Storage, databases and egress — including the standing 10 TB/month free transfer allowance.',
    keywords: ['Oracle Cloud pricing', 'OCI pricing calculator', 'Oracle free egress', 'OCI compute cost', 'Oracle Cloud cost estimator'],
    intro:
      'Oracle Cloud Infrastructure is the challenger that behaves like a hyperscaler on capability and like a developer cloud on price. The structural difference is egress: every tenancy ships a standing free monthly transfer allowance, which is the single largest lever in this comparison for content-heavy workloads. Every figure below is computed from OCI list rates by the same engine as the live estimator.',
    faqs: [
      {
        question: 'Is Oracle Cloud cheaper than AWS, Azure or Google Cloud?',
        answer:
          'On compute it is generally the cheapest of the four hyperscalers in this catalog, and Ampere arm64 shapes widen that lead on price/performance. On egress it is not close: Oracle includes a large free monthly transfer allowance on every tenancy where the others meter from the first gigabyte. The workload totals below let you see both effects on the same architecture rather than arguing from rate cards.'
      },
      {
        question: 'What is the cheapest way to run a workload on Oracle Cloud?',
        answer:
          'Size workloads to stay inside the free monthly egress allowance — for content delivery, APIs with large responses, and backup replication it is often the dominant line item, and it costs nothing to design around. On compute, prefer Ampere arm64 shapes where your software stack supports them, and remember that the Always Free tier is open-ended rather than a twelve-month trial. OKE Basic clusters never bill for the control plane.'
      },
      {
        question: 'Who is Oracle Cloud the right choice for?',
        answer:
          'Egress-heavy workloads first: media delivery, public APIs with large payloads, and anything that ships data out to customers. Second, teams that want hyperscaler-grade infrastructure without hyperscaler list prices, and organizations with existing Oracle database estates. It is the least widely adopted of the four hyperscalers here, so weigh ecosystem and hiring alongside the bill.'
      }
    ]
  },
  [CloudProvider.IBM]: {
    title: 'IBM Cloud Pricing & Calculator (2026)',
    metaDescription:
      'IBM Cloud list pricing for Virtual Servers, Object Storage, Kubernetes and egress — computed workload totals plus a comparison against nine other clouds.',
    keywords: ['IBM Cloud pricing', 'IBM Cloud Kubernetes pricing', 'IBM Cloud cost estimator', 'IBM Virtual Server pricing'],
    intro:
      'IBM Cloud sells hybrid-cloud integration rather than raw price: the same Red Hat OpenShift tooling runs on-premises and in IBM data centers, and the Kubernetes service never bills for the control plane on any tier. Every figure below is computed from IBM published rates by the same engine as the live estimator.',
    faqs: [
      {
        question: 'How does IBM Cloud pricing compare with the hyperscalers?',
        answer:
          'Compute rates land between the hyperscalers and the developer clouds, and the reference workload totals below show where that puts a specific architecture. IBM’s argument is rarely the lowest bill: it is that the managed Kubernetes service carries no control-plane fee at any tier — free even for multi-zone clusters — and that the hybrid tooling reduces the cost of running the same platform in two places.'
      },
      {
        question: 'What is the cheapest way to run a workload on IBM Cloud?',
        answer:
          'Run more than one cluster: with no control-plane fee on any tier, the per-cluster management cost that dominates small Kubernetes deployments elsewhere simply does not exist here. Consolidate load balancers per region rather than per service, since IBM prices each one individually with no bundled allowance. Note that there is no spot or preemptible tier, so interrupted batch work has no discount path.'
      },
      {
        question: 'Who is IBM Cloud the right choice for?',
        answer:
          'Regulated enterprises and hybrid estates: organizations that need the same Kubernetes and OpenShift platform across a private data center and a public cloud, with the compliance paperwork to match. Teams choosing purely on infrastructure price will usually find IBM Cloud in the middle of this comparison rather than at the front.'
      }
    ]
  },
  [CloudProvider.DIGITALOCEAN]: {
    title: 'DigitalOcean Pricing & Calculator (2026)',
    metaDescription:
      'DigitalOcean Droplet, Spaces, Managed Database and DOKS list pricing — flat rates with no commitment tiers, computed against nine other clouds.',
    keywords: ['DigitalOcean pricing', 'Droplet pricing', 'DigitalOcean Spaces cost', 'DOKS pricing', 'DigitalOcean cost calculator'],
    intro:
      'DigitalOcean prices the way it markets: one flat rate per size, no reserved-instance layer, no commitment mechanics, and bundled outbound transfer per Droplet. That makes the bill predictable and budgeting trivial — the trade is that there is no discount path for committing. Every figure below is computed from DigitalOcean published rates by the same engine as the live estimator.',
    faqs: [
      {
        question: 'Is DigitalOcean cheaper than AWS?',
        answer:
          'For small and mid-size workloads, usually yes — and the gap is widest at entry level, where hyperscaler pricing is least competitive. The comparison is not purely about the Droplet rate: bundled per-instance transfer keeps typical web workloads free of egress surprises, and free DOKS control planes remove a fixed monthly cost that AWS charges from the first cluster. The workload totals below show the difference on the same architecture.'
      },
      {
        question: 'What is the cheapest way to run a workload on DigitalOcean?',
        answer:
          'Consolidate rather than fragment: outbound transfer is pooled and bundled per Droplet, so fewer, larger instances raise the allowance you get for the same money. Keep Kubernetes on DOKS, where the control plane is free on every cluster and you pay only for worker Droplets. And accept that there is no reserved or spot tier — the flat rate is the rate, so savings come from sizing correctly rather than from committing.'
      },
      {
        question: 'Who is DigitalOcean the right choice for?',
        answer:
          'Startups, agencies, and product teams whose infrastructure is compute, object storage, a managed Postgres or MySQL, and a Kubernetes cluster — the everyday stack, at a predictable price. Its advantages shrink as workloads grow into specialized instance types, multiple database engines, or deep enterprise compliance requirements.'
      }
    ]
  },
  [CloudProvider.ALIBABA]: {
    title: 'Alibaba Cloud Pricing & Calculator (2026)',
    metaDescription:
      'Alibaba Cloud ECS, OSS and ApsaraDB pricing with the deepest reserved-instance discounts in this comparison — computed against nine other providers.',
    keywords: ['Alibaba Cloud pricing', 'Alibaba ECS pricing', 'Alibaba Cloud cost calculator', 'ApsaraDB pricing'],
    intro:
      'Alibaba Cloud is the Asia-Pacific challenger in this catalog, and the only challenger that sells managed SQL Server alongside PostgreSQL and MySQL. Its commitment discounts are the steepest here, which makes the on-demand rate a misleading summary of what a committed customer pays. Every figure below is computed by the same engine as the live estimator.',
    faqs: [
      {
        question: 'Is Alibaba Cloud cheaper than AWS?',
        answer:
          'At list prices it generally undercuts the hyperscalers, and its three-year reserved discounts are the deepest in this comparison — up to 60% off on-demand — which is where the real gap opens up. Treat the three-year figures with the usual care: they are a commitment, and the workload totals below are scored at on-demand rates unless you change the commitment in the live configurator.'
      },
      {
        question: 'What is the cheapest way to run a workload on Alibaba Cloud?',
        answer:
          'Commit if your capacity is stable: no other provider in this catalog discounts three-year terms as deeply. For fault-tolerant batch work, preemptible instances price as low as a fifth of on-demand. Keep Kubernetes on ACK Basic clusters, which carry no control-plane fee, and route outbound traffic through Alibaba Cloud CDN, since internet egress is metered.'
      },
      {
        question: 'Who is Alibaba Cloud the right choice for?',
        answer:
          'Teams serving users in Asia-Pacific, where its region footprint and network paths are the differentiator, and organizations that need managed SQL Server outside the three US hyperscalers. Two caveats are worth weighing honestly: the pricing in this catalog is a reconciled benchmark rather than a live sync — see the freshness note below — and its western-region service catalog is narrower than AWS, Azure, or Google Cloud.'
      }
    ]
  },
  [CloudProvider.LINODE]: {
    title: 'Linode Pricing & Cost Calculator (2026)',
    metaDescription:
      'Linode (Akamai) instance, Object Storage and Managed Database pricing — pooled bandwidth with the lowest overage rate in the catalog, computed against nine clouds.',
    keywords: ['Linode pricing', 'Akamai Linode cost calculator', 'Linode instance pricing', 'Linode Kubernetes pricing'],
    intro:
      'Linode, now part of Akamai, keeps pricing simple and bandwidth generous: transfer is pooled account-wide across every instance and the overage rate is the lowest in this comparison. Control planes are free on every Kubernetes tier, including production-grade HA clusters. Every figure below is computed from Linode published rates by the same engine as the live estimator.',
    faqs: [
      {
        question: 'Is Linode cheaper than DigitalOcean or Vultr?',
        answer:
          'The three developer clouds price within a few dollars of each other on comparable shapes, which is why this comparison is rarely decided on the instance rate. Linode’s edge is bandwidth economics: transfer pools across the whole account rather than per instance, and the overage rate beyond the allowance is the lowest in the catalog. Kubernetes is also free at every tier, including HA clusters where some providers charge a premium.'
      },
      {
        question: 'What is the cheapest way to run a workload on Linode?',
        answer:
          'Pool bandwidth deliberately — because the allowance is account-wide, consolidating instances raises the free transfer available to the whole estate, and overage beyond it is charged at the lowest rate in this comparison. Run Kubernetes on LKE, where the control plane is free even for high-availability clusters. There is no reserved or spot tier, so savings come from right-sizing rather than commitment.'
      },
      {
        question: 'Who is Linode the right choice for?',
        answer:
          'Teams that want developer-cloud simplicity with better bandwidth economics than the hyperscalers: media and file serving, APIs with heavy response payloads, and backup or replication traffic. It is now US-headquartered through Akamai, which matters if EU data residency is a requirement — the EU regions remain available, but corporate control is not European.'
      }
    ]
  },
  [CloudProvider.OVHCLOUD]: {
    title: 'OVHcloud Pricing & Calculator (2026)',
    metaDescription:
      'OVHcloud Public Cloud pricing with unlimited free egress on every plan — EU-sovereign infrastructure, EUR list rates converted to USD at the ECB reference rate.',
    keywords: ['OVHcloud pricing', 'OVHcloud Public Cloud cost', 'EU cloud provider pricing', 'unlimited bandwidth cloud hosting'],
    intro:
      'OVHcloud is the only EU-headquartered provider in this comparison, and the only one whose Public Cloud plans include unlimited outbound bandwidth as standard rather than as an add-on. Rates are published in EUR and converted to USD at the ECB reference rate recorded at sync time, which is why this provider is labelled FX-converted rather than plain live. Every figure below is computed by the same engine as the live estimator.',
    faqs: [
      {
        question: 'Is OVHcloud cheaper than the hyperscalers?',
        answer:
          'On compute it prices at the developer-cloud end rather than the hyperscaler end, and on egress the comparison stops being close: outbound bandwidth is unlimited and free on every Public Cloud plan, where AWS, Azure, and Google Cloud meter from the first gigabyte. For data-heavy workloads that single policy difference usually outweighs everything else on the bill — the workload totals below let you check that against your own architecture.'
      },
      {
        question: 'What is the cheapest way to run a workload on OVHcloud?',
        answer:
          'Stop optimizing egress: with unlimited free outbound transfer there is no CDN offload to justify and no transfer line item to design around, which removes work as well as cost. Then treat the compute choices conventionally — pick the shape that matches the workload, and note that OVHcloud sells no spot or preemptible tier, so interrupted batch work has no discount path here.'
      },
      {
        question: 'Who is OVHcloud the right choice for?',
        answer:
          'European organizations with data-residency or sovereignty requirements, since OVHcloud is EU-headquartered rather than a US provider with EU regions, and teams whose workload ships a lot of data outward. The honest caveats: list prices are EUR-denominated and FX-converted here, several managed services are not synced live, and the instance and service catalog is narrower than a hyperscaler’s.'
      }
    ]
  },
  [CloudProvider.VULTR]: {
    title: 'Vultr Pricing & Cost Calculator (2026)',
    metaDescription:
      'Vultr Cloud Compute, Object Storage and Managed Database pricing across 33 regions — flat hourly billing with free Kubernetes control planes, computed live.',
    keywords: ['Vultr pricing', 'Vultr cost calculator', 'Vultr Cloud Compute pricing', 'VKE pricing'],
    intro:
      'Vultr is the widest-footprint independent cloud in this catalog: 33 published regions, flat hourly billing with a monthly cap, and no long-term contracts to sign. Kubernetes control planes are free on every cluster. Every figure below is computed from Vultr published rates by the same engine as the live estimator.',
    faqs: [
      {
        question: 'Is Vultr cheaper than DigitalOcean and Linode?',
        answer:
          'The developer clouds cluster tightly on price, and the comparison is usually settled on region coverage and bandwidth allowances rather than on the instance rate. Vultr’s differentiator is reach: 33 regions, which is more than several hyperscalers offer, at flat hourly rates with a monthly cap so a full month billed hourly never costs more than the monthly price.'
      },
      {
        question: 'What is the cheapest way to run a workload on Vultr?',
        answer:
          'Match the plan family to the workload rather than defaulting to the largest general-purpose shape — High Frequency and High Performance plans price differently for the same vCPU count. Keep Kubernetes on VKE, where the control plane is free, and size instances so pooled monthly transfer allowances (which range from 0.5 TB to 15 TB by plan) cover the estate’s traffic. There is no reserved or spot tier, so there is no commitment discount to weigh.'
      },
      {
        question: 'Who is Vultr the right choice for?',
        answer:
          'Teams that need many regions at low cost — localized deployments, edge-adjacent workloads, test fleets across geographies — and anyone who wants hourly flexibility without contracts. Its managed-database and object-storage catalogs are narrower than a hyperscaler’s, and it is US-headquartered, which matters for EU residency decisions.'
      }
    ]
  }
};

/** Authored positioning copy for one provider. */
export function providerPageCopy(provider: CloudProvider): ProviderPageCopy {
  return PROVIDER_PAGE_COPY[provider];
}

/**
 * The H1 — deliberately richer than the title tag, where the length budget is
 * spent on the query ("AWS Pricing & Cost Calculator") rather than on the
 * branded service names, which belong in the heading a reader sees.
 */
export function providerHeadline(provider: CloudProvider): string {
  const meta = PROVIDER_METAS[provider];
  return `${meta.name} Pricing — ${meta.services.compute}, ${meta.services.objectStorage}, ${meta.services.managedDb} & Egress Costs (2026)`;
}

/** Authored positioning questions plus catalog-derived ones, so half the FAQ can never go stale. */
export function buildProviderFaqs(provider: CloudProvider): { question: string; answer: string }[] {
  return [...PROVIDER_PAGE_COPY[provider].faqs, ...derivedFaqs(provider)];
}

function derivedFaqs(provider: CloudProvider): { question: string; answer: string }[] {
  const meta = PROVIDER_METAS[provider];
  const name = meta.shortName;
  const cat = EFFECTIVE_CATALOGS[provider];
  const cap = PROVIDER_CAPABILITIES[provider];
  const spec = { vCpu: 4, ramGb: 16, os: 'LINUX' as const, count: 1, hoursPerMonth: 730, commitment: 'ON_DEMAND' as const };
  const instance = CostCalculatorEngine.calculateCompute(spec, provider);

  const egressPolicy = cat.networking.unlimitedEgress
    ? `Outbound internet transfer is unlimited and free on every ${name} plan (fair use), so there is no egress line item to manage.`
    : cat.networking.freeEgressGbPerMonth
      ? `The first ${cat.networking.freeEgressGbPerMonth.toLocaleString()} GB of outbound internet transfer each month is free; beyond that it is metered.`
      : `Internet egress is metered from the first gigabyte — there is no standing free transfer allowance.`;

  const k8s = cat.kubernetes.freeFirstCluster
    ? `The managed Kubernetes control plane is free on the first cluster.`
    : `The managed Kubernetes control plane bills $${(cat.kubernetes.managementHourlyFeePerCluster * 730).toFixed(0)}/month per cluster.`;

  const tiers = (Object.keys(cap.storageTiers) as StorageTier[]).filter((tier) => cap.storageTiers[tier]);
  const engines = (Object.keys(cap.dbEngines) as DbEngine[]).filter((engine) => cap.dbEngines[engine]);
  const engineNames = engines.map((e) => e.replace('_', ' ')).join(', ');

  return [
    {
      question: `What does the cheapest comparable instance cost on ${name}?`,
      answer: `For a 4 vCPU / 16 GB Linux instance at 730 hours a month on demand, the engine matches ${meta.services.compute} to ${instance.instanceTypeOrTier} at $${instance.monthlyCost.toFixed(2)}/month. Instance shapes differ between providers, so the matched shape matters as much as the price — the compute table below lists every published shape with its reserved and spot rates.`
    },
    {
      question: `How does ${name} charge for data transfer?`,
      answer: `${egressPolicy} Load balancers bill at $${(cat.networking.loadBalancerHourly * 730).toFixed(2)}/month and static IPv4 addresses at $${(cat.networking.staticIpHourly * 730).toFixed(2)}/month in this catalog, both metered hourly.`
    },
    {
      question: `What storage tiers and managed database engines does ${name} offer?`,
      answer: `Object storage is available in ${tiers.length} tier${tiers.length === 1 ? '' : 's'} (${tiers.map((t) => t.toLowerCase()).join(', ')}) — see the storage table for per-GB rates. Managed databases cover ${engineNames || 'no first-party relational engines'}${cap.notes.dbEngines?.SQL_SERVER && !cap.dbEngines.SQL_SERVER ? ' (SQL Server is not offered as a managed service)' : ''}. ${k8s}`
    }
  ];
}

const usd = (amount: number, digits = 2): string => `$${amount.toFixed(digits)}`;

/** Instance catalog, priced at 730 hours and every commitment the provider sells. */
export function buildComputeRows(provider: CloudProvider): ProviderComputeRow[] {
  const cat = EFFECTIVE_CATALOGS[provider];
  const cap = PROVIDER_CAPABILITIES[provider];
  return cat.compute.map((shape) => {
    const monthly = (hourly: number | undefined): string =>
      hourly == null ? '—' : `${usd(hourly * 730)}/mo`;
    return {
      name: shape.name,
      family: shape.family,
      shape: `${shape.vCpu} vCPU / ${shape.ramGb} GB`,
      onDemand: monthly(shape.hourlyOnDemandLinux),
      oneYear: cap.commitments['1_YEAR_RESERVED'] ? monthly(shape.hourly1YrReservedLinux) : 'Not offered',
      threeYear: cap.commitments['3_YEAR_RESERVED'] ? monthly(shape.hourly3YrReservedLinux) : 'Not offered',
      spot: cap.commitments.SPOT ? monthly(shape.hourlySpotLinux) : 'Not offered'
    };
  });
}

/** Every storage tier, with capability-gated tiers shown as such rather than silently dropped. */
export function buildStorageRows(provider: CloudProvider): ProviderTableRow[] {
  const cat = EFFECTIVE_CATALOGS[provider];
  const cap = PROVIDER_CAPABILITIES[provider];
  return (Object.keys(cat.storage) as StorageTier[]).map((tier) => {
    const benchmark = cat.storage[tier];
    const offered = cap.storageTiers[tier];
    const minimum = benchmark.minimumMonthlyFee ? ` · ${usd(benchmark.minimumMonthlyFee)}/mo minimum` : '';
    return {
      label: TIER_LABELS[tier],
      value: offered ? `${usd(benchmark.costPerGbMonth, 4)}/GB-mo` : 'Not offered',
      note: offered
        ? `${usd(1000 * benchmark.costPerGbMonth)} per TB-month · ${usd(benchmark.costPer10kReads, 4)}/10k reads · ${usd(benchmark.costPer10kWrites, 4)}/10k writes${minimum}`
        : (cap.notes.storageTiers?.[tier] ?? 'This tier is not sold by this provider.')
    };
  });
}

/** Managed database catalog. Storage and HA multiplier are per provider, not per engine. */
export function buildDatabaseRows(provider: CloudProvider): ProviderTableRow[] {
  const cat = EFFECTIVE_CATALOGS[provider];
  const cap = PROVIDER_CAPABILITIES[provider];
  const engine = (offered: boolean, hourly: number | undefined): string =>
    offered ? (hourly == null ? '—' : `${usd(hourly * 730)}/mo`) : 'Not offered';

  return cat.database.map((db) => {
    const engines = [
      `PostgreSQL ${engine(cap.dbEngines.POSTGRES, db.hourlyPostgres)}`,
      `MySQL ${engine(cap.dbEngines.MYSQL, db.hourlyMySql)}`,
      `SQL Server ${engine(cap.dbEngines.SQL_SERVER, db.hourlySqlServer)}`
    ].join(' · ');
    return {
      label: `${db.name} (${db.vCpu} vCPU / ${db.ramGb} GB)`,
      value: engines,
      note: `Storage ${usd(db.storagePerGbMonth, 4)}/GB-mo · multi-AZ multiplies the instance rate by ${db.multiAzMultiplier}×`
    };
  });
}

/** Networking rates and the provider's own egress policy wording. */
export function buildNetworkingRows(provider: CloudProvider): ProviderTableRow[] {
  const net = EFFECTIVE_CATALOGS[provider].networking;
  const rows: ProviderTableRow[] = [
    {
      label: 'Internet egress',
      value: net.unlimitedEgress ? 'Unlimited (fair use, free)' : `${usd(net.first10TbPerGb, 4)}/GB (first 10 TB)`,
      note: net.unlimitedEgress
        ? 'No metered transfer on any plan.'
        : `Then ${usd(net.next40TbPerGb, 4)}/GB up to 40 TB. ${net.freeEgressGbPerMonth ? `First ${net.freeEgressGbPerMonth.toLocaleString()} GB each month free.` : 'No standing free allowance.'}`
    },
    { label: 'Load balancer', value: `${usd(net.loadBalancerHourly * 730)}/mo` },
    { label: 'Static IPv4 address', value: `${usd(net.staticIpHourly * 730)}/mo` }
  ];
  if (net.bundledEgressGbPerInstance) {
    rows.push({
      label: 'Bundled transfer per instance',
      value: `${net.bundledEgressGbPerInstance.toLocaleString()} GB/mo`,
      note: net.overageEgressPerGb != null ? `${usd(net.overageEgressPerGb, 4)}/GB beyond the pooled allowance.` : undefined
    });
  }
  if (net.egressPolicyNote) {
    rows.push({ label: 'Egress policy detail', value: net.egressPolicyNote });
  }
  return rows;
}

/** Kubernetes control-plane pricing for the first cluster. */
export function buildKubernetesRows(provider: CloudProvider): ProviderTableRow[] {
  const k8s = EFFECTIVE_CATALOGS[provider].kubernetes;
  const monthly = k8s.managementHourlyFeePerCluster * 730;
  return [
    {
      label: 'Control plane (first cluster)',
      value: k8s.freeFirstCluster ? 'Free' : `${usd(monthly)}/mo`,
      note: k8s.freeFirstCluster
        ? `Billed at ${usd(k8s.managementHourlyFeePerCluster, 3)}/hr; the first cluster is waived.`
        : `${usd(k8s.managementHourlyFeePerCluster, 3)}/hr per cluster, charged from the first cluster.`
    }
  ];
}

/** The four blueprints priced for this provider alone — the "what does it cost me" table. */
export function buildWorkloadRows(provider: CloudProvider): ProviderWorkloadRow[] {
  return ARCHITECTURE_BLUEPRINTS.map((blueprint) => {
    const matrix = CostCalculatorEngine.calculateFullMatrix({
      ...blueprint.config,
      selectedProviders: [provider]
    });
    const total = matrix.providers[provider];
    const breakdown = (Object.keys(total.categoryBreakdown) as ServiceCategory[])
      .filter((category) => (blueprint.config.activeCategories[category] ?? true) && total.categoryBreakdown[category] > 0)
      .map((category) => ({
        label: SERVICE_CATEGORY_METAS[category].name,
        value: `${usd(total.categoryBreakdown[category])}/mo`
      }));

    return {
      name: blueprint.name,
      description: blueprint.tagline,
      monthly: `${usd(total.monthlyTotal)}/mo`,
      annual: `${usd(total.annualTotal)}/yr`,
      breakdown,
      unsupported: total.unsupportedCategories
        .map((category) => SERVICE_CATEGORY_METAS[category].name)
        .join(', ')
    };
  });
}

/** Where this provider lands on the two ranked metrics the guides use. */
export function buildRankNotes(provider: CloudProvider): string[] {
  const entry = rankProviders('entryCompute').find((r) => r.provider === provider);
  const egress = rankProviders('egress').find((r) => r.provider === provider);
  const notes: string[] = [];
  if (entry) notes.push(`Entry-level compute: #${entry.rank} of ${ALL_PROVIDERS.length} (${entry.display})`);
  if (egress) notes.push(`Egress at 20 TB/month: #${egress.rank} of ${ALL_PROVIDERS.length} (${egress.display})`);
  return notes;
}

/** Every provider this one can be compared against, each at its own indexable URL. */
export function providerComparisonLinks(provider: CloudProvider): { slug: string; label: string }[] {
  return ALL_PROVIDERS.filter((other) => other !== provider).map((other) => {
    const slug = indexableSlugForPair(provider, other);
    return {
      slug,
      label: `${PROVIDER_METAS[provider].shortName} vs ${PROVIDER_METAS[other].shortName}`
    };
  });
}

export function providerFreshness(provider: CloudProvider) {
  return getProviderFreshness(provider);
}

const TIER_LABELS: Record<StorageTier, string> = {
  HOT: 'Hot / standard',
  COOL: 'Cool / infrequent',
  COLD: 'Cold',
  ARCHIVE: 'Archive'
};

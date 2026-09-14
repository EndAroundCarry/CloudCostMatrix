import { CloudProvider } from '../../core/models/cloud-provider.enum';
import { RankingMetricId } from '../../core/seo/provider-rankings';

/** A hand-authored, non-derivable fact about one provider — rendered verbatim. */
export interface GuideProviderNote {
  provider: CloudProvider;
  /** Short label for the row, e.g. "EU-domiciled" or "US-headquartered". */
  label: string;
  note: string;
}

export interface GuidePageData {
  slug: string;
  slugTitle: string;
  /** Short label for the guide tab strip. */
  tabLabel: string;
  headline: string;
  summary: string;
  metaDescription: string;
  keywords: string[];
  /** Which live-computed ranking table this guide is built around. */
  metric: RankingMetricId;
  /** Hand-written qualitative rows that genuinely aren't derivable from the catalogs. */
  providerNotes?: GuideProviderNote[];
  providerNotesCaption?: string;
  /** Honest limitations of the guide, rendered as a list. */
  caveats: string[];
  faqs: { question: string; answer: string }[];
  /** Curated /compare slugs worth linking from this guide. */
  relatedSlugs: string[];
}

export const GUIDE_PAGES: Record<string, GuidePageData> = {
  'cheapest-cloud-egress-pricing': {
    slug: 'cheapest-cloud-egress-pricing',
    slugTitle: 'Cheapest Cloud Egress Pricing',
    tabLabel: 'Cheapest Egress',
    headline: 'Which Cloud Provider Is Cheapest for Egress? All 10 Ranked (2026)',
    summary:
      'Outbound data transfer is the cloud bill line item that scales with success rather than with headcount — and it is the one most comparisons leave out, because it does not fit neatly into a per-instance price table. This guide ranks all ten providers in the catalog by what the same outbound workload actually costs, using the live pricing engine rather than a hand-copied rate sheet.',
    metaDescription:
      'Cloud egress pricing ranked across 10 providers — OVHcloud unlimited, Oracle 10 TB free, AWS and Azure metered. See the monthly cost for a 20 TB workload.',
    keywords: [
      'cheapest cloud egress pricing',
      'cloud data transfer cost comparison',
      'free egress cloud provider',
      'unlimited bandwidth cloud hosting',
      'AWS egress vs Oracle free tier',
      'cloud bandwidth pricing 2026'
    ],
    metric: 'egress',
    caveats: [
      'Egress here means outbound internet transfer. Inter-region, inter-AZ, and CDN-origin traffic are priced differently by most providers and are not all modelled by the engine.',
      'Two providers in the catalog have no USD list pricing (see the methodology page). Both are ranked, but their egress figures are benchmark estimates rather than live-synced rates.',
      '"Unlimited" bandwidth is a fair-use policy on every provider that offers it, not an unlimited contractual entitlement — read the provider\'s own acceptable-use terms before designing around it.'
    ],
    faqs: [
      {
        question: 'Which cloud provider has the cheapest egress?',
        answer:
          'Right now the ranking above is led by the providers that either do not meter outbound transfer at all or give away a large monthly allowance before charging — OVHcloud\'s fair-use unlimited bandwidth and Oracle Cloud\'s standing free monthly egress allowance are the two structural outliers. Every other provider in the catalog bills from the first gigabyte. The table above is computed live from the current catalogs, so re-check it rather than trusting a number quoted in a blog post, including this one.'
      },
      {
        question: 'Why does egress pricing matter more than it looks like it should?',
        answer:
          'Because it is the only major infrastructure cost that scales with how much your product is used rather than with how much of it you run. Compute and storage costs are roughly proportional to the fleet you choose and stay flat month to month; a successful feature, a viral piece of content, or a large customer exporting their data can multiply outbound transfer overnight. Teams that model only instances and storage routinely discover their egress line item outgrew their compute bill.'
      },
      {
        question: 'Should I choose a provider purely on egress price?',
        answer:
          'Usually not on its own — but it should be an explicit input rather than a rounding error. The decision only tips on egress when outbound volume is a large share of the workload: media and file delivery, APIs with heavy response payloads, backup and disaster-recovery replication, and anything doing bulk data export for customers. For a workload with modest network traffic, the compute and managed-database lines will dominate and an unlimited-egress provider will not save you much. Use the live calculator with your own transfer volume to see where your crossover sits.'
      },
      {
        question: 'Do free egress tiers have gotchas?',
        answer:
          'Yes, and they are worth reading carefully. Allowances are typically per-month and do not roll over, they may exclude certain traffic classes, and "free" is normally bounded by a fair-use clause that a provider can act on if your traffic pattern looks abusive. Some providers also bundle an allowance per instance rather than per account, which means it grows as you add instances — a materially different shape than a fixed account-wide allowance, and one the engine models explicitly.'
      }
    ],
    relatedSlugs: ['oracle-vs-aws-egress', 'ovhcloud-vs-aws-egress']
  },

  'cheapest-cloud-provider-for-startups': {
    slug: 'cheapest-cloud-provider-for-startups',
    slugTitle: 'Cheapest Cloud Provider for Startups',
    tabLabel: 'Cheapest for Startups',
    headline: 'The Cheapest Cloud Provider for a Startup Workload: 10 Providers Ranked (2026)',
    summary:
      'A pre-seed team does not need a hyperscaler\'s catalog — it needs the smallest bill that will not become a migration project in eighteen months. This guide ranks all ten providers on the cost of an entry-level Linux instance, then lays out the non-price factors that actually decide the answer: egress shape, managed-database availability, Kubernetes control-plane fees, and how much of the catalog you will realistically outgrow.',
    metaDescription:
      'Cloud pricing for startups across 10 providers: cheapest entry-level Linux instances, plus the egress, database and Kubernetes fees that decide the real bill.',
    keywords: [
      'cheapest cloud provider for startups',
      'cloud hosting for startups comparison',
      'cheap VPS for early stage',
      'startup cloud costs 2026',
      'developer cloud vs hyperscaler pricing',
      'small instance pricing comparison'
    ],
    metric: 'entryCompute',
    providerNotesCaption:
      'Facts that are not derivable from published price lists, but that decide whether the cheap option is still cheap once you grow into it.',
    providerNotes: [
      {
        provider: CloudProvider.OVHCLOUD,
        label: 'Unlimited egress',
        note: 'Fair-use unlimited outbound bandwidth on every plan — the egress line item never becomes a budgeting variable as traffic grows.'
      },
      {
        provider: CloudProvider.ORACLE,
        label: 'Standing free tier',
        note: 'A permanent always-free allowance in compute, storage, and database, plus a large free monthly egress allowance — unusual in being open-ended rather than 12-month.'
      },
      {
        provider: CloudProvider.DIGITALOCEAN,
        label: 'Flat-rate simplicity',
        note: 'One published rate per size with no reserved layer, plus bundled per-instance transfer. Predictable to budget, but no discount path for committing.'
      },
      {
        provider: CloudProvider.LINODE,
        label: 'Pooled bandwidth',
        note: 'Transfer is pooled account-wide across every instance, with a published overage rate that is among the lowest in this comparison.'
      },
      {
        provider: CloudProvider.AWS,
        label: 'Commitment discounts',
        note: 'The deepest discount path in the catalog, but it is gated behind multi-year commitments and a substantially more complex pricing model.'
      },
      {
        provider: CloudProvider.AZURE,
        label: 'Existing Microsoft licences',
        note: 'Azure Hybrid Benefit can materially reduce cost for teams that already own Windows Server or SQL Server licences with Software Assurance.'
      },
      {
        provider: CloudProvider.GCP,
        label: 'Automatic discounts',
        note: 'Sustained-use discounts apply without any upfront commitment, and custom machine shapes avoid paying for unused vCPU or RAM.'
      },
      {
        provider: CloudProvider.IBM,
        label: 'Managed Kubernetes',
        note: 'No control-plane fee on any cluster tier, which matters once a startup runs more than one cluster.'
      },
      {
        provider: CloudProvider.ALIBABA,
        label: 'Aggressive commitments',
        note: 'The steepest reserved-instance discounts in the catalog, alongside full managed SQL Server support — though the ecosystem skews Asia-Pacific.'
      }
    ],
    caveats: [
      'The ranking measures infrastructure cost only. It says nothing about free startup-credit programmes, which routinely exceed a year of early-stage infra spend and can dominate this entire calculation — ask every provider you shortlist.',
      'Egress allowances are frequently bundled per instance rather than per account. Adding instances can therefore make cheap compute cheaper to run at volume, in a way a single-instance comparison does not show.',
      'Benchmark-estimated providers in the catalog (see the methodology page) are ranked alongside live-synced ones. Check the freshness badge before treating a gap of a few dollars as decisive.'
    ],
    faqs: [
      {
        question: 'What is the cheapest cloud for a startup?',
        answer:
          'At entry-level instance sizes the developer clouds and challengers generally lead, and the two hardware-defined hyperscalers sit at the other end — that is the ranking above, computed live from published list prices. The more useful question is which of those cheap options you will not have to leave in eighteen months, which depends far more on your egress shape, whether you need a managed database for your engine, and whether you want a managed Kubernetes control plane than on a few dollars of monthly compute.'
      },
      {
        question: 'Are startup cloud credits worth more than a cheap list price?',
        answer:
          'Frequently yes, by a wide margin. Most providers run credit programmes that can cover a year or more of early infrastructure spend, and on a pre-seed budget that dwarfs the difference between the cheapest and third-cheapest option in the table above. The caveat is that credits expire and renew at commercial rates — so treat them as runway, not as a pricing decision, and check what your bill looks like the month after they run out.'
      },
      {
        question: 'Should a startup use a hyperscaler or a developer cloud?',
        answer:
          'It depends on which parts of the catalog you will actually consume. A team whose needs are compute, object storage, a managed Postgres, and a Kubernetes control plane is paying a substantial premium on a hyperscaler for catalog breadth it does not use. A team that will need managed SQL Server, a specific compliance accreditation, or a service only one provider offers has a real reason to pay it. The honest test is to list the managed services you expect to need in the next two years and check which providers actually offer them — the pricing comparison only matters among the providers that pass that filter.'
      },
      {
        question: 'How much does Kubernetes control-plane pricing affect a startup bill?',
        answer:
          'More than most teams expect in the early stages, because it is a flat per-cluster fee that arrives before you have any meaningful workload. Several providers in this comparison charge nothing for the control plane on the first or all clusters; one of the largest charges a per-cluster hourly fee from the very first cluster. If you run more than one cluster — for staging and production, say — that difference is a fixed monthly cost that scales with the number of clusters rather than with usage.'
      }
    ],
    relatedSlugs: ['digitalocean-vs-aws', 'linode-vs-aws', 'ovhcloud-vs-digitalocean']
  },

  'eu-cloud-providers-gdpr-data-residency': {
    slug: 'eu-cloud-providers-gdpr-data-residency',
    slugTitle: 'EU Cloud Providers & GDPR Data Residency',
    tabLabel: 'EU Cloud & GDPR',
    headline: 'EU Cloud Providers and GDPR Data Residency: A Practical Comparison (2026)',
    summary:
      'Having an EU region and being an EU provider are different things, and for many organisations that distinction — not price — is the deciding factor. This guide lays out which providers in the catalog are EU-headquartered versus US-headquartered with EU regions, then ranks the same providers on entry-level compute cost so the compliance shortlist can be priced without switching tools.',
    metaDescription:
      'EU cloud providers compared: which of 10 providers are EU-domiciled vs US-headquartered with EU regions, plus a live cost ranking for GDPR-conscious workloads.',
    keywords: [
      'EU cloud providers',
      'GDPR data residency cloud',
      'EU-sovereign cloud hosting',
      'cloud data residency comparison 2026',
      'European cloud provider pricing',
      'data sovereignty cloud hosting'
    ],
    metric: 'entryCompute',
    providerNotesCaption:
      'Where each provider is headquartered and where it runs EU regions. This is a summary for shortlisting, not legal advice — confirm the current position with the provider directly.',
    providerNotes: [
      {
        provider: CloudProvider.OVHCLOUD,
        label: 'EU-headquartered',
        note: 'French-headquartered and EU-domiciled, with EU regions as the default footprint. The only provider in this catalog whose centre of gravity is the EU rather than the US.'
      },
      {
        provider: CloudProvider.AWS,
        label: 'US-headquartered, EU regions',
        note: 'Multiple EU regions (for example Ireland and Frankfurt). EU-region data remains subject to US-headquartered corporate control and to US legal process.'
      },
      {
        provider: CloudProvider.AZURE,
        label: 'US-headquartered, EU regions',
        note: 'Multiple EU regions and a dedicated EU data-boundary offering for customers who need data to stay within the EU. Headquartered in the US.'
      },
      {
        provider: CloudProvider.GCP,
        label: 'US-headquartered, EU regions',
        note: 'Multiple EU regions, with sovereign controls available on some products. Headquartered in the US.'
      },
      {
        provider: CloudProvider.ORACLE,
        label: 'US-headquartered, EU regions',
        note: 'EU regions including Frankfurt and Amsterdam, plus an EU sovereign cloud offering. Headquartered in the US.'
      },
      {
        provider: CloudProvider.IBM,
        label: 'US-headquartered, EU regions',
        note: 'EU regions with a long enterprise-compliance track record. Headquartered in the US.'
      },
      {
        provider: CloudProvider.DIGITALOCEAN,
        label: 'US-headquartered, EU regions',
        note: 'EU regions such as Amsterdam, Frankfurt, and London. Headquartered in the US.'
      },
      {
        provider: CloudProvider.LINODE,
        label: 'US-headquartered, EU regions',
        note: 'Multiple EU regions, now under Akamai (US-headquartered) following its 2022 acquisition. EU data centres predate the acquisition and remain available.'
      },
      {
        provider: CloudProvider.ALIBABA,
        label: 'China-headquartered, EU regions',
        note: 'EU regions available (for example Frankfurt and London). Headquartered in China, which raises a different set of jurisdictional questions again.'
      }
    ],
    caveats: [
      'This page is infrastructure research, not legal advice. Data-residency and transfer questions turn on your contracts, your data categories, and your regulator — not on a provider\'s marketing page.',
      'A provider operating EU regions does not by itself settle a GDPR analysis. Corporate control, support access paths, sub-processors, and the terms you actually sign all bear on the outcome.',
      'Costs shown are infrastructure list prices only. Compliance, support, and contractual arrangements are separate line items and are not modelled here.'
    ],
    faqs: [
      {
        question: 'Does an EU region make a cloud provider GDPR-compliant?',
        answer:
          'No. Choosing an EU region addresses where data is stored and processed, which is one part of the analysis. A provider headquartered outside the EU remains subject to its home jurisdiction, including legal orders that can compel disclosure, and the transfer mechanics and sub-processors named in your contract matter as much as the region you select. Many providers offer additional contractual and technical controls — EU data boundaries, sovereign offerings, customer-managed keys — that address exactly this gap. Which of those you need is a question for your legal team, not for a pricing site.'
      },
      {
        question: 'What does EU-sovereign cloud hosting actually mean?',
        answer:
          'In practice it usually means a combination of EU incorporation or an EU-domiciled legal entity, EU-based operations and support, and contractual guarantees against non-EU government access — rather than simply a data centre located in Europe. It is worth reading exactly how any given provider defines sovereignty, because the term is used loosely and the operational differences behind it are significant. A provider that is EU-headquartered starts from a different position than one that has added a sovereign product line to a US-headquartered business.'
      },
      {
        question: 'How much more expensive is an EU-sovereign cloud?',
        answer:
          'On entry-level infrastructure the answer is often "not much, and sometimes nothing" — as the ranking above shows, an EU-headquartered provider sits alongside the other developer clouds on list price rather than at a premium to them. Where cost can diverge is in breadth: an EU-sovereign provider may not offer every managed service you would find on a hyperscaler, and the cost of filling that gap yourself is real, even when it does not appear on a price list. Price the specific services you need before assuming sovereignty carries a large infrastructure premium.'
      },
      {
        question: 'Should a US-headquartered provider be ruled out entirely?',
        answer:
          'Not automatically — plenty of EU organisations run regulated workloads on EU regions of US hyperscalers and have the contractual paperwork to support it. What matters is that the decision is made deliberately, with the transfer mechanism and sub-processor chain understood, rather than by default because that is where the team already has an account. If your data categories or regulator make the analysis uncomfortable, an EU-headquartered provider removes a class of question at the outset — which is often worth more than a marginal difference in list price.'
      }
    ],
    relatedSlugs: ['ovhcloud-vs-digitalocean', 'ovhcloud-vs-aws-egress']
  },

  'cheapest-cloud-object-storage': {
    slug: 'cheapest-cloud-object-storage',
    slugTitle: 'Cheapest Cloud Object Storage',
    tabLabel: 'Cheapest Object Storage',
    headline: 'Which Cloud Has the Cheapest Object Storage? 10 Providers Ranked (2026)',
    summary:
      'Object storage pricing looks like one number per gigabyte and almost never is. Tiers, request and retrieval charges, monthly minimums, and per-provider storage classes all change the answer once an actual access pattern is applied. This guide ranks all ten providers on the same 10 TB hot-tier workload, computed by the live engine rather than copied from a rate sheet — then explains where that ranking breaks down.',
    metaDescription:
      'Cloud object storage ranked across 10 providers — S3, Blob, Cloud Storage, Spaces, OSS and more — for a 10 TB hot-tier workload, computed live.',
    keywords: [
      'cheapest cloud object storage',
      'S3 vs Blob vs GCS pricing',
      'object storage cost comparison',
      'cloud storage pricing 2026',
      'cheapest cloud storage per GB',
      'object storage tier comparison'
    ],
    metric: 'objectStorage',
    providerNotesCaption:
      'Structural differences between the ten catalogs. None of these are visible in a per-GB headline rate, and each one changes what you actually pay once an access pattern is applied.',
    providerNotes: [
      {
        provider: CloudProvider.DIGITALOCEAN,
        label: 'Single storage class',
        note: 'Spaces offers one class with no cool, cold or archive tiering, so there is no cheaper tier to move cold data into — the hot rate is the rate.'
      },
      {
        provider: CloudProvider.LINODE,
        label: 'Single storage class',
        note: 'Linode Object Storage likewise publishes one class. Attractive at the capacity end, but there is no lifecycle policy that can move data out of it.'
      },
      {
        provider: CloudProvider.OVHCLOUD,
        label: 'Standard and Archive only',
        note: 'Two classes rather than four — no separate cool or cold rung between standard and archive, which simplifies lifecycle rules and removes a tier to get wrong.'
      },
      {
        provider: CloudProvider.ORACLE,
        label: 'No distinct Cold tier',
        note: 'Infrequent Access and Archive cover that range instead, so a lifecycle policy that expects a four-rung ladder has to be written for a three-rung one.'
      },
      {
        provider: CloudProvider.AWS,
        label: 'Operation charges are the variable',
        note: 'S3 capacity is fetched live, but request and retrieval rates are carried from the reconciled benchmark — and for small-object workloads those operations, not capacity, are usually the larger line item.'
      },
      {
        provider: CloudProvider.VULTR,
        label: 'Monthly minimum applies',
        note: 'Vultr prices object storage at a per-TB rate with a monthly minimum, so the engine charges the minimum on small buckets — a shape that makes it cheap at volume and less so for a few hundred gigabytes.'
      }
    ],
    caveats: [
      'Request, operation and retrieval charges are excluded from this ranking. They depend on object size and access frequency rather than on the rate card, and for small-object or frequently-read workloads they can outgrow the capacity line entirely — model them in the live calculator with your own operation counts.',
      'Retrieval fees from archive-class tiers are not modelled. Archive storage is cheap to hold and expensive to read, and the break-even point depends entirely on how often you expect to restore from it.',
      'Two providers in the catalog carry benchmark storage figures rather than live-synced rates (see the methodology page). They are ranked alongside the rest, but a gap of a few percent between them is not meaningful.'
    ],
    faqs: [
      {
        question: 'Which cloud provider has the cheapest object storage?',
        answer: 'For hot-tier capacity at ten terabytes, the ranking above is computed live and the leaders are the providers whose per-GB rate is lowest without a monthly minimum distorting small volumes. That ordering is capacity-only: add request charges, move part of the dataset to a colder tier, or read heavily from archive and the ranking can change entirely. The useful exercise is not finding the globally cheapest rate but finding which provider is cheapest for your access pattern — which is what the calculator models and a rate table cannot.'
      },
      {
        question: 'Why do per-gigabyte storage prices mislead?',
        answer: 'Because capacity is only one of three charges and the least variable of them. Object storage bills capacity per GB-month, requests per thousand operations, and retrieval per GB moved out of colder tiers. A workload storing 50 TB of small, frequently-read objects can pay more in operations than in capacity, while a backup workload storing the same volume in archive pays almost nothing for either — same provider, same rate card, different answers. Any comparison that quotes one tier and one number is describing a workload it has not disclosed.'
      },
      {
        question: 'Do storage-class tiers actually save money?',
        answer: 'They do for data with a genuinely cold lifecycle, and they cost money when data is moved before it is ready. Tiering works on the assumption that you will not read the data often enough for the retrieval charge to exceed the capacity saving, and every provider charges retrieval from archive — some with a minimum retention period before deletion is allowed. Move data down a tier only when you can describe, honestly, how often you expect to need it back.'
      },
      {
        question: 'Does the provider choice matter more than the tier choice?',
        answer: 'Usually the tier and access pattern matter more, and the provider matters most at the extremes. If your dataset is small, every provider in this comparison is affordable and the per-GB difference is noise against compute and database costs. If you are storing hundreds of terabytes of cold data, the per-GB rate is the entire bill and the provider ranking above becomes decisive. The awkward middle is where a request-heavy workload on a cheap-capacity provider quietly becomes expensive.'
      }
    ],
    relatedSlugs: ['s3-vs-azure-blob-vs-google-cloud-storage', 'digitalocean-vs-linode', 'ovhcloud-vs-aws-egress']
  },

  'cheapest-managed-postgresql': {
    slug: 'cheapest-managed-postgresql',
    slugTitle: 'Cheapest Managed PostgreSQL',
    tabLabel: 'Cheapest Managed Postgres',
    headline: 'Cheapest Managed PostgreSQL: 10 Cloud Providers Ranked (2026)',
    summary:
      'A managed Postgres bill is three numbers stacked: the instance rate, the storage rate, and the multiplier for a standby. Providers disagree about all three, so the same 2 vCPU / 8 GB database can land at very different monthly totals. This guide ranks all ten providers on one small production shape using the same engine as the calculator, then explains where the ranking stops being the answer.',
    metaDescription:
      'Managed PostgreSQL pricing ranked across 10 cloud providers — RDS, Azure Database, Cloud SQL, OCI, IBM Cloud Databases, DigitalOcean and more — 2 vCPU, 8 GB, 100 GB.',
    keywords: [
      'cheapest managed postgresql',
      'managed postgres pricing comparison',
      'RDS vs Azure Database vs Cloud SQL pricing',
      'cloud database cost comparison 2026',
      'managed database pricing',
      'postgres hosting cost'
    ],
    metric: 'managedPostgres',
    providerNotesCaption:
      'What each provider does differently around the same PostgreSQL instance — the differences that survive the pricing table.',
    providerNotes: [
      {
        provider: CloudProvider.AWS,
        label: 'Two products, one label',
        note: 'RDS and Aurora are different services with different pricing models; this comparison prices RDS-style instance shapes, which is the like-for-like option against the other providers.'
      },
      {
        provider: CloudProvider.AZURE,
        label: 'Storage and IOPS priced separately',
        note: 'Azure Database separates instance, storage, and provisioned IOPS, so a database with a heavy write pattern can cost materially more than the shape alone suggests.'
      },
      {
        provider: CloudProvider.DIGITALOCEAN,
        label: 'Bundle-first pricing',
        note: 'Managed Databases bundle a vCPU/RAM/disk shape into one flat rate, which is easy to budget and leaves nothing to tune — you move to the next size up instead of sizing components separately.'
      },
      {
        provider: CloudProvider.LINODE,
        label: 'Storage bundled into the instance',
        note: 'Disk is not billed as a separate line, which makes Linode look cheaper than a per-GB comparison would suggest at small sizes — the trade is that the storage rate is not independently visible.'
      },
      {
        provider: CloudProvider.IBM,
        label: 'No SQL Server, wider engine list',
        note: 'IBM Cloud Databases covers PostgreSQL, MySQL and Db2. If you are standardising on Postgres this is irrelevant; if you are porting a mixed estate, it changes what can stay managed.'
      },
      {
        provider: CloudProvider.ALIBABA,
        label: 'Benchmark-priced',
        note: 'ApsaraDB RDS figures in this catalog are a reconciled benchmark rather than a live sync, because the provider\u2019s pricing API requires signed requests. Treat the position as directional.'
      }
    ],
    caveats: [
      'Multi-AZ standby pricing is not applied to this ranking. Every provider charges a multiplier for a synchronous standby — the multiplier differs, and it can move the ranking more than the base rate does. Price it in the calculator once you know whether you need the failover.',
      'Backup retention, point-in-time recovery windows, and I/O charges beyond the provisioned capacity are not modelled here. They are real line items on a production database and they differ between providers.',
      'Instance shapes are matched to the nearest published size rather than interpolated, so a provider with a 2 vCPU / 8 GB shape and one with a 2 vCPU / 7.5 GB shape are both compared at their own nearest fit.'
    ],
    faqs: [
      {
        question: 'Which cloud provider has the cheapest managed PostgreSQL?',
        answer: 'For a small single-AZ instance, the developer clouds generally lead and the hyperscalers sit at the top of the table — the ranking above is computed live from published list prices, so check it rather than trusting a figure quoted anywhere, including here. The more decision-relevant question is which of those providers you can still use once the database grows: engine versions, extensions, read replicas, and failover behaviour vary more between providers than the price does.'
      },
      {
        question: 'How much does a multi-AZ standby add?',
        answer: 'It is a multiplier on the instance rate rather than a fixed surcharge, and the multiplier differs by provider — which is exactly why this guide excludes it: applying one provider\u2019s multiplier across the table would misrepresent every other row. If you need automatic failover, price the same shape with multi-AZ enabled in the calculator; the ordering can change, and for high-availability workloads it usually does.'
      },
      {
        question: 'Why is managed PostgreSQL cheaper on developer clouds?',
        answer: 'Mostly because the product is narrower. A developer cloud managed database is typically one engine version, a bundled shape, and a simple HA story; hyperscaler offerings carry more configuration surface — provisioned IOPS, performance insights, cross-region replicas, compliance certifications — and you pay for that surface whether or not you configure it. The trade-off appears later: when the workload needs a specific extension, a particular failover topology, or an accreditation the smaller provider does not hold, migration is the cost.'
      },
      {
        question: 'Should the cheapest database decide where an application runs?',
        answer: 'Rarely on its own. Compute, egress, and object storage are usually larger line items, and moving an application to chase a cheaper database means paying for a second platform. The database rate is most decisive when the dataset is small but the instance must be always-on, since that is a fixed cost that does not scale down with traffic — which is precisely the workload the ranking above measures.'
      }
    ],
    relatedSlugs: ['aws-vs-azure', 'linode-vs-aws', 'digitalocean-vs-aws']
  },

  'cheapest-managed-kubernetes': {
    slug: 'cheapest-managed-kubernetes',
    slugTitle: 'Cheapest Managed Kubernetes',
    tabLabel: 'Cheapest Managed Kubernetes',
    headline: 'Cheapest Managed Kubernetes: EKS vs AKS vs GKE and 7 More, Ranked (2026)',
    summary:
      'A Kubernetes control-plane fee is a flat monthly cost that arrives before there is any workload to run, and the providers in this catalog treat it three different ways: billed per cluster from the first one, waived on a first or basic tier, or never charged at all. This guide ranks all ten on a single cluster with three modest worker nodes — the shape a small team actually runs — and shows how much of the total is the control plane versus the workers.',
    metaDescription:
      'Managed Kubernetes pricing ranked: EKS vs AKS vs GKE vs DOKS, LKE, OKE, ACK, IKS, OVHcloud and Vultr — one cluster, three worker nodes, control-plane fees included.',
    keywords: [
      'cheapest managed kubernetes',
      'EKS vs AKS vs GKE pricing',
      'kubernetes control plane cost',
      'managed kubernetes pricing comparison 2026',
      'DOKS vs LKE vs OKE cost',
      'kubernetes cluster cost calculator'
    ],
    metric: 'kubernetes',
    providerNotesCaption:
      'How each provider prices cluster management, and what that means for a team running more than one cluster.',
    providerNotes: [
      {
        provider: CloudProvider.AWS,
        label: 'Charged from the first cluster',
        note: 'EKS bills a per-cluster hourly management fee with no free first cluster, which makes it the only provider in this comparison whose control plane is a standing monthly cost on a single small cluster.'
      },
      {
        provider: CloudProvider.AZURE,
        label: 'Free on the standard tier',
        note: 'AKS cluster management carries no charge on the standard tier, so the platform cost of running several small clusters is close to zero beyond the nodes themselves.'
      },
      {
        provider: CloudProvider.GCP,
        label: 'First zonal cluster waived',
        note: 'GKE waives the management fee for a first zonal cluster; regional clusters and additional clusters are billed, so the free tier is a starting point rather than a permanent policy.'
      },
      {
        provider: CloudProvider.ORACLE,
        label: 'Free on Basic clusters',
        note: 'OKE Basic clusters do not bill for the control plane. Upgrading to a supported-SLA tier changes that, so check which tier the workload requires before treating it as free.'
      },
      {
        provider: CloudProvider.IBM,
        label: 'Never charged, any tier',
        note: 'IBM Cloud Kubernetes Service does not bill for the control plane on any tier, including multi-zone clusters — the clearest structural saving in this catalog for multi-cluster estates.'
      },
      {
        provider: CloudProvider.ALIBABA,
        label: 'Free on ACK Basic',
        note: 'ACK Basic clusters carry no control-plane fee; the Pro tier is where the SLA and advanced features are, and where the charge begins.'
      },
      {
        provider: CloudProvider.DIGITALOCEAN,
        label: 'Free on every cluster',
        note: 'DOKS includes the control plane on every cluster, so running separate staging and production clusters costs nothing beyond the worker Droplets.'
      },
      {
        provider: CloudProvider.LINODE,
        label: 'Free, including HA',
        note: 'LKE does not charge for the control plane even on high-availability clusters, which is unusual — most providers make the HA tier the paid one.'
      },
      {
        provider: CloudProvider.OVHCLOUD,
        label: 'Free on every plan',
        note: 'OVHcloud Managed Kubernetes includes the control plane at no extra charge, and its unlimited free egress removes the data-transfer line that clusters serving traffic otherwise accumulate.'
      },
      {
        provider: CloudProvider.VULTR,
        label: 'Free on VKE',
        note: 'Vultr Kubernetes Engine ships the control plane free — you pay for worker nodes and any attached load balancer or storage.'
      }
    ],
    caveats: [
      'Worker nodes dominate the bill at scale. At one cluster with three nodes the control-plane difference is a meaningful share of the total; at ten clusters with fifty nodes it is a rounding error. Use the ranking above for the small-cluster case and the calculator for anything larger.',
      'Control-plane policies carry conditions. Several providers make the free tier a specific cluster type — zonal, basic, or standard — and charge on the tiers above it. Check which tier your reliability requirements actually demand.',
      'Spot and preemptible worker pools are a bigger lever than control-plane fees for fault-tolerant workloads, and they are not available everywhere: five providers in this catalog sell no interruption-priced instance type at all.'
    ],
    faqs: [
      {
        question: 'Which cloud provider has the cheapest managed Kubernetes?',
        answer: 'For a single small cluster, the deciding factor is usually the control-plane policy rather than the node rate — nine of the ten providers in this catalog waive or never charge for a first cluster, and one bills it from the first cluster onward. That makes the ranking above mostly a story about worker-node pricing once the control plane is free, except on the one platform charging for it. The live table is recomputed from current catalogs, so it will tell you which side of the spread your own cluster size lands on.'
      },
      {
        question: 'Do control-plane fees matter at scale?',
        answer: 'They matter most when the cluster is small, which is the opposite of how teams usually think about them. A per-cluster management fee is a fixed cost: at one cluster with three nodes it can be a large share of the bill, and by the time you are running dozens of nodes it is nearly invisible. Where it stays material regardless of node count is multi-cluster estates — staging plus production plus a per-region split multiplies the fee, which is why providers that never charge for the control plane are disproportionately attractive to platform teams.'
      },
      {
        question: 'Are the free control-plane tiers good enough for production?',
        answer: 'Sometimes, and the answer depends on what the free tier excludes. Several providers make the free option a zonal or basic cluster without an uptime SLA; production workloads with real availability requirements often need the paid tier, which changes the arithmetic. The right question is not whether the control plane is free but whether the free tier meets the SLA you have promised — read that before optimising the line item.'
      },
      {
        question: 'How much can spot node pools save compared to choosing a cheaper provider?',
        answer: 'Usually more, when the workload tolerates interruption. Spot and preemptible discounts reach 60-90% off on-demand across the providers that offer them, which dwarfs the difference between two providers\u2019 on-demand node rates. The catch is availability: several providers in this catalog sell no interruption-priced capacity at all, so a fault-tolerant batch workload has a real discount to gain by picking a platform that does — and the same workload on a platform without spot is paying list price for capacity it could be renting cheaply.'
      }
    ],
    relatedSlugs: ['ec2-vs-azure-vm-vs-compute-engine', 'gcp-vs-oracle', 'digitalocean-vs-linode']
  }
};

/** Every guide slug, derived — single source of truth for tabs, sitemap, and prerender params. */
export const GUIDE_SLUGS: string[] = Object.keys(GUIDE_PAGES);

export const GUIDE_TABS: { slug: string; label: string }[] = GUIDE_SLUGS.map((slug) => ({
  slug,
  label: GUIDE_PAGES[slug].tabLabel
}));

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
    headline: 'Which Cloud Provider Is Cheapest for Egress? All 9 Ranked (2026)',
    summary:
      'Outbound data transfer is the cloud bill line item that scales with success rather than with headcount — and it is the one most comparisons leave out, because it does not fit neatly into a per-instance price table. This guide ranks all nine providers in the catalog by what the same outbound workload actually costs, using the live pricing engine rather than a hand-copied rate sheet.',
    metaDescription:
      'Cloud egress pricing ranked across 9 providers — OVHcloud unlimited bandwidth, Oracle 10 TB free, AWS and Azure metered transfer. See the real monthly cost for a 20 TB workload.',
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
    headline: 'The Cheapest Cloud Provider for a Startup Workload: 9 Providers Ranked (2026)',
    summary:
      'A pre-seed team does not need a hyperscaler\'s catalog — it needs the smallest bill that will not become a migration project in eighteen months. This guide ranks all nine providers on the cost of an entry-level Linux instance, then lays out the non-price factors that actually decide the answer: egress shape, managed-database availability, Kubernetes control-plane fees, and how much of the catalog you will realistically outgrow.',
    metaDescription:
      'Cloud pricing for startups compared across 9 providers. Cheapest entry-level Linux instances plus egress, managed database, and Kubernetes fees that decide the real bill.',
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
      'EU cloud providers compared: which of 9 providers are EU-domiciled vs US-headquartered with EU regions, plus a live cost ranking for GDPR-conscious workloads.',
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
  }
};

/** Every guide slug, derived — single source of truth for tabs, sitemap, and prerender params. */
export const GUIDE_SLUGS: string[] = Object.keys(GUIDE_PAGES);

export const GUIDE_TABS: { slug: string; label: string }[] = GUIDE_SLUGS.map((slug) => ({
  slug,
  label: GUIDE_PAGES[slug].tabLabel
}));

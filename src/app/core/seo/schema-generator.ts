export class SchemaGenerator {

  /**
   * WebApplication schema — more specific than SoftwareApplication for web tools.
   * Targets Google Knowledge Panel and "Software" rich results.
   */
  public static generateWebApplicationSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': 'CloudCostMatrix',
      'url': 'https://cloudcostmatrix.com',
      'applicationCategory': 'BusinessApplication',
      'operatingSystem': 'All',
      'browserRequirements': 'Requires JavaScript',
      'description': 'Free, real-time multi-cloud infrastructure cost estimator comparing 9 providers — AWS, Microsoft Azure, Google Cloud, Oracle Cloud, IBM Cloud, DigitalOcean, Alibaba Cloud, Linode, and OVHcloud — side-by-side for Compute, Storage, Database, Kubernetes, and Egress. Save unlimited architectures, diff migration scenarios, and export team-ready reports.',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD',
        'availability': 'https://schema.org/InStock'
      },
      'featureList': [
        'Side-by-side AWS vs Azure vs GCP compute, storage, database, and egress pricing',
        'On-demand, 1-year reserved, 3-year reserved, and Spot instance pricing models',
        'Managed Kubernetes (EKS vs AKS vs GKE) cluster cost comparison',
        'Preconfigured architecture blueprints for SaaS, E-Commerce, Kubernetes, and AI workloads',
        'Guest-first saved architecture library with rename, duplicate & branch — no signup required',
        'Architecture A vs B scenario diffing with monthly / 3-year TCO deltas and migration ROI',
        'Visual cost topology heatmap that highlights budget hotspots in real time',
        'Automated live price sync from official AWS, Azure, Oracle Cloud, and Linode pricing APIs, with a per-provider Live/Verified/Estimate freshness badge for all 9 providers',
        'Instant zero-database URL sharing with LZ-String compression',
        'Team exports: Slack/Teams summary, Markdown RFC table, and executive PDF print brief',
        'Exportable CSV and printable PDF comparison reports'
      ],
      'screenshot': 'https://cloudcostmatrix.com/og-preview.png'
      // Deliberately no `aggregateRating` — the app has no review system, and a
      // fabricated one is a Google structured-data policy violation (manual
      // action risk). Only add this back if/when real user ratings exist.
    };
  }

  /**
   * Organization schema — establishes brand identity in Knowledge Graph.
   */
  public static generateOrganizationSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'CloudCostMatrix',
      'url': 'https://cloudcostmatrix.com',
      'logo': 'https://cloudcostmatrix.com/og-preview.png',
      'description': 'Independent multi-cloud infrastructure cost comparison and TCO estimation platform.',
      'sameAs': []
    };
  }

  /**
   * FAQPage schema — drives "People Also Ask" placements in Google SERP.
   */
  public static generateFaqSchema(faqs: { question: string; answer: string }[]) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    };
  }

  /**
   * BreadcrumbList schema — renders hierarchical breadcrumbs in SERP.
   */
  public static generateBreadcrumbSchema(crumbs: { name: string; url: string }[]) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': crumbs.map((crumb, idx) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'name': crumb.name,
        'item': crumb.url
      }))
    };
  }

  /**
   * WebPage schema — per-page metadata for individual comparison/landing pages.
   */
  public static generateWebPageSchema(config: {
    name: string;
    description: string;
    url: string;
    dateModified?: string;
  }) {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': config.name,
      'description': config.description,
      'url': config.url,
      'isPartOf': {
        '@type': 'WebSite',
        'name': 'CloudCostMatrix',
        'url': 'https://cloudcostmatrix.com'
      },
      // Prerendering freezes new Date() to the build machine's clock forever —
      // pass an explicit dateModified (e.g. PRICING_LAST_SYNCED_AT) wherever
      // one is meaningful. This bare fallback only fires for callers that
      // genuinely have no better date, and still reflects build time rather
      // than a stale hardcoded string.
      'dateModified': config.dateModified || new Date().toISOString().split('T')[0],
      'inLanguage': 'en'
    };
  }

  /**
   * HowTo schema — for the estimator tool usage flow, targets "How to" rich results.
   */
  public static generateHowToSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      'name': 'How to Compare AWS, Azure, and GCP Cloud Infrastructure Costs',
      'description': 'Use CloudCostMatrix to estimate and compare multi-cloud infrastructure pricing in 3 simple steps.',
      'step': [
        {
          '@type': 'HowToStep',
          'position': 1,
          'name': 'Select a Workload Blueprint',
          'text': 'Choose a preconfigured architecture blueprint like SaaS Starter MVP, High-Traffic E-Commerce, Enterprise Kubernetes, or AI/ML Inference to instantly populate realistic workload specifications.'
        },
        {
          '@type': 'HowToStep',
          'position': 2,
          'name': 'Customize Your Infrastructure Specs',
          'text': 'Use the interactive configurator to adjust vCPU, RAM, instance count, storage capacity, database engine, egress bandwidth, and commitment type (On-Demand, 1-Year, 3-Year Reserved, or Spot).'
        },
        {
          '@type': 'HowToStep',
          'position': 3,
          'name': 'Compare and Share Results',
          'text': 'View the side-by-side cost matrix showing monthly and annual TCO across AWS, Azure, and GCP. Save architectures to your library, run an A vs B migration diff, export as CSV, copy a Slack or Markdown summary, print an executive PDF, or share via instant compressed URL link — no sign-up required.'
        }
      ],
      'totalTime': 'PT2M'
    };
  }
}

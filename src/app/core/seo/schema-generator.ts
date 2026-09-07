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
      'description': 'Free, real-time multi-cloud infrastructure cost estimator comparing AWS, Microsoft Azure, and Google Cloud Platform pricing side-by-side for Compute, Storage, Database, Kubernetes, and Egress.',
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
        'Instant zero-database URL sharing with LZ-String compression',
        'Exportable CSV and printable PDF comparison reports'
      ],
      'screenshot': 'https://cloudcostmatrix.com/og-preview.png',
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': '4.8',
        'ratingCount': '127',
        'bestRating': '5',
        'worstRating': '1'
      }
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
      'logo': 'https://cloudcostmatrix.com/favicon.ico',
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
          'text': 'View the side-by-side cost matrix showing monthly and annual TCO across AWS, Azure, and GCP. Export as CSV, print as PDF, or share via instant compressed URL link — no sign-up required.'
        }
      ],
      'totalTime': 'PT2M'
    };
  }
}

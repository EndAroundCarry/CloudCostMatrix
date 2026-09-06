export class SchemaGenerator {
  public static generateSoftwareAppSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'CloudCostMatrix',
      'operatingSystem': 'All',
      'applicationCategory': 'BusinessApplication',
      'description': 'Real-time multi-cloud infrastructure cost estimator and TCO comparison matrix for AWS, Azure, and Google Cloud Platform.',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      },
      'featureList': [
        'Side-by-side AWS vs Azure vs GCP compute comparison',
        'Real-time commitment discount calculations (On-demand, 1-yr, 3-yr, Spot)',
        'Managed database, object storage, and egress TCO calculator',
        'Preconfigured architecture blueprints (SaaS, E-Commerce, Kubernetes, AI)',
        'Zero-database instant URL sharing and export'
      ]
    };
  }

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
}

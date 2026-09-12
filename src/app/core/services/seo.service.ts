import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

/**
 * Directive applied when a page doesn't specify its own. Prerendered HTML and
 * `src/index.html` both ship this value, so the client-side renderer must agree
 * with them — otherwise an SPA navigation would quietly diverge from the crawl.
 */
const DEFAULT_ROBOTS_META =
  'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

export interface SeoTagsConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  robotsMeta?: string;
  structuredDataJson?: object | object[];
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  public updateTags(config: SeoTagsConfig): void {
    // Title — avoid double branding if title already contains CloudCostMatrix
    const fullTitle = config.title.includes('CloudCostMatrix')
      ? config.title
      : `${config.title} | CloudCostMatrix`;
    this.titleService.setTitle(fullTitle);

    // Core Meta
    this.metaService.updateTag({ name: 'description', content: config.description });
    if (config.keywords?.length) {
      this.metaService.updateTag({ name: 'keywords', content: config.keywords.join(', ') });
    }

    // Robots directive — ALWAYS set, never left stale. This runs on every route,
    // so a page that omits robotsMeta must actively restore the index directive.
    // Otherwise a client-side navigation away from a `noindex` page (a derived
    // /compare/... pair or the 404) would leave that noindex behind on a page we
    // want indexed, and Google would drop it.
    this.metaService.updateTag({
      name: 'robots',
      content: config.robotsMeta ?? DEFAULT_ROBOTS_META
    });

    // Canonical URL — critical for preventing duplicate content from ?c= share URLs
    if (config.canonicalUrl) {
      this.setCanonicalUrl(config.canonicalUrl);
      this.setHreflang(config.canonicalUrl);
    }

    // OpenGraph
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: config.description });
    this.metaService.updateTag({ property: 'og:type', content: config.ogType || 'website' });
    this.metaService.updateTag({ property: 'og:site_name', content: 'CloudCostMatrix' });
    const ogImage = config.ogImage || 'https://cloudcostmatrix.com/og-preview.png';
    this.metaService.updateTag({ property: 'og:image', content: ogImage });
    this.metaService.updateTag({ property: 'og:image:width', content: '1200' });
    this.metaService.updateTag({ property: 'og:image:height', content: '630' });
    this.metaService.updateTag({ property: 'og:image:alt', content: fullTitle });
    if (config.canonicalUrl) {
      this.metaService.updateTag({ property: 'og:url', content: config.canonicalUrl });
    }

    // Twitter Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: fullTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: config.description });
    this.metaService.updateTag({ name: 'twitter:image', content: ogImage });
    this.metaService.updateTag({ name: 'twitter:image:alt', content: fullTitle });

    // Structured Data (JSON-LD) — supports single object or array (renders @graph)
    if (config.structuredDataJson) {
      this.injectSchema(config.structuredDataJson);
    }
  }

  /**
   * Dynamically set <link rel="canonical"> in <head>
   */
  private setCanonicalUrl(url: string): void {
    if (typeof this.doc === 'undefined') return;

    let link: HTMLLinkElement | null = this.doc.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Set hreflang alternate link
   */
  private setHreflang(url: string): void {
    if (typeof this.doc === 'undefined') return;

    let link: HTMLLinkElement | null = this.doc.querySelector('link[rel="alternate"][hreflang="en"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', 'en');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Injects JSON-LD structured data. Supports single schema or array → @graph.
   */
  private injectSchema(schemaInput: object | object[]): void {
    if (typeof this.doc === 'undefined') return;

    const id = 'ccm-json-ld';
    let script = this.doc.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = this.doc.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.doc.head.appendChild(script);
    }

    // Combine multiple schemas into a single @graph for richer rich results.
    // .textContent rather than .text — both work in a real browser, but
    // .textContent is the portable spelling across Angular's server-side DOM
    // implementation used during prerendering.
    if (Array.isArray(schemaInput)) {
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': schemaInput.map(s => {
          const copy = { ...s } as Record<string, unknown>;
          delete copy['@context'];
          return copy;
        })
      });
    } else {
      script.textContent = JSON.stringify(schemaInput);
    }
  }
}

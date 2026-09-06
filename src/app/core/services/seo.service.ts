import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

export interface SeoTagsConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  structuredDataJson?: object;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  public updateTags(config: SeoTagsConfig): void {
    const fullTitle = `${config.title} | CloudCostMatrix`;
    this.titleService.setTitle(fullTitle);

    this.metaService.updateTag({ name: 'description', content: config.description });
    if (config.keywords) {
      this.metaService.updateTag({ name: 'keywords', content: config.keywords.join(', ') });
    }

    // OpenGraph
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: config.description });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:image', content: config.ogImage || 'https://cloudcostmatrix.com/og-preview.png' });
    if (config.canonicalUrl) {
      this.metaService.updateTag({ property: 'og:url', content: config.canonicalUrl });
    }

    // Twitter Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: fullTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: config.description });

    if (config.structuredDataJson && typeof document !== 'undefined') {
      this.injectSchema(config.structuredDataJson);
    }
  }

  private injectSchema(schemaObj: object): void {
    const id = 'ccm-json-ld';
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.text = JSON.stringify(schemaObj);
  }
}

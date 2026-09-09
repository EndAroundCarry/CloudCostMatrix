import { Injectable } from '@angular/core';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { ArchitectureEstimateConfig } from '../models/pricing.model';
import { DEFAULT_SELECTED_PROVIDERS, normalizeSelectedProviders } from '../models/cloud-provider.enum';

@Injectable({
  providedIn: 'root'
})
export class UrlStateService {
  /**
   * Encodes the entire architecture configuration into a compact URI query string
   * enabling 100% free, database-free, instant, and permanent sharing.
   */
  public encodeToUrl(config: ArchitectureEstimateConfig): string {
    // Omit selectedProviders when it's just the default big-3 selection so the
    // common case keeps producing the same short URL shape as before this
    // field existed — it's optional on decode, so leaving it out is safe.
    const isDefaultSelection = config.selectedProviders
      ? config.selectedProviders.length === DEFAULT_SELECTED_PROVIDERS.length
        && DEFAULT_SELECTED_PROVIDERS.every((p) => config.selectedProviders!.includes(p))
      : true;
    const payload: ArchitectureEstimateConfig = isDefaultSelection
      ? { ...config, selectedProviders: undefined }
      : config;
    const json = JSON.stringify(payload);
    return compressToEncodedURIComponent(json);
  }

  /**
   * Decodes a compressed URI query string back into an architecture configuration.
   */
  public decodeFromUrl(compressed: string): ArchitectureEstimateConfig | null {
    try {
      const json = decompressFromEncodedURIComponent(compressed);
      if (!json) return null;
      const config = JSON.parse(json) as ArchitectureEstimateConfig;
      // Defense-in-depth: a hand-edited `c=` param, a link minted on a future
      // build with an unknown provider id, or a pre-selection-feature legacy
      // link must all still decode into something safe to render.
      config.selectedProviders = normalizeSelectedProviders(config.selectedProviders);
      return config;
    } catch {
      return null;
    }
  }

  /**
   * Builds the full shareable URL
   */
  public buildShareUrl(config: ArchitectureEstimateConfig, baseUrl?: string): string {
    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://cloudcostmatrix.com');
    const encoded = this.encodeToUrl(config);
    return `${origin}/?c=${encoded}`;
  }
}

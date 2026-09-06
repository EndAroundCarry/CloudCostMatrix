import { Injectable } from '@angular/core';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { ArchitectureEstimateConfig } from '../models/pricing.model';

@Injectable({
  providedIn: 'root'
})
export class UrlStateService {
  /**
   * Encodes the entire architecture configuration into a compact URI query string
   * enabling 100% free, database-free, instant, and permanent sharing.
   */
  public encodeToUrl(config: ArchitectureEstimateConfig): string {
    const json = JSON.stringify(config);
    return compressToEncodedURIComponent(json);
  }

  /**
   * Decodes a compressed URI query string back into an architecture configuration.
   */
  public decodeFromUrl(compressed: string): ArchitectureEstimateConfig | null {
    try {
      const json = decompressFromEncodedURIComponent(compressed);
      if (!json) return null;
      return JSON.parse(json) as ArchitectureEstimateConfig;
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

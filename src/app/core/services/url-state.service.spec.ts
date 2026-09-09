import { describe, it, expect } from 'vitest';
import { UrlStateService } from './url-state.service';
import { ARCHITECTURE_BLUEPRINTS } from '../models/blueprints.model';
import { CloudProvider, DEFAULT_SELECTED_PROVIDERS } from '../models/cloud-provider.enum';

describe('UrlStateService', () => {
  const service = new UrlStateService();
  const sampleConfig = ARCHITECTURE_BLUEPRINTS[0].config;

  it('should compress and decompress configuration losslessly', () => {
    const encoded = service.encodeToUrl(sampleConfig);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(10);

    const decoded = service.decodeFromUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe(sampleConfig.name);
    expect(decoded?.compute.vCpu).toBe(sampleConfig.compute.vCpu);
    expect(decoded?.storage.capacityGb).toBe(sampleConfig.storage.capacityGb);
    expect(decoded?.database.engine).toBe(sampleConfig.database.engine);
  });

  it('should return null for malformed query strings gracefully', () => {
    const decoded = service.decodeFromUrl('invalid-gibberish-string-!!@@##$$');
    expect(decoded).toBeNull();
  });

  it('round-trips a non-default provider selection', () => {
    const withSelection = { ...sampleConfig, selectedProviders: [CloudProvider.ORACLE, CloudProvider.LINODE, CloudProvider.OVHCLOUD] };
    const encoded = service.encodeToUrl(withSelection);
    const decoded = service.decodeFromUrl(encoded);
    expect(decoded?.selectedProviders).toEqual([CloudProvider.ORACLE, CloudProvider.LINODE, CloudProvider.OVHCLOUD]);
  });

  it('normalizes a legacy payload with no selectedProviders field to the big 3', () => {
    // Simulates a pre-provider-selection-feature share link.
    const legacy: any = { ...sampleConfig };
    delete legacy.selectedProviders;
    const encoded = service.encodeToUrl(legacy);
    const decoded = service.decodeFromUrl(encoded);
    expect(decoded?.selectedProviders).toEqual([...DEFAULT_SELECTED_PROVIDERS]);
  });

  it('drops unknown provider ids from a hand-edited or future-build payload without crashing', () => {
    const withUnknown: any = { ...sampleConfig, selectedProviders: ['AWS', 'HETZNER', 'AZURE'] };
    const encoded = service.encodeToUrl(withUnknown);
    const decoded = service.decodeFromUrl(encoded);
    expect(decoded?.selectedProviders).toEqual([CloudProvider.AWS, CloudProvider.AZURE]);
  });
});

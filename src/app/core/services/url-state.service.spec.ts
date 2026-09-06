import { describe, it, expect } from 'vitest';
import { UrlStateService } from './url-state.service';
import { ARCHITECTURE_BLUEPRINTS } from '../models/blueprints.model';

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
});

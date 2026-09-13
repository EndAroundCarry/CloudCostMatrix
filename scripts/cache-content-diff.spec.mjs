import { describe, it, expect } from 'vitest';
import { catalogsMoved } from './cache-content-diff.mjs';

const withMeta = (lastSyncedAt, catalogs) => ({
  meta: { mode: 'live', lastSyncedAt, syncedBy: 'scripts/sync-prices.mjs', sources: { AWS: `live@${lastSyncedAt}` } },
  catalogs
});

const aws = (rate) =>
  withMeta('2026-09-12T00:00:00.000Z', {
    AWS: { provider: 'AWS', region: 'us-east-1', compute: [{ name: 't4g.small', hourlyOnDemandLinux: rate }] }
  });

describe('cache-content-diff', () => {
  it('ignores a timestamp-only change (the everyday scheduled run)', () => {
    const prev = aws(0.0168);
    const next = { ...aws(0.0168), meta: { ...aws(0.0168).meta, lastSyncedAt: '2026-09-13T00:00:00.000Z' } };
    expect(catalogsMoved(prev, next)).toBe(false);
  });

  it('detects a changed rate', () => {
    expect(catalogsMoved(aws(0.0168), aws(0.0175))).toBe(true);
  });

  it('detects a provider appearing', () => {
    const prev = aws(0.0168);
    const next = withMeta('2026-09-13T00:00:00.000Z', { ...prev.catalogs, IBM: { provider: 'IBM', compute: [] } });
    expect(catalogsMoved(prev, next)).toBe(true);
  });

  it('treats a missing previous cache as a change, so the first sync still deploys', () => {
    expect(catalogsMoved(null, aws(0.0168))).toBe(true);
    expect(catalogsMoved({}, aws(0.0168))).toBe(true);
  });

  it('treats two empty caches as unchanged', () => {
    expect(catalogsMoved({}, {})).toBe(false);
  });
});

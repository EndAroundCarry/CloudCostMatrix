import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAllPages, unitPriceToNumber, round } from './shared.mjs';

const jsonResponse = (body) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  text: async () => JSON.stringify(body)
});

describe('unitPriceToNumber', () => {
  it('adds units + nanos numerically instead of concatenating the string units', () => {
    // The bug this exists to prevent: "0" + 0.031611 would concatenate to "00.031611".
    expect(unitPriceToNumber({ units: '0', nanos: 31611000 })).toBeCloseTo(0.031611, 9);
    // The 10x variant: "1" + 0.5 must be 1.5, not "10.5".
    expect(unitPriceToNumber({ units: '1', nanos: 500000000 })).toBeCloseTo(1.5, 9);
    expect(typeof unitPriceToNumber({ units: '0', nanos: 31611000 })).toBe('number');
  });

  it('accepts numeric units too, and returns 0 for missing or unparseable input', () => {
    expect(unitPriceToNumber({ units: 0, nanos: 250000000 })).toBeCloseTo(0.25, 9);
    expect(unitPriceToNumber(null)).toBe(0);
    expect(unitPriceToNumber(undefined)).toBe(0);
    expect(unitPriceToNumber({})).toBe(0);
    expect(unitPriceToNumber({ units: 'not-a-number', nanos: 1 })).toBe(0);
  });
});

describe('round', () => {
  it('returns 0 rather than NaN/Infinity for non-finite input', () => {
    expect(round(NaN)).toBe(0);
    expect(round(Infinity)).toBe(0);
    expect(round(0.388472, 4)).toBe(0.3885);
  });
});

describe('fetchAllPages', () => {
  let mockFetch;

  const pageOptions = (overrides = {}) => ({
    firstUrl: 'https://example.test/items',
    nextUrl: (token) => `https://example.test/items?pageToken=${token}`,
    extract: (data) => data.items,
    getToken: (data) => data.next || '',
    id: 'test feed',
    ...overrides
  });

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows the token through every page and concatenates the results', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ items: [1, 2], next: 't1' }))
      .mockResolvedValueOnce(jsonResponse({ items: [3], next: 't2' }))
      .mockResolvedValueOnce(jsonResponse({ items: [4] }));

    const items = await fetchAllPages(pageOptions());

    expect(items).toEqual([1, 2, 3, 4]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls[2][0]).toBe('https://example.test/items?pageToken=t2');
  });

  it('forwards caller headers (this is how API keys stay out of URLs)', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ items: [] }));
    await fetchAllPages(pageOptions({ headers: { 'X-goog-api-key': 'test-key' } }));

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).not.toContain('test-key');
    expect(init.headers['X-goog-api-key']).toBe('test-key');
  });

  it('treats a feed that reuses the same token as fatal rather than looping forever', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ items: [1], next: 'same-token' }));
    await expect(fetchAllPages(pageOptions())).rejects.toThrow(/repeated page token/);
  });

  it('throws instead of returning a partial list when the page cap is reached', async () => {
    let n = 0;
    mockFetch.mockImplementation(async () => jsonResponse({ items: [1], next: `token-${++n}` }));

    await expect(fetchAllPages(pageOptions({ maxPages: 3 }))).rejects.toThrow(/exceeded 3 pages/);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('returns an empty list without fetching when there is no first URL', async () => {
    await expect(fetchAllPages(pageOptions({ firstUrl: '' }))).resolves.toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('surfaces a non-OK HTTP response as an error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' });
    await expect(fetchAllPages(pageOptions())).rejects.toThrow(/HTTP 503/);
  });
});

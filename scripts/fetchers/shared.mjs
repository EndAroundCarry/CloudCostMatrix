/**
 * Shared helpers for every provider fetcher in this directory. Extracted so
 * each fetcher is an independently importable, independently testable ES
 * module — sync-prices.mjs is now just the orchestrator that wires them
 * together and writes the result.
 */

export const FETCH_TIMEOUT_MS = 45_000;
export const USER_AGENT = 'CloudCostMatrix-PriceSync/1.0 (+https://cloudcostmatrix.com)';

export async function fetchJson(url, extraHeaders = {}) {
  const text = await fetchText(url, extraHeaders);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${url} (${text.slice(0, 80)})`);
  }
}

/**
 * Fetches a raw text/HTML response. Same UA + timeout behaviour as fetchJson,
 * for sources that publish pricing as server-rendered markup rather than a
 * JSON API (see the DigitalOcean fetcher).
 */
export async function fetchText(url, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': USER_AGENT, ...extraHeaders } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function round(n, digits = 4) {
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(digits));
}

/**
 * Walks a token-paginated JSON endpoint to completion.
 *
 * Feeds page differently — GCP takes a `pageToken` query param, Azure hands
 * back a ready-made `NextPageLink` URL — so the caller supplies the URL for a
 * given token rather than this helper assuming a query-param shape.
 *
 * Throws instead of returning a partial list: the app's `mergeOverSeed`
 * replaces whole sections, so a truncated page walk would silently REPLACE a
 * complete catalog with an incomplete one rather than merging into it.
 */
export async function fetchAllPages({
  firstUrl,
  nextUrl,
  extract,
  getToken,
  headers = {},
  maxPages = 25,
  id = 'feed'
}) {
  const items = [];
  const seenTokens = new Set();
  let url = firstUrl;

  for (let page = 1; ; page++) {
    if (!url) return items;
    if (page > maxPages) {
      throw new Error(`${id}: exceeded ${maxPages} pages — refusing to sync a partial catalog`);
    }

    const data = await fetchJson(url, headers);
    items.push(...(extract(data) ?? []));

    const token = getToken(data);
    if (!token) return items;
    if (seenTokens.has(token)) throw new Error(`${id}: pagination returned a repeated page token`);
    seenTokens.add(token);

    url = nextUrl(token);
  }
}

/**
 * Google/Azure-style money objects are `{ units, nanos }` where `units` is a
 * STRING (to preserve precision), so `("0" || 0) + 0.031611` string-concatenates
 * into "00.031611" instead of adding. Coerce both fields explicitly — this is
 * the bug that made GCP's compute rates unusable.
 */
export function unitPriceToNumber(unitPrice) {
  if (!unitPrice) return 0;
  const value = Number(unitPrice.units ?? 0) + Number(unitPrice.nanos ?? 0) / 1e9;
  return Number.isFinite(value) ? value : 0;
}

/**
 * Same distance metric cost-calculator.engine.ts uses for nearest-shape
 * matching at request time (|vCpu diff| * 4 + |ramGb diff|) — used here only
 * to pick a good *representative spread* of rows to emit into the catalog,
 * not to replace the app's own runtime matching.
 */
export function nearest(items, targetVcpu, targetRamGb, getVcpu, getRamGb) {
  return [...items].sort((a, b) => {
    const da = Math.abs(getVcpu(a) - targetVcpu) * 4 + Math.abs(getRamGb(a) - targetRamGb);
    const db = Math.abs(getVcpu(b) - targetVcpu) * 4 + Math.abs(getRamGb(b) - targetRamGb);
    return da - db;
  })[0];
}

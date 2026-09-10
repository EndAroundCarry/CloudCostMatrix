/**
 * Shared helpers for every provider fetcher in this directory. Extracted so
 * each fetcher is an independently importable, independently testable ES
 * module — sync-prices.mjs is now just the orchestrator that wires them
 * together and writes the result.
 */

export const FETCH_TIMEOUT_MS = 45_000;
export const USER_AGENT = 'CloudCostMatrix-PriceSync/1.0 (+https://cloudcostmatrix.com)';

export async function fetchJson(url, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': USER_AGENT, ...extraHeaders } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response from ${url} (${text.slice(0, 80)})`);
    }
  } finally {
    clearTimeout(timer);
  }
}

export function round(n, digits = 4) {
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(digits));
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

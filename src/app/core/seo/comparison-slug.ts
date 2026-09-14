import { ALL_PROVIDERS, CloudProvider, PROVIDER_METAS } from '../models/cloud-provider.enum';

export interface ParsedPairSlug {
  /** Provider named first in the URL, as typed — may not be the canonical order. */
  a: CloudProvider;
  /** Provider named second in the URL. */
  b: CloudProvider;
  /** The `{slug}-vs-{slug}` this pair should canonicalize to (ALL_PROVIDERS-ascending). */
  canonicalSlug: string;
  /** True when the requested slug is NOT already in canonical order. */
  isReversed: boolean;
}

const SLUG_TO_PROVIDER = new Map<string, CloudProvider>(
  ALL_PROVIDERS.map((p) => [PROVIDER_METAS[p].slug, p])
);

/**
 * Parses a `/compare/:slug` segment into a provider pair, if it names two
 * distinct known providers. Resolution goes through `ProviderMeta.slug` —
 * never derived from the enum — so the URL space is stable even if
 * `CloudProvider` members are ever reordered or renamed.
 */
export function parsePairSlug(rawSlug: string): ParsedPairSlug | null {
  const slug = rawSlug.toLowerCase().trim();
  const match = /^([a-z0-9]+)-vs-([a-z0-9]+)$/.exec(slug);
  if (!match) return null;

  const providerA = SLUG_TO_PROVIDER.get(match[1]);
  const providerB = SLUG_TO_PROVIDER.get(match[2]);
  if (!providerA || !providerB || providerA === providerB) return null;

  const isForward = ALL_PROVIDERS.indexOf(providerA) <= ALL_PROVIDERS.indexOf(providerB);

  return { a: providerA, b: providerB, canonicalSlug: canonicalPairSlug(providerA, providerB), isReversed: !isForward };
}

/** Builds a `{slugA}-vs-{slugB}` segment for a specific, already-ordered pair. */
export function buildPairSlug(a: CloudProvider, b: CloudProvider): string {
  return `${PROVIDER_METAS[a].slug}-vs-${PROVIDER_METAS[b].slug}`;
}

/**
 * The forward-ordered (`ALL_PROVIDERS`-ascending) slug for a pair, whichever
 * order the caller happens to hold it in. This is the URL a pair consolidates
 * to when no curated page claims it.
 */
export function canonicalPairSlug(a: CloudProvider, b: CloudProvider): string {
  return ALL_PROVIDERS.indexOf(a) <= ALL_PROVIDERS.indexOf(b) ? buildPairSlug(a, b) : buildPairSlug(b, a);
}

/** Every unordered provider pair this build knows about, forward-ordered — the full URL space. */
export function allPairSlugs(): string[] {
  const slugs: string[] = [];
  for (let i = 0; i < ALL_PROVIDERS.length; i++) {
    for (let j = i + 1; j < ALL_PROVIDERS.length; j++) {
      slugs.push(buildPairSlug(ALL_PROVIDERS[i], ALL_PROVIDERS[j]));
    }
  }
  return slugs;
}

/**
 * Every pair in BOTH orderings — the exact `/compare/:slug` URL space that must
 * resolve without a server. Only the indexable ordering of each pair is
 * prerendered as an index page (see `indexableSlugForPair`); the reversed one
 * is prerendered too, but `noindex` + canonical, because a hand-typed
 * `…/azure-vs-aws` should render rather than 404 once the SPA fallback is gone.
 */
export function allPairOrderings(): string[] {
  const slugs: string[] = [];
  for (let i = 0; i < ALL_PROVIDERS.length; i++) {
    for (let j = i + 1; j < ALL_PROVIDERS.length; j++) {
      slugs.push(buildPairSlug(ALL_PROVIDERS[i], ALL_PROVIDERS[j]));
      slugs.push(buildPairSlug(ALL_PROVIDERS[j], ALL_PROVIDERS[i]));
    }
  }
  return slugs;
}

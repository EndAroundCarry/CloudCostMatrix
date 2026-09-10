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

  const indexA = ALL_PROVIDERS.indexOf(providerA);
  const indexB = ALL_PROVIDERS.indexOf(providerB);
  const isForward = indexA <= indexB;
  const canonicalSlug = isForward ? buildPairSlug(providerA, providerB) : buildPairSlug(providerB, providerA);

  return { a: providerA, b: providerB, canonicalSlug, isReversed: !isForward };
}

/** Builds a `{slugA}-vs-{slugB}` segment for a specific, already-ordered pair. */
export function buildPairSlug(a: CloudProvider, b: CloudProvider): string {
  return `${PROVIDER_METAS[a].slug}-vs-${PROVIDER_METAS[b].slug}`;
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

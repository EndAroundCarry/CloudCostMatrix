import { CloudProvider, PROVIDER_METAS } from '../models/cloud-provider.enum';
import { ComparisonMatrixResult } from '../models/pricing.model';
import { DerivedFeatureId, DerivedFeatureRow } from './derived-features';

/**
 * Page copy for a provider pair that has no curated page, assembled from facts
 * the engine already computed — never hand-typed numbers. The FAQ answers carry
 * the pair's actual prices so the page says something no other page says; the
 * structure is identical to a curated page's, which is what lets the component
 * render both through one template.
 */
export interface DerivedComparisonContent {
  slugTitle: string;
  headline: string;
  summary: string;
  metaDescription: string;
  keywords: string[];
  faqs: { question: string; answer: string }[];
}

export function buildDerivedComparison(
  a: CloudProvider,
  b: CloudProvider,
  matrix: ComparisonMatrixResult,
  features: DerivedFeatureRow[]
): DerivedComparisonContent {
  const metaA = PROVIDER_METAS[a];
  const metaB = PROVIDER_METAS[b];
  const totalA = matrix.providers[a];
  const totalB = matrix.providers[b];

  const cheaper = totalA.monthlyTotal <= totalB.monthlyTotal ? a : b;
  const pricier = cheaper === a ? b : a;
  const cheaperMeta = PROVIDER_METAS[cheaper];
  const pricierMeta = PROVIDER_METAS[pricier];
  const cheaperTotal = matrix.providers[cheaper].monthlyTotal;
  const pricierTotal = matrix.providers[pricier].monthlyTotal;
  const diff = Math.abs(cheaperTotal - pricierTotal);
  const percent = Math.max(cheaperTotal, pricierTotal) > 0
    ? Math.round((diff / Math.max(cheaperTotal, pricierTotal)) * 100)
    : 0;

  const workload = matrix.config.name;
  const gapNote = totalA.hasCoverageGap || totalB.hasCoverageGap
    ? ` Note that ${[totalA, totalB].filter((t) => t.hasCoverageGap).map((t) => PROVIDER_METAS[t.provider].shortName).join(' and ')} cannot price every service category in this workload, so the totals below are not a like-for-like comparison.`
    : '';

  const row = (id: DerivedFeatureId): DerivedFeatureRow | undefined => features.find((f) => f.id === id);

  return {
    slugTitle: `${metaA.shortName} vs ${metaB.shortName}`,
    headline: `${metaA.name} vs ${metaB.name}: Cloud Infrastructure Cost Comparison (2026)`,
    summary: `${metaA.headline} ${metaB.headline} Scored against the same reference workload (${workload}), ${cheaperMeta.name} prices at ${usd(cheaperTotal)}/mo against ${usd(pricierTotal)}/mo for ${pricierMeta.name} — a ${percent}% difference.${gapNote}`,
    metaDescription: trimDescription(
      `${metaA.shortName} vs ${metaB.shortName} pricing: ${cheaperMeta.shortName} is cheaper for a ${workload} workload (${usd(cheaperTotal)}/mo vs ${usd(pricierTotal)}/mo). Live-computed compute, storage, database and egress costs.`
    ),
    keywords: [
      `${metaA.shortName} vs ${metaB.shortName}`,
      `${metaA.shortName} vs ${metaB.shortName} cost`,
      `${metaA.name} pricing`,
      `${metaB.name} pricing`,
      'cloud cost comparison 2026'
    ],
    faqs: [
      {
        question: `Is ${metaA.shortName} or ${metaB.shortName} cheaper?`,
        answer: `For the reference ${workload} workload modelled on this page, ${cheaperMeta.name} comes out cheaper at ${usd(cheaperTotal)}/mo against ${usd(pricierTotal)}/mo for ${pricierMeta.name} — a ${percent}% difference.${gapNote} That ranking is specific to this workload shape, region, and commitment type; change the vCPU, RAM, storage, transfer volume, or commitment terms in the live configurator and it can move, so re-run it with your own numbers before treating it as settled.`
      },
      egressFaq(metaA.shortName, metaB.shortName, row('EGRESS_10TB'), row('FREE_EGRESS')),
      storageFaq(metaA.shortName, metaB.shortName, row('HOT_STORAGE'), row('ARCHIVE_STORAGE')),
      kubernetesFaq(metaA.shortName, metaB.shortName, row('K8S_CONTROL_PLANE')),
      computeFaq(metaA.shortName, metaB.shortName, row('CHEAPEST_4X16'), row('RESERVED_3YR'), row('SPOT'))
    ]
  };
}

function egressFaq(a: string, b: string, egress?: DerivedFeatureRow, allowance?: DerivedFeatureRow): { question: string; answer: string } {
  const question = `How do ${a} and ${b} compare on egress (data transfer) costs?`;
  if (!egress) return { question, answer: placeholderAnswer };
  const allowanceText = !allowance
    ? ''
    : allowance.providerAVal === 'None' && allowance.providerBVal === 'None'
      ? ' Neither provider includes a standing free monthly egress allowance.'
      : ` The standing free monthly allowance is ${a}: ${allowance.providerAVal}, ${b}: ${allowance.providerBVal}.`;
  return {
    question,
    answer: `For the same outbound workload (10 TB/month of internet transfer), ${a} prices at ${egress.providerAVal} and ${b} at ${egress.providerBVal}.${allowanceText} Egress is the one major line item that scales with how much a product is used rather than with how much infrastructure runs, which is why it dominates the bill for content delivery, API-heavy services, and backup replication — and why the comparison above is computed through the same engine as the calculator rather than copied from a rate sheet.`
  };
}

function storageFaq(a: string, b: string, hot?: DerivedFeatureRow, archive?: DerivedFeatureRow): { question: string; answer: string } {
  const question = `Which is cheaper for object storage: ${a} or ${b}?`;
  if (!hot) return { question, answer: placeholderAnswer };
  const archiveText = archive
    ? ` Archive-class storage — for data that is written once and rarely read — prices at ${a}: ${archive.providerAVal}, ${b}: ${archive.providerBVal}.`
    : '';
  return {
    question,
    answer: `Hot object storage capacity compares at ${a}: ${hot.providerAVal} and ${b}: ${hot.providerBVal}.${archiveText} Capacity is only part of the bill: request/operation charges and retrieval fees differ between tiers and between providers, and the cheapest headline rate is often not the cheapest tier once access patterns are taken into account.`
  };
}

function kubernetesFaq(a: string, b: string, k8s?: DerivedFeatureRow): { question: string; answer: string } {
  const question = `Do ${a} and ${b} charge for a managed Kubernetes control plane?`;
  if (!k8s) return { question, answer: placeholderAnswer };
  return {
    question,
    answer: `For the first cluster: ${a} charges ${k8s.providerAVal}, ${b} charges ${k8s.providerBVal}. A control-plane fee is a flat cost that arrives before there is any workload to run on it, so it matters most early on and to anyone running more than one cluster — staging plus production, for example. Worker nodes are billed as ordinary compute on top of that, which is where the bulk of a cluster's cost usually sits.`
  };
}

function computeFaq(
  a: string,
  b: string,
  cheapest?: DerivedFeatureRow,
  reserved?: DerivedFeatureRow,
  spot?: DerivedFeatureRow
): { question: string; answer: string } {
  const question = `What does the cheapest comparable instance cost on ${a} and ${b}?`;
  if (!cheapest) return { question, answer: placeholderAnswer };
  const discountParts: string[] = [];
  if (reserved) discountParts.push(`deepest 3-year reserved discount: ${a} ${reserved.providerAVal}, ${b} ${reserved.providerBVal}`);
  if (spot) discountParts.push(`spot/preemptible: ${a} ${spot.providerAVal}, ${b} ${spot.providerBVal}`);
  const discountText = discountParts.length
    ? ` Commitment pricing moves the picture: ${discountParts.join('; ')}.`
    : '';
  return {
    question,
    answer: `For a 4 vCPU / 16 GB Linux instance at 730 hours a month, on demand, the engine matches ${a} to ${cheapest.providerAVal} and ${b} to ${cheapest.providerBVal}.${discountText} Providers publish different instance shapes, and the engine never interpolates between them — a request is matched to the nearest shape each provider actually sells, which is why the named instance type belongs in any comparison.`
  };
}

const placeholderAnswer =
  'This comparison is computed from the current pricing catalogs; the figures for this row are not available in the present catalog build. See the methodology page for exactly which provider catalogs are live-synced and which are benchmark estimates.';

/**
 * Descriptions are the one place a long generated string costs us: search
 * engines truncate past roughly 165 characters, so a pair with long provider
 * names gets its trailing clause dropped rather than its price facts.
 */
function trimDescription(text: string, maxLength = 165): string {
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 0 ? lastSpace : maxLength).replace(/[,;:.]$/, '')}.`;
}

/** Matches EstimatorStore.formatMoney's convention (rounded, explicit en-US grouping) so prerendered text and hydrated text agree. */
function usd(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

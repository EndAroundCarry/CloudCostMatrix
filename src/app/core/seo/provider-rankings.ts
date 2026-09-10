import { ALL_PROVIDERS, CloudProvider } from '../models/cloud-provider.enum';
import { EFFECTIVE_CATALOGS } from '../engine/catalog/pricing-catalog.resolver';
import { CostCalculatorEngine } from '../engine/cost-calculator.engine';

/**
 * Which metric a guide ranks providers by. Kept to a closed union rather than
 * an open registry: only the metrics an actual page needs are implemented, so
 * there's no speculative surface to keep tested and honest.
 */
export type RankingMetricId = 'egress' | 'entryCompute';

export interface RankedProvider {
  provider: CloudProvider;
  /** The comparable number — USD/month for both current metrics. */
  value: number;
  /** Formatted for display, and context-bearing (e.g. which shape matched). */
  display: string;
  /** 1-based position, cheapest first. No ties are shared — see the note below. */
  rank: number;
  lowest: boolean;
}

/**
 * Egress ranking reference workload. Bundled per-instance allowances are a real
 * part of several developer clouds' egress economics, so the instance count is
 * explicit here rather than zero — an allowance only exists if instances do.
 */
export const EGRESS_REFERENCE_GB = 20480;
export const EGRESS_REFERENCE_INSTANCES = 3;

/** Entry-level shape for the "cheapest provider for a small app" ranking. */
export const ENTRY_COMPUTE_SPEC = {
  vCpu: 2,
  ramGb: 4,
  os: 'LINUX' as const,
  count: 1,
  hoursPerMonth: 730,
  commitment: 'ON_DEMAND' as const
};

interface MetricDefinition {
  label: string;
  /** Sentence explaining exactly what the ranking measures — rendered above the table. */
  caption: string;
  evaluate(provider: CloudProvider): { value: number; display: string };
}

const METRICS: Record<RankingMetricId, MetricDefinition> = {
  egress: {
    label: 'Monthly egress cost',
    caption: `Outbound internet transfer at ${(EGRESS_REFERENCE_GB / 1024).toFixed(0)} TB/month across ${EGRESS_REFERENCE_INSTANCES} instances, computed by the same engine as the live calculator — so free tiers, unlimited-egress providers, and bundled per-instance allowances all apply exactly as they would on a real bill.`,
    evaluate(provider) {
      const monthlyCost = CostCalculatorEngine.calculateNetworking(
        { egressGbPerMonth: EGRESS_REFERENCE_GB, loadBalancersCount: 0, staticIpsCount: 0 },
        provider,
        EGRESS_REFERENCE_INSTANCES
      ).monthlyCost;
      const net = EFFECTIVE_CATALOGS[provider].networking;
      const display = net.unlimitedEgress
        ? 'Unlimited (free, fair use)'
        : monthlyCost === 0
          ? 'Free within allowance'
          : `$${monthlyCost.toFixed(2)}/mo`;
      return { value: monthlyCost, display };
    }
  },
  entryCompute: {
    label: 'Entry-level compute',
    caption: `Cheapest matching instance for a ${ENTRY_COMPUTE_SPEC.vCpu} vCPU / ${ENTRY_COMPUTE_SPEC.ramGb} GB Linux workload on a flat 730 h/month, on-demand. Sizes shown are the nearest published shape each provider actually offers — the engine does not interpolate between shapes.`,
    evaluate(provider) {
      const result = CostCalculatorEngine.calculateCompute(ENTRY_COMPUTE_SPEC, provider);
      return {
        value: result.monthlyCost,
        display: `$${result.monthlyCost.toFixed(2)}/mo (${result.instanceTypeOrTier})`
      };
    }
  }
};

export function rankingLabel(metric: RankingMetricId): string {
  return METRICS[metric].label;
}

export function rankingCaption(metric: RankingMetricId): string {
  return METRICS[metric].caption;
}

/**
 * Ranks every provider by one metric, cheapest first.
 *
 * Deliberately no tie banding here (unlike the pairwise derived-features rows):
 * a ranking has to produce a definite order, and a "tie" spanning several
 * providers would make the numbering meaningless. Ranks are therefore strict
 * positions in the sorted order.
 */
export function rankProviders(metric: RankingMetricId): RankedProvider[] {
  const definition = METRICS[metric];
  const evaluated = ALL_PROVIDERS.map((provider) => ({ provider, ...definition.evaluate(provider) }));

  evaluated.sort((a, b) => a.value - b.value);

  return evaluated.map((entry, index) => ({
    provider: entry.provider,
    value: entry.value,
    display: entry.display,
    rank: index + 1,
    lowest: index === 0
  }));
}

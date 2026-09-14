import { ALL_PROVIDERS, CloudProvider } from '../models/cloud-provider.enum';
import { EFFECTIVE_CATALOGS } from '../engine/catalog/pricing-catalog.resolver';
import { CostCalculatorEngine } from '../engine/cost-calculator.engine';

/**
 * Which metric a guide ranks providers by. Kept to a closed union rather than
 * an open registry: only the metrics an actual page needs are implemented, so
 * there's no speculative surface to keep tested and honest.
 */
export type RankingMetricId = 'egress' | 'entryCompute' | 'objectStorage' | 'managedPostgres' | 'kubernetes';

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

/**
 * Hot-tier capacity for the storage ranking. Request/operation charges are
 * deliberately excluded: they depend on access patterns rather than on the
 * provider's rate card, and the calculator models them separately.
 */
export const OBJECT_STORAGE_REFERENCE_GB = 10240;

/** A small production database: 2 vCPU / 8 GB, 100 GB, single-AZ, on-demand. */
export const MANAGED_DB_REFERENCE_SPEC = {
  engine: 'POSTGRES' as const,
  vCpu: 2,
  ramGb: 8,
  storageGb: 100,
  multiAz: false,
  commitment: 'ON_DEMAND' as const
};

/** One cluster with three modest worker nodes — the shape a small team actually runs. */
export const KUBERNETES_REFERENCE_SPEC = {
  clustersCount: 1,
  workerNodesPerCluster: 3,
  workerVcpu: 2,
  workerRamGb: 4
};

interface MetricDefinition {
  label: string;
  /** Sentence explaining exactly what the ranking measures — rendered above the table. */
  caption: string;
  /** `null` when the provider does not sell this service — it is then absent from the ranking rather than priced. */
  evaluate(provider: CloudProvider): { value: number; display: string } | null;
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
  },

  objectStorage: {
    label: `Hot object storage (${(OBJECT_STORAGE_REFERENCE_GB / 1024).toFixed(0)} TB)`,
    caption: `Capacity cost for ${(OBJECT_STORAGE_REFERENCE_GB / 1024).toFixed(0)} TB of hot/standard object storage per month, on-demand. Request and retrieval charges are excluded — they depend on access patterns rather than on the rate card, and the calculator models them separately. Providers that bill a monthly minimum are charged that minimum rather than the raw per-GB rate.`,
    evaluate(provider) {
      const result = CostCalculatorEngine.calculateStorage(
        { capacityGb: OBJECT_STORAGE_REFERENCE_GB, tier: 'HOT', readOpsThousands: 0, writeOpsThousands: 0 },
        provider
      );
      return result.supported
        ? { value: result.monthlyCost, display: `$${result.monthlyCost.toFixed(2)}/mo` }
        : null;
    }
  },

  managedPostgres: {
    label: 'Managed PostgreSQL',
    caption: `A ${MANAGED_DB_REFERENCE_SPEC.vCpu} vCPU / ${MANAGED_DB_REFERENCE_SPEC.ramGb} GB managed PostgreSQL instance with ${MANAGED_DB_REFERENCE_SPEC.storageGb} GB of storage, single-AZ, on-demand. Instance sizes are matched to the nearest published shape each provider sells; multi-AZ standby pricing is a separate multiplier and is not applied here.`,
    evaluate(provider) {
      const result = CostCalculatorEngine.calculateDatabase(MANAGED_DB_REFERENCE_SPEC, provider);
      return result.supported
        ? { value: result.monthlyCost, display: `$${result.monthlyCost.toFixed(2)}/mo (${result.instanceTypeOrTier})` }
        : null;
    }
  },

  kubernetes: {
    label: 'Managed Kubernetes cluster',
    caption: `One cluster with ${KUBERNETES_REFERENCE_SPEC.workerNodesPerCluster} worker nodes of ${KUBERNETES_REFERENCE_SPEC.workerVcpu} vCPU / ${KUBERNETES_REFERENCE_SPEC.workerRamGb} GB each, on-demand, including any control-plane fee. Providers that waive the first cluster's management fee are charged nothing for it — that difference is the whole point of this ranking at small cluster counts.`,
    evaluate(provider) {
      const result = CostCalculatorEngine.calculateKubernetes(KUBERNETES_REFERENCE_SPEC, provider);
      return result.supported
        ? { value: result.monthlyCost, display: `$${result.monthlyCost.toFixed(2)}/mo` }
        : null;
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
 * Ranks every provider that offers the metric, cheapest first.
 *
 * A provider that does not sell the service is excluded rather than ranked —
 * "most expensive" and "not offered" are different facts, and giving the second
 * one a price would be the sort of invented number this codebase avoids
 * elsewhere. In the current catalog all ten providers offer every metric, so
 * the exclusion is a guard rather than a factor.
 *
 * Deliberately no tie banding here (unlike the pairwise derived-features rows):
 * a ranking has to produce a definite order, and a "tie" spanning several
 * providers would make the numbering meaningless. Ranks are therefore strict
 * positions in the sorted order.
 */
export function rankProviders(metric: RankingMetricId): RankedProvider[] {
  const definition = METRICS[metric];
  const evaluated = ALL_PROVIDERS.map((provider) => ({ provider, result: definition.evaluate(provider) }))
    .filter((entry): entry is { provider: CloudProvider; result: { value: number; display: string } } => entry.result !== null);

  evaluated.sort((a, b) => a.result.value - b.result.value);

  return evaluated.map((entry, index) => ({
    provider: entry.provider,
    value: entry.result.value,
    display: entry.result.display,
    rank: index + 1,
    lowest: index === 0
  }));
}

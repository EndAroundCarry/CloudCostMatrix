import { ArchitectureEstimateConfig, ComparisonMatrixResult, ServiceCostBreakdown } from '../models/pricing.model';
import { ServiceCategory } from '../models/service-category.enum';
import { CloudProvider } from '../models/cloud-provider.enum';
import { CostCalculatorEngine } from './cost-calculator.engine';
import { SERVICE_CATEGORY_METAS } from '../models/service-category.enum';

export interface DiffRow {
  category: ServiceCategory;
  label: string;
  aValue: string;
  bValue: string;
  /** true when the two architectures differ in this row */
  changed: boolean;
  /** textual hint when B is more expensive / larger than A */
  trend: 'up' | 'down' | 'same';
}

export interface ProviderMonthlyDelta {
  provider: CloudProvider;
  aMonthly: number;
  bMonthly: number;
  delta: number; // B - A
  deltaPercent: number;
}

export interface ArchitectureDiffResult {
  matrixA: ComparisonMatrixResult;
  matrixB: ComparisonMatrixResult;
  rows: DiffRow[];
  providerDeltas: ProviderMonthlyDelta[];
  monthlyDelta: number; // B total (cheapest) - A total (cheapest)
  annualDelta: number;
  threeYearDelta: number;
  /** Which side is cheaper over 3 years: 'A' | 'B' | 'TIE' */
  winner: 'A' | 'B' | 'TIE';
  winnerProvider: CloudProvider | null;
  savingsPerMonth: number; // absolute |delta|
  savingsPerYear: number;
  savingsThreeYear: number;
  savingsPercent: number;
  hotspotLabel: string;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });

export class ArchitectureDiffEngine {
  public static compute(configA: ArchitectureEstimateConfig, configB: ArchitectureEstimateConfig): ArchitectureDiffResult {
    const matrixA = CostCalculatorEngine.calculateFullMatrix(configA);
    const matrixB = CostCalculatorEngine.calculateFullMatrix(configB);

    const rows: DiffRow[] = [];
    rows.push(this.specRow('Compute vCPU (per instance)', ServiceCategory.COMPUTE, `${configA.compute.vCpu}`, `${configB.compute.vCpu}`, configA.compute.vCpu !== configB.compute.vCpu));
    rows.push(this.specRow('Compute RAM (GB)', ServiceCategory.COMPUTE, `${configA.compute.ramGb}`, `${configB.compute.ramGb}`, configA.compute.ramGb !== configB.compute.ramGb));
    rows.push(this.specRow('Compute instance count', ServiceCategory.COMPUTE, `${configA.compute.count}`, `${configB.compute.count}`, configA.compute.count !== configB.compute.count));
    rows.push(this.specRow('Compute commitment', ServiceCategory.COMPUTE, configA.compute.commitment.replace(/_/g, ' '), configB.compute.commitment.replace(/_/g, ' '), configA.compute.commitment !== configB.compute.commitment));

    rows.push(this.specRow('Object storage capacity', ServiceCategory.STORAGE, `${fmt(configA.storage.capacityGb)} GB`, `${fmt(configB.storage.capacityGb)} GB`, configA.storage.capacityGb !== configB.storage.capacityGb));
    rows.push(this.specRow('Storage tier', ServiceCategory.STORAGE, configA.storage.tier, configB.storage.tier, configA.storage.tier !== configB.storage.tier));

    rows.push(this.specRow('Database engine', ServiceCategory.DATABASE, configA.database.engine, configB.database.engine, configA.database.engine !== configB.database.engine));
    rows.push(this.specRow('Database vCPU', ServiceCategory.DATABASE, `${configA.database.vCpu}`, `${configB.database.vCpu}`, configA.database.vCpu !== configB.database.vCpu));
    rows.push(this.specRow('Database storage (SSD)', ServiceCategory.DATABASE, `${fmt(configA.database.storageGb)} GB`, `${fmt(configB.database.storageGb)} GB`, configA.database.storageGb !== configB.database.storageGb));
    rows.push(this.specRow('Multi-AZ HA', ServiceCategory.DATABASE, configA.database.multiAz ? 'Yes' : 'Single zone', configB.database.multiAz ? 'Yes' : 'Single zone', configA.database.multiAz !== configB.database.multiAz));

    rows.push(this.specRow('Internet egress', ServiceCategory.NETWORKING, `${fmt(configA.networking.egressGbPerMonth)} GB/mo`, `${fmt(configB.networking.egressGbPerMonth)} GB/mo`, configA.networking.egressGbPerMonth !== configB.networking.egressGbPerMonth));
    rows.push(this.specRow('Load balancers', ServiceCategory.NETWORKING, `${configA.networking.loadBalancersCount}`, `${configB.networking.loadBalancersCount}`, configA.networking.loadBalancersCount !== configB.networking.loadBalancersCount));

    rows.push(this.specRow('K8s clusters', ServiceCategory.KUBERNETES, `${configA.kubernetes.clustersCount}`, `${configB.kubernetes.clustersCount}`, configA.kubernetes.clustersCount !== configB.kubernetes.clustersCount));
    rows.push(this.specRow('K8s worker nodes', ServiceCategory.KUBERNETES, `${configA.kubernetes.workerNodesPerCluster}`, `${configB.kubernetes.workerNodesPerCluster}`, configA.kubernetes.workerNodesPerCluster !== configB.kubernetes.workerNodesPerCluster));

    // Provider monthly deltas (B − A)
    const providers = [CloudProvider.AWS, CloudProvider.AZURE, CloudProvider.GCP];
    const providerDeltas: ProviderMonthlyDelta[] = providers.map((p) => {
      const a = matrixA.providers[p].monthlyTotal;
      const b = matrixB.providers[p].monthlyTotal;
      const delta = Number((b - a).toFixed(2));
      return {
        provider: p,
        aMonthly: a,
        bMonthly: b,
        delta,
        deltaPercent: a > 0 ? Math.round((delta / a) * 100) : 0
      };
    });

    // Compare "best provider" totals: the lowest monthly TCO achievable on each side
    const cheapestA = matrixA.cheapestMonthlyProvider;
    const cheapestB = matrixB.cheapestMonthlyProvider;
    const aBest = matrixA.providers[cheapestA].monthlyTotal;
    const bBest = matrixB.providers[cheapestB].monthlyTotal;
    const monthlyDelta = Number((bBest - aBest).toFixed(2));
    const annualDelta = Number((monthlyDelta * 12).toFixed(2));
    const threeYearDelta = Number((monthlyDelta * 36).toFixed(2));

    const winner: 'A' | 'B' | 'TIE' = Math.abs(monthlyDelta) < 0.01 ? 'TIE' : monthlyDelta > 0 ? 'A' : 'B';
    const winnerProvider = winner === 'A' ? cheapestA : winner === 'B' ? cheapestB : null;
    const savingsPerMonth = Math.abs(monthlyDelta);
    const savingsPercent = Math.max(aBest, bBest) > 0 ? Math.round((savingsPerMonth / Math.max(aBest, bBest)) * 100) : 0;

    // Hotspot label for the modal summary
    const bigA = this.hotspot(matrixA, 'A');
    const bigB = this.hotspot(matrixB, 'B');
    const hotspotLabel = winner === 'TIE'
      ? 'Both architectures land within $1/mo — a true tie.'
      : winner === 'B'
        ? `Scenario B is ${fmt(savingsPerMonth)}/mo cheaper (${savingsPercent}%): ${bigB}`
        : `Scenario A is ${fmt(savingsPerMonth)}/mo cheaper (${savingsPercent}%): ${bigA}`;

    return {
      matrixA,
      matrixB,
      rows,
      providerDeltas,
      monthlyDelta,
      annualDelta,
      threeYearDelta,
      winner,
      winnerProvider,
      savingsPerMonth,
      savingsPerYear: savingsPerMonth * 12,
      savingsThreeYear: savingsPerMonth * 36,
      savingsPercent,
      hotspotLabel
    };
  }

  private static hotspot(matrix: ComparisonMatrixResult, label: 'A' | 'B'): string {
    const totals = (Object.keys(matrix.providers) as CloudProvider[]).map(
      (p) => matrix.providers[p].monthlyTotal
    );
    const best = Math.min(...totals);
    const cats = (Object.keys(SERVICE_CATEGORY_METAS) as ServiceCategory[]).map((cat) => ({
      cat,
      cost: matrix.providers[matrix.cheapestMonthlyProvider].categoryBreakdown[cat] ?? 0
    }));
    const top = cats.sort((x, y) => y.cost - x.cost)[0];
    const pct = best > 0 ? Math.round(((top?.cost ?? 0) / best) * 100) : 0;
    return `${SERVICE_CATEGORY_METAS[top?.cat ?? ServiceCategory.COMPUTE].name.split('/')[0]} drives ${pct}% of monthly spend on the cheapest provider.`;
  }

  private static specRow(label: string, category: ServiceCategory, aValue: string, bValue: string, changed: boolean): DiffRow {
    return { category, label, aValue, bValue, changed, trend: 'same' };
  }
}

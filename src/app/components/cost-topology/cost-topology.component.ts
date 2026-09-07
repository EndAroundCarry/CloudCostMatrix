import { Component, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EstimatorStore } from '../../state/estimator.store';
import { ServiceCategory } from '../../core/models/service-category.enum';
import { ArchitectureEstimateConfig } from '../../core/models/pricing.model';
import { CostCalculatorEngine } from '../../core/engine/cost-calculator.engine';

interface TopologyNode {
  id: ServiceCategory;
  title: string;
  icon: string;
  color: string;
  glow: string;
  description: string;
}

const NODES: TopologyNode[] = [
  {
    id: ServiceCategory.COMPUTE,
    title: 'Compute Cluster',
    icon: 'memory',
    color: '#3B82F6',
    glow: 'shadow-blue-500/20',
    description: 'Virtual machines or Kubernetes worker nodes'
  },
  {
    id: ServiceCategory.DATABASE,
    title: 'Database',
    icon: 'storage',
    color: '#10B981',
    glow: 'shadow-emerald-500/20',
    description: 'Managed relational database'
  },
  {
    id: ServiceCategory.STORAGE,
    title: 'Object Storage',
    icon: 'cloud_queue',
    color: '#A855F7',
    glow: 'shadow-purple-500/20',
    description: 'S3 / Blob / Cloud Storage'
  },
  {
    id: ServiceCategory.NETWORKING,
    title: 'Traffic & Egress',
    icon: 'public',
    color: '#F59E0B',
    glow: 'shadow-amber-500/20',
    description: 'Load balancers, DNS, data transfer'
  },
  {
    id: ServiceCategory.KUBERNETES,
    title: 'Kubernetes',
    icon: 'hub',
    color: '#06B6D4',
    glow: 'shadow-cyan-500/20',
    description: 'Managed control plane (EKS / AKS / GKE)'
  }
];

@Component({
  selector: 'app-cost-topology',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7 shadow-xl" aria-labelledby="topology-heading">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 id="topology-heading" class="text-lg sm:text-xl font-bold text-white tracking-tight m-0 flex items-center gap-2">
            <mat-icon class="text-blue-400">account_tree</mat-icon>
            <span>Cost Topology & Budget Hotspot Map</span>
          </h2>
          <p class="text-xs text-slate-400 m-0 mt-0.5">
            Live budget allocation across your architecture on the cheapest provider — click a node to jump to its configurator.
          </p>
        </div>
        <span class="inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-full"
          [class.bg-emerald-500/10]="true" [class.text-emerald-400]="true" [class.border]="true" [class.border-emerald-500/20]="true">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Hotspot: {{ hotspotLabel() }}
        </span>
      </div>

      <!-- Flow diagram -->
      <div class="relative flex flex-col lg:flex-row items-stretch gap-3">
        @for (node of visibleNodes(); track node.id) {
          @let cost = nodeCost(node.id);
          @let pct = nodePercent(node.id);
          @let isHotspot = pct >= hotspotThreshold() && pct > 0;

          <div class="relative flex-1 min-w-[150px]">
            <!-- Connector arrow (right, except last) -->
            @if (!$last) {
              <div class="hidden lg:flex absolute top-1/2 -right-3.5 z-10 -translate-y-1/2 text-slate-600">
                <mat-icon class="!text-sm">arrow_forward</mat-icon>
              </div>
            }

            <button
              type="button"
              (click)="focusNode(node.id)"
              [class.ring-2]="isHotspot"
              [class.ring-red-500/60]="isHotspot"
              class="w-full text-left rounded-2xl p-4 border transition-all cursor-pointer bg-slate-800/50 group"
              [class.border-red-500/50]="isHotspot"
              [class.hover:border-slate-500]="!isHotspot"
              [title]="'Focus ' + node.title + ' in the configurator'">

              <!-- Heat intensity bar -->
              <div class="absolute inset-x-0 top-0 h-1.5 rounded-t-2xl overflow-hidden opacity-90">
                <div class="h-full transition-all duration-700"
                  [style.width.%]="pct"
                  [style.background]="heatColor(pct, node.color)"></div>
              </div>

              <div class="flex items-center justify-between mb-3">
                <span class="w-9 h-9 rounded-xl flex items-center justify-center"
                  [style.background]="node.color + '22'"
                  [style.color]="node.color">
                  <mat-icon class="!text-lg">{{ node.icon }}</mat-icon>
                </span>
                @if (isHotspot) {
                  <span class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-black border border-red-500/30">
                    <mat-icon class="!text-[11px]">local_fire_department</mat-icon>
                    HOTSPOT
                  </span>
                } @else if (!isActive(node.id)) {
                  <span class="text-[10px] font-bold text-slate-600 uppercase">Excluded</span>
                } @else {
                  <span class="text-[10px] font-bold text-slate-500 uppercase">Active</span>
                }
              </div>

              <div class="font-bold text-white text-sm mb-0.5 flex items-center gap-1.5">
                <span>{{ node.title }}</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-snug m-0 mb-3">{{ node.description }}</p>

              <!-- Budget badge -->
              <div class="rounded-lg px-2.5 py-1.5 text-xs font-black flex items-center justify-between"
                [style.background]="node.color + '14'"
                [style.color]="node.color">
                <span>{{ formatMoney(cost) }}</span>
                <span class="text-[10px] opacity-80 font-bold">/mo · {{ pct }}%</span>
              </div>
            </button>
          </div>
        }
      </div>

      <!-- Legend: scale note -->
      <div class="mt-4 text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
        <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
        <span>Cost hotspot (largest budget share).</span>
        <span class="mx-1 text-slate-700">|</span>
        <span>Percentages are share of total monthly spend on the lowest-TCO provider ({{ cheapestProviderName() }}).</span>
      </div>
    </section>
  `
})
export class CostTopologyComponent {
  protected readonly store = inject(EstimatorStore);

  /**
   * Optional explicit architecture config (used on blueprint detail pages).
   * When omitted, the live configurator state drives the topology reactively.
   */
  readonly config = input<ArchitectureEstimateConfig | null>(null);

  readonly nodes = NODES;

  /** Effective config + full matrix for whichever source is active */
  private readonly effectiveConfig = computed(() => this.config() ?? this.store.config());
  private readonly matrix = computed(() => CostCalculatorEngine.calculateFullMatrix(this.effectiveConfig()));

  /** Monthly costs per category on the cheapest provider */
  protected readonly categoryCosts = computed<Record<ServiceCategory, number>>(() => {
    const m = this.matrix();
    const prov = m.cheapestMonthlyProvider;
    const bd = m.providers[prov].categoryBreakdown;
    return {
      [ServiceCategory.COMPUTE]: bd[ServiceCategory.COMPUTE] ?? 0,
      [ServiceCategory.STORAGE]: bd[ServiceCategory.STORAGE] ?? 0,
      [ServiceCategory.DATABASE]: bd[ServiceCategory.DATABASE] ?? 0,
      [ServiceCategory.NETWORKING]: bd[ServiceCategory.NETWORKING] ?? 0,
      [ServiceCategory.KUBERNETES]: bd[ServiceCategory.KUBERNETES] ?? 0
    };
  });

  protected readonly totalCost = computed(() => {
    const costs = this.categoryCosts();
    return Object.values(costs).reduce((s, v) => s + v, 0);
  });

  protected readonly visibleNodes = computed(() => this.nodes.filter((n) => this.nodeCost(n.id) > 0 || this.isActive(n.id)));

  protected readonly hotspotLabel = computed(() => {
    const costs = this.categoryCosts();
    const total = this.totalCost();
    if (total <= 0) return 'No active services';
    const maxCat = (Object.keys(costs) as ServiceCategory[]).reduce((best, c) =>
      costs[c] > costs[best] ? c : best
    );
    const pct = Math.round((costs[maxCat] / total) * 100);
    const node = NODES.find((n) => n.id === maxCat);
    return `${node?.title ?? maxCat} is ${pct}% of total spend`;
  });

  protected readonly cheapestProviderName = computed(() => {
    const metas: Record<string, string> = { AWS: 'AWS', AZURE: 'Azure', GCP: 'GCP' };
    return metas[this.matrix().cheapestMonthlyProvider] ?? 'the cheapest provider';
  });

  nodeCost(id: ServiceCategory): number {
    return this.categoryCosts()[id] ?? 0;
  }

  nodePercent(id: ServiceCategory): number {
    const total = this.totalCost();
    if (total <= 0) return 0;
    return Math.round(((this.nodeCost(id) / total) * 100));
  }

  hotspotThreshold(): number {
    return 30;
  }

  heatColor(pct: number, base: string): string {
    if (pct >= 50) return '#EF4444'; // red
    if (pct >= 30) return '#F97316'; // orange
    return base;
  }

  isActive(id: ServiceCategory): boolean {
    return !!this.effectiveConfig().activeCategories[id];
  }

  formatMoney(v: number): string {
    return this.store.formatMoney(v);
  }

  focusNode(id: ServiceCategory): void {
    if (this.config()) {
      // Blueprint pages don't have a live configurator in view — just toast.
      this.store.showToast(`${this.nodeTitle(id)} accounts for ${this.nodePercent(id)}% of this blueprint's spend.`);
      return;
    }
    this.store.setActiveCategory(id);
    this.store.showToast(`Configurator focused on ${this.nodeTitle(id)}.`);
  }

  private nodeTitle(id: ServiceCategory): string {
    return NODES.find((n) => n.id === id)?.title ?? id;
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EstimatorStore } from '../../state/estimator.store';
import { CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { ServiceCategory, SERVICE_CATEGORY_METAS } from '../../core/models/service-category.enum';
import { ComparisonMatrixResult, ServiceCostBreakdown } from '../../core/models/pricing.model';
import { EFFECTIVE_CATALOGS } from '../../core/engine/catalog/pricing-catalog.resolver';
import { getProviderFreshness } from '../../core/engine/catalog/provider-verification';
import { AffiliateCtaComponent } from '../affiliate-cta/affiliate-cta.component';

/** One row of the transposed matrix: a provider + its cost per active category. */
interface ProviderRow {
  provider: CloudProvider;
  region: string;
  total: ComparisonMatrixResult['providers'][CloudProvider];
  cells: Record<ServiceCategory, ServiceCostBreakdown | undefined>;
  isCheapest: boolean;
  hasGap: boolean;
  rank: number;
}

/**
 * Builds the transposed (provider-per-row) view of the matrix. Extracted as a
 * pure function — independently testable without a TestBed — rather than
 * expressed inline in the template, since it's the highest-risk new logic
 * (rank ordering + gap handling) added by the N-provider matrix table.
 */
export function buildProviderRows(
  matrix: ComparisonMatrixResult,
  selected: CloudProvider[],
  activeCategoryKeys: ServiceCategory[]
): ProviderRow[] {
  const ranked = [...selected].sort((a, b) => matrix.providers[a].monthlyTotal - matrix.providers[b].monthlyTotal);
  const comparableRanked = ranked.filter((p) => matrix.comparableProviders.includes(p));
  return ranked.map((provider) => {
    const total = matrix.providers[provider];
    const cells: Record<ServiceCategory, ServiceCostBreakdown | undefined> = {} as any;
    for (const cat of activeCategoryKeys) {
      cells[cat] = matrix.breakdowns.find((b) => b.category === cat && b.provider === provider);
    }
    const rankIndex = comparableRanked.indexOf(provider);
    return {
      provider,
      region: EFFECTIVE_CATALOGS[provider].region,
      total,
      cells,
      isCheapest: matrix.cheapestMonthlyProvider === provider && !total.hasCoverageGap,
      hasGap: total.hasCoverageGap,
      rank: rankIndex >= 0 ? rankIndex + 1 : -1
    };
  });
}

/** Cheapest supported monthlyCost among the given breakdowns for a category — Infinity-safe. */
export function getMinCostForCategory(rows: ProviderRow[], cat: ServiceCategory): number {
  const values = rows
    .map((r) => r.cells[cat])
    .filter((bd): bd is ServiceCostBreakdown => !!bd && bd.supported)
    .map((bd) => bd.monthlyCost);
  return values.length ? Math.min(...values) : NaN;
}

@Component({
  selector: 'app-matrix-table',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatChipsModule, MatTooltipModule, AffiliateCtaComponent],
  template: `
    <div class="w-full">
      <!-- Matrix Header Summary -->
      <div class="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 m-0">
            <span>Side-by-Side Cost Matrix</span>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
              Monthly & Annual TCO
            </span>
          </h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-1 mb-0">
            Comparing line-item equivalents across {{ regionSummary() }}.
          </p>
        </div>

        <!-- Savings Badge -->
        @if (store.matrix().monthlyMaxSavings > 0) {
          <div class="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-lg shadow-emerald-950/40">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <mat-icon>trending_down</mat-icon>
            </div>
            <div>
              <div class="text-xs font-bold uppercase tracking-wider text-emerald-400">Max Potential Savings</div>
              <div class="text-lg font-black text-white">
                {{ store.formatMoney(store.matrix().monthlyMaxSavings) }}/mo
                <span class="text-xs font-semibold text-emerald-400">({{ store.matrix().monthlyMaxSavingsPercent }}% delta)</span>
              </div>
            </div>
          </div>
        }
      </div>

      @if (store.matrix().allSelectedHaveGaps) {
        <div class="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-300 flex items-center gap-2">
          <mat-icon class="!text-base">warning</mat-icon>
          <span>None of your selected providers fully support this configuration — ranking is shown for reference only. Adjust the spec or your provider selection for a fair comparison.</span>
        </div>
      }

      <!-- Hero winner card + rank strip -->
      @let rows = providerRows();
      @if (winnerRow(); as winner) {
        <div class="relative rounded-2xl bg-slate-800/70 border border-emerald-400/60 ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/10 p-5 backdrop-blur-sm mb-4">
          <div class="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500 on-vivid font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-md">
            <mat-icon class="!text-xs leading-none">star</mat-icon>
            <span>Lowest TCO</span>
          </div>
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                   [style.background-color]="providerMetas[winner.provider].badgeBg"
                   [style.color]="providerMetas[winner.provider].primaryColor"
                   [style.border]="'1px solid ' + providerMetas[winner.provider].badgeBorder">
                <mat-icon class="!text-base">{{ providerMetas[winner.provider].icon }}</mat-icon>
              </div>
              <div>
                <h3 class="font-bold text-white text-base m-0">{{ providerMetas[winner.provider].name }}</h3>
                <span class="text-xs text-slate-400">{{ winner.region }}</span>
              </div>
            </div>
          </div>
          <div class="mt-4 mb-4">
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-extrabold text-white tracking-tight">{{ store.formatMoney(winner.total.monthlyTotal) }}</span>
              <span class="text-xs font-semibold text-slate-400">/ month</span>
            </div>
            <div class="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>Annual: <strong class="text-slate-200">{{ store.formatMoney(winner.total.annualTotal) }}</strong></span>
              <span>3-Yr: <strong class="text-slate-200">{{ store.formatMoney(winner.total.threeYearTotal) }}</strong></span>
            </div>
          </div>
          <div class="space-y-1.5 pt-3 border-t border-slate-700/60 text-xs">
            @for (cat of activeCategoryKeys; track cat) {
              @if (store.config().activeCategories[cat]) {
                <div class="flex items-center justify-between text-slate-300">
                  <span class="text-slate-400 flex items-center gap-1">
                    <mat-icon class="!text-xs text-slate-500">{{ categoryMetas[cat].icon }}</mat-icon>
                    {{ categoryMetas[cat].shortName }}
                  </span>
                  <span class="font-semibold text-white">{{ store.formatMoney(winner.total.categoryBreakdown[cat]) }}</span>
                </div>
              }
            }
          </div>
          <div class="mt-4 pt-3 border-t border-slate-700/60">
            <p class="text-xs text-slate-400 leading-relaxed m-0 italic">
              💡 {{ winner.total.highlightNotes[0] }}
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-700/60">
            <app-affiliate-cta [provider]="winner.provider" variant="primary" context="matrix-hero"></app-affiliate-cta>
          </div>
        </div>
      }

      <!-- Rank strip -->
      <div class="grid gap-2 mb-8">
        @for (row of rows; track row.provider) {
          @if (row.provider !== winnerRow()?.provider) {
            @let meta = providerMetas[row.provider];
            <div class="flex items-center gap-3 rounded-xl bg-slate-800/50 border border-slate-700/60 px-4 py-2.5"
                 [class.opacity-60]="row.hasGap">
              <span class="w-6 text-center text-xs font-black text-slate-500">{{ row.rank > 0 ? '#' + row.rank : '—' }}</span>
              <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    [style.background-color]="meta.badgeBg" [style.color]="meta.primaryColor">
                <mat-icon class="!text-sm">{{ meta.icon }}</mat-icon>
              </span>
              <span class="text-sm font-bold text-white flex-1 truncate">{{ meta.shortName }}</span>
              <span class="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide cursor-help"
                    [class.text-emerald-400]="freshness(row.provider).tier === 'LIVE'"
                    [class.text-blue-400]="freshness(row.provider).tier === 'VERIFIED'"
                    [class.text-amber-400]="freshness(row.provider).tier === 'ESTIMATE'"
                    [matTooltip]="freshness(row.provider).caveats.join(' ')">
                {{ freshness(row.provider).label }}
              </span>
              @if (row.hasGap) {
                <span class="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <mat-icon class="!text-xs">warning</mat-icon> Not ranked — coverage gap
                </span>
              }
              <span class="text-sm font-black text-white">{{ store.formatMoney(row.total.monthlyTotal) }}<span class="text-[10px] font-normal text-slate-400">/mo</span></span>
              <div class="hidden sm:block w-24 h-1.5 rounded-full bg-slate-900/60 overflow-hidden">
                <div class="h-full rounded-full" [style.width.%]="deltaBarPercent(row)" [style.background]="meta.primaryColor"></div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Transposed Line-by-Line Service Detail Table: providers as rows, categories as columns -->
      <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <table class="w-full text-left text-sm border-collapse" [attr.aria-label]="tableAriaLabel()">
          <caption class="sr-only">Detailed breakdown of cloud costs by service category, one row per provider</caption>
          <thead>
            <tr class="border-b border-slate-800 bg-slate-800/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th scope="col" class="py-3.5 px-4 sm:px-6 sticky left-0 bg-slate-800/90 z-10">Provider</th>
              @for (cat of activeCategoryKeys; track cat) {
                @if (store.config().activeCategories[cat]) {
                  <th scope="col" class="py-3.5 px-4">{{ categoryMetas[cat].shortName }}</th>
                }
              }
              <th scope="col" class="py-3.5 px-4">Monthly TCO</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            @for (row of rows; track row.provider) {
              @let meta = providerMetas[row.provider];
              <tr class="hover:bg-slate-800/30 transition-colors" [class.opacity-60]="row.hasGap">
                <th scope="row" class="py-4 px-4 sm:px-6 align-top sticky left-0 bg-slate-900 z-10 font-normal">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                         [style.background-color]="meta.badgeBg" [style.color]="meta.primaryColor">
                      <mat-icon class="!text-sm">{{ meta.icon }}</mat-icon>
                    </div>
                    <div>
                      <div class="font-bold text-white text-sm flex items-center gap-1.5">
                        {{ meta.shortName }}
                        <span class="w-1.5 h-1.5 rounded-full cursor-help"
                              [class.bg-emerald-400]="freshness(row.provider).tier === 'LIVE'"
                              [class.bg-blue-400]="freshness(row.provider).tier === 'VERIFIED'"
                              [class.bg-amber-400]="freshness(row.provider).tier === 'ESTIMATE'"
                              [matTooltip]="freshness(row.provider).label + ' — ' + freshness(row.provider).caveats.join(' ')"></span>
                      </div>
                      <div class="text-[11px] text-slate-500">{{ row.region }}</div>
                    </div>
                  </div>
                </th>
                @for (cat of activeCategoryKeys; track cat) {
                  @if (store.config().activeCategories[cat]) {
                    @let bd = row.cells[cat];
                    @let minCost = minCostByCategory()[cat];
                    <td class="py-4 px-4 align-top" [class.bg-slate-800]="bd && !bd.supported">
                      @if (bd && bd.supported) {
                        <div class="font-extrabold text-white text-base" [class.text-emerald-400]="bd.monthlyCost === minCost">
                          {{ store.formatMoney(bd.monthlyCost) }}<span class="text-xs text-slate-400 font-normal">/mo</span>
                        </div>
                        <div class="text-xs font-semibold text-slate-300 mt-1" [matTooltip]="bd.details.join(' · ')">{{ bd.instanceTypeOrTier }}</div>
                      } @else if (bd) {
                        <div class="text-slate-500 italic text-sm" [matTooltip]="bd.unsupportedNote || 'Not offered by this provider.'"
                             [attr.aria-label]="meta.shortName + ' does not offer ' + categoryMetas[cat].name + '. ' + (bd.unsupportedNote || '')">
                          <span aria-hidden="true">—</span> Not offered
                        </div>
                      } @else {
                        <span class="text-slate-600">—</span>
                      }
                    </td>
                  }
                }
                <td class="py-4 px-4 align-top">
                  <div class="font-black text-white text-base">{{ store.formatMoney(row.total.monthlyTotal) }}</div>
                  <div class="text-[11px] text-slate-500">{{ store.formatMoney(row.total.annualTotal) }}/yr</div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class MatrixTableComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly providerMetas = PROVIDER_METAS;
  protected readonly categoryMetas = SERVICE_CATEGORY_METAS;
  protected readonly activeCategoryKeys = [
    ServiceCategory.COMPUTE,
    ServiceCategory.STORAGE,
    ServiceCategory.DATABASE,
    ServiceCategory.NETWORKING,
    ServiceCategory.KUBERNETES
  ];

  protected readonly CloudProvider = CloudProvider;

  protected readonly providerRows = () =>
    buildProviderRows(this.store.matrix(), this.store.matrix().selectedProviders, this.activeCategoryKeys.filter((c) => this.store.config().activeCategories[c]));

  protected readonly winnerRow = () => {
    const matrix = this.store.matrix();
    return this.providerRows().find((r) => r.provider === matrix.cheapestMonthlyProvider);
  };

  protected readonly minCostByCategory = () => {
    const rows = this.providerRows();
    const out = {} as Record<ServiceCategory, number>;
    for (const cat of this.activeCategoryKeys) {
      out[cat] = getMinCostForCategory(rows, cat);
    }
    return out;
  };

  protected readonly regionSummary = () => {
    const matrix = this.store.matrix();
    const names = matrix.selectedProviders.map((p) => `${this.providerMetas[p].shortName} ${EFFECTIVE_CATALOGS[p].region}`);
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
  };

  protected readonly tableAriaLabel = () => `Cloud cost comparison table across ${this.regionSummary()}`;

  freshness(provider: CloudProvider) {
    return getProviderFreshness(provider);
  }

  deltaBarPercent(row: ReturnType<typeof buildProviderRows>[number]): number {
    const rows = this.providerRows();
    const max = Math.max(...rows.map((r) => r.total.monthlyTotal), 1);
    return Math.max(4, Math.min(100, Math.round((row.total.monthlyTotal / max) * 100)));
  }
}

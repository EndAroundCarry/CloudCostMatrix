import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { EstimatorStore } from '../../state/estimator.store';
import { CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { ServiceCategory, SERVICE_CATEGORY_METAS } from '../../core/models/service-category.enum';

@Component({
  selector: 'app-matrix-table',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatChipsModule],
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
            Comparing line-item equivalents across AWS us-east-1, Azure East US, and GCP us-central1.
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

      <!-- 3 Provider Totals Card Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        @for (provider of providers; track provider) {
          @let total = store.matrix().providers[provider];
          @let meta = providerMetas[provider];
          @let isCheapest = store.matrix().cheapestMonthlyProvider === provider;

          <div 
            [class.ring-2]="isCheapest"
            [class.ring-emerald-400]="isCheapest"
            [class.shadow-emerald-500/10]="isCheapest"
            class="relative rounded-2xl bg-slate-800/70 border border-slate-700/80 p-5 backdrop-blur-sm transition-all hover:border-slate-600 shadow-lg">
            
            <!-- Cheapest Winner Ribbon -->
            @if (isCheapest) {
              <div class="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500 on-vivid font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-md">
                <mat-icon class="!text-xs leading-none">star</mat-icon>
                <span>Lowest TCO</span>
              </div>
            }

            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                     [style.background-color]="meta.badgeBg"
                     [style.color]="meta.primaryColor"
                     [style.border]="'1px solid ' + meta.badgeBorder">
                  <mat-icon class="!text-base">{{ meta.icon }}</mat-icon>
                </div>
                <div>
                  <h3 class="font-bold text-white text-base m-0">{{ meta.name }}</h3>
                  <span class="text-xs text-slate-400">{{ meta.shortName }} Region Benchmark</span>
                </div>
              </div>
            </div>

            <!-- Price Figures -->
            <div class="mt-4 mb-4">
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-extrabold text-white tracking-tight">{{ store.formatMoney(total.monthlyTotal) }}</span>
                <span class="text-xs font-semibold text-slate-400">/ month</span>
              </div>
              <div class="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span>Annual: <strong class="text-slate-200">{{ store.formatMoney(total.annualTotal) }}</strong></span>
                <span>3-Yr: <strong class="text-slate-200">{{ store.formatMoney(total.threeYearTotal) }}</strong></span>
              </div>
            </div>

            <!-- Category mini-breakdown pills -->
            <div class="space-y-1.5 pt-3 border-t border-slate-700/60 text-xs">
              @for (cat of activeCategoryKeys; track cat) {
                @if (store.config().activeCategories[cat]) {
                  <div class="flex items-center justify-between text-slate-300">
                    <span class="text-slate-400 flex items-center gap-1">
                      <mat-icon class="!text-xs text-slate-500">{{ categoryMetas[cat].icon }}</mat-icon>
                      {{ categoryMetas[cat].name.split('/')[0] }}
                    </span>
                    <span class="font-semibold text-white">{{ store.formatMoney(total.categoryBreakdown[cat]) }}</span>
                  </div>
                }
              }
            </div>

            <!-- Key Provider Advantage -->
            <div class="mt-4 pt-3 border-t border-slate-700/60">
              <p class="text-xs text-slate-400 leading-relaxed m-0 italic">
                💡 {{ total.highlightNotes[0] }}
              </p>
            </div>
          </div>
        }
      </div>

      <!-- Line-by-Line Service Detail Table -->
      <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <table class="w-full text-left text-sm border-collapse" aria-label="Cloud Cost Comparison Table across AWS, Azure, and Google Cloud">
          <caption class="sr-only">Detailed breakdown of cloud costs by service category across AWS, Azure, and GCP</caption>
          <thead>
            <tr class="border-b border-slate-800 bg-slate-800/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <th scope="col" class="py-3.5 px-4 sm:px-6">Service Category</th>
              <th scope="col" class="py-3.5 px-4 text-amber-400">AWS (Amazon)</th>
              <th scope="col" class="py-3.5 px-4 text-blue-400">Azure (Microsoft)</th>
              <th scope="col" class="py-3.5 px-4 text-sky-400">GCP (Google Cloud)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            @for (cat of activeCategoryKeys; track cat) {
              @if (store.config().activeCategories[cat]) {
                @let awsBd = getBreakdown(cat, CloudProvider.AWS);
                @let azureBd = getBreakdown(cat, CloudProvider.AZURE);
                @let gcpBd = getBreakdown(cat, CloudProvider.GCP);
                @let minCatCost = getMinCost(awsBd?.monthlyCost, azureBd?.monthlyCost, gcpBd?.monthlyCost);

                <tr class="hover:bg-slate-800/30 transition-colors">
                  <!-- Category Info Column -->
                  <td class="py-4 px-4 sm:px-6 align-top">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
                        <mat-icon class="!text-sm">{{ categoryMetas[cat].icon }}</mat-icon>
                      </div>
                      <div>
                        <div class="font-bold text-white text-sm">{{ categoryMetas[cat].name }}</div>
                        <div class="text-xs text-slate-400">{{ categoryMetas[cat].description }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- AWS Column -->
                  <td class="py-4 px-4 align-top">
                    <div class="font-extrabold text-white text-base" [class.text-emerald-400]="awsBd?.monthlyCost === minCatCost">
                      {{ store.formatMoney(awsBd?.monthlyCost) }}<span class="text-xs text-slate-400 font-normal">/mo</span>
                    </div>
                    <div class="text-xs font-semibold text-slate-300 mt-1">{{ awsBd?.instanceTypeOrTier }}</div>
                    @for (detail of awsBd?.details; track detail) {
                      <div class="text-xs text-slate-400 leading-tight mt-0.5">{{ detail }}</div>
                    }
                  </td>

                  <!-- Azure Column -->
                  <td class="py-4 px-4 align-top">
                    <div class="font-extrabold text-white text-base" [class.text-emerald-400]="azureBd?.monthlyCost === minCatCost">
                      {{ store.formatMoney(azureBd?.monthlyCost) }}<span class="text-xs text-slate-400 font-normal">/mo</span>
                    </div>
                    <div class="text-xs font-semibold text-slate-300 mt-1">{{ azureBd?.instanceTypeOrTier }}</div>
                    @for (detail of azureBd?.details; track detail) {
                      <div class="text-xs text-slate-400 leading-tight mt-0.5">{{ detail }}</div>
                    }
                  </td>

                  <!-- GCP Column -->
                  <td class="py-4 px-4 align-top">
                    <div class="font-extrabold text-white text-base" [class.text-emerald-400]="gcpBd?.monthlyCost === minCatCost">
                      {{ store.formatMoney(gcpBd?.monthlyCost) }}<span class="text-xs text-slate-400 font-normal">/mo</span>
                    </div>
                    <div class="text-xs font-semibold text-slate-300 mt-1">{{ gcpBd?.instanceTypeOrTier }}</div>
                    @for (detail of gcpBd?.details; track detail) {
                      <div class="text-xs text-slate-400 leading-tight mt-0.5">{{ detail }}</div>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class MatrixTableComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly providers = [CloudProvider.AWS, CloudProvider.AZURE, CloudProvider.GCP];
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

  getBreakdown(cat: ServiceCategory, provider: CloudProvider) {
    return this.store.matrix().breakdowns.find(b => b.category === cat && b.provider === provider);
  }

  getMinCost(a?: number, b?: number, c?: number): number {
    const valid = [a, b, c].filter((v): v is number => typeof v === 'number');
    return Math.min(...valid);
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EstimatorStore } from '../../state/estimator.store';
import { CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';

@Component({
  selector: 'app-tco-chart',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-xl">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-base sm:text-lg font-bold text-white tracking-tight m-0 flex items-center gap-2">
            <mat-icon class="text-emerald-400">bar_chart</mat-icon>
            <span>Cost Comparison Visualizer</span>
          </h2>
          <p class="text-xs text-slate-400 m-0">Visual TCO breakdown across {{ providers().length }} selected provider{{ providers().length === 1 ? '' : 's' }}.</p>
        </div>
      </div>

      <!-- Horizontal Comparison Bars -->
      <div class="space-y-4">
        @let maxVal = maxMonthly();
        @for (provider of providers(); track provider) {
          @let meta = providerMetas[provider];
          @let total = store.matrix().providers[provider].monthlyTotal;
          <div>
            <div class="flex items-center justify-between text-xs font-semibold mb-1">
              <span class="flex items-center gap-1.5" [style.color]="meta.primaryColor">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background-color]="meta.primaryColor"></span>
                {{ meta.name }}
              </span>
              <span class="text-white font-bold">{{ store.formatMoney(total) }}/mo</span>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                [style.width.%]="getPercent(total, maxVal)"
                [style.background]="meta.primaryColor">
              </div>
            </div>
          </div>
        }
      </div>

      <!-- 3-Year TCO Summary Comparison Cards -->
      <div class="mt-6 pt-5 border-t border-slate-800 grid gap-3 text-center" [style.grid-template-columns]="'repeat(auto-fit, minmax(110px, 1fr))'">
        @for (provider of providers(); track provider) {
          @let meta = providerMetas[provider];
          <div class="rounded-xl bg-slate-800/40 p-3 border border-slate-700/50">
            <div class="text-[11px] font-bold text-slate-400">{{ meta.shortName }} 3-Yr TCO</div>
            <div class="text-sm sm:text-base font-extrabold mt-0.5" [style.color]="meta.primaryColor">
              {{ store.formatMoney(store.matrix().providers[provider].threeYearTotal) }}
            </div>
          </div>
        }
      </div>

    </div>
  `
})
export class TcoChartComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly CloudProvider = CloudProvider;
  protected readonly providerMetas = PROVIDER_METAS;

  protected readonly providers = () => this.store.matrix().selectedProviders;

  maxMonthly(): number {
    const m = this.store.matrix();
    const values = m.selectedProviders.map((p) => m.providers[p].monthlyTotal);
    return Math.max(...values, 1);
  }

  getPercent(val: number, max: number): number {
    return Math.max(5, Math.min(100, Math.round((val / max) * 100)));
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { EstimatorStore } from '../../state/estimator.store';
import { CloudProvider } from '../../core/models/cloud-provider.enum';
import { ServiceCategory, SERVICE_CATEGORY_METAS } from '../../core/models/service-category.enum';

@Component({
  selector: 'app-tco-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-xl">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-base sm:text-lg font-bold text-white tracking-tight m-0 flex items-center gap-2">
            <mat-icon class="text-emerald-400">bar_chart</mat-icon>
            <span>Cost Comparison Visualizer</span>
          </h2>
          <p class="text-xs text-slate-400 m-0">Visual TCO breakdown across AWS, Azure, and Google Cloud.</p>
        </div>
      </div>

      <!-- Horizontal Comparison Bars -->
      <div class="space-y-4">
        <!-- AWS Bar -->
        @let awsTotal = store.matrix().providers[CloudProvider.AWS].monthlyTotal;
        @let maxVal = getMaxMonthly();
        <div>
          <div class="flex items-center justify-between text-xs font-semibold mb-1">
            <span class="text-amber-400 flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-[#FF9900]"></span>
              AWS (Amazon Web Services)
            </span>
            <span class="text-white font-bold">\${{ awsTotal.toLocaleString() }}/mo</span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden">
            <div 
              class="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
              [style.width.%]="getPercent(awsTotal, maxVal)">
            </div>
          </div>
        </div>

        <!-- Azure Bar -->
        @let azureTotal = store.matrix().providers[CloudProvider.AZURE].monthlyTotal;
        <div>
          <div class="flex items-center justify-between text-xs font-semibold mb-1">
            <span class="text-blue-400 flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-[#0078D4]"></span>
              Microsoft Azure
            </span>
            <span class="text-white font-bold">\${{ azureTotal.toLocaleString() }}/mo</span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden">
            <div 
              class="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-500"
              [style.width.%]="getPercent(azureTotal, maxVal)">
            </div>
          </div>
        </div>

        <!-- GCP Bar -->
        @let gcpTotal = store.matrix().providers[CloudProvider.GCP].monthlyTotal;
        <div>
          <div class="flex items-center justify-between text-xs font-semibold mb-1">
            <span class="text-sky-400 flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-[#4285F4]"></span>
              Google Cloud Platform
            </span>
            <span class="text-white font-bold">\${{ gcpTotal.toLocaleString() }}/mo</span>
          </div>
          <div class="w-full bg-slate-800 rounded-full h-3.5 overflow-hidden">
            <div 
              class="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
              [style.width.%]="getPercent(gcpTotal, maxVal)">
            </div>
          </div>
        </div>
      </div>

      <!-- 3-Year TCO Summary Comparison Cards -->
      <div class="mt-6 pt-5 border-t border-slate-800 grid grid-cols-3 gap-3 text-center">
        <div class="rounded-xl bg-slate-800/40 p-3 border border-slate-700/50">
          <div class="text-[11px] font-bold text-slate-400">AWS 3-Yr TCO</div>
          <div class="text-sm sm:text-base font-extrabold text-amber-400 mt-0.5">
            \${{ store.matrix().providers[CloudProvider.AWS].threeYearTotal.toLocaleString() }}
          </div>
        </div>
        <div class="rounded-xl bg-slate-800/40 p-3 border border-slate-700/50">
          <div class="text-[11px] font-bold text-slate-400">Azure 3-Yr TCO</div>
          <div class="text-sm sm:text-base font-extrabold text-blue-400 mt-0.5">
            \${{ store.matrix().providers[CloudProvider.AZURE].threeYearTotal.toLocaleString() }}
          </div>
        </div>
        <div class="rounded-xl bg-slate-800/40 p-3 border border-slate-700/50">
          <div class="text-[11px] font-bold text-slate-400">GCP 3-Yr TCO</div>
          <div class="text-sm sm:text-base font-extrabold text-sky-400 mt-0.5">
            \${{ store.matrix().providers[CloudProvider.GCP].threeYearTotal.toLocaleString() }}
          </div>
        </div>
      </div>

    </div>
  `
})
export class TcoChartComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly CloudProvider = CloudProvider;

  getMaxMonthly(): number {
    const aws = this.store.matrix().providers[CloudProvider.AWS].monthlyTotal;
    const azure = this.store.matrix().providers[CloudProvider.AZURE].monthlyTotal;
    const gcp = this.store.matrix().providers[CloudProvider.GCP].monthlyTotal;
    return Math.max(aws, azure, gcp, 1);
  }

  getPercent(val: number, max: number): number {
    return Math.max(5, Math.min(100, Math.round((val / max) * 100)));
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { EstimatorStore } from '../../state/estimator.store';
import { PROVIDER_METAS } from '../../core/models/cloud-provider.enum';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6 shadow-xl">
      <div class="flex items-center gap-2 mb-4">
        <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
          <mat-icon class="!text-lg">lightbulb</mat-icon>
        </div>
        <div>
          <h2 class="text-base sm:text-lg font-bold text-white tracking-tight m-0">Cloud Optimization Insights</h2>
          <p class="text-xs text-slate-400 m-0">Actionable techniques to decrease your infrastructure bill, per selected provider.</p>
        </div>
      </div>

      <div class="grid gap-4" [style.grid-template-columns]="'repeat(auto-fit, minmax(240px, 1fr))'">
        @for (provider of providers(); track provider) {
          @let meta = providerMetas[provider];
          <div class="rounded-xl bg-slate-800/50 p-4 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background-color]="meta.primaryColor"></span>
                <span class="text-xs font-bold uppercase tracking-wider" [style.color]="meta.primaryColor">{{ meta.optimizationTip.title }}</span>
              </div>
              <p class="text-xs text-slate-300 leading-relaxed m-0">{{ meta.optimizationTip.body }}</p>
            </div>
            <div class="mt-3 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400">
              {{ meta.optimizationTip.footnote }}
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class RecommendationsComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly providerMetas = PROVIDER_METAS;

  protected readonly providers = () => this.store.matrix().selectedProviders;
}

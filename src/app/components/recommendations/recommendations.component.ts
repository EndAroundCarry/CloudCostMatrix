import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { EstimatorStore } from '../../state/estimator.store';
import { CloudProvider } from '../../core/models/cloud-provider.enum';

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
          <p class="text-xs text-slate-400 m-0">Actionable techniques to decrease your infrastructure bill.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- AWS Tip -->
        <div class="rounded-xl bg-slate-800/50 p-4 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#FF9900]"></span>
              <span class="text-xs font-bold text-amber-400 uppercase tracking-wider">AWS Graviton & Savings</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed m-0">
              Migrate general-purpose workloads to AWS Graviton3/4 processors for up to <strong>20% better price/performance</strong> compared to standard x86 instances.
            </p>
          </div>
          <div class="mt-3 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400">
            Combine with Compute Savings Plans for cross-region flexibility.
          </div>
        </div>

        <!-- Azure Tip -->
        <div class="rounded-xl bg-slate-800/50 p-4 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#0078D4]"></span>
              <span class="text-xs font-bold text-blue-400 uppercase tracking-wider">Azure Hybrid Benefit</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed m-0">
              If your organization owns on-premises Windows Server or SQL Server licenses with Software Assurance, apply them to Azure VMs for up to <strong>40% savings</strong>.
            </p>
          </div>
          <div class="mt-3 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400">
            AKS standard tier also waives cluster management fees.
          </div>
        </div>

        <!-- GCP Tip -->
        <div class="rounded-xl bg-slate-800/50 p-4 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="w-2.5 h-2.5 rounded-full bg-[#4285F4]"></span>
              <span class="text-xs font-bold text-sky-400 uppercase tracking-wider">GCP Custom Sizing</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed m-0">
              Avoid paying for predefined instance shapes. Google Cloud allows <strong>custom vCPU & memory ratios</strong> tailored specifically to your exact application footprint.
            </p>
          </div>
          <div class="mt-3 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400">
            First GKE zonal cluster management is completely free.
          </div>
        </div>
      </div>
    </div>
  `
})
export class RecommendationsComponent {
  protected readonly store = inject(EstimatorStore);
}

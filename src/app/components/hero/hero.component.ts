import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EstimatorStore } from '../../state/estimator.store';
import { ARCHITECTURE_BLUEPRINTS, ArchitectureBlueprint } from '../../core/models/blueprints.model';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="relative pt-10 pb-8 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950 overflow-hidden">
      
      <!-- Subtle Ambient Glow -->
      <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-10 left-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto text-center relative z-10">
        
        <!-- Badge -->
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-300 mb-5 shadow-inner">
          <span class="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Multi-Cloud Pricing Matrix 2026 Edition</span>
        </div>

        <!-- Main H1 SEO Heading -->
        <h1 class="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Compare <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500">AWS</span>,
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-500">Azure</span>,
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400">GCP</span>
          & 6 More Cloud Infrastructure Costs
        </h1>

        <!-- Subheading -->
        <p class="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal">
          Real-time Total Cost of Ownership (TCO) estimator across 9 providers — the big 3 plus Oracle, IBM, DigitalOcean, Alibaba, Linode, and OVHcloud — for Compute, Storage, Managed Databases, and Egress with instant commit discounts.
        </p>

        <!-- Presets Selection Bar -->
        <div class="mt-8 flex flex-col items-center">
          <span class="text-xs uppercase tracking-wider font-bold text-slate-400 mb-3">
            Quick Start with Workload Blueprints:
          </span>

          <div class="flex flex-wrap justify-center gap-2.5 max-w-4xl">
            @for (bp of blueprints; track bp.id) {
              <div class="flex items-center rounded-xl bg-slate-800 border border-slate-700/80 shadow-sm overflow-hidden">
                <button
                  type="button"
                  (click)="store.applyBlueprint(bp)"
                  [class.bg-blue-600]="store.activeBlueprint()?.id === bp.id"
                  [class.text-white]="store.activeBlueprint()?.id === bp.id"
                  [class.text-slate-200]="store.activeBlueprint()?.id !== bp.id"
                  class="px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-2 hover:bg-slate-700 transition-colors border-none bg-transparent cursor-pointer">
                  <mat-icon class="!text-lg">{{ bp.icon }}</mat-icon>
                  <span>{{ bp.name }}</span>
                </button>
                <a 
                  [routerLink]="['/blueprints', bp.slug]"
                  [title]="'View detailed ' + bp.name + ' architecture and TCO breakdown'"
                  class="px-2 py-2 text-slate-400 hover:text-white hover:bg-slate-700 border-l border-slate-700/80 transition-colors flex items-center justify-center no-underline">
                  <mat-icon class="!text-sm">open_in_new</mat-icon>
                </a>
              </div>
            }
          </div>
        </div>

      </div>
    </section>
  `
})
export class HeroComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly blueprints = ARCHITECTURE_BLUEPRINTS;
}

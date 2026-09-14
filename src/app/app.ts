import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { SavedEstimatesModalComponent } from './components/saved-estimates-modal/saved-estimates-modal.component';
import { ArchitectureDiffModalComponent } from './components/architecture-diff-modal/architecture-diff-modal.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { EstimatorStore } from './state/estimator.store';
import { ALL_PROVIDERS, PROVIDER_METAS } from './core/models/cloud-provider.enum';
import { COMPARISON_TABS } from './pages/programmatic/comparison-pages.data';
import { GUIDE_TABS } from './pages/guides/guide-pages.data';
import { ARCHITECTURE_BLUEPRINTS } from './core/models/blueprints.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    HeaderComponent,
    SavedEstimatesModalComponent,
    ArchitectureDiffModalComponent,
    AuthModalComponent
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      <!-- Global Navigation Header -->
      <app-header></app-header>

      <!-- Main Routing Outlet -->
      <div class="flex-1">
        <router-outlet></router-outlet>
      </div>

      <!-- Global modals (accessible from any route) -->
      <app-saved-estimates-modal></app-saved-estimates-modal>
      <app-architecture-diff-modal></app-architecture-diff-modal>
      <app-auth-modal></app-auth-modal>

      <!-- Toast Notification Bar -->
      @if (store.toastMessage()) {
        <div class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 border border-blue-500/40 text-slate-100 shadow-2xl shadow-blue-500/20 text-xs font-semibold animate-bounce-short">
          <div class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
          <span>{{ store.toastMessage() }}</span>
        </div>
      }

      <!-- Footer with SEO Links & Attribution -->
      <footer class="border-t border-slate-800/80 bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div class="max-w-7xl mx-auto space-y-8">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div class="text-sm font-bold text-white mb-3">CloudCostMatrix</div>
              <p class="m-0 leading-relaxed">
                Independent multi-cloud cost calculator. Every figure is computed from published list prices by the same
                engine as the estimator — free, no signup, no quotes.
              </p>
            </div>

            <nav aria-label="Provider pricing pages">
              <div class="text-slate-500 font-bold uppercase tracking-wider mb-3">Providers</div>
              <ul class="space-y-1.5 m-0 p-0 list-none">
                @for (provider of providers; track provider.slug) {
                  <li>
                    <a [routerLink]="['/providers', provider.slug]" class="hover:text-white transition-colors">{{ provider.name }} pricing</a>
                  </li>
                }
              </ul>
            </nav>

            <nav aria-label="Head-to-head comparisons">
              <div class="text-slate-500 font-bold uppercase tracking-wider mb-3">Compare</div>
              <ul class="space-y-1.5 m-0 p-0 list-none">
                @for (link of compareLinks; track link.slug) {
                  <li>
                    <a [routerLink]="['/compare', link.slug]" class="hover:text-white transition-colors">{{ link.label }}</a>
                  </li>
                }
                <li>
                  <a routerLink="/compare" class="text-blue-400 hover:text-white transition-colors">All 45 comparisons &rarr;</a>
                </li>
              </ul>
            </nav>

            <nav aria-label="Guides and architecture blueprints">
              <div class="text-slate-500 font-bold uppercase tracking-wider mb-3">Guides</div>
              <ul class="space-y-1.5 m-0 p-0 list-none">
                @for (guide of guideLinks; track guide.slug) {
                  <li>
                    <a [routerLink]="['/guides', guide.slug]" class="hover:text-white transition-colors">{{ guide.label }}</a>
                  </li>
                }
              </ul>
              <div class="text-slate-500 font-bold uppercase tracking-wider mt-5 mb-3">Blueprints</div>
              <ul class="space-y-1.5 m-0 p-0 list-none">
                @for (blueprint of blueprintLinks; track blueprint.slug) {
                  <li>
                    <a [routerLink]="['/blueprints', blueprint.slug]" class="hover:text-white transition-colors">{{ blueprint.label }}</a>
                  </li>
                }
                <li>
                  <a routerLink="/blueprints" class="text-blue-400 hover:text-white transition-colors">All blueprints &rarr;</a>
                </li>
              </ul>
            </nav>
          </div>

          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-800/60 pt-6">
            <nav aria-label="Footer Navigation" class="flex flex-wrap items-center gap-4">
              <a routerLink="/methodology" class="hover:text-white transition-colors">Methodology</a>
              <a routerLink="/disclosure" class="hover:text-white transition-colors">Affiliate Disclosure</a>
              <a routerLink="/privacy" class="hover:text-white transition-colors">Privacy</a>
              <a href="/sitemap.xml" target="_blank" rel="noopener" class="hover:text-white transition-colors">Sitemap</a>
            </nav>
            <span class="text-slate-500">Directional list prices for planning — not a quote.</span>
          </div>
        </div>
      </footer>
    </div>
  `
})
export class App {
  protected readonly store = inject(EstimatorStore);

  readonly providers = ALL_PROVIDERS.map((provider) => ({
    slug: PROVIDER_METAS[provider].slug,
    name: PROVIDER_METAS[provider].shortName
  }));

  /** A handful of curated comparisons as site-wide entry points; the hub lists all 45. */
  readonly compareLinks = COMPARISON_TABS.slice(0, 6);

  readonly guideLinks = GUIDE_TABS;

  readonly blueprintLinks = ARCHITECTURE_BLUEPRINTS.map((blueprint) => ({
    slug: blueprint.slug,
    label: blueprint.name
  }));
}

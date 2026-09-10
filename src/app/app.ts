import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { SavedEstimatesModalComponent } from './components/saved-estimates-modal/saved-estimates-modal.component';
import { ArchitectureDiffModalComponent } from './components/architecture-diff-modal/architecture-diff-modal.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { EstimatorStore } from './state/estimator.store';

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
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <span class="font-bold text-white">CloudCostMatrix</span>
            <span>&bull;</span>
            <span>Independent multi-cloud cost calculator</span>
          </div>
          <nav aria-label="Footer Navigation" class="flex flex-wrap items-center gap-4 text-slate-400">
            <span class="text-slate-500 font-bold">Compare:</span>
            <a routerLink="/compare/aws-vs-azure" class="hover:text-white transition-colors">AWS vs Azure</a>
            <a routerLink="/compare/aws-vs-gcp" class="hover:text-white transition-colors">AWS vs GCP</a>
            <a routerLink="/compare/oracle-vs-aws" class="hover:text-white transition-colors">Oracle vs AWS</a>
            <a routerLink="/compare/digitalocean-vs-linode" class="hover:text-white transition-colors">DigitalOcean vs Linode</a>
            <span class="text-slate-500 font-bold">Blueprints:</span>
            <a routerLink="/blueprints/saas-starter-mvp" class="hover:text-white transition-colors">SaaS MVP</a>
            <a routerLink="/blueprints/ecommerce-high-traffic" class="hover:text-white transition-colors">E-Commerce</a>
            <span class="text-slate-500 font-bold">About:</span>
            <a routerLink="/methodology" class="hover:text-white transition-colors">Methodology</a>
            <a routerLink="/disclosure" class="hover:text-white transition-colors">Affiliate Disclosure</a>
            <a href="/sitemap.xml" class="hover:text-white transition-colors" target="_blank" rel="noopener">Sitemap</a>
          </nav>
        </div>
      </footer>
    </div>
  `
})
export class App {
  protected readonly store = inject(EstimatorStore);
}

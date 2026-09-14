import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { COMPARISON_TABS } from '../programmatic/comparison-pages.data';
import { SeoService } from '../../core/services/seo.service';

/**
 * A genuine 404 surface. Before prerendering existed, every unmatched route
 * silently `redirectTo: ''`d — which made every broken/typo'd URL look like a
 * 200 to both visitors and analytics, and (worse) meant `/compare/aws-vs-azur`
 * rendered as if it were the home page with no signal anything was wrong.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  template: `
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6">
        <mat-icon class="!text-3xl">search_off</mat-icon>
      </div>
      <h1 class="text-3xl font-extrabold text-white tracking-tight m-0">Page not found</h1>
      <p class="mt-3 text-sm text-slate-400 leading-relaxed m-0">
        That page doesn't exist — it may have been a typo, or a comparison we haven't curated yet. Here is where to go instead:
      </p>
      <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
        <a routerLink="/providers" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline border border-slate-700">
          All 10 Cloud Providers
        </a>
        <a routerLink="/compare" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline border border-slate-700">
          All 45 Comparisons
        </a>
        <a routerLink="/guides" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline border border-slate-700">
          Cost Guides
        </a>
        <a routerLink="/blueprints" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline border border-slate-700">
          Architecture Blueprints
        </a>
      </div>
      <p class="mt-6 text-xs text-slate-500 m-0">Popular comparisons:</p>
      <div class="mt-3 flex flex-wrap items-center justify-center gap-2">
        @for (tab of popularTabs; track tab.slug) {
          <a [routerLink]="['/compare', tab.slug]" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline border border-slate-700">
            {{ tab.label }}
          </a>
        }
      </div>
      <a routerLink="/" mat-flat-button class="!mt-8 !bg-gradient-to-r !from-blue-600 !to-indigo-600 !text-white shadow-md shadow-blue-500/20">
        <mat-icon class="!mr-1">home</mat-icon>
        Back to the live estimator
      </a>
    </div>
  `
})
export class NotFoundComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  /** A handful of the most-searched pairs, so a lost visitor lands somewhere useful. */
  readonly popularTabs = COMPARISON_TABS.slice(0, 6);

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'Page Not Found',
      description: 'This page could not be found.',
      robotsMeta: 'noindex, follow'
    });
  }
}

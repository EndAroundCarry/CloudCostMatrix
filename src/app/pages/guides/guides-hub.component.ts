import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';
import { GUIDE_PAGES, GUIDE_SLUGS } from './guide-pages.data';
import { rankingLabel } from '../../core/seo/provider-rankings';

const SITE = 'https://cloudcostmatrix.com';

interface GuideCard {
  slug: string;
  headline: string;
  summary: string;
  metric: string;
  faqCount: number;
}

/**
 * Guides directory. Every guide is a live ranking table recomputed from the
 * catalogs at build time, so this hub is the entry point for the "cheapest X"
 * query family rather than a placeholder index.
 */
@Component({
  selector: 'app-guides-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
        <a routerLink="/" class="hover:text-white transition-colors">Home</a>
        <span aria-hidden="true">/</span>
        <span class="text-slate-200" aria-current="page">Guides</span>
      </nav>

      <header class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight m-0">
          Cloud Cost Guides — Ranked from Published List Prices (2026)
        </h1>
        <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl m-0">
          Each guide ranks all ten providers on one question — egress, entry-level compute, data residency — using the
          same engine as the live calculator. No sponsored placement, no hand-copied rate sheets: the tables are
          recomputed every time the pricing catalogs sync.
        </p>
      </header>

      <section aria-labelledby="guides-heading">
        <h2 id="guides-heading" class="sr-only">Guides</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          @for (card of cards; track card.slug) {
            <a
              [routerLink]="['/guides', card.slug]"
              class="group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-600 p-6 no-underline transition-all">
              <div class="flex items-start justify-between gap-3">
                <h3 class="text-base font-bold text-white m-0">{{ card.headline }}</h3>
                <mat-icon class="!text-base text-slate-500 group-hover:text-white transition-colors shrink-0">arrow_forward</mat-icon>
              </div>
              <p class="mt-2 text-xs text-slate-400 leading-relaxed m-0">{{ card.summary }}</p>
              <div class="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span class="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700">Ranked by: {{ card.metric }}</span>
                <span>{{ card.faqCount }} questions answered</span>
              </div>
            </a>
          }
        </div>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8" aria-labelledby="next-heading">
        <h2 id="next-heading" class="text-xl font-bold text-white tracking-tight mb-4 m-0">Related directories</h2>
        <div class="flex flex-wrap gap-2">
          <a routerLink="/providers" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
            All 10 providers
          </a>
          <a routerLink="/compare" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
            All 45 head-to-head comparisons
          </a>
          <a routerLink="/blueprints" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
            Architecture blueprints
          </a>
        </div>
      </section>
    </div>
  `
})
export class GuidesHubComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  readonly cards: GuideCard[] = GUIDE_SLUGS.map((slug) => {
    const guide = GUIDE_PAGES[slug];
    return {
      slug,
      headline: guide.headline,
      summary: guide.summary,
      metric: rankingLabel(guide.metric),
      faqCount: guide.faqs.length
    };
  });

  ngOnInit(): void {
    const canonicalUrl = `${SITE}/guides`;
    const description =
      'Ranked cloud cost guides: cheapest egress, cheapest cloud for startups, EU data residency, object storage, managed PostgreSQL and managed Kubernetes — ten providers.';

    this.seoService.updateTags({
      title: 'Cloud Cost Guides — 10 Providers Ranked',
      description,
      keywords: [
        'cloud cost guides',
        'cheapest cloud provider',
        'cloud pricing guide 2026',
        'cloud cost comparison guide',
        'cloud provider rankings'
      ],
      canonicalUrl,
      structuredDataJson: [
        SchemaGenerator.generateWebPageSchema({
          name: 'Cloud cost guides',
          description,
          url: canonicalUrl
        }),
        SchemaGenerator.generateBreadcrumbSchema([
          { name: 'Home', url: `${SITE}/` },
          { name: 'Guides', url: canonicalUrl }
        ]),
        SchemaGenerator.generateItemListSchema({
          name: 'Cloud cost guides',
          items: this.cards.map((card) => ({ name: card.headline, url: `${SITE}/guides/${card.slug}` }))
        })
      ]
    });
  }
}

import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';
import { PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { PRICING_LAST_SYNCED_AT } from '../../core/engine/catalog/pricing-catalog.resolver';
import { rankProviders, rankingCaption, rankingLabel, RankedProvider } from '../../core/seo/provider-rankings';
import { GUIDE_PAGES, GUIDE_TABS, GuidePageData } from './guide-pages.data';
import { COMPARISON_PAGES } from '../programmatic/comparison-pages.data';
import { AffiliateCtaComponent } from '../../components/affiliate-cta/affiliate-cta.component';
import { AffiliateDisclosureComponent } from '../../components/affiliate-disclosure/affiliate-disclosure.component';

@Component({
  selector: 'app-guide-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    AffiliateCtaComponent,
    AffiliateDisclosureComponent
  ],
  template: `
    <article class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

      <!-- Guide Switcher Tabs -->
      <nav aria-label="Guide Selection Tabs" class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-2">Guides:</span>
        @for (tab of guideTabs; track tab.slug) {
          <a
            [routerLink]="['/guides', tab.slug]"
            [class.bg-blue-600]="activeSlug === tab.slug"
            [class.text-white]="activeSlug === tab.slug"
            [class.border-blue-500]="activeSlug === tab.slug"
            [class.bg-slate-800/80]="activeSlug !== tab.slug"
            [class.text-slate-300]="activeSlug !== tab.slug"
            [class.border-slate-700]="activeSlug !== tab.slug"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border hover:border-slate-500 hover:text-white transition-all no-underline">
            {{ tab.label }}
          </a>
        }
      </nav>

      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
        <a routerLink="/" class="hover:text-white transition-colors">Home</a>
        <span aria-hidden="true">/</span>
        <span class="text-blue-400">Guides</span>
        <span aria-hidden="true">/</span>
        <span class="text-slate-200" aria-current="page">{{ pageData.slugTitle }}</span>
      </nav>

      <!-- Editorial Hero -->
      <header class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-3">
          <mat-icon class="!text-sm">leaderboard</mat-icon>
          <span>Live-Ranked from Published List Prices (2026)</span>
        </div>
        <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight m-0">
          {{ pageData.headline }}
        </h1>
        <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed m-0">
          {{ pageData.summary }}
        </p>
      </header>

      <!-- Live Ranking Table -->
      <section class="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5" aria-labelledby="ranking-heading">
        <div>
          <h2 id="ranking-heading" class="text-lg sm:text-xl font-bold text-white tracking-tight m-0 flex items-center gap-2">
            <mat-icon class="text-emerald-400">payments</mat-icon>
            <span>All 9 providers by {{ metricLabel }}</span>
          </h2>
          <p class="text-xs text-slate-400 mt-2 m-0 leading-relaxed">{{ metricCaption }}</p>
        </div>

        <app-affiliate-disclosure></app-affiliate-disclosure>

        <div class="overflow-x-auto rounded-xl border border-slate-800">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-800/60 text-slate-400 uppercase tracking-wider">
                <th class="py-3 px-4 font-bold w-14">Rank</th>
                <th class="py-3 px-4 font-bold">Provider</th>
                <th class="py-3 px-4 font-bold">{{ metricLabel }}</th>
                <th class="py-3 px-4 font-bold text-right">Get started</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              @for (row of ranking; track row.provider) {
                @let meta = providerMetas[row.provider];
                <tr class="hover:bg-slate-800/30 transition-colors" [class.bg-emerald-950/20]="row.lowest">
                  <td class="py-3 px-4">
                    <span
                      class="inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs"
                      [class.bg-emerald-500]="row.lowest"
                      [class.text-emerald-950]="row.lowest"
                      [class.bg-slate-800]="!row.lowest"
                      [class.text-slate-300]="!row.lowest">
                      {{ row.rank }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2 font-bold text-white">
                      <span class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                            [style.background-color]="meta.badgeBg"
                            [style.color]="meta.primaryColor">
                        <mat-icon class="!text-sm">{{ meta.icon }}</mat-icon>
                      </span>
                      <span>{{ meta.shortName }}</span>
                      @if (row.lowest) {
                        <span class="px-2 py-0.5 rounded-full bg-emerald-500 on-vivid font-black text-[10px] uppercase tracking-wider">Cheapest</span>
                      }
                    </div>
                  </td>
                  <td class="py-3 px-4 font-bold" [class.text-emerald-400]="row.lowest" [class.text-slate-200]="!row.lowest">
                    {{ row.display }}
                  </td>
                  <td class="py-3 px-4 text-right">
                    <app-affiliate-cta [provider]="row.provider" variant="inline" context="guide-ranking"></app-affiliate-cta>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Editorial provider notes (non-derivable facts) -->
        @if (pageData.providerNotes?.length) {
          <div class="pt-4 border-t border-slate-800">
            <h3 class="text-sm font-bold text-white tracking-tight mb-2 m-0 flex items-center gap-2">
              <mat-icon class="!text-base text-blue-400">fact_check</mat-icon>
              <span>What the price list doesn't tell you</span>
            </h3>
            @if (pageData.providerNotesCaption) {
              <p class="text-[11px] text-slate-500 mb-3 mt-0">{{ pageData.providerNotesCaption }}</p>
            }
            <dl class="space-y-2.5">
              @for (note of pageData.providerNotes; track note.provider) {
                <div class="rounded-xl bg-slate-800/40 border border-slate-700/40 p-3">
                  <dt class="flex items-center gap-2 text-xs font-bold text-white">
                    <span class="w-2 h-2 rounded-full shrink-0" [style.background-color]="providerMetas[note.provider].primaryColor"></span>
                    <span>{{ providerMetas[note.provider].shortName }}</span>
                    <span class="text-[10px] font-normal uppercase tracking-wider text-slate-500">{{ note.label }}</span>
                  </dt>
                  <dd class="text-xs text-slate-400 mt-1 ml-4 m-0 leading-relaxed">{{ note.note }}</dd>
                </div>
              }
            </dl>
          </div>
        }

        <!-- Honest limitations -->
        @if (pageData.caveats.length) {
          <div class="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
            <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 m-0">Read this before you act on the ranking</h3>
            <ul class="space-y-1.5 text-xs text-slate-300 m-0 pl-4 list-disc">
              @for (caveat of pageData.caveats; track caveat) {
                <li>{{ caveat }}</li>
              }
            </ul>
          </div>
        }
      </section>

      <!-- Live Estimator Hand-off -->
      <section class="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <h2 class="text-lg font-bold text-white tracking-tight mb-2 m-0 flex items-center gap-2">
          <mat-icon class="text-blue-400">tune</mat-icon>
          <span>Price your own workload, not a reference one</span>
        </h2>
        <p class="text-xs text-slate-400 mb-4 m-0 leading-relaxed">
          The ranking above uses one fixed reference workload so the providers are comparable. Set your own vCPU, RAM,
          storage, managed database, and transfer volume to see how the order changes for your architecture.
        </p>
        <a routerLink="/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold no-underline shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all">
          <mat-icon class="!text-sm">open_in_new</mat-icon>
          <span>Open the live estimator</span>
        </a>
      </section>

      <!-- Related head-to-head comparisons -->
      @if (relatedPages.length) {
        <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <h2 class="text-lg font-bold text-white tracking-tight mb-4 m-0 flex items-center gap-2">
            <mat-icon class="text-slate-400">compare_arrows</mat-icon>
            <span>Related head-to-head comparisons</span>
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            @for (rel of relatedPages; track rel.slug) {
              <a [routerLink]="['/compare', rel.slug]"
                 class="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 hover:border-slate-500 transition-all no-underline group block">
                <div class="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{{ rel.label }}</div>
                <div class="text-[11px] text-slate-400 mt-1">Full side-by-side breakdown</div>
              </a>
            }
          </div>
        </section>
      }

      <!-- FAQ -->
      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-xl" aria-labelledby="faq-heading">
        <h2 id="faq-heading" class="text-xl font-bold text-white tracking-tight mb-6 flex items-center gap-2 m-0">
          <mat-icon class="text-amber-400">help_outline</mat-icon>
          <span>{{ pageData.slugTitle }} — Frequently Asked Questions</span>
        </h2>
        <div class="space-y-4">
          @for (faq of pageData.faqs; track faq.question) {
            <div class="rounded-xl bg-slate-800/40 p-4 border border-slate-700/40">
              <h3 class="text-sm sm:text-base font-bold text-white m-0">{{ faq.question }}</h3>
              <p class="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed m-0">{{ faq.answer }}</p>
            </div>
          }
        </div>
      </section>

    </article>
  `
})
export class GuidePageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seoService = inject(SeoService);

  readonly guideTabs = GUIDE_TABS;
  readonly providerMetas = PROVIDER_METAS;

  activeSlug = '';
  pageData!: GuidePageData;
  ranking: RankedProvider[] = [];
  relatedPages: { slug: string; label: string }[] = [];
  metricLabel = '';
  metricCaption = '';

  private routeSub?: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const slug = (params.get('slug') ?? '').toLowerCase();
      const page = GUIDE_PAGES[slug];
      if (!page) {
        this.router.navigate(['/'], { replaceUrl: true });
        return;
      }
      this.activeSlug = slug;
      this.pageData = page;
      this.metricLabel = rankingLabel(page.metric);
      this.metricCaption = rankingCaption(page.metric);
      this.ranking = rankProviders(page.metric);
      this.relatedPages = page.relatedSlugs
        .filter((s) => COMPARISON_PAGES[s])
        .map((s) => ({ slug: s, label: COMPARISON_PAGES[s].slugTitle }));
      this.setupSeo(page);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private setupSeo(page: GuidePageData): void {
    const canonicalUrl = `https://cloudcostmatrix.com/guides/${page.slug}`;
    this.seoService.updateTags({
      title: page.slugTitle,
      description: page.metaDescription,
      keywords: page.keywords,
      canonicalUrl,
      // Always pass a value: SeoService only SETS robots when truthy and never
      // clears it, so a client-side nav between guide and compare pages would
      // otherwise be able to leave a stale directive in place.
      robotsMeta: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
      structuredDataJson: [
        SchemaGenerator.generateFaqSchema(page.faqs),
        SchemaGenerator.generateBreadcrumbSchema([
          { name: 'Home', url: 'https://cloudcostmatrix.com/' },
          { name: 'Guides', url: 'https://cloudcostmatrix.com/guides/' },
          { name: page.slugTitle, url: canonicalUrl }
        ]),
        SchemaGenerator.generateWebPageSchema({
          name: page.headline,
          description: page.metaDescription,
          url: canonicalUrl,
          dateModified: PRICING_LAST_SYNCED_AT ?? undefined
        })
      ]
    });
  }
}

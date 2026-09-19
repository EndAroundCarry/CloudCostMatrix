import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';
import { ALL_PROVIDERS, CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { allPairSlugs } from '../../core/seo/comparison-slug';
import { COMPARISON_PAGES, COMPARISON_SLUGS, indexableSlugForPair } from '../programmatic/comparison-pages.data';

const SITE = 'https://cloudcostmatrix.com';

interface ComparisonLink {
  slug: string;
  label: string;
}

interface ProviderGroup {
  provider: CloudProvider;
  shortName: string;
  slug: string;
  pairs: ComparisonLink[];
}

interface CuratedCard {
  slug: string;
  title: string;
  summary: string;
  providerNames: string;
}

/**
 * The comparison directory. Two jobs: give every one of the 45 pair pages a
 * crawlable path from a single hub, and target the head-term "cloud cost
 * comparison" queries with a page that actually enumerates the catalog rather
 * than describing it.
 */
@Component({
  selector: 'app-compare-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
        <a routerLink="/" class="hover:text-white transition-colors">Home</a>
        <span aria-hidden="true">/</span>
        <span class="text-slate-200" aria-current="page">Compare</span>
      </nav>

      <header class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight m-0">
          Cloud Cost Comparisons — All {{ totalPairs }} Provider Pairs (2026)
        </h1>
        <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl m-0">
          Every pair of providers in the catalog, scored against the same reference workload by the same engine as the
          live calculator — verdict, category-by-category totals, and a capability matrix computed from published list
          rates rather than hand-typed. Where a pair has a curated deep-dive, this directory links to that instead.
        </p>
        <div class="mt-5 flex flex-wrap gap-2">
          <a routerLink="/providers" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:border-blue-400 hover:text-white transition-all no-underline">
            Provider pricing directory
          </a>
          <a routerLink="/" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
            Price your own architecture
          </a>
        </div>
      </header>

      <section aria-labelledby="curated-heading">
        <h2 id="curated-heading" class="text-xl font-bold text-white tracking-tight mb-2">
          Curated comparisons
        </h2>
        <p class="text-xs text-slate-400 mb-5 max-w-3xl">
          Authored deep-dives: an edited verdict, hand-written capability rows, and workload-specific analysis on top of
          the same computed numbers.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          @for (card of curatedCards; track card.slug) {
            <a
              [routerLink]="['/compare', card.slug]"
              class="group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-600 p-5 no-underline transition-all">
              <div class="flex items-start justify-between gap-3 mb-2">
                <h3 class="text-sm font-bold text-white m-0">{{ card.title }}</h3>
                <mat-icon class="!text-base text-slate-500 group-hover:text-white transition-colors shrink-0">arrow_forward</mat-icon>
              </div>
              <p class="text-xs text-slate-400 leading-relaxed m-0 line-clamp-3">{{ card.summary }}</p>
              <span class="mt-3 inline-block text-[11px] text-slate-500 uppercase tracking-wider">{{ card.providerNames }}</span>
            </a>
          }
        </div>
      </section>

      <section aria-labelledby="pairs-heading">
        <h2 id="pairs-heading" class="text-xl font-bold text-white tracking-tight mb-2">
          Every provider pair
        </h2>
        <p class="text-xs text-slate-400 mb-5 max-w-3xl">
          All {{ totalPairs }} pairs, grouped by the first provider. Each page holds a computed verdict, per-category
          costs for both providers, and the egress, storage, Kubernetes and instance comparisons that follow from them.
        </p>
        <div class="space-y-4">
          @for (group of providerGroups; track group.provider) {
            <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div class="flex items-center gap-2 mb-3">
                <a [routerLink]="['/providers', group.slug]" class="text-sm font-bold text-white hover:text-blue-300 transition-colors no-underline">
                  {{ group.shortName }}
                </a>
                <span class="text-[11px] text-slate-500 uppercase tracking-wider">vs</span>
              </div>
              <div class="flex flex-wrap gap-2">
                @for (pair of group.pairs; track pair.slug) {
                  <a
                    [routerLink]="['/compare', pair.slug]"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
                    {{ pair.label }}
                  </a>
                }
              </div>
            </div>
          }
        </div>
      </section>
    </div>
  `
})
export class CompareHubComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  readonly totalPairs = allPairSlugs().length;

  readonly curatedCards: CuratedCard[] = COMPARISON_SLUGS.map((slug) => {
    const page = COMPARISON_PAGES[slug];
    const names = [page.providerA, page.providerB]
      .filter((p): p is CloudProvider => Boolean(p))
      .map((p) => PROVIDER_METAS[p].name);
    return {
      slug,
      title: page.slugTitle,
      summary: page.summary,
      providerNames: names.length ? names.join(' · ') : 'Multi-provider comparison'
    };
  });

  /**
   * Grouped by the pair's forward-ordered first provider, so each of the 45
   * pairs appears exactly once here — a directory that listed every ordering
   * would double every link for no crawler benefit.
   */
  readonly providerGroups: ProviderGroup[] = ALL_PROVIDERS.map((provider, index) => ({
    provider,
    shortName: PROVIDER_METAS[provider].shortName,
    slug: PROVIDER_METAS[provider].slug,
    pairs: ALL_PROVIDERS.slice(index + 1).map((other) => {
      const slug = indexableSlugForPair(provider, other);
      const curated = COMPARISON_PAGES[slug];
      return {
        slug,
        label: curated ? curated.tabLabel : `${PROVIDER_METAS[provider].shortName} vs ${PROVIDER_METAS[other].shortName}`
      };
    })
  })).filter((group) => group.pairs.length > 0);

  ngOnInit(): void {
    const canonicalUrl = `${SITE}/compare`;
    const description =
      'All 45 cloud provider pairs priced by one engine: AWS vs Azure, GCP vs Oracle, DigitalOcean vs Vultr and 42 more — verdicts, category totals and capability matrices.';

    this.seoService.updateTags({
      title: 'Cloud Cost Comparisons — 45 Provider Pairs',
      description,
      keywords: [
        'cloud cost comparison',
        'AWS vs Azure',
        'cloud provider comparison 2026',
        'multi-cloud pricing comparison',
        'compare cloud pricing'
      ],
      canonicalUrl,
      structuredDataJson: [
        SchemaGenerator.generateWebPageSchema({
          name: 'Cloud Cost Comparisons — all provider pairs',
          description,
          url: canonicalUrl
        }),
        SchemaGenerator.generateBreadcrumbSchema([
          { name: 'Home', url: `${SITE}/` },
          { name: 'Compare', url: canonicalUrl }
        ]),
        SchemaGenerator.generateItemListSchema({
          name: 'Cloud provider comparisons',
          items: this.providerGroups.flatMap((group) =>
            group.pairs.map((pair) => ({ name: pair.label, url: `${SITE}/compare/${pair.slug}` }))
          )
        })
      ]
    });
  }
}

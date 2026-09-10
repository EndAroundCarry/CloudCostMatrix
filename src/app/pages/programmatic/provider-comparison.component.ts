import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';
import { EstimatorStore } from '../../state/estimator.store';
import { CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { ServiceCategory, SERVICE_CATEGORY_METAS } from '../../core/models/service-category.enum';
import { ComparisonMatrixResult } from '../../core/models/pricing.model';
import { CostCalculatorEngine } from '../../core/engine/cost-calculator.engine';
import { MatrixTableComponent } from '../../components/matrix-table/matrix-table.component';
import { ConfiguratorComponent } from '../../components/configurator/configurator.component';
import { TcoChartComponent } from '../../components/charts/tco-chart.component';
import { RecommendationsComponent } from '../../components/recommendations/recommendations.component';
import { AffiliateCtaComponent } from '../../components/affiliate-cta/affiliate-cta.component';
import { AffiliateDisclosureComponent } from '../../components/affiliate-disclosure/affiliate-disclosure.component';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import {
  COMPARISON_PAGES,
  COMPARISON_TABS,
  COMPARISON_REFERENCE_CONFIG,
  ComparisonPageData,
  EditorialFeatureRow
} from './comparison-pages.data';
import { buildDerivedFeatures, DerivedFeatureRow } from '../../core/seo/derived-features';
import { parsePairSlug, buildPairSlug } from '../../core/seo/comparison-slug';
import { PRICING_LAST_SYNCED_AT } from '../../core/engine/catalog/pricing-catalog.resolver';

type FeatureRow = DerivedFeatureRow | EditorialFeatureRow;

@Component({
  selector: 'app-provider-comparison',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatrixTableComponent,
    ConfiguratorComponent,
    TcoChartComponent,
    RecommendationsComponent,
    AffiliateCtaComponent,
    AffiliateDisclosureComponent
  ],
  template: `
    <article class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

      <!-- Sticky Comparison Switcher Bar -->
      <nav aria-label="Comparison Selection Tabs" class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-2">Compare:</span>
        @for (tab of comparisonTabs; track tab.slug) {
          <a
            [routerLink]="['/compare', tab.slug]"
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
        <span class="text-blue-400">Compare</span>
        <span aria-hidden="true">/</span>
        <span class="text-slate-200" aria-current="page">{{ pageData.slugTitle }}</span>
      </nav>

      @if (!isCurated) {
        <div class="rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2.5 text-[11px] text-slate-400 flex items-center gap-2">
          <mat-icon class="!text-sm text-slate-500">auto_awesome</mat-icon>
          <span>This is a generated comparison — facts are computed live from the pricing catalogs. Browse our <a routerLink="/" class="text-blue-400 hover:text-white underline">curated comparisons</a> for editorial deep-dives.</span>
        </div>
      }

      <!-- Editorial Intro Card -->
      <header class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-3">
          <mat-icon class="!text-sm">analytics</mat-icon>
          <span>Direct Head-to-Head Benchmark (2026 Edition)</span>
        </div>

        <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight m-0">
          {{ pageData.headline }}
        </h1>

        <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl m-0">
          {{ pageData.summary }}
        </p>
      </header>

      <!-- Dedicated Head-to-Head Duel Card (for 2-provider comparisons) -->
      @if (pageData.providerA && pageData.providerB && pageMatrix) {
        @let provA = pageData.providerA;
        @let provB = pageData.providerB;
        @let totalA = pageMatrix.providers[provA];
        @let totalB = pageMatrix.providers[provB];
        @let diff = Math.abs(totalA.monthlyTotal - totalB.monthlyTotal);
        @let winner = totalA.monthlyTotal <= totalB.monthlyTotal ? provA : provB;
        @let percent = Math.max(totalA.monthlyTotal, totalB.monthlyTotal) > 0
          ? Math.round((diff / Math.max(totalA.monthlyTotal, totalB.monthlyTotal)) * 100)
          : 0;

        <section class="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">

          <!-- Reference workload note — this verdict is page-scoped, not tied to
               whatever the visitor last configured elsewhere on the site. -->
          <div class="text-[11px] text-slate-500 flex items-center gap-1.5">
            <mat-icon class="!text-xs">tune</mat-icon>
            <span>Scored against: <strong class="text-slate-300">{{ referenceWorkloadName() }}</strong> — <a routerLink="/" class="text-blue-400 hover:text-white underline">change it in the live estimator ↓</a></span>
          </div>

          <!-- Winner Verdict Banner -->
          <div class="p-5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-800/80 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <mat-icon class="!text-2xl">emoji_events</mat-icon>
              </div>
              <div>
                <div class="text-xs font-bold uppercase tracking-wider text-emerald-400">Verdict for this workload</div>
                <div class="text-lg sm:text-xl font-black text-white">
                  {{ providerMetas[winner].name }} is cheaper by {{ store.formatMoney(diff) }}/mo
                  <span class="text-xs font-bold text-emerald-400">({{ percent }}% savings)</span>
                </div>
              </div>
            </div>

            <app-affiliate-cta [provider]="winner" variant="primary" context="compare-verdict"></app-affiliate-cta>
          </div>

          <app-affiliate-disclosure></app-affiliate-disclosure>

          <!-- Side-by-Side 2 Provider Scorecard -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Provider A Card -->
            <div
              [class.ring-2]="winner === provA"
              [class.ring-emerald-400]="winner === provA"
              class="rounded-2xl bg-slate-800/60 border border-slate-700 p-5">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center font-bold"
                       [style.background-color]="providerMetas[provA].badgeBg"
                       [style.color]="providerMetas[provA].primaryColor">
                    <mat-icon class="!text-base">{{ providerMetas[provA].icon }}</mat-icon>
                  </div>
                  <div>
                    <h3 class="text-base font-bold text-white m-0">{{ providerMetas[provA].name }}</h3>
                    <span class="text-xs text-slate-400">{{ providerMetas[provA].shortName }} Benchmark</span>
                  </div>
                </div>
                @if (winner === provA) {
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-500 on-vivid font-black text-xs uppercase">Winner</span>
                }
              </div>

              <div class="text-3xl font-black text-white tracking-tight my-3">
                {{ store.formatMoney(totalA.monthlyTotal) }}<span class="text-xs text-slate-400 font-normal"> / month</span>
              </div>
              <div class="text-xs text-slate-400 mb-4">
                Annual TCO: <strong class="text-slate-200">{{ store.formatMoney(totalA.annualTotal) }}</strong>
              </div>

              <div class="space-y-2 border-t border-slate-700/60 pt-3 text-xs mb-4">
                @for (cat of activeCategoryKeys; track cat) {
                  @if (pageMatrix.config.activeCategories[cat]) {
                    <div class="flex items-center justify-between text-slate-300">
                      <span class="text-slate-400">{{ categoryMetas[cat].shortName }}</span>
                      <span class="font-bold text-white">{{ store.formatMoney(totalA.categoryBreakdown[cat]) }}</span>
                    </div>
                  }
                }
              </div>
              <app-affiliate-cta [provider]="provA" variant="inline" context="compare-scorecard"></app-affiliate-cta>
            </div>

            <!-- Provider B Card -->
            <div
              [class.ring-2]="winner === provB"
              [class.ring-emerald-400]="winner === provB"
              class="rounded-2xl bg-slate-800/60 border border-slate-700 p-5">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center font-bold"
                       [style.background-color]="providerMetas[provB].badgeBg"
                       [style.color]="providerMetas[provB].primaryColor">
                    <mat-icon class="!text-base">{{ providerMetas[provB].icon }}</mat-icon>
                  </div>
                  <div>
                    <h3 class="text-base font-bold text-white m-0">{{ providerMetas[provB].name }}</h3>
                    <span class="text-xs text-slate-400">{{ providerMetas[provB].shortName }} Benchmark</span>
                  </div>
                </div>
                @if (winner === provB) {
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-500 on-vivid font-black text-xs uppercase">Winner</span>
                }
              </div>

              <div class="text-3xl font-black text-white tracking-tight my-3">
                {{ store.formatMoney(totalB.monthlyTotal) }}<span class="text-xs text-slate-400 font-normal"> / month</span>
              </div>
              <div class="text-xs text-slate-400 mb-4">
                Annual TCO: <strong class="text-slate-200">{{ store.formatMoney(totalB.annualTotal) }}</strong>
              </div>

              <div class="space-y-2 border-t border-slate-700/60 pt-3 text-xs mb-4">
                @for (cat of activeCategoryKeys; track cat) {
                  @if (pageMatrix.config.activeCategories[cat]) {
                    <div class="flex items-center justify-between text-slate-300">
                      <span class="text-slate-400">{{ categoryMetas[cat].shortName }}</span>
                      <span class="font-bold text-white">{{ store.formatMoney(totalB.categoryBreakdown[cat]) }}</span>
                    </div>
                  }
                }
              </div>
              <app-affiliate-cta [provider]="provB" variant="inline" context="compare-scorecard"></app-affiliate-cta>
            </div>
          </div>

          <!-- Feature & Architectural Capabilities Duel Table -->
          @if (features.length > 0) {
            <div class="mt-8 pt-6 border-t border-slate-800">
              <h3 class="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2 m-0">
                <mat-icon class="text-blue-400">compare_arrows</mat-icon>
                <span>{{ providerMetas[provA].shortName }} vs {{ providerMetas[provB].shortName }} Feature & Capability Matrix</span>
              </h3>
              <p class="text-[11px] text-slate-500 mb-3 -mt-2">Pricing rows are computed live from the current catalogs, not hand-typed — they'll never silently go stale.</p>

              <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-slate-800 bg-slate-800/60 font-bold text-slate-300 uppercase tracking-wider">
                      <th class="py-3 px-4">Feature / Capability</th>
                      <th class="py-3 px-4">{{ providerMetas[provA].name }}</th>
                      <th class="py-3 px-4">{{ providerMetas[provB].name }}</th>
                      <th class="py-3 px-4 text-center">Advantage</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/60">
                    @for (row of features; track row.feature) {
                      <tr class="hover:bg-slate-800/30 transition-colors">
                        <td class="py-3 px-4 font-semibold text-white">
                          <div>{{ row.feature }}</div>
                          <span class="text-[10px] text-slate-500 font-normal uppercase">{{ row.category }}</span>
                        </td>
                        <td class="py-3 px-4 text-slate-300">{{ row.providerAVal }}</td>
                        <td class="py-3 px-4 text-slate-300">{{ row.providerBVal }}</td>
                        <td class="py-3 px-4 text-center">
                          @if (row.winner === 'A') {
                            <span class="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                              {{ providerMetas[provA].shortName }}
                            </span>
                          } @else if (row.winner === 'B') {
                            <span class="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">
                              {{ providerMetas[provB].shortName }}
                            </span>
                          } @else {
                            <span class="text-slate-500 font-bold">Tie</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

        </section>
      }

      <!-- Live Interactive Cost Matrix -->
      <section aria-labelledby="matrix-heading">
        <h2 id="matrix-heading" class="sr-only">Cost Comparison Matrix</h2>
        <app-matrix-table></app-matrix-table>
      </section>

      <!-- Charts & Insights -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-tco-chart></app-tco-chart>
        <app-recommendations></app-recommendations>
      </div>

      <!-- Live Configurator -->
      <app-configurator></app-configurator>

      <!-- FAQ Section (unique per slug for Google Rich Snippets) -->
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
export class ProviderComparisonComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seoService = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  protected readonly store = inject(EstimatorStore);

  readonly Math = Math;
  readonly comparisonTabs = COMPARISON_TABS;
  readonly providerMetas = PROVIDER_METAS;
  readonly categoryMetas = SERVICE_CATEGORY_METAS;
  readonly activeCategoryKeys = [
    ServiceCategory.COMPUTE,
    ServiceCategory.STORAGE,
    ServiceCategory.DATABASE,
    ServiceCategory.NETWORKING,
    ServiceCategory.KUBERNETES
  ];

  activeSlug = '';
  isCurated = true;
  pageData!: ComparisonPageData;
  pageMatrix: ComparisonMatrixResult | null = null;
  features: FeatureRow[] = [];

  private routeSub?: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      this.resolveSlug(params.get('slug') ?? '');
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  referenceWorkloadName(): string {
    return (this.pageData?.referenceConfig ?? COMPARISON_REFERENCE_CONFIG).name;
  }

  /**
   * Resolves a `/compare/:slug` segment through three tiers, replacing the
   * old `COMPARISON_PAGES[slug] || COMPARISON_PAGES['aws-vs-azure']` fallback
   * that served full AWS-vs-Azure content — indexable, with a self-canonical
   * pointing at the junk URL — at literally any URL that didn't match.
   *
   *  1. Curated slug        → render as-authored, indexed, self-canonical.
   *  2. Any other valid pair → render a generated page (derived facts only),
   *     noindexed, canonical to the forward-ordered URL if reversed.
   *  3. Unparseable          → redirect home. No content is ever served for
   *     a URL that doesn't resolve to something real.
   */
  private resolveSlug(rawSlug: string): void {
    const slug = rawSlug.toLowerCase();
    const curated = COMPARISON_PAGES[slug];
    if (curated) {
      this.activeSlug = slug;
      this.pageData = curated;
      this.isCurated = true;
      this.recomputePageMatrix();
      this.setupSeo(slug, curated, { noindex: false, canonicalSlug: slug });
      return;
    }

    const parsed = parsePairSlug(slug);
    if (parsed) {
      this.activeSlug = slug;
      this.pageData = this.buildDerivedPage(parsed.a, parsed.b);
      this.isCurated = false;
      this.recomputePageMatrix();
      this.setupSeo(slug, this.pageData, { noindex: true, canonicalSlug: parsed.canonicalSlug });
      return;
    }

    this.router.navigate(['/'], { replaceUrl: true });
  }

  private buildDerivedPage(a: CloudProvider, b: CloudProvider): ComparisonPageData {
    const metaA = PROVIDER_METAS[a];
    const metaB = PROVIDER_METAS[b];
    return {
      slug: buildPairSlug(a, b),
      slugTitle: `${metaA.shortName} vs ${metaB.shortName}`,
      tabLabel: `${metaA.shortName} vs ${metaB.shortName}`,
      headline: `${metaA.name} vs ${metaB.name}: Cloud Infrastructure Cost Comparison`,
      summary: `${metaA.headline} ${metaB.headline} Compare Compute, Storage, Managed Database, Networking, and Kubernetes pricing side-by-side, computed live from each provider's published catalog.`,
      metaDescription: `Compare ${metaA.name} vs ${metaB.name} cloud infrastructure pricing — Compute, Storage, Database, Kubernetes, and Egress, computed live from published list prices. Free TCO calculator.`,
      keywords: [`${metaA.shortName} vs ${metaB.shortName}`, `${metaA.name} pricing`, `${metaB.name} pricing`, 'cloud cost comparison 2026'],
      providerA: a,
      providerB: b,
      faqs: [
        {
          question: `Is ${metaA.shortName} or ${metaB.shortName} cheaper?`,
          answer: `It depends on the workload shape and commitment terms you choose — use the live calculator above with your own vCPU, RAM, storage, and egress specs for an exact answer. At a glance: ${metaA.shortName} — ${metaA.headline} ${metaB.shortName} — ${metaB.headline}`
        },
        {
          question: `What are the biggest pricing differences between ${metaA.shortName} and ${metaB.shortName}?`,
          answer: `See the feature comparison table above for a full, catalog-computed breakdown across compute, storage, managed database, networking, and Kubernetes pricing — every row is derived live, not hand-typed, so it can't silently go stale.`
        }
      ]
    };
  }

  private recomputePageMatrix(): void {
    const ref = this.pageData.referenceConfig ?? COMPARISON_REFERENCE_CONFIG;
    const selectedProviders = this.pageData.providerA && this.pageData.providerB
      ? [this.pageData.providerA, this.pageData.providerB]
      : ref.selectedProviders;
    this.pageMatrix = CostCalculatorEngine.calculateFullMatrix({ ...ref, selectedProviders });

    this.features = this.pageData.providerA && this.pageData.providerB
      ? [...buildDerivedFeatures(this.pageData.providerA, this.pageData.providerB), ...(this.pageData.editorialFeatures ?? [])]
      : [];
  }

  private setupSeo(requestedSlug: string, page: ComparisonPageData, opts: { noindex: boolean; canonicalSlug: string }): void {
    const canonicalUrl = `https://cloudcostmatrix.com/compare/${opts.canonicalSlug}`;
    // Always pass a value — SeoService only SETS the robots tag when truthy and
    // never clears a previous one, so a client-side nav from a noindexed
    // derived page to a curated page would otherwise leave a stale noindex.
    const robotsMeta = opts.noindex
      ? 'noindex, follow'
      : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

    this.seoService.updateTags({
      title: `${page.slugTitle} Cost Comparison (2026)`,
      description: page.metaDescription,
      keywords: page.keywords,
      canonicalUrl,
      robotsMeta,
      structuredDataJson: [
        SchemaGenerator.generateFaqSchema(page.faqs),
        SchemaGenerator.generateBreadcrumbSchema([
          { name: 'Home', url: 'https://cloudcostmatrix.com/' },
          { name: 'Compare', url: 'https://cloudcostmatrix.com/compare/' },
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

    this.analytics.trackComparisonView(requestedSlug, !opts.noindex, this.pageMatrix?.cheapestMonthlyProvider ?? null);
  }
}

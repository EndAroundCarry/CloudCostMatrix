import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';
import { CloudProvider, PROVIDER_METAS, ProviderMeta } from '../../core/models/cloud-provider.enum';
import { ProviderFreshness } from '../../core/engine/catalog/provider-verification';
import { GUIDE_TABS } from '../guides/guide-pages.data';
import { AffiliateCtaComponent } from '../../components/affiliate-cta/affiliate-cta.component';
import { AffiliateDisclosureComponent } from '../../components/affiliate-disclosure/affiliate-disclosure.component';
import { ProviderTableComponent } from './provider-table.component';
import {
  ProviderComputeRow,
  ProviderTableRow,
  ProviderWorkloadRow,
  ProviderPageCopy,
  buildComputeRows,
  buildDatabaseRows,
  buildKubernetesRows,
  buildNetworkingRows,
  buildProviderFaqs,
  buildRankNotes,
  buildStorageRows,
  buildWorkloadRows,
  providerComparisonLinks,
  providerFreshness,
  providerFromSlug,
  providerHeadline,
  providerPageCopy
} from './provider-pages.data';

const SITE = 'https://cloudcostmatrix.com';

@Component({
  selector: 'app-provider-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, ProviderTableComponent, AffiliateCtaComponent, AffiliateDisclosureComponent],
  template: `
    @if (provider) {
      <article class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        <!-- Breadcrumbs -->
        <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
          <a routerLink="/" class="hover:text-white transition-colors">Home</a>
          <span aria-hidden="true">/</span>
          <a routerLink="/providers" class="hover:text-white transition-colors">Providers</a>
          <span aria-hidden="true">/</span>
          <span class="text-slate-200" aria-current="page">{{ meta.shortName }}</span>
        </nav>

        <!-- Header -->
        <header class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span
              class="px-3 py-1 rounded-full text-xs font-semibold border"
              [style.background-color]="meta.badgeBg"
              [style.color]="meta.primaryColor"
              [style.border-color]="meta.badgeBorder">
              {{ meta.tier === 'HYPERSCALER' ? 'Hyperscaler' : meta.tier === 'CHALLENGER' ? 'Challenger cloud' : 'Developer cloud' }}
            </span>
            <span class="px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 text-xs font-semibold">
              {{ freshness.label }}
            </span>
          </div>

          <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight m-0">
            {{ headline }}
          </h1>

          <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl m-0">{{ copy.intro }}</p>

          <ul class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 m-0 p-0 list-none">
            @for (highlight of meta.highlightNotes; track highlight) {
              <li class="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                <mat-icon class="!text-base text-emerald-400 shrink-0">check_circle</mat-icon>
                <span>{{ highlight }}</span>
              </li>
            }
          </ul>

          <div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <a
              [href]="freshness.sourceUrl"
              target="_blank"
              rel="noopener"
              class="text-blue-400 hover:text-white underline">
              Provider's published price list
            </a>
            <a [href]="meta.pricingUrl" target="_blank" rel="noopener" class="text-blue-400 hover:text-white underline">
              {{ meta.shortName }} pricing page
            </a>
            <span class="text-slate-500">{{ meta.services.compute }} · {{ meta.services.objectStorage }} · {{ meta.services.managedDb }} · {{ meta.services.kubernetes }}</span>
          </div>
        </header>

        <!-- What a workload costs on this provider -->
        <section aria-labelledby="workloads-heading">
          <h2 id="workloads-heading" class="text-xl font-bold text-white tracking-tight mb-2">
            What a {{ meta.shortName }} architecture costs
          </h2>
          <p class="text-xs text-slate-400 mb-6 max-w-3xl">
            Four reference architectures, priced for {{ meta.name }} alone by the same engine that powers the live estimator — list prices in USD, us-east-1 baseline, on-demand unless noted.
          </p>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            @for (workload of workloadRows; track workload.name) {
              <div class="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
                <h3 class="text-base font-bold text-white m-0">{{ workload.name }}</h3>
                <p class="text-xs text-slate-400 mt-1 mb-3">{{ workload.description }}</p>
                <div class="flex items-baseline gap-3">
                  <span class="text-2xl font-black text-white tracking-tight">{{ workload.monthly }}</span>
                  <span class="text-xs text-slate-400">{{ workload.annual }} annual</span>
                </div>
                <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs m-0">
                  @for (row of workload.breakdown; track row.label) {
                    <div class="flex items-center justify-between gap-2">
                      <dt class="text-slate-400 m-0">{{ row.label }}</dt>
                      <dd class="text-slate-200 font-semibold m-0">{{ row.value }}</dd>
                    </div>
                  }
                </dl>
                @if (workload.unsupported) {
                  <p class="mt-3 text-[11px] text-amber-400">Not offered for this workload: {{ workload.unsupported }} — the total excludes that category.</p>
                }
              </div>
            }
          </div>
        </section>

        <!-- Compute catalogue -->
        <section aria-labelledby="compute-heading">
          <h2 id="compute-heading" class="text-xl font-bold text-white tracking-tight mb-2">
            {{ meta.services.compute }} instance pricing
          </h2>
          <p class="text-xs text-slate-400 mb-4">
            Every published shape in the catalog, priced at 730 hours/month in USD list rates.
          </p>
          <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-slate-800 bg-slate-800/60 font-bold text-slate-300 uppercase tracking-wider">
                  <th class="py-3 px-4">Instance</th>
                  <th class="py-3 px-4">Shape</th>
                  <th class="py-3 px-4">On-demand</th>
                  <th class="py-3 px-4">1-year reserved</th>
                  <th class="py-3 px-4">3-year reserved</th>
                  <th class="py-3 px-4">Spot / preemptible</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                @for (row of computeRows; track row.name) {
                  <tr class="hover:bg-slate-800/30 transition-colors">
                    <td class="py-3 px-4 font-semibold text-white">
                      <div>{{ row.name }}</div>
                      <span class="text-[10px] text-slate-500 font-normal uppercase">{{ row.family }}</span>
                    </td>
                    <td class="py-3 px-4 text-slate-300">{{ row.shape }}</td>
                    <td class="py-3 px-4 text-slate-200 font-semibold">{{ row.onDemand }}</td>
                    <td class="py-3 px-4 text-slate-300">{{ row.oneYear }}</td>
                    <td class="py-3 px-4 text-slate-300">{{ row.threeYear }}</td>
                    <td class="py-3 px-4 text-slate-300">{{ row.spot }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <!-- Storage, database, networking, kubernetes -->
        <section aria-labelledby="storage-heading">
          <h2 id="storage-heading" class="text-xl font-bold text-white tracking-tight mb-4">
            {{ meta.services.objectStorage }} storage tiers
          </h2>
          <app-provider-table [rows]="storageRows"></app-provider-table>
        </section>

        <section aria-labelledby="database-heading">
          <h2 id="database-heading" class="text-xl font-bold text-white tracking-tight mb-4">
            {{ meta.services.managedDb }} pricing
          </h2>
          <app-provider-table [rows]="databaseRows"></app-provider-table>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section aria-labelledby="networking-heading">
            <h2 id="networking-heading" class="text-xl font-bold text-white tracking-tight mb-4">
              Networking &amp; egress
            </h2>
            <app-provider-table [rows]="networkingRows"></app-provider-table>
          </section>

          <section aria-labelledby="kubernetes-heading">
            <h2 id="kubernetes-heading" class="text-xl font-bold text-white tracking-tight mb-4">
              {{ meta.services.kubernetes }}
            </h2>
            <app-provider-table [rows]="kubernetesRows"></app-provider-table>
          </section>
        </div>

        <!-- Ranking + savings -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6" aria-labelledby="ranking-heading">
            <h2 id="ranking-heading" class="text-lg font-bold text-white tracking-tight mb-4 m-0">
              Where {{ meta.shortName }} ranks
            </h2>
            <ul class="space-y-2 m-0 p-0 list-none">
              @for (note of rankNotes; track note) {
                <li class="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                  <mat-icon class="!text-base text-blue-400 shrink-0">leaderboard</mat-icon>
                  <span>{{ note }}</span>
                </li>
              }
            </ul>
            <p class="mt-4 mb-0 text-[11px] text-slate-500">
              Full ranked tables live in the <a routerLink="/guides" class="text-blue-400 hover:text-white underline">cost guides</a>.
            </p>
          </section>

          <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6" aria-labelledby="savings-heading">
            <h2 id="savings-heading" class="text-lg font-bold text-white tracking-tight mb-4 m-0">
              Lowering a {{ meta.shortName }} bill
            </h2>
            <div class="rounded-xl bg-slate-800/40 border border-slate-700/40 p-4">
              <h3 class="text-sm font-bold text-white m-0">{{ meta.optimizationTip.title }}</h3>
              <p class="text-xs text-slate-300 mt-2 leading-relaxed m-0">{{ meta.optimizationTip.body }}</p>
              <p class="text-[11px] text-slate-400 mt-2 mb-0">{{ meta.optimizationTip.footnote }}</p>
            </div>
            @if (savingsTips.length > 0) {
              <ul class="mt-3 space-y-2 m-0 p-0 list-none">
                @for (tip of savingsTips; track tip) {
                  <li class="flex items-start gap-2 text-xs text-slate-300">
                    <mat-icon class="!text-sm text-emerald-400 shrink-0">savings</mat-icon>
                    <span>{{ tip }}</span>
                  </li>
                }
              </ul>
            }
          </section>
        </div>

        <!-- Internal linking: every comparison this provider takes part in -->
        <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8" aria-labelledby="compare-heading">
          <h2 id="compare-heading" class="text-xl font-bold text-white tracking-tight mb-6 m-0">
            Compare {{ meta.shortName }} with other providers
          </h2>
          <div class="flex flex-wrap gap-2 mb-6">
            @for (link of comparisonLinks; track link.slug) {
              <a
                [routerLink]="['/compare', link.slug]"
                class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
                {{ link.label }}
              </a>
            }
          </div>
          <h3 class="text-sm font-bold text-slate-300 mb-3">Cost guides featuring {{ meta.shortName }}</h3>
          <div class="flex flex-wrap gap-2">
            @for (guide of guideLinks; track guide.slug) {
              <a
                [routerLink]="['/guides', guide.slug]"
                class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
                {{ guide.label }}
              </a>
            }
          </div>
          <div class="mt-5">
            <app-affiliate-cta [provider]="provider" variant="inline" context="provider-page"></app-affiliate-cta>
            <app-affiliate-disclosure></app-affiliate-disclosure>
          </div>
        </section>

        <!-- FAQ -->
        <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-xl" aria-labelledby="faq-heading">
          <h2 id="faq-heading" class="text-xl font-bold text-white tracking-tight mb-6 flex items-center gap-2 m-0">
            <mat-icon class="text-amber-400">help_outline</mat-icon>
            <span>{{ meta.name }} pricing — frequently asked questions</span>
          </h2>
          <div class="space-y-4">
            @for (faq of faqs; track faq.question) {
              <div class="rounded-xl bg-slate-800/40 p-4 border border-slate-700/40">
                <h3 class="text-sm sm:text-base font-bold text-white m-0">{{ faq.question }}</h3>
                <p class="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed m-0">{{ faq.answer }}</p>
              </div>
            }
          </div>
          <p class="mt-5 mb-0 text-[11px] text-slate-500">
            Provenance for every figure on this page is listed on the
            <a routerLink="/methodology" class="text-blue-400 hover:text-white underline">methodology page</a>.
          </p>
        </section>

      </article>
    }
  `
})
export class ProviderDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seoService = inject(SeoService);

  provider: CloudProvider | null = null;
  meta!: ProviderMeta;
  copy!: ProviderPageCopy;
  headline = '';
  freshness!: ProviderFreshness;
  faqs: { question: string; answer: string }[] = [];
  workloadRows: ProviderWorkloadRow[] = [];
  computeRows: ProviderComputeRow[] = [];
  storageRows: ProviderTableRow[] = [];
  databaseRows: ProviderTableRow[] = [];
  networkingRows: ProviderTableRow[] = [];
  kubernetesRows: ProviderTableRow[] = [];
  rankNotes: string[] = [];
  savingsTips: string[] = [];
  comparisonLinks: { slug: string; label: string }[] = [];
  readonly guideLinks = GUIDE_TABS;

  private routeSub?: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      const provider = providerFromSlug(params.get('slug') ?? '');
      if (!provider) {
        this.router.navigate(['/providers'], { replaceUrl: true });
        return;
      }
      this.load(provider);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private load(provider: CloudProvider): void {
    this.provider = provider;
    this.meta = PROVIDER_METAS[provider];
    this.copy = providerPageCopy(provider);
    this.headline = providerHeadline(provider);
    this.freshness = providerFreshness(provider);
    this.faqs = buildProviderFaqs(provider);
    this.workloadRows = buildWorkloadRows(provider);
    this.computeRows = buildComputeRows(provider);
    this.storageRows = buildStorageRows(provider);
    this.databaseRows = buildDatabaseRows(provider);
    this.networkingRows = buildNetworkingRows(provider);
    this.kubernetesRows = buildKubernetesRows(provider);
    this.rankNotes = buildRankNotes(provider);
    this.savingsTips = Object.values(this.meta.savingsTips);
    this.comparisonLinks = providerComparisonLinks(provider);
    this.setupSeo(provider);
  }

  private setupSeo(provider: CloudProvider): void {
    const canonicalUrl = `${SITE}/providers/${this.meta.slug}`;
    this.seoService.updateTags({
      title: this.copy.title,
      description: this.copy.metaDescription,
      keywords: this.copy.keywords,
      canonicalUrl,
      structuredDataJson: [
        SchemaGenerator.generateWebPageSchema({
          name: this.headline,
          description: this.copy.metaDescription,
          url: canonicalUrl,
          dateModified: this.freshness.asOf
        }),
        SchemaGenerator.generateFaqSchema(this.faqs),
        SchemaGenerator.generateBreadcrumbSchema([
          { name: 'Home', url: `${SITE}/` },
          { name: 'Providers', url: `${SITE}/providers` },
          { name: this.meta.shortName, url: canonicalUrl }
        ]),
        SchemaGenerator.generateItemListSchema({
          name: `${this.meta.shortName} cloud cost comparisons`,
          items: this.comparisonLinks.map((link) => ({
            name: link.label,
            url: `${SITE}/compare/${link.slug}`
          }))
        })
      ]
    });
  }
}

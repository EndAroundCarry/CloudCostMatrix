import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ALL_PROVIDERS, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { getProviderFreshness } from '../../core/engine/catalog/provider-verification';
import { CURRENCY_DEFINITIONS, REGION_DEFINITIONS } from '../../core/models/pricing.model';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';

@Component({
  selector: 'app-methodology',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <article class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
        <a routerLink="/" class="hover:text-white transition-colors">Home</a>
        <span aria-hidden="true">/</span>
        <span class="text-slate-200" aria-current="page">Methodology</span>
      </nav>

      <header>
        <h1 class="text-3xl font-extrabold text-white tracking-tight m-0">How CloudCostMatrix Calculates Pricing</h1>
        <p class="mt-3 text-sm text-slate-300 leading-relaxed max-w-2xl m-0">
          Every number on this site is directional — useful for architecture planning and provider selection, not a
          substitute for a quote from a provider's own calculator. This page explains exactly how the engine works,
          what it approximates, and how fresh each provider's catalog is, so you can judge how much to trust any
          given figure.
        </p>
      </header>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h2 class="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2 m-0">
          <mat-icon class="text-blue-400">calculate</mat-icon>
          <span>How the calculation works</span>
        </h2>
        <ul class="space-y-3 text-sm text-slate-300 leading-relaxed">
          <li><strong class="text-white">Nearest-shape matching.</strong> When you request e.g. 4 vCPU / 16 GB RAM, the engine picks the closest published instance shape from each provider's catalog — it does not interpolate between shapes, so small requests can land on a larger-than-requested instance if that's the nearest match.</li>
          <li><strong class="text-white">730 hours/month.</strong> All hourly rates are converted to monthly using a flat 730 hours (the average length of a month), not the exact days in the current calendar month.</li>
          <li><strong class="text-white">Regional multipliers.</strong> Prices are benchmarked in each provider's primary US region, then adjusted by a flat regional multiplier (e.g. Europe ×1.10, Asia Pacific ×1.16) rather than fetching real region-specific rates for every region.</li>
          <li><strong class="text-white">Reserved & Spot pricing is derived, not fetched, even for live-synced providers.</strong> Every public pricing API used here (Azure, Oracle, Linode) returns on-demand rates only — 1-year, 3-year, and Spot/preemptible rates are computed as fixed multipliers of the live on-demand rate (e.g. 3-yr ≈ ×0.40–0.67, varying by provider). AWS's reserved/spot rates come from the seeded benchmark. This is disclosed per-provider in the table below.</li>
          <li><strong class="text-white">Coverage gaps are excluded from ranking, never faked.</strong> When a provider genuinely doesn't sell a requested combination (e.g. managed SQL Server on DigitalOcean, an Archive storage tier on Linode), the comparison table shows "Not offered" and that provider is excluded from the cheapest-provider ranking for that configuration — it is never assigned a $0 or estimated substitute cost.</li>
          <li><strong class="text-white">Currency conversion uses fixed exchange rates</strong> ({{ currencyList.length }} currencies supported), not a live FX feed. Rates are updated periodically, not in real time — treat non-USD figures as approximate.</li>
        </ul>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h2 class="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2 m-0">
          <mat-icon class="text-emerald-400">verified</mat-icon>
          <span>Per-provider pricing freshness</span>
        </h2>
        <p class="text-xs text-slate-400 mb-5 m-0">
          <span class="text-emerald-400 font-bold">Live</span> — fetched from the provider's public pricing API on an automated schedule.
          <span class="text-blue-400 font-bold ml-2">Verified</span> — manually reconciled against the provider's published pricing page on the date shown.
          <span class="text-amber-400 font-bold ml-2">Estimate</span> — a relative-positioning estimate not yet reconciled against real published rates; treat these numbers as the least reliable on the site.
        </p>
        <div class="overflow-x-auto rounded-xl border border-slate-800">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-800/60 text-slate-400 uppercase tracking-wider">
                <th class="py-2.5 px-4 font-bold">Provider</th>
                <th class="py-2.5 px-4 font-bold">Status</th>
                <th class="py-2.5 px-4 font-bold">Source</th>
                <th class="py-2.5 px-4 font-bold">Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              @for (provider of providers; track provider) {
                @let f = freshness(provider);
                @let meta = providerMetas[provider];
                <tr class="hover:bg-slate-800/30">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2 font-bold text-white">
                      <span class="w-6 h-6 rounded-lg flex items-center justify-center" [style.background-color]="meta.badgeBg" [style.color]="meta.primaryColor">
                        <mat-icon class="!text-sm">{{ meta.icon }}</mat-icon>
                      </span>
                      {{ meta.shortName }}
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <span class="font-bold"
                          [class.text-emerald-400]="f.tier === 'LIVE'"
                          [class.text-blue-400]="f.tier === 'VERIFIED'"
                          [class.text-amber-400]="f.tier === 'ESTIMATE'">
                      {{ f.label }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <a [href]="f.sourceUrl" target="_blank" rel="noopener nofollow" class="text-slate-400 hover:text-white underline break-all">{{ f.sourceUrl }}</a>
                  </td>
                  <td class="py-3 px-4 text-slate-400">
                    @for (note of f.caveats; track note) {
                      <p class="m-0 mb-1 last:mb-0">{{ note }}</p>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h2 class="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2 m-0">
          <mat-icon class="text-sky-400">handshake</mat-icon>
          <span>Affiliate links & ranking independence</span>
        </h2>
        <p class="text-sm text-slate-300 leading-relaxed m-0">
          CloudCostMatrix carries affiliate links to some providers — see the <a routerLink="/disclosure" class="text-blue-400 hover:text-white underline">full disclosure</a> for which
          ones and what commission structure applies. The cost calculations, rankings, and "cheapest provider" verdicts
          on this site are computed entirely by the pricing engine described above, from the published list-price
          catalogs — no affiliate relationship touches that math. If a provider we don't have a commercial relationship
          with is cheaper for your workload, that is what the calculator will show.
        </p>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h2 class="text-lg font-bold text-white tracking-tight mb-3 flex items-center gap-2 m-0">
          <mat-icon class="text-slate-400">public</mat-icon>
          <span>Supported regions</span>
        </h2>
        <p class="text-xs text-slate-400 m-0">
          {{ regionList.length }} region multipliers: {{ regionNames }}. Regional multipliers are applied uniformly across all providers and are not provider-specific.
        </p>
      </section>
    </article>
  `
})
export class MethodologyComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  readonly providers = ALL_PROVIDERS;
  readonly providerMetas = PROVIDER_METAS;
  readonly currencyList = Object.values(CURRENCY_DEFINITIONS);
  readonly regionList = Object.values(REGION_DEFINITIONS);
  readonly regionNames = this.regionList.map((r) => r.shortLocation).join(', ');

  freshness(provider: (typeof ALL_PROVIDERS)[number]) {
    return getProviderFreshness(provider);
  }

  ngOnInit(): void {
    const canonicalUrl = 'https://cloudcostmatrix.com/methodology';
    this.seoService.updateTags({
      title: 'Methodology — How CloudCostMatrix Calculates Cloud Pricing',
      description: 'How CloudCostMatrix computes cloud cost estimates: nearest-shape matching, regional multipliers, derived reserved/spot rates, and per-provider pricing freshness (Live/Verified/Estimate) for all 9 providers.',
      keywords: ['cloud cost calculator methodology', 'pricing accuracy', 'cloud TCO calculation method'],
      canonicalUrl,
      robotsMeta: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
      structuredDataJson: [
        SchemaGenerator.generateBreadcrumbSchema([
          { name: 'Home', url: 'https://cloudcostmatrix.com/' },
          { name: 'Methodology', url: canonicalUrl }
        ]),
        SchemaGenerator.generateWebPageSchema({
          name: 'CloudCostMatrix Methodology',
          description: 'How pricing is calculated and how fresh each provider catalog is.',
          url: canonicalUrl
        })
      ]
    });
  }
}

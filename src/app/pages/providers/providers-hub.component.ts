import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';
import { ALL_PROVIDERS, CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { CostCalculatorEngine } from '../../core/engine/cost-calculator.engine';
import { rankProviders } from '../../core/seo/provider-rankings';

const SITE = 'https://cloudcostmatrix.com';

interface ProviderCard {
  provider: CloudProvider;
  name: string;
  shortName: string;
  slug: string;
  tierLabel: string;
  headline: string;
  icon: string;
  primaryColor: string;
  badgeBg: string;
  entryCompute: string;
  rankNote: string;
  services: string;
}

/**
 * The provider directory. Its job is discovery rather than depth: it exists so
 * every provider page is one click from a hub, and so "cloud provider
 * comparison" queries land on a page that enumerates the whole catalog.
 */
@Component({
  selector: 'app-providers-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
        <a routerLink="/" class="hover:text-white transition-colors">Home</a>
        <span aria-hidden="true">/</span>
        <span class="text-slate-200" aria-current="page">Providers</span>
      </nav>

      <header class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight m-0">
          Cloud Provider Pricing Directory — All {{ cards.length }} Providers Compared (2026)
        </h1>
        <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl m-0">
          Every provider in the catalog, with its entry-level compute price, where it ranks, and the services it is
          actually branded on. Each page prices that provider's published list rates through the same engine as the
          live estimator — then compares the result with the other nine.
        </p>
      </header>

      <section aria-labelledby="providers-heading">
        <h2 id="providers-heading" class="sr-only">Providers</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          @for (card of cards; track card.slug) {
            <a
              [routerLink]="['/providers', card.slug]"
              class="group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-600 p-5 no-underline transition-all">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2.5">
                  <div
                    class="w-9 h-9 rounded-lg flex items-center justify-center"
                    [style.background-color]="card.badgeBg"
                    [style.color]="card.primaryColor">
                    <mat-icon class="!text-base">{{ card.icon }}</mat-icon>
                  </div>
                  <div>
                    <div class="text-base font-bold text-white">{{ card.name }}</div>
                    <span class="text-[11px] text-slate-400 uppercase tracking-wider">{{ card.tierLabel }}</span>
                  </div>
                </div>
                <mat-icon class="!text-base text-slate-500 group-hover:text-white transition-colors">arrow_forward</mat-icon>
              </div>

              <p class="text-xs text-slate-400 leading-relaxed m-0">{{ card.headline }}</p>

              <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs m-0">
                <div>
                  <dt class="text-slate-500 m-0">Entry compute</dt>
                  <dd class="text-slate-200 font-semibold m-0">{{ card.entryCompute }}</dd>
                </div>
                <div>
                  <dt class="text-slate-500 m-0">Ranking</dt>
                  <dd class="text-slate-200 font-semibold m-0">{{ card.rankNote }}</dd>
                </div>
              </dl>

              <p class="mt-3 mb-0 text-[11px] text-slate-500">{{ card.services }}</p>
            </a>
          }
        </div>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8" aria-labelledby="next-heading">
        <h2 id="next-heading" class="text-xl font-bold text-white tracking-tight mb-4 m-0">Where to go next</h2>
        <div class="flex flex-wrap gap-2">
          <a routerLink="/" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
            Price your own architecture
          </a>
          <a routerLink="/compare" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
            Head-to-head comparisons
          </a>
          <a routerLink="/guides" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
            Cost guides
          </a>
          <a routerLink="/blueprints" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
            Architecture blueprints
          </a>
        </div>
      </section>
    </div>
  `
})
export class ProvidersHubComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  readonly cards: ProviderCard[] = ALL_PROVIDERS.map((provider) => {
    const meta = PROVIDER_METAS[provider];
    const entry = CostCalculatorEngine.calculateCompute(
      { vCpu: 2, ramGb: 4, os: 'LINUX', count: 1, hoursPerMonth: 730, commitment: 'ON_DEMAND' },
      provider
    );
    const ranking = rankProviders('entryCompute').find((r) => r.provider === provider);
    return {
      provider,
      name: meta.name,
      shortName: meta.shortName,
      slug: meta.slug,
      tierLabel:
        meta.tier === 'HYPERSCALER' ? 'Hyperscaler' : meta.tier === 'CHALLENGER' ? 'Challenger cloud' : 'Developer cloud',
      headline: meta.headline,
      icon: meta.icon,
      primaryColor: meta.primaryColor,
      badgeBg: meta.badgeBg,
      entryCompute: `$${entry.monthlyCost.toFixed(2)}/mo`,
      rankNote: ranking ? `#${ranking.rank} of ${ALL_PROVIDERS.length} on entry compute` : '',
      services: `${meta.services.compute} · ${meta.services.objectStorage} · ${meta.services.kubernetes}`
    };
  });

  ngOnInit(): void {
    const canonicalUrl = `${SITE}/providers`;
    this.seoService.updateTags({
      title: 'Cloud Provider Pricing Directory',
      description:
        'Cloud provider directory: AWS, Azure, Google Cloud, Oracle, IBM, DigitalOcean, Alibaba, Linode, OVHcloud and Vultr — with entry pricing and rankings.',
      keywords: [
        'cloud provider comparison',
        'cloud pricing directory',
        'cloud providers list 2026',
        'multi-cloud providers compared',
        'cheapest cloud provider'
      ],
      canonicalUrl,
      structuredDataJson: [
        SchemaGenerator.generateWebPageSchema({
          name: 'Cloud Provider Pricing Directory',
          description: 'All ten cloud providers in the catalog with entry pricing and rankings.',
          url: canonicalUrl
        }),
        SchemaGenerator.generateBreadcrumbSchema([
          { name: 'Home', url: `${SITE}/` },
          { name: 'Providers', url: canonicalUrl }
        ]),
        SchemaGenerator.generateItemListSchema({
          name: 'Cloud providers compared',
          items: ALL_PROVIDERS.map((provider) => ({
            name: PROVIDER_METAS[provider].name,
            url: `${SITE}/providers/${PROVIDER_METAS[provider].slug}`
          }))
        })
      ]
    });
  }
}

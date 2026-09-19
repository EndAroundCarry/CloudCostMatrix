import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';
import { ARCHITECTURE_BLUEPRINTS } from '../../core/models/blueprints.model';
import { ALL_PROVIDERS, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { CostCalculatorEngine } from '../../core/engine/cost-calculator.engine';

const SITE = 'https://cloudcostmatrix.com';

interface BlueprintCard {
  slug: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  recommendedFor: string;
  cheapest: string;
  spread: string;
}

/**
 * Blueprints directory. The per-card cheapest/spread figures are computed here,
 * so the hub itself answers the question a visitor arrives with — "what does
 * this kind of architecture cost, and how much does the provider choice move
 * it?" — instead of only linking onwards.
 */
@Component({
  selector: 'app-blueprints-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
        <a routerLink="/" class="hover:text-white transition-colors">Home</a>
        <span aria-hidden="true">/</span>
        <span class="text-slate-200" aria-current="page">Blueprints</span>
      </nav>

      <header class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight m-0">
          Cloud Architecture Blueprints — What {{ cards.length }} Workloads Actually Cost (2026)
        </h1>
        <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl m-0">
          Four reference architectures, each priced across all {{ providerCount }} providers in the catalog by the same
          engine as the live estimator. Open one to see the per-provider totals, the cost topology, and every assumption
          behind the number — then load it into the calculator and change whatever you disagree with.
        </p>
      </header>

      <section aria-labelledby="blueprints-heading">
        <h2 id="blueprints-heading" class="sr-only">Architecture blueprints</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          @for (card of cards; track card.slug) {
            <a
              [routerLink]="['/blueprints', card.slug]"
              class="group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-600 p-6 no-underline transition-all">
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                    <mat-icon class="!text-lg">{{ card.icon }}</mat-icon>
                  </div>
                  <h3 class="text-base font-bold text-white m-0">{{ card.name }}</h3>
                </div>
                <mat-icon class="!text-base text-slate-500 group-hover:text-white transition-colors shrink-0">arrow_forward</mat-icon>
              </div>

              <p class="text-xs text-slate-400 leading-relaxed m-0">{{ card.tagline }}</p>
              <p class="mt-2 text-xs text-slate-500 leading-relaxed m-0">{{ card.description }}</p>

              <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs m-0">
                <div>
                  <dt class="text-slate-500 m-0">Cheapest provider</dt>
                  <dd class="text-slate-200 font-semibold m-0">{{ card.cheapest }}</dd>
                </div>
                <div>
                  <dt class="text-slate-500 m-0">Provider spread</dt>
                  <dd class="text-slate-200 font-semibold m-0">{{ card.spread }}</dd>
                </div>
              </dl>

              <span class="mt-3 inline-block text-[11px] text-slate-500 uppercase tracking-wider">Best for: {{ card.recommendedFor }}</span>
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
            All 45 comparisons
          </a>
          <a routerLink="/guides" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all no-underline">
            Cost guides
          </a>
        </div>
      </section>
    </div>
  `
})
export class BlueprintsHubComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  readonly providerCount = ALL_PROVIDERS.length;

  readonly cards: BlueprintCard[] = ARCHITECTURE_BLUEPRINTS.map((blueprint) => {
    const matrix = CostCalculatorEngine.calculateFullMatrix(blueprint.config);
    const cheapest = PROVIDER_METAS[matrix.cheapestMonthlyProvider];
    const spreadPercent = matrix.monthlyMaxSavingsPercent ?? 0;
    return {
      slug: blueprint.slug,
      name: blueprint.name,
      icon: blueprint.icon,
      tagline: blueprint.tagline,
      description: blueprint.description,
      recommendedFor: blueprint.recommendedFor,
      cheapest: `${cheapest.shortName} — $${Math.round(matrix.providers[matrix.cheapestMonthlyProvider].monthlyTotal).toLocaleString('en-US')}/mo`,
      spread: `${Math.round(spreadPercent)}% between cheapest and dearest`
    };
  });

  ngOnInit(): void {
    const canonicalUrl = `${SITE}/blueprints`;
    const description =
      'Four reference cloud architectures — SaaS MVP, high-traffic e-commerce, enterprise Kubernetes and AI/ML inference — priced across all ten providers by the live engine.';

    this.seoService.updateTags({
      title: 'Cloud Architecture Blueprints — Costed',
      description,
      keywords: [
        'cloud architecture cost',
        'SaaS infrastructure cost',
        'ecommerce cloud cost',
        'kubernetes cluster cost',
        'AI inference infrastructure cost'
      ],
      canonicalUrl,
      structuredDataJson: [
        SchemaGenerator.generateWebPageSchema({
          name: 'Cloud architecture blueprints',
          description,
          url: canonicalUrl
        }),
        SchemaGenerator.generateBreadcrumbSchema([
          { name: 'Home', url: `${SITE}/` },
          { name: 'Blueprints', url: canonicalUrl }
        ]),
        SchemaGenerator.generateItemListSchema({
          name: 'Architecture blueprints',
          items: this.cards.map((card) => ({ name: card.name, url: `${SITE}/blueprints/${card.slug}` }))
        })
      ]
    });
  }
}

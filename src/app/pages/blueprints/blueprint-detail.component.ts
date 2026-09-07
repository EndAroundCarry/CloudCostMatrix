import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { ARCHITECTURE_BLUEPRINTS, ArchitectureBlueprint } from '../../core/models/blueprints.model';
import { EstimatorStore } from '../../state/estimator.store';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';
import { CostCalculatorEngine } from '../../core/engine/cost-calculator.engine';
import { CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { ServiceCategory, SERVICE_CATEGORY_METAS } from '../../core/models/service-category.enum';

@Component({
  selector: 'app-blueprint-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <article class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
        <a routerLink="/" class="hover:text-white transition-colors">Home</a>
        <span aria-hidden="true">/</span>
        <span class="text-blue-400">Architecture Blueprints</span>
        <span aria-hidden="true">/</span>
        <span class="text-slate-200" aria-current="page">{{ blueprint.name }}</span>
      </nav>

      <!-- Blueprint Hero Header -->
      <header class="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <mat-icon class="!text-sm">verified</mat-icon>
            <span>Production-Vetted Blueprint</span>
          </div>

          <div class="flex items-center gap-2">
            <button 
              mat-flat-button 
              class="!bg-gradient-to-r !from-blue-600 !to-indigo-600 !text-white font-bold shadow-lg shadow-blue-500/20"
              (click)="loadAndCustomize()">
              <mat-icon class="!mr-1">tune</mat-icon>
              <span>Load & Customize in Live Estimator</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-3 mb-2">
          <div class="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <mat-icon class="!text-2xl">{{ blueprint.icon }}</mat-icon>
          </div>
          <div>
            <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight m-0">
              {{ blueprint.name }}
            </h1>
            <p class="text-xs text-slate-400 mt-0.5 m-0 font-medium">
              Recommended for: <span class="text-slate-200">{{ blueprint.recommendedFor }}</span>
            </p>
          </div>
        </div>

        <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl m-0">
          {{ blueprint.description }}
        </p>
      </header>

      <!-- Multi-Cloud Pricing Comparison for this Blueprint -->
      <section class="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight m-0 flex items-center gap-2">
              <mat-icon class="text-emerald-400">payments</mat-icon>
              <span>Estimated Cost Across AWS vs Azure vs GCP</span>
            </h2>
            <p class="text-xs text-slate-400 m-0 mt-0.5">Calculated using production baseline pricing in US-East with standard commitments.</p>
          </div>

          <div class="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            Active Currency: <strong class="text-white">{{ store.selectedCurrency() }}</strong>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (prov of providers; track prov) {
            @let total = blueprintMatrix.providers[prov];
            @let meta = providerMetas[prov];
            @let isCheapest = blueprintMatrix.cheapestMonthlyProvider === prov;

            <div 
              [class.ring-2]="isCheapest"
              [class.ring-emerald-400]="isCheapest"
              class="rounded-xl bg-slate-800/50 border border-slate-700 p-5 relative">
              @if (isCheapest) {
                <span class="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  Lowest TCO
                </span>
              }

              <div class="flex items-center gap-2.5 mb-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                     [style.background-color]="meta.badgeBg"
                     [style.color]="meta.primaryColor">
                  <mat-icon class="!text-sm">{{ meta.icon }}</mat-icon>
                </div>
                <div>
                  <h3 class="font-bold text-white text-sm m-0">{{ meta.name }}</h3>
                  <span class="text-[11px] text-slate-400">{{ meta.shortName }} Benchmark</span>
                </div>
              </div>

              <div class="text-2xl font-extrabold text-white tracking-tight my-2">
                {{ store.formatMoney(total.monthlyTotal) }}<span class="text-xs text-slate-400 font-normal"> /mo</span>
              </div>
              <div class="text-xs text-slate-400">
                Annual Total: <strong class="text-slate-200">{{ store.formatMoney(total.annualTotal) }}</strong>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Visual Architecture Topology Flow -->
      <section class="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <h2 class="text-lg sm:text-xl font-bold text-white tracking-tight mb-6 flex items-center gap-2 m-0">
          <mat-icon class="text-blue-400">hub</mat-icon>
          <span>Architecture Topology & Data Flow</span>
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          
          <!-- Step 1: Ingress / Networking -->
          <div class="rounded-xl bg-slate-800/60 border border-slate-700 p-4 relative flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Layer 1</span>
                <span class="w-2 h-2 rounded-full bg-blue-400"></span>
              </div>
              <div class="font-bold text-white text-sm flex items-center gap-1.5 mb-2">
                <mat-icon class="text-sky-400 !text-base">alt_route</mat-icon>
                <span>Edge & Ingress</span>
              </div>
              <p class="text-xs text-slate-300 leading-relaxed m-0">
                {{ blueprint.config.networking.loadBalancersCount }}x High-Availability Load Balancers handling incoming traffic.
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
              Egress: <strong class="text-white">{{ blueprint.config.networking.egressGbPerMonth.toLocaleString() }} GB/mo</strong>
            </div>
          </div>

          <!-- Step 2: Compute / K8s -->
          <div class="rounded-xl bg-slate-800/60 border border-slate-700 p-4 relative flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Layer 2</span>
                <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              </div>
              <div class="font-bold text-white text-sm flex items-center gap-1.5 mb-2">
                <mat-icon class="text-amber-400 !text-base">dns</mat-icon>
                <span>Compute Tier</span>
              </div>
              @if (blueprint.config.activeCategories['KUBERNETES']) {
                <p class="text-xs text-slate-300 leading-relaxed m-0">
                  {{ blueprint.config.kubernetes.clustersCount }}x Managed K8s Cluster with {{ blueprint.config.kubernetes.workerNodesPerCluster }}x Nodes ({{ blueprint.config.kubernetes.workerVcpu }} vCPU, {{ blueprint.config.kubernetes.workerRamGb }} GB RAM each).
                </p>
              } @else {
                <p class="text-xs text-slate-300 leading-relaxed m-0">
                  {{ blueprint.config.compute.count }}x Virtual Machines ({{ blueprint.config.compute.vCpu }} vCPU, {{ blueprint.config.compute.ramGb }} GB RAM) running {{ blueprint.config.compute.os }}.
                </p>
              }
            </div>
            <div class="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
              Commitment: <strong class="text-white">{{ blueprint.config.compute.commitment.replace(/_/g, ' ') }}</strong>
            </div>
          </div>

          <!-- Step 3: Database -->
          <div class="rounded-xl bg-slate-800/60 border border-slate-700 p-4 relative flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Layer 3</span>
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <div class="font-bold text-white text-sm flex items-center gap-1.5 mb-2">
                <mat-icon class="text-emerald-400 !text-base">storage</mat-icon>
                <span>Managed Database</span>
              </div>
              <p class="text-xs text-slate-300 leading-relaxed m-0">
                Managed {{ blueprint.config.database.engine }} ({{ blueprint.config.database.vCpu }} vCPU, {{ blueprint.config.database.ramGb }} GB RAM). Multi-AZ: {{ blueprint.config.database.multiAz ? 'Enabled' : 'Single AZ' }}.
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
              Storage: <strong class="text-white">{{ blueprint.config.database.storageGb }} GB SSD</strong>
            </div>
          </div>

          <!-- Step 4: Storage -->
          <div class="rounded-xl bg-slate-800/60 border border-slate-700 p-4 relative flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Layer 4</span>
                <span class="w-2 h-2 rounded-full bg-purple-400"></span>
              </div>
              <div class="font-bold text-white text-sm flex items-center gap-1.5 mb-2">
                <mat-icon class="text-purple-400 !text-base">cloud_queue</mat-icon>
                <span>Object Storage</span>
              </div>
              <p class="text-xs text-slate-300 leading-relaxed m-0">
                {{ blueprint.config.storage.capacityGb.toLocaleString() }} GB {{ blueprint.config.storage.tier }} Object Storage for application media, assets, and backups.
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
              I/O: <strong class="text-white">{{ blueprint.config.storage.readOpsThousands }}k Reads/mo</strong>
            </div>
          </div>

        </div>
      </section>

      <!-- Other Workload Blueprints -->
      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-xl">
        <h2 class="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2 m-0">
          <mat-icon class="text-slate-400">view_carousel</mat-icon>
          <span>Explore Other Workload Blueprints</span>
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          @for (bp of otherBlueprints; track bp.id) {
            <a 
              [routerLink]="['/blueprints', bp.slug]"
              class="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 hover:border-slate-500 transition-all text-left no-underline group block">
              <div class="flex items-center gap-2.5 mb-2">
                <mat-icon class="text-blue-400">{{ bp.icon }}</mat-icon>
                <div class="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">{{ bp.name }}</div>
              </div>
              <p class="text-xs text-slate-400 line-clamp-2 m-0">{{ bp.tagline }}</p>
            </a>
          }
        </div>
      </section>

    </article>
  `
})
export class BlueprintDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seoService = inject(SeoService);
  protected readonly store = inject(EstimatorStore);

  readonly providers = [CloudProvider.AWS, CloudProvider.AZURE, CloudProvider.GCP];
  readonly providerMetas = PROVIDER_METAS;
  readonly categoryMetas = SERVICE_CATEGORY_METAS;

  blueprint: ArchitectureBlueprint = ARCHITECTURE_BLUEPRINTS[0];
  otherBlueprints: ArchitectureBlueprint[] = [];
  blueprintMatrix = CostCalculatorEngine.calculateFullMatrix(ARCHITECTURE_BLUEPRINTS[0].config);

  private routeSub?: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      const found = ARCHITECTURE_BLUEPRINTS.find(b => b.slug === slug);
      if (found) {
        this.blueprint = found;
        this.otherBlueprints = ARCHITECTURE_BLUEPRINTS.filter(b => b.id !== found.id);
        this.blueprintMatrix = CostCalculatorEngine.calculateFullMatrix(found.config);
        this.setupSeo(found);
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadAndCustomize(): void {
    this.store.applyBlueprint(this.blueprint);
    this.router.navigate(['/']);
  }

  private setupSeo(bp: ArchitectureBlueprint): void {
    const canonicalUrl = `https://cloudcostmatrix.com/blueprints/${bp.slug}`;

    this.seoService.updateTags({
      title: `${bp.name} — Multi-Cloud Architecture Cost Blueprint (AWS vs Azure vs GCP)`,
      description: `${bp.tagline} Compare estimated TCO across AWS, Azure, and GCP. Detailed infrastructure sizing and cost breakdown.`,
      keywords: [bp.name, 'cloud architecture blueprint', 'AWS vs Azure vs GCP cost', bp.recommendedFor, 'TCO estimator 2026'],
      canonicalUrl,
      structuredDataJson: [
        SchemaGenerator.generateBreadcrumbSchema([
          { name: 'Home', url: 'https://cloudcostmatrix.com/' },
          { name: 'Blueprints', url: 'https://cloudcostmatrix.com/' },
          { name: bp.name, url: canonicalUrl }
        ]),
        SchemaGenerator.generateWebPageSchema({
          name: `${bp.name} Cloud Cost Blueprint`,
          description: bp.description,
          url: canonicalUrl
        })
      ]
    });
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HeroComponent } from '../../components/hero/hero.component';
import { MatrixTableComponent } from '../../components/matrix-table/matrix-table.component';
import { ConfiguratorComponent } from '../../components/configurator/configurator.component';
import { TcoChartComponent } from '../../components/charts/tco-chart.component';
import { RecommendationsComponent } from '../../components/recommendations/recommendations.component';
import { ExportShareModalComponent } from '../../components/export-share-modal/export-share-modal.component';
import { CostTopologyComponent } from '../../components/cost-topology/cost-topology.component';
import { ProviderPickerComponent } from '../../components/provider-picker/provider-picker.component';
import { EstimatorStore } from '../../state/estimator.store';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    HeroComponent,
    MatrixTableComponent,
    ConfiguratorComponent,
    TcoChartComponent,
    RecommendationsComponent,
    ExportShareModalComponent,
    CostTopologyComponent,
    ProviderPickerComponent
  ],
  template: `
    <div class="space-y-8 pb-16">
      <!-- SEO Hero Section with Preset Selectors -->
      <app-hero></app-hero>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <!-- Architecture Management Action Bar -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4">
          <div>
            <div class="text-sm font-bold text-white flex items-center gap-2 m-0">
              <mat-icon class="text-amber-400 !text-base">folder_special</mat-icon>
              Architecture Library
            </div>
            <p class="text-xs text-slate-400 m-0 mt-0.5">
              Save, branch, and compare scenarios against your current matrix — guest-first with zero signup.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button mat-stroked-button class="!border-slate-600 !text-slate-200 !bg-slate-800/40" (click)="store.isSavedEstimatesOpen.set(true)">
              <mat-icon class="!mr-1 text-amber-400 !text-sm">bookmarks</mat-icon>
              Saved Architectures
              @if (store.savedEstimateCount() > 0) {
                <span class="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 on-vivid text-[10px] font-black">{{ store.savedEstimateCount() }}</span>
              }
            </button>
            <button mat-stroked-button class="!border-slate-600 !text-slate-200 !bg-slate-800/40" (click)="store.openDiffModal()">
              <mat-icon class="!mr-1 text-sky-400 !text-sm">compare_arrows</mat-icon>
              A vs B Diff
            </button>
            <button mat-flat-button class="!bg-gradient-to-r !from-amber-500 !to-orange-500 on-vivid !font-bold shadow-lg shadow-amber-500/20" (click)="store.openSaveDialog()">
              <mat-icon class="!mr-1 !text-sm">bookmark_add</mat-icon>
              Save
            </button>
          </div>
        </div>

        <!-- Interactive Visual Cost Topology (Feature 4) -->
        <app-cost-topology></app-cost-topology>

        <!-- Provider selection — big 3 pre-selected, expand up to all 9 -->
        <app-provider-picker></app-provider-picker>

        <!-- Live Side-by-Side Matrix Table -->
        <app-matrix-table></app-matrix-table>

        <!-- Charts & Strategic Recommendations -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <app-tco-chart></app-tco-chart>
          <app-recommendations></app-recommendations>
        </div>

        <!-- Spec Configurator -->
        <app-configurator></app-configurator>

        <!-- SEO: How It Works Section (supports HowTo schema) -->
        <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-xl" aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading" class="text-xl font-bold text-white tracking-tight mb-6 flex items-center gap-2 m-0">
            <mat-icon class="text-sky-400">integration_instructions</mat-icon>
            <span>How to Compare Cloud Costs in 3 Steps</span>
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="rounded-xl bg-slate-800/40 p-5 border border-slate-700/40 text-center">
              <div class="w-10 h-10 mx-auto rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg font-extrabold mb-3">1</div>
              <h3 class="text-sm font-bold text-white m-0 mb-2">Select a Workload Blueprint</h3>
              <p class="text-xs text-slate-300 leading-relaxed m-0">Choose a preconfigured architecture like SaaS MVP, E-Commerce, Kubernetes microservices, or AI/ML inference to auto-populate realistic specs.</p>
            </div>
            <div class="rounded-xl bg-slate-800/40 p-5 border border-slate-700/40 text-center">
              <div class="w-10 h-10 mx-auto rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-extrabold mb-3">2</div>
              <h3 class="text-sm font-bold text-white m-0 mb-2">Customize Your Infrastructure</h3>
              <p class="text-xs text-slate-300 leading-relaxed m-0">Adjust vCPUs, RAM, storage capacity, database engine, egress bandwidth, and commitment type using interactive sliders.</p>
            </div>
            <div class="rounded-xl bg-slate-800/40 p-5 border border-slate-700/40 text-center">
              <div class="w-10 h-10 mx-auto rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg font-extrabold mb-3">3</div>
              <h3 class="text-sm font-bold text-white m-0 mb-2">Compare & Share Results</h3>
              <p class="text-xs text-slate-300 leading-relaxed m-0">View the side-by-side TCO matrix across up to 9 cloud providers — AWS, Azure, GCP, and 6 more. Export as CSV, print as PDF, or share via instant URL — no signup required.</p>
            </div>
          </div>
        </section>

        <!-- SEO: FAQ Section (targets Google "People Also Ask") -->
        <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-xl" aria-labelledby="faq-heading">
          <h2 id="faq-heading" class="text-xl font-bold text-white tracking-tight mb-6 flex items-center gap-2 m-0">
            <mat-icon class="text-amber-400">help_outline</mat-icon>
            <span>Cloud Cost Comparison FAQ</span>
          </h2>

          <div class="space-y-4">
            @for (faq of faqs; track faq.question) {
              <div class="rounded-xl bg-slate-800/40 p-4 border border-slate-700/40">
                <h3 class="text-sm sm:text-base font-bold text-white m-0">{{ faq.question }}</h3>
                <p class="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed m-0">{{ faq.answer }}</p>
              </div>
            }
          </div>
        </section>

      </main>

      <!-- Share modal (kept page-local) -->
      <app-export-share-modal></app-export-share-modal>
    </div>
  `
})
export class HomeComponent implements OnInit {
  protected readonly store = inject(EstimatorStore);
  private readonly seoService = inject(SeoService);

  readonly faqs = [
    {
      question: 'Which cloud provider is cheapest for compute in 2026?',
      answer: 'It depends on the workload. For general-purpose Linux instances, AWS EC2 (Graviton4) and GCP E2/T2A offer the best price-to-performance. Azure excels when you bring existing Windows Server or SQL Server licenses via Azure Hybrid Benefit, saving up to 40%. For spot/preemptible workloads, GCP often has the lowest prices due to sustained use discounts.'
    },
    {
      question: 'How does AWS pricing compare to Azure and GCP for object storage?',
      answer: 'AWS S3 Standard costs approximately $0.023/GB-month in us-east-1. Azure Blob Hot tier is ~$0.018/GB-month, and Google Cloud Storage Standard is ~$0.020/GB-month. For archive storage, all three providers converge near $0.001/GB-month. The real cost difference emerges in read/write operation fees and egress bandwidth charges.'
    },
    {
      question: 'What is a cloud TCO calculator and why should I use one?',
      answer: 'A Total Cost of Ownership (TCO) calculator estimates the full cost of running cloud infrastructure including compute instances, managed databases, object storage, data transfer egress, load balancers, and Kubernetes cluster management — not just the hourly instance rate. CloudCostMatrix compares TCO across AWS, Azure, and GCP simultaneously.'
    },
    {
      question: 'How do reserved instance discounts compare across AWS, Azure, and GCP?',
      answer: 'AWS offers Compute Savings Plans (flexible across instance families, regions, and services) with 1-year (~37% off) and 3-year (~60% off) terms. Azure Reserved VM Instances provide comparable discounts for specific VM sizes. GCP uses Committed Use Discounts (CUDs) with 1-year (~37% off) and 3-year (~55% off) commitments for specific machine types.'
    },
    {
      question: 'Is CloudCostMatrix free to use?',
      answer: 'Yes, CloudCostMatrix is completely free. You can estimate, compare, and share cloud infrastructure costs without creating an account. All calculations happen in your browser with zero data sent to any server. Shared comparison links use URL compression, requiring zero database storage.'
    },
    {
      question: 'How accurate are the pricing estimates?',
      answer: 'CloudCostMatrix uses benchmark pricing data sourced from official AWS, Azure, and GCP public pricing feeds, updated regularly via automated synchronization. Actual costs may vary based on specific instance availability, negotiated enterprise agreements, and regional pricing differences. The estimates provide directional accuracy for architecture planning and cloud provider selection.'
    },
    {
      question: 'Can I save and compare multiple cloud architectures?',
      answer: 'Yes. You can save unlimited architecture estimates — guest-first and 100% private in your browser with no signup required. The Saved Architectures library lets you reload, rename, duplicate, and branch any scenario, then run an Architecture A vs B diff that highlights specification changes, per-provider monthly cost deltas, 3-year TCO projections, and migration ROI. Sign in with Google to sync your library across devices.'
    },
    {
      question: 'How fresh is the cloud pricing data?',
      answer: 'CloudCostMatrix bundles an automated price-sync pipeline that ingests the official Azure Retail Prices API, the AWS Price List bulk feeds (S3 tiers), and the GCP Cloud Billing Catalog. A freshness badge in the header shows exactly when pricing was last verified — no stale month-old guesswork, and zero runtime API cost since the catalog is compiled into the app.'
    }
  ];

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'CloudCostMatrix — Free AWS vs Azure vs GCP Cloud Cost Estimator (2026)',
      description: 'Free cloud cost calculator comparing AWS, Microsoft Azure, and Google Cloud Platform pricing side-by-side. Estimate Compute (EC2, Azure VM, GCE), Storage (S3, Blob, GCS), Database (RDS, Azure SQL, Cloud SQL), Kubernetes (EKS, AKS, GKE), and Egress TCO in real-time. Save unlimited architecture scenarios, run A vs B migration diffs, and export Slack-ready summaries — no signup required.',
      keywords: [
        'cloud cost calculator',
        'AWS vs Azure',
        'AWS vs GCP',
        'Azure vs GCP',
        'cloud pricing comparison',
        'TCO calculator',
        'EC2 pricing',
        'Azure VM pricing',
        'Google Cloud pricing',
        'infrastructure cost estimator',
        'multi-cloud cost comparison 2026',
        'cloud migration cost',
        'EKS vs AKS vs GKE',
        'S3 vs Blob vs GCS',
        'saved architecture comparison',
        'cloud architecture A vs B diff',
        'cloud cost topology',
        'live cloud pricing feed',
        'cloud FinOps calculator'
      ],
      canonicalUrl: 'https://cloudcostmatrix.com/',
      structuredDataJson: [
        SchemaGenerator.generateWebApplicationSchema(),
        SchemaGenerator.generateOrganizationSchema(),
        SchemaGenerator.generateFaqSchema(this.faqs),
        SchemaGenerator.generateHowToSchema(),
        SchemaGenerator.generateBreadcrumbSchema([
          { name: 'Home', url: 'https://cloudcostmatrix.com/' }
        ])
      ]
    });
  }
}

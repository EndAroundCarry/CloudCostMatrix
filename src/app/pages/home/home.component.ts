import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HeroComponent } from '../../components/hero/hero.component';
import { MatrixTableComponent } from '../../components/matrix-table/matrix-table.component';
import { ConfiguratorComponent } from '../../components/configurator/configurator.component';
import { TcoChartComponent } from '../../components/charts/tco-chart.component';
import { RecommendationsComponent } from '../../components/recommendations/recommendations.component';
import { ExportShareModalComponent } from '../../components/export-share-modal/export-share-modal.component';
import { EstimatorStore } from '../../state/estimator.store';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    HeroComponent,
    MatrixTableComponent,
    ConfiguratorComponent,
    TcoChartComponent,
    RecommendationsComponent,
    ExportShareModalComponent
  ],
  template: `
    <div class="space-y-8 pb-16">
      <!-- SEO Hero Section with Preset Selectors -->
      <app-hero></app-hero>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
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
              <p class="text-xs text-slate-300 leading-relaxed m-0">View the side-by-side TCO matrix across AWS, Azure, and GCP. Export as CSV, print as PDF, or share via instant URL — no signup required.</p>
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

      <!-- Modals -->
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
    }
  ];

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'CloudCostMatrix — Free AWS vs Azure vs GCP Cloud Cost Estimator (2026)',
      description: 'Free cloud cost calculator comparing AWS, Microsoft Azure, and Google Cloud Platform pricing side-by-side. Estimate Compute (EC2, Azure VM, GCE), Storage (S3, Blob, GCS), Database (RDS, Azure SQL, Cloud SQL), Kubernetes (EKS, AKS, GKE), and Egress TCO in real-time.',
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
        'S3 vs Blob vs GCS'
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

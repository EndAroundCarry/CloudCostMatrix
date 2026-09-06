import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';
import { EstimatorStore } from '../../state/estimator.store';
import { MatrixTableComponent } from '../../components/matrix-table/matrix-table.component';
import { ConfiguratorComponent } from '../../components/configurator/configurator.component';
import { TcoChartComponent } from '../../components/charts/tco-chart.component';
import { RecommendationsComponent } from '../../components/recommendations/recommendations.component';

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
    RecommendationsComponent
  ],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
        <a routerLink="/" class="hover:text-white transition-colors">Home</a>
        <span>/</span>
        <span class="text-blue-400">Compare</span>
        <span>/</span>
        <span class="text-slate-200">{{ slugTitle }}</span>
      </nav>

      <!-- Editorial Intro Card with SEO Keywords -->
      <div class="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-3">
          <mat-icon class="!text-sm">analytics</mat-icon>
          <span>Direct Head-to-Head Analysis</span>
        </div>
        
        <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight m-0">
          {{ pageHeadline }}
        </h1>

        <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
          {{ pageSummary }}
        </p>
      </div>

      <!-- Live Interactive Cost Matrix -->
      <app-matrix-table></app-matrix-table>

      <!-- Charts & Insights -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-tco-chart></app-tco-chart>
        <app-recommendations></app-recommendations>
      </div>

      <!-- Live Configurator for Custom Tweaks -->
      <app-configurator></app-configurator>

      <!-- Comprehensive FAQ Section for Google Rich Snippets -->
      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-xl">
        <h2 class="text-xl font-bold text-white tracking-tight mb-6 flex items-center gap-2 m-0">
          <mat-icon class="text-amber-400">help_outline</mat-icon>
          <span>Frequently Asked Questions</span>
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

    </div>
  `
})
export class ProviderComparisonComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly seoService = inject(SeoService);
  protected readonly store = inject(EstimatorStore);

  slugTitle = 'AWS vs Azure';
  pageHeadline = 'AWS vs Azure: Detailed Cloud Infrastructure Pricing & TCO (2026)';
  pageSummary = 'A comprehensive, line-by-line comparison of Amazon Web Services (AWS) and Microsoft Azure across Compute (EC2 vs Virtual Machines), Storage (S3 vs Blob), Database (RDS vs Azure SQL), and Networking egress fees.';

  faqs = [
    {
      question: 'Which is cheaper: AWS or Azure for compute?',
      answer: 'Pricing is comparable for on-demand Linux instances, but Azure provides significant discounts through Azure Hybrid Benefit if you bring existing Windows Server or SQL Server licenses. For general compute, AWS Graviton processors often offer superior price-to-performance.'
    },
    {
      question: 'How do AWS Savings Plans compare to Azure Reserved Instances?',
      answer: 'AWS Compute Savings Plans offer greater flexibility across instance families, sizes, and AWS Lambda/Fargate, while Azure Reservations provide high discounts for specific VM sizes with monthly payment options at no penalty.'
    },
    {
      question: 'What is the egress bandwidth pricing difference?',
      answer: 'Both AWS and Azure charge between $0.08 and $0.09 per GB for initial internet egress, but using integrated CDN services (CloudFront or Azure Front Door) significantly lowers external bandwidth costs.'
    }
  ];

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || 'aws-vs-azure';
    this.setupPageContent(slug);
  }

  private setupPageContent(slug: string): void {
    if (slug.includes('gcp')) {
      this.slugTitle = 'AWS vs GCP';
      this.pageHeadline = 'AWS vs Google Cloud (GCP): Complete Cost & Performance Analysis';
      this.pageSummary = 'Compare compute, Google Kubernetes Engine (GKE) vs EKS, Cloud SQL vs RDS, and BigQuery vs Redshift data storage costs with real-time TCO modeling.';
    }

    // Dynamic SEO update
    this.seoService.updateTags({
      title: `${this.slugTitle} Cost Comparison Matrix (2026)`,
      description: this.pageSummary,
      canonicalUrl: `https://cloudcostmatrix.com/compare/${slug}`,
      structuredDataJson: SchemaGenerator.generateFaqSchema(this.faqs)
    });
  }
}

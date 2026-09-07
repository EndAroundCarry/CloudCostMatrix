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

interface ComparisonPageData {
  slugTitle: string;
  headline: string;
  summary: string;
  metaDescription: string;
  keywords: string[];
  faqs: { question: string; answer: string }[];
}

const COMPARISON_PAGES: Record<string, ComparisonPageData> = {
  'aws-vs-azure': {
    slugTitle: 'AWS vs Azure',
    headline: 'AWS vs Azure: Detailed Cloud Infrastructure Pricing & TCO Comparison (2026)',
    summary: 'A comprehensive, line-by-line comparison of Amazon Web Services (AWS) and Microsoft Azure across Compute (EC2 vs Azure Virtual Machines), Object Storage (S3 vs Azure Blob), Managed Databases (RDS/Aurora vs Azure SQL Database), Networking egress fees, and managed Kubernetes (EKS vs AKS).',
    metaDescription: 'Compare AWS vs Azure pricing in 2026. Side-by-side cost analysis of EC2 vs Azure VMs, S3 vs Blob Storage, RDS vs Azure SQL, EKS vs AKS, and data egress. Free TCO calculator.',
    keywords: ['AWS vs Azure', 'AWS vs Azure pricing', 'EC2 vs Azure VM', 'S3 vs Azure Blob', 'RDS vs Azure SQL', 'EKS vs AKS', 'cloud cost comparison 2026'],
    faqs: [
      {
        question: 'Which is cheaper overall: AWS or Azure?',
        answer: 'For general-purpose Linux compute, AWS and Azure are closely priced. AWS Graviton processors offer better price-performance for ARM-compatible workloads. Azure provides significant savings through Azure Hybrid Benefit if you bring existing Windows Server or SQL Server licenses. For managed Kubernetes, AKS provides free cluster management on the standard tier, while EKS charges $73/month per cluster.'
      },
      {
        question: 'How do AWS Savings Plans compare to Azure Reserved Instances?',
        answer: 'AWS Compute Savings Plans offer greater flexibility — they apply across EC2 instance families, sizes, regions, and even Fargate/Lambda. Azure Reserved Instances are tied to specific VM sizes but offer comparable discount depths (up to 72% for 3-year). Azure also supports monthly payment options without upfront commitment penalty.'
      },
      {
        question: 'What is the egress bandwidth pricing difference between AWS and Azure?',
        answer: 'AWS charges $0.09/GB for the first 10 TB of internet egress in us-east-1. Azure charges $0.087/GB for the same tier. Both providers significantly reduce costs when traffic is routed through their CDN services (CloudFront or Azure Front Door). For inter-region transfer, Azure tends to be slightly cheaper.'
      },
      {
        question: 'Which is better for Windows workloads: AWS or Azure?',
        answer: 'Azure has a clear advantage for Windows workloads due to Azure Hybrid Benefit (AHUB), which allows you to use existing Windows Server and SQL Server licenses with Software Assurance, saving up to 40-55% compared to pay-as-you-go pricing. AWS requires purchasing Windows licenses as part of the hourly instance rate.'
      }
    ]
  },
  'aws-vs-gcp': {
    slugTitle: 'AWS vs GCP',
    headline: 'AWS vs Google Cloud (GCP): Complete Cost & Performance Analysis (2026)',
    summary: 'Compare Amazon Web Services and Google Cloud Platform across Compute (EC2 vs Google Compute Engine), Storage (S3 vs Google Cloud Storage), Databases (RDS vs Cloud SQL), Kubernetes (EKS vs GKE), and data egress pricing with real-time TCO modeling.',
    metaDescription: 'AWS vs GCP pricing comparison 2026. Compare EC2 vs Compute Engine, S3 vs Cloud Storage, RDS vs Cloud SQL, EKS vs GKE costs. Free real-time TCO calculator.',
    keywords: ['AWS vs GCP', 'AWS vs Google Cloud', 'EC2 vs Compute Engine', 'S3 vs Cloud Storage', 'RDS vs Cloud SQL', 'EKS vs GKE', 'cloud pricing comparison'],
    faqs: [
      {
        question: 'Is Google Cloud cheaper than AWS?',
        answer: 'GCP is often 5-15% cheaper than AWS for sustained, always-on workloads due to Google\'s automatic Sustained Use Discounts (SUDs) that apply without any upfront commitment. GCP also offers custom machine types that let you specify exact vCPU and RAM ratios, avoiding the waste of predefined instance sizes. However, AWS has a broader range of specialized instance types and deeper Savings Plan flexibility.'
      },
      {
        question: 'How does GKE compare to EKS in pricing?',
        answer: 'Both GKE and EKS charge $0.10/hour ($73/month) for cluster management. However, GKE waives this fee for the first zonal cluster, making it effectively free for small deployments. EKS charges from the first cluster. For worker nodes, pricing depends on the underlying compute instances, which are comparably priced across both providers.'
      },
      {
        question: 'What is the difference between AWS and GCP data egress pricing?',
        answer: 'AWS charges $0.09/GB for the first 10 TB of internet egress, while GCP charges $0.085/GB for the same tier — roughly 5% cheaper. Both providers offer CDN services (CloudFront vs Cloud CDN) that substantially reduce egress costs. GCP also offers free egress to other Google services and between zones within the same region.'
      },
      {
        question: 'Which cloud provider is better for AI and machine learning workloads?',
        answer: 'GCP has strong advantages for AI/ML workloads with TPU (Tensor Processing Unit) availability, Vertex AI integration, and competitive GPU instance pricing. AWS counters with a broader selection of GPU instances (P5, Inf2, Trn1), SageMaker, and Bedrock for generative AI. The cost difference depends heavily on the specific ML framework and inference vs. training workload patterns.'
      }
    ]
  },
  'azure-vs-gcp': {
    slugTitle: 'Azure vs GCP',
    headline: 'Azure vs Google Cloud (GCP): Head-to-Head Pricing & TCO Analysis (2026)',
    summary: 'Detailed cost comparison of Microsoft Azure and Google Cloud Platform across Virtual Machines (Azure VMs vs Compute Engine), Object Storage (Azure Blob vs Cloud Storage), Managed Databases (Azure SQL vs Cloud SQL), Kubernetes (AKS vs GKE), and internet data egress.',
    metaDescription: 'Azure vs GCP pricing comparison 2026. Compare Azure VMs vs Compute Engine, Blob vs Cloud Storage, Azure SQL vs Cloud SQL, AKS vs GKE costs. Free TCO calculator.',
    keywords: ['Azure vs GCP', 'Azure vs Google Cloud', 'Azure VM vs Compute Engine', 'Azure Blob vs Cloud Storage', 'Azure SQL vs Cloud SQL', 'AKS vs GKE'],
    faqs: [
      {
        question: 'Is Azure or GCP cheaper for virtual machines?',
        answer: 'For standard on-demand Linux instances, Azure and GCP are closely priced. GCP\'s automatic Sustained Use Discounts give it an edge for always-on workloads (5-15% cheaper without any commitment). Azure\'s advantage is Azure Hybrid Benefit for Windows and SQL Server workloads, which can cut costs by 40-55%. GCP\'s custom machine types also help avoid paying for unused CPU or RAM.'
      },
      {
        question: 'Which has better Kubernetes pricing: AKS or GKE?',
        answer: 'AKS (Azure Kubernetes Service) provides free cluster management on the standard tier — the control plane costs $0. GKE charges $0.10/hour ($73/month) per cluster but waives this for the first zonal cluster. For multi-cluster enterprise deployments, AKS is typically cheaper on management fees, while GKE excels in Kubernetes-native tooling and Autopilot mode.'
      },
      {
        question: 'How do Azure and GCP storage costs compare?',
        answer: 'Azure Blob Hot tier costs ~$0.018/GB-month vs Google Cloud Storage Standard at ~$0.020/GB-month in comparable regions. For archive storage, both converge near $0.001/GB-month. Azure offers ZRS (Zone-Redundant Storage) at modest premium, while GCP provides dual-region and multi-region options. Operation costs (reads/writes) are similar across both platforms.'
      },
      {
        question: 'Which provider is better for enterprise organizations?',
        answer: 'Azure has a strong enterprise advantage through deep Microsoft 365, Active Directory, and Windows Server integration. Organizations with existing Microsoft Enterprise Agreements often receive significant Azure credits. GCP appeals to data-engineering-heavy enterprises with BigQuery, Dataflow, and superior Kubernetes tooling. The choice typically depends on existing technology ecosystem investment.'
      }
    ]
  },
  'ec2-vs-azure-vm-vs-compute-engine': {
    slugTitle: 'EC2 vs Azure VM vs Compute Engine',
    headline: 'EC2 vs Azure VM vs Google Compute Engine: Virtual Machine Pricing Comparison (2026)',
    summary: 'Direct compute pricing comparison of Amazon EC2, Azure Virtual Machines, and Google Compute Engine across general-purpose, compute-optimized, and memory-optimized instance families with On-Demand, Reserved, and Spot pricing models.',
    metaDescription: 'Compare EC2 vs Azure VM vs Google Compute Engine pricing 2026. On-Demand, Reserved, Spot instance costs. General-purpose, compute-optimized, memory-optimized families.',
    keywords: ['EC2 pricing', 'Azure VM pricing', 'Compute Engine pricing', 'cloud compute comparison', 'virtual machine pricing', 'spot instance pricing', 'reserved instance comparison'],
    faqs: [
      {
        question: 'Which cloud provider offers the cheapest virtual machines?',
        answer: 'For general-purpose Linux instances with 4 vCPU and 16 GB RAM, on-demand pricing is roughly: AWS EC2 t4g.xlarge at $0.134/hr, Azure Standard_D4as_v5 at $0.192/hr, and GCP e2-standard-4 at $0.134/hr. AWS Graviton and GCP E2 instances tend to be the cheapest for ARM/standard workloads. Azure excels when Windows licensing is factored in via Hybrid Benefit.'
      },
      {
        question: 'How do spot instance prices compare across EC2, Azure, and GCP?',
        answer: 'Spot/Preemptible instance savings range from 60-90% off on-demand across all three providers. GCP Spot VMs often offer the deepest discounts but with potentially shorter interruption notice. AWS Spot Instances provide a 2-minute warning before termination, while Azure Spot VMs offer a 30-second eviction notice. Availability varies significantly by instance type and region.'
      }
    ]
  },
  's3-vs-azure-blob-vs-google-cloud-storage': {
    slugTitle: 'S3 vs Azure Blob vs Cloud Storage',
    headline: 'S3 vs Azure Blob Storage vs Google Cloud Storage: Object Storage Pricing (2026)',
    summary: 'Comprehensive object storage pricing comparison across Amazon S3, Azure Blob Storage, and Google Cloud Storage — covering Standard/Hot, Cool/Infrequent Access, Cold/Archive tiers, read/write operation costs, and data retrieval fees.',
    metaDescription: 'Compare S3 vs Azure Blob vs Google Cloud Storage pricing 2026. Standard, Cool, Archive tiers. Read/write operations, egress costs. Free storage cost calculator.',
    keywords: ['S3 pricing', 'Azure Blob pricing', 'Cloud Storage pricing', 'object storage comparison', 'cloud storage cost', 'S3 vs Blob vs GCS', 'archive storage pricing'],
    faqs: [
      {
        question: 'Which cloud provider has the cheapest object storage?',
        answer: 'For standard/hot tier storage in primary US regions: Azure Blob Hot is cheapest at ~$0.018/GB-month, followed by GCP Standard at ~$0.020/GB-month, and AWS S3 Standard at ~$0.023/GB-month. However, total cost depends heavily on read/write operation volume and egress bandwidth — not just storage capacity.'
      },
      {
        question: 'How do archive storage prices compare?',
        answer: 'Archive tier pricing converges across all three providers: AWS S3 Glacier Deep Archive at ~$0.00099/GB-month, Azure Archive at ~$0.00099/GB-month, and Google Archive at ~$0.0012/GB-month. The main cost difference is in data retrieval fees — AWS Glacier Deep Archive charges the highest retrieval fees, while Azure Archive offers more predictable retrieval pricing.'
      }
    ]
  }
};

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
    <article class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      <!-- Breadcrumbs (semantic nav with aria) -->
      <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
        <a routerLink="/" class="hover:text-white transition-colors">Home</a>
        <span aria-hidden="true">/</span>
        <span class="text-blue-400">Compare</span>
        <span aria-hidden="true">/</span>
        <span class="text-slate-200" aria-current="page">{{ pageData.slugTitle }}</span>
      </nav>

      <!-- Editorial Intro Card -->
      <header class="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-3">
          <mat-icon class="!text-sm">analytics</mat-icon>
          <span>Direct Head-to-Head Analysis</span>
        </div>
        
        <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight m-0">
          {{ pageData.headline }}
        </h1>

        <p class="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
          {{ pageData.summary }}
        </p>
      </header>

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
export class ProviderComparisonComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly seoService = inject(SeoService);
  protected readonly store = inject(EstimatorStore);

  pageData!: ComparisonPageData;

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || 'aws-vs-azure';
    this.pageData = COMPARISON_PAGES[slug] || COMPARISON_PAGES['aws-vs-azure'];
    this.setupSeo(slug);
  }

  private setupSeo(slug: string): void {
    const canonicalUrl = `https://cloudcostmatrix.com/compare/${slug}`;

    this.seoService.updateTags({
      title: `${this.pageData.slugTitle} Cost Comparison (2026)`,
      description: this.pageData.metaDescription,
      keywords: this.pageData.keywords,
      canonicalUrl,
      structuredDataJson: [
        SchemaGenerator.generateFaqSchema(this.pageData.faqs),
        SchemaGenerator.generateBreadcrumbSchema([
          { name: 'Home', url: 'https://cloudcostmatrix.com/' },
          { name: 'Compare', url: 'https://cloudcostmatrix.com/compare/' },
          { name: this.pageData.slugTitle, url: canonicalUrl }
        ]),
        SchemaGenerator.generateWebPageSchema({
          name: this.pageData.headline,
          description: this.pageData.metaDescription,
          url: canonicalUrl
        })
      ]
    });
  }
}

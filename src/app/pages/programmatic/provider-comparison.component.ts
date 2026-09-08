import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';
import { EstimatorStore } from '../../state/estimator.store';
import { CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { ServiceCategory, SERVICE_CATEGORY_METAS } from '../../core/models/service-category.enum';
import { MatrixTableComponent } from '../../components/matrix-table/matrix-table.component';
import { ConfiguratorComponent } from '../../components/configurator/configurator.component';
import { TcoChartComponent } from '../../components/charts/tco-chart.component';
import { RecommendationsComponent } from '../../components/recommendations/recommendations.component';

interface FeatureComparisonRow {
  feature: string;
  category: string;
  providerAVal: string;
  providerBVal: string;
  winner: 'A' | 'B' | 'TIE';
}

interface ComparisonPageData {
  slug: string;
  slugTitle: string;
  headline: string;
  summary: string;
  metaDescription: string;
  keywords: string[];
  providerA?: CloudProvider;
  providerB?: CloudProvider;
  features?: FeatureComparisonRow[];
  faqs: { question: string; answer: string }[];
}

const COMPARISON_TABS = [
  { slug: 'aws-vs-azure', label: 'AWS vs Azure' },
  { slug: 'aws-vs-gcp', label: 'AWS vs GCP' },
  { slug: 'azure-vs-gcp', label: 'Azure vs GCP' },
  { slug: 'ec2-vs-azure-vm-vs-compute-engine', label: 'EC2 vs VMs vs Compute Engine' },
  { slug: 's3-vs-azure-blob-vs-google-cloud-storage', label: 'S3 vs Blob vs Cloud Storage' }
];

const COMPARISON_PAGES: Record<string, ComparisonPageData> = {
  'aws-vs-azure': {
    slug: 'aws-vs-azure',
    slugTitle: 'AWS vs Azure',
    headline: 'AWS vs Azure: Detailed Cloud Infrastructure Pricing & TCO Comparison (2026)',
    summary: 'A comprehensive, line-by-line comparison of Amazon Web Services (AWS) and Microsoft Azure across Compute (EC2 vs Azure Virtual Machines), Object Storage (S3 vs Azure Blob), Managed Databases (RDS/Aurora vs Azure SQL Database), Networking egress fees, and managed Kubernetes (EKS vs AKS).',
    metaDescription: 'Compare AWS vs Azure pricing in 2026. Side-by-side cost analysis of EC2 vs Azure VMs, S3 vs Blob Storage, RDS vs Azure SQL, EKS vs AKS, and data egress. Free TCO calculator.',
    keywords: ['AWS vs Azure', 'AWS vs Azure pricing', 'EC2 vs Azure VM', 'S3 vs Azure Blob', 'RDS vs Azure SQL', 'EKS vs AKS', 'cloud cost comparison 2026'],
    providerA: CloudProvider.AWS,
    providerB: CloudProvider.AZURE,
    features: [
      { feature: 'ARM Processor Option', category: 'Compute', providerAVal: 'AWS Graviton3 / Graviton4 (Up to 20% price-perf)', providerBVal: 'Azure Cobalt 100 & Ampere Altra', winner: 'A' },
      { feature: 'Spot / Preemptible Eviction Notice', category: 'Compute', providerAVal: '2-minute warning via EventBridge', providerBVal: '30-second warning via Azure Scheduled Events', winner: 'A' },
      { feature: 'Managed Kubernetes Control Plane Fee', category: 'Kubernetes', providerAVal: '$0.10/hour ($73/month per cluster)', providerBVal: '$0.00/month (Free standard AKS cluster management)', winner: 'B' },
      { feature: 'Enterprise License Portability', category: 'Licensing', providerAVal: 'BYOL with dedicated hosts or license manager', providerBVal: 'Azure Hybrid Benefit (Save up to 40-55% with Windows/SQL)', winner: 'B' },
      { feature: '1st Tier Internet Egress', category: 'Networking', providerAVal: '$0.090 / GB (first 10 TB in us-east-1)', providerBVal: '$0.087 / GB (first 10 TB in East US)', winner: 'B' },
      { feature: 'Hot Object Storage Base Rate', category: 'Storage', providerAVal: '$0.023 / GB-month (S3 Standard)', providerBVal: '$0.018 / GB-month (Azure Blob Hot)', winner: 'B' }
    ],
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
    slug: 'aws-vs-gcp',
    slugTitle: 'AWS vs GCP',
    headline: 'AWS vs Google Cloud (GCP): Complete Cost & Performance Analysis (2026)',
    summary: 'Compare Amazon Web Services and Google Cloud Platform across Compute (EC2 vs Google Compute Engine), Storage (S3 vs Google Cloud Storage), Databases (RDS vs Cloud SQL), Kubernetes (EKS vs GKE), and data egress pricing with real-time TCO modeling.',
    metaDescription: 'AWS vs GCP pricing comparison 2026. Compare EC2 vs Compute Engine, S3 vs Cloud Storage, RDS vs Cloud SQL, EKS vs GKE costs. Free real-time TCO calculator.',
    keywords: ['AWS vs GCP', 'AWS vs Google Cloud', 'EC2 vs Compute Engine', 'S3 vs Cloud Storage', 'RDS vs Cloud SQL', 'EKS vs GKE', 'cloud pricing comparison'],
    providerA: CloudProvider.AWS,
    providerB: CloudProvider.GCP,
    features: [
      { feature: 'Automatic Sustained Use Discounts (SUD)', category: 'Compute', providerAVal: 'Requires upfront Savings Plan commitment', providerBVal: 'Automatic up to 30% discount on always-on VMs', winner: 'B' },
      { feature: 'Custom Machine Sizing', category: 'Compute', providerAVal: 'Fixed predefined instance types only', providerBVal: 'Custom vCPU and RAM ratios without waste', winner: 'B' },
      { feature: 'Managed Kubernetes (K8s)', category: 'Kubernetes', providerAVal: '$73/month management fee on all clusters', providerBVal: 'First zonal cluster is 100% free ($0/mo)', winner: 'B' },
      { feature: 'Internet Egress Pricing', category: 'Networking', providerAVal: '$0.090 / GB (first 10 TB)', providerBVal: '$0.085 / GB (first 10 TB)', winner: 'B' },
      { feature: 'Breadth of Specialized Instances', category: 'Compute', providerAVal: 'Largest catalog (P5, Inf2, Trn1, X2gd, Mac)', providerBVal: 'Strong AI/TPU catalog but fewer niche general types', winner: 'A' },
      { feature: 'Global Network Ingress/Egress', category: 'Networking', providerAVal: 'Standard AWS global backbone', providerBVal: 'Google Premium Tier network (direct Google fiber)', winner: 'B' }
    ],
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
    slug: 'azure-vs-gcp',
    slugTitle: 'Azure vs GCP',
    headline: 'Azure vs Google Cloud (GCP): Head-to-Head Pricing & TCO Analysis (2026)',
    summary: 'Detailed cost comparison of Microsoft Azure and Google Cloud Platform across Virtual Machines (Azure VMs vs Compute Engine), Object Storage (Azure Blob vs Cloud Storage), Managed Databases (Azure SQL vs Cloud SQL), Kubernetes (AKS vs GKE), and internet data egress.',
    metaDescription: 'Azure vs GCP pricing comparison 2026. Compare Azure VMs vs Compute Engine, Blob vs Cloud Storage, Azure SQL vs Cloud SQL, AKS vs GKE costs. Free TCO calculator.',
    keywords: ['Azure vs GCP', 'Azure vs Google Cloud', 'Azure VM vs Compute Engine', 'Azure Blob vs Cloud Storage', 'Azure SQL vs Cloud SQL', 'AKS vs GKE'],
    providerA: CloudProvider.AZURE,
    providerB: CloudProvider.GCP,
    features: [
      { feature: 'Windows Licensing Advantages', category: 'Licensing', providerAVal: 'Azure Hybrid Benefit cuts up to 55% with existing EA', providerBVal: 'Standard Windows Server hourly license surcharge', winner: 'A' },
      { feature: 'Automatic Volume Discounts', category: 'Compute', providerAVal: 'Reserved Instances required', providerBVal: 'Automatic Sustained Use Discounts (up to 30%)', winner: 'B' },
      { feature: 'Managed K8s Management Fee', category: 'Kubernetes', providerAVal: '$0 standard tier (all clusters free management)', providerBVal: 'First zonal cluster free, subsequent $73/mo', winner: 'A' },
      { feature: 'Hot Object Storage Base Rate', category: 'Storage', providerAVal: '$0.018 / GB-month (Blob Hot)', providerBVal: '$0.020 / GB-month (GCS Standard)', winner: 'A' },
      { feature: 'Custom VM Configurations', category: 'Compute', providerAVal: 'Pre-packaged VM sizes only', providerBVal: 'Custom Machine Types (exact vCPU & RAM)', winner: 'B' }
    ],
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
    slug: 'ec2-vs-azure-vm-vs-compute-engine',
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
    slug: 's3-vs-azure-blob-vs-google-cloud-storage',
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
      @if (pageData.providerA && pageData.providerB) {
        @let provA = pageData.providerA;
        @let provB = pageData.providerB;
        @let totalA = store.matrix().providers[provA];
        @let totalB = store.matrix().providers[provB];
        @let diff = Math.abs(totalA.monthlyTotal - totalB.monthlyTotal);
        @let winner = totalA.monthlyTotal <= totalB.monthlyTotal ? provA : provB;
        @let percent = Math.max(totalA.monthlyTotal, totalB.monthlyTotal) > 0 
          ? Math.round((diff / Math.max(totalA.monthlyTotal, totalB.monthlyTotal)) * 100) 
          : 0;

        <section class="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
          
          <!-- Winner Verdict Banner -->
          <div class="p-5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-800/80 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <mat-icon class="!text-2xl">emoji_events</mat-icon>
              </div>
              <div>
                <div class="text-xs font-bold uppercase tracking-wider text-emerald-400">Current Workload Verdict</div>
                <div class="text-lg sm:text-xl font-black text-white">
                  {{ providerMetas[winner].name }} is cheaper by {{ store.formatMoney(diff) }}/mo
                  <span class="text-xs font-bold text-emerald-400">({{ percent }}% savings)</span>
                </div>
              </div>
            </div>

            <div class="text-xs text-slate-400 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700/60">
              Region: <strong class="text-white">{{ store.config().region }}</strong> &bull; Currency: <strong class="text-white">{{ store.selectedCurrency() }}</strong>
            </div>
          </div>

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

              <div class="space-y-2 border-t border-slate-700/60 pt-3 text-xs">
                @for (cat of activeCategoryKeys; track cat) {
                  @if (store.config().activeCategories[cat]) {
                    <div class="flex items-center justify-between text-slate-300">
                      <span class="text-slate-400">{{ categoryMetas[cat].name.split('/')[0] }}</span>
                      <span class="font-bold text-white">{{ store.formatMoney(totalA.categoryBreakdown[cat]) }}</span>
                    </div>
                  }
                }
              </div>
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

              <div class="space-y-2 border-t border-slate-700/60 pt-3 text-xs">
                @for (cat of activeCategoryKeys; track cat) {
                  @if (store.config().activeCategories[cat]) {
                    <div class="flex items-center justify-between text-slate-300">
                      <span class="text-slate-400">{{ categoryMetas[cat].name.split('/')[0] }}</span>
                      <span class="font-bold text-white">{{ store.formatMoney(totalB.categoryBreakdown[cat]) }}</span>
                    </div>
                  }
                }
              </div>
            </div>
          </div>

          <!-- Feature & Architectural Capabilities Duel Table -->
          @if (pageData.features && pageData.features.length > 0) {
            <div class="mt-8 pt-6 border-t border-slate-800">
              <h3 class="text-lg font-bold text-white tracking-tight mb-4 flex items-center gap-2 m-0">
                <mat-icon class="text-blue-400">compare_arrows</mat-icon>
                <span>{{ providerMetas[provA].shortName }} vs {{ providerMetas[provB].shortName }} Feature & Capability Matrix</span>
              </h3>

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
                    @for (row of pageData.features; track row.feature) {
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
  private readonly seoService = inject(SeoService);
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

  activeSlug: string = 'aws-vs-azure';
  pageData: ComparisonPageData = COMPARISON_PAGES['aws-vs-azure'];
  private routeSub?: Subscription;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const slug = params.get('slug') || 'aws-vs-azure';
      this.activeSlug = slug;
      this.pageData = COMPARISON_PAGES[slug] || COMPARISON_PAGES['aws-vs-azure'];
      this.setupSeo(slug);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
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

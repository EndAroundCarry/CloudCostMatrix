import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

      </main>

      <!-- Modals -->
      <app-export-share-modal></app-export-share-modal>
    </div>
  `
})
export class HomeComponent implements OnInit {
  protected readonly store = inject(EstimatorStore);
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'CloudCostMatrix — AWS vs Azure vs GCP Infrastructure Cost Estimator',
      description: 'Real-time multi-cloud infrastructure cost calculator and TCO comparison matrix. Compare Compute, S3/Blob storage, Databases, and Egress across AWS, Azure, and GCP side-by-side.',
      canonicalUrl: 'https://cloudcostmatrix.com/',
      structuredDataJson: SchemaGenerator.generateSoftwareAppSchema()
    });
  }
}

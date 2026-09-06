import { Injectable, signal, computed, inject } from '@angular/core';
import { ArchitectureEstimateConfig, ComparisonMatrixResult, CommitmentType, StorageTier, DbEngine, OperatingSystem } from '../core/models/pricing.model';
import { ServiceCategory } from '../core/models/service-category.enum';
import { CloudProvider } from '../core/models/cloud-provider.enum';
import { ARCHITECTURE_BLUEPRINTS, ArchitectureBlueprint } from '../core/models/blueprints.model';
import { CostCalculatorEngine } from '../core/engine/cost-calculator.engine';
import { UrlStateService } from '../core/services/url-state.service';
import { ESTIMATE_REPOSITORY_TOKEN } from '../core/repositories/estimate.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class EstimatorStore {
  private readonly urlState = inject(UrlStateService);
  private readonly estimateRepo = inject(ESTIMATE_REPOSITORY_TOKEN);

  // State signals
  public readonly activeBlueprint = signal<ArchitectureBlueprint | null>(ARCHITECTURE_BLUEPRINTS[0]);
  public readonly config = signal<ArchitectureEstimateConfig>(JSON.parse(JSON.stringify(ARCHITECTURE_BLUEPRINTS[0].config)));
  public readonly activeCategory = signal<ServiceCategory>(ServiceCategory.COMPUTE);
  public readonly isShareModalOpen = signal<boolean>(false);
  public readonly isSavedEstimatesOpen = signal<boolean>(false);
  public readonly toastMessage = signal<string | null>(null);

  // Computed comparison matrix
  public readonly matrix = computed<ComparisonMatrixResult>(() => {
    return CostCalculatorEngine.calculateFullMatrix(this.config());
  });

  // Shareable URL computed reactively
  public readonly shareableUrl = computed<string>(() => {
    return this.urlState.buildShareUrl(this.config());
  });

  constructor() {
    this.checkInitialUrlParams();
  }

  private checkInitialUrlParams(): void {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('c');
      if (encoded) {
        const decoded = this.urlState.decodeFromUrl(encoded);
        if (decoded) {
          this.config.set(decoded);
          this.activeBlueprint.set(null);
          this.showToast('Loaded shared architecture configuration!');
        }
      }
    }
  }

  public showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }

  // Action methods
  public applyBlueprint(blueprint: ArchitectureBlueprint): void {
    this.activeBlueprint.set(blueprint);
    this.config.set(JSON.parse(JSON.stringify(blueprint.config)));
    this.showToast(`Applied "${blueprint.name}" preset`);
  }

  public toggleCategory(cat: ServiceCategory): void {
    this.config.update(c => {
      const active = { ...c.activeCategories, [cat]: !c.activeCategories[cat] };
      return { ...c, activeCategories: active };
    });
  }

  public setActiveCategory(cat: ServiceCategory): void {
    this.activeCategory.set(cat);
  }

  // Compute updates
  public updateComputeVcpu(vCpu: number): void {
    this.config.update(c => ({
      ...c,
      compute: { ...c.compute, vCpu }
    }));
  }

  public updateComputeRam(ramGb: number): void {
    this.config.update(c => ({
      ...c,
      compute: { ...c.compute, ramGb }
    }));
  }

  public updateComputeCount(count: number): void {
    this.config.update(c => ({
      ...c,
      compute: { ...c.compute, count: Math.max(1, count) }
    }));
  }

  public updateComputeCommitment(commitment: CommitmentType): void {
    this.config.update(c => ({
      ...c,
      compute: { ...c.compute, commitment }
    }));
  }

  public updateComputeOs(os: OperatingSystem): void {
    this.config.update(c => ({
      ...c,
      compute: { ...c.compute, os }
    }));
  }

  // Storage updates
  public updateStorageCapacity(capacityGb: number): void {
    this.config.update(c => ({
      ...c,
      storage: { ...c.storage, capacityGb: Math.max(1, capacityGb) }
    }));
  }

  public updateStorageTier(tier: StorageTier): void {
    this.config.update(c => ({
      ...c,
      storage: { ...c.storage, tier }
    }));
  }

  // Database updates
  public updateDatabaseEngine(engine: DbEngine): void {
    this.config.update(c => ({
      ...c,
      database: { ...c.database, engine }
    }));
  }

  public updateDatabaseStorage(storageGb: number): void {
    this.config.update(c => ({
      ...c,
      database: { ...c.database, storageGb: Math.max(10, storageGb) }
    }));
  }

  public updateDatabaseMultiAz(multiAz: boolean): void {
    this.config.update(c => ({
      ...c,
      database: { ...c.database, multiAz }
    }));
  }

  // Networking updates
  public updateEgress(egressGbPerMonth: number): void {
    this.config.update(c => ({
      ...c,
      networking: { ...c.networking, egressGbPerMonth: Math.max(0, egressGbPerMonth) }
    }));
  }

  public updateLoadBalancers(loadBalancersCount: number): void {
    this.config.update(c => ({
      ...c,
      networking: { ...c.networking, loadBalancersCount: Math.max(0, loadBalancersCount) }
    }));
  }

  // Kubernetes updates
  public updateK8sClusters(clustersCount: number): void {
    this.config.update(c => ({
      ...c,
      kubernetes: { ...c.kubernetes, clustersCount: Math.max(0, clustersCount) }
    }));
  }

  public updateK8sWorkerNodes(workerNodesPerCluster: number): void {
    this.config.update(c => ({
      ...c,
      kubernetes: { ...c.kubernetes, workerNodesPerCluster: Math.max(1, workerNodesPerCluster) }
    }));
  }

  // Share and save actions
  public async saveSharedLink(): Promise<string> {
    const id = await this.estimateRepo.saveSharedEstimate(this.config());
    return id;
  }
}

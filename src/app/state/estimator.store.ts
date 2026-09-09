import { Injectable, signal, computed, inject } from '@angular/core';
import { 
  ArchitectureEstimateConfig, 
  ComparisonMatrixResult, 
  CommitmentType, 
  StorageTier, 
  DbEngine, 
  OperatingSystem,
  CurrencyCode,
  CURRENCY_DEFINITIONS,
  RegionId,
  REGION_DEFINITIONS
} from '../core/models/pricing.model';
import { ServiceCategory } from '../core/models/service-category.enum';
import { ARCHITECTURE_BLUEPRINTS, ArchitectureBlueprint } from '../core/models/blueprints.model';
import { CostCalculatorEngine } from '../core/engine/cost-calculator.engine';
import { ALL_PROVIDERS, CloudProvider, DEFAULT_SELECTED_PROVIDERS, normalizeSelectedProviders } from '../core/models/cloud-provider.enum';
import { UrlStateService } from '../core/services/url-state.service';
import { ESTIMATE_REPOSITORY_TOKEN, SavedEstimateRecord } from '../core/repositories/estimate.repository.interface';
import { AUTH_SERVICE_TOKEN, AppUser } from '../core/repositories/auth.service.interface';
import { LIVE_PRICING_CACHE, PRICING_LAST_SYNCED_AT, PRICING_MODE } from '../core/engine/catalog/pricing-catalog.resolver';

@Injectable({
  providedIn: 'root'
})
export class EstimatorStore {
  private readonly urlState = inject(UrlStateService);
  private readonly estimateRepo = inject(ESTIMATE_REPOSITORY_TOKEN);
  private readonly authService = inject(AUTH_SERVICE_TOKEN);

  // State signals
  public readonly activeBlueprint = signal<ArchitectureBlueprint | null>(ARCHITECTURE_BLUEPRINTS[0]);
  public readonly config = signal<ArchitectureEstimateConfig>({
    ...JSON.parse(JSON.stringify(ARCHITECTURE_BLUEPRINTS[0].config)),
    scaleFactor: 1,
    region: 'us-east-1',
    selectedProviders: [...DEFAULT_SELECTED_PROVIDERS]
  });
  public readonly activeCategory = signal<ServiceCategory>(ServiceCategory.COMPUTE);
  public readonly selectedCurrency = signal<CurrencyCode>('USD');
  public readonly isShareModalOpen = signal<boolean>(false);
  public readonly isSavedEstimatesOpen = signal<boolean>(false);
  public readonly isAuthModalOpen = signal<boolean>(false);
  public readonly toastMessage = signal<string | null>(null);

  // Saved-estimates state
  public readonly savedEstimates = signal<SavedEstimateRecord[]>([]);
  public readonly savedEstimateCount = computed(() => this.savedEstimates().length);
  public readonly isSaveNameDialogOpen = signal<boolean>(false);
  public readonly isDiffModalOpen = signal<boolean>(false);
  // Which estimate is being named (for rename), or null → saving current
  public readonly estimateBeingNamed = signal<SavedEstimateRecord | null>(null);

  // Which estimate ids are loaded into "Architecture A" / "B" in the diff modal
  public readonly diffEstimateAId = signal<string | null>(null);
  public readonly diffEstimateBId = signal<string | null>(null);

  // Currency meta helper
  public readonly currencyDef = computed(() => {
    return CURRENCY_DEFINITIONS[this.selectedCurrency()] || CURRENCY_DEFINITIONS.USD;
  });

  // Live pricing freshness metadata (from committed live-pricing-cache.json)
  public readonly pricingMode = computed<'live' | 'seed'>(() => PRICING_MODE);
  public readonly pricingLastSyncedAt = computed<string | null>(() => PRICING_LAST_SYNCED_AT);
  public readonly pricingSources = computed<Record<string, string>>(() => LIVE_PRICING_CACHE.meta?.sources ?? {});

  public readonly pricingLabel = computed<string>(() => {
    const stamp = PRICING_LAST_SYNCED_AT;
    if (PRICING_MODE === 'live' && stamp) {
      const d = new Date(stamp);
      const month = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      return `Pricing Verified: ${month}`;
    }
    return 'Benchmark Pricing 2026';
  });

  // Helper to format any USD amount into active currency
  public formatMoney(usdAmount: number = 0): string {
    const cur = this.currencyDef();
    const converted = Math.round(usdAmount * cur.rateAgainstUsd);
    return `${cur.symbol}${converted.toLocaleString()}`;
  }

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
    this.restoreSavedEstimates();
  }

  private async restoreSavedEstimates(): Promise<void> {
    // Wait for Firebase to restore (or rule out) a persisted session before
    // deciding whether a fresh guest session is needed.
    const user = await this.authService.whenReady();
    if (user) {
      const list = await this.estimateRepo.getGuestEstimates(user.uid, user.isAnonymous);
      this.savedEstimates.set(list);
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        const guest = await this.authService.signInAnonymously();
        const list = await this.estimateRepo.getGuestEstimates(guest.uid, true);
        this.savedEstimates.set(list);
      } catch {
        // Offline / no network — the app still works, saves just won't persist yet.
      }
    }
  }

  // ---- Authentication actions -----------------------------------------

  public openAuthModal(): void {
    this.authService.clearAuthError();
    this.isAuthModalOpen.set(true);
  }

  public closeAuthModal(): void {
    this.isAuthModalOpen.set(false);
    this.authService.clearAuthError();
  }

  public async signInWithGoogle(): Promise<void> {
    const before = this.authService.currentUser();
    try {
      const after = await this.authService.signInWithGoogle();
      await this.completeSignIn(before, after);
    } catch {
      // authService.authError() already carries a message for the modal to show.
    }
  }

  public async signInWithEmail(email: string, password: string): Promise<void> {
    const before = this.authService.currentUser();
    try {
      const after = await this.authService.signInWithEmail(email, password);
      await this.completeSignIn(before, after);
    } catch {
      // handled via authService.authError()
    }
  }

  public async signUpWithEmail(email: string, password: string, displayName: string): Promise<void> {
    const before = this.authService.currentUser();
    try {
      const after = await this.authService.signUpWithEmail(email, password, displayName);
      await this.completeSignIn(before, after);
    } catch {
      // handled via authService.authError()
    }
  }

  public async sendPasswordReset(email: string): Promise<void> {
    try {
      await this.authService.sendPasswordReset(email);
    } catch {
      // handled via authService.authError()
    }
  }

  public async signOut(): Promise<void> {
    await this.authService.signOut();
    this.savedEstimates.set([]);
    this.showToast('Signed out.');
    if (typeof window !== 'undefined') {
      try {
        const guest = await this.authService.signInAnonymously();
        const list = await this.estimateRepo.getGuestEstimates(guest.uid, true);
        this.savedEstimates.set(list);
      } catch {
        // Offline — stay signed out locally until the next reload.
      }
    }
  }

  private async completeSignIn(before: AppUser | null, after: AppUser): Promise<void> {
    // Linking (the common path) keeps the same UID but switches the storage
    // backend from local (anonymous) to Firestore (signed-in) — migrate
    // whenever the anonymous->real transition happens, not just when the UID
    // itself changes (that only differs on the credential-already-in-use
    // fallback, where a pre-existing account is signed into instead).
    if (before?.isAnonymous && !after.isAnonymous) {
      await this.estimateRepo.migrateGuestData(before.uid, after.uid);
    }
    const list = await this.estimateRepo.getGuestEstimates(after.uid, after.isAnonymous);
    this.savedEstimates.set(list);
    this.isAuthModalOpen.set(false);
    this.showToast(`Welcome${after.displayName ? ', ' + after.displayName : ''}! Your architectures now sync across devices.`);
  }

  // ---- Saved-estimates actions --------------------------------------

  public openSaveDialog(): void {
    this.estimateBeingNamed.set(null);
    this.isSaveNameDialogOpen.set(true);
  }

  public openRenameDialog(record: SavedEstimateRecord): void {
    this.estimateBeingNamed.set(record);
    this.isSaveNameDialogOpen.set(true);
  }

  public async saveCurrentEstimate(name: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;
    const trimmed = name.trim() || `Architecture ${new Date().toLocaleDateString()}`;
    const snapshot: ArchitectureEstimateConfig = JSON.parse(JSON.stringify(this.config()));
    const id = await this.estimateRepo.saveGuestEstimate(user.uid, { ...snapshot, name: trimmed }, user.isAnonymous);
    this.isSaveNameDialogOpen.set(false);
    this.showToast(`Saved "${trimmed}" to your architecture library.`);
    await this.refreshSavedEstimates(id);
  }

  public async renameEstimate(record: SavedEstimateRecord, newName: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;
    await this.estimateRepo.renameEstimate(user.uid, record.id, newName.trim() || record.name, user.isAnonymous);
    this.isSaveNameDialogOpen.set(false);
    await this.refreshSavedEstimates();
    this.showToast('Estimate renamed.');
  }

  public async loadEstimate(id: string): Promise<void> {
    const rec = this.savedEstimates().find((r) => r.id === id);
    if (!rec) return;
    const cfg: ArchitectureEstimateConfig = JSON.parse(JSON.stringify(rec.config));
    cfg.selectedProviders = normalizeSelectedProviders(cfg.selectedProviders);
    this.config.set(cfg);
    this.activeBlueprint.set(null);
    this.isSavedEstimatesOpen.set(false);
    this.showToast(`Loaded "${rec.name}" into the matrix.`);
  }

  public async duplicateEstimate(id: string): Promise<void> {
    const user = this.authService.currentUser();
    const rec = this.savedEstimates().find((r) => r.id === id);
    if (!user || !rec) return;
    const copy: ArchitectureEstimateConfig = {
      ...JSON.parse(JSON.stringify(rec.config)),
      name: `${rec.name} (copy)`,
      selectedProviders: normalizeSelectedProviders(rec.config.selectedProviders)
    };
    await this.estimateRepo.saveGuestEstimate(user.uid, copy, user.isAnonymous);
    await this.refreshSavedEstimates();
    this.showToast(`Duplicated "${rec.name}" as a new branch.`);
  }

  public async deleteEstimate(id: string): Promise<void> {
    const user = this.authService.currentUser();
    const rec = this.savedEstimates().find((r) => r.id === id);
    if (!user || !rec) return;
    await this.estimateRepo.deleteGuestEstimate(user.uid, id, user.isAnonymous);
    await this.refreshSavedEstimates();
    this.showToast(`Deleted "${rec.name}".`);
  }

  public async refreshSavedEstimates(highlightId?: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;
    const list = await this.estimateRepo.getGuestEstimates(user.uid, user.isAnonymous);
    this.savedEstimates.set(list);
  }

  /** Opens the Architecture A vs B diff modal, defaulting A to current matrix. */
  public openDiffModal(): void {
    this.isDiffModalOpen.set(true);
  }

  public closeDiffModal(): void {
    this.isDiffModalOpen.set(false);
    this.diffEstimateAId.set(null);
    this.diffEstimateBId.set(null);
  }

  public selectDiffEstimate(slot: 'A' | 'B', id: string | null): void {
    if (slot === 'A') this.diffEstimateAId.set(id);
    else this.diffEstimateBId.set(id);
  }

  private checkInitialUrlParams(): void {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('c');
      if (encoded) {
        const decoded = this.urlState.decodeFromUrl(encoded);
        if (decoded) {
          decoded.selectedProviders = normalizeSelectedProviders(decoded.selectedProviders);
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
    const cfg: ArchitectureEstimateConfig = JSON.parse(JSON.stringify(blueprint.config));
    cfg.selectedProviders = normalizeSelectedProviders(cfg.selectedProviders);
    this.config.set(cfg);
    this.showToast(`Applied "${blueprint.name}" preset`);
  }

  // ---- Provider selection actions -------------------------------------

  /** Toggles one provider in/out of the comparison, refusing to drop the last one. */
  public toggleProvider(provider: CloudProvider): void {
    this.config.update((c) => {
      const current = normalizeSelectedProviders(c.selectedProviders);
      const isSelected = current.includes(provider);
      if (isSelected && current.length <= 1) return c; // never allow an empty matrix
      const next = isSelected ? current.filter((p) => p !== provider) : [...current, provider];
      return { ...c, selectedProviders: next };
    });
  }

  public setSelectedProviders(providers: CloudProvider[]): void {
    this.config.update((c) => ({ ...c, selectedProviders: normalizeSelectedProviders(providers) }));
  }

  public selectDefaultProviders(): void {
    this.setSelectedProviders([...DEFAULT_SELECTED_PROVIDERS]);
  }

  public selectAllProviders(): void {
    this.setSelectedProviders([...ALL_PROVIDERS]);
  }

  /** Selects the N providers with the lowest monthly total for the current config. */
  public selectCheapestProviders(count: number): void {
    const m = this.matrix();
    const ranked = [...ALL_PROVIDERS].sort((a, b) => m.providers[a].monthlyTotal - m.providers[b].monthlyTotal);
    this.setSelectedProviders(ranked.slice(0, Math.max(1, count)));
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

  // Currency & Region updates
  public setCurrency(currency: CurrencyCode): void {
    this.selectedCurrency.set(currency);
    this.showToast(`Switched currency to ${CURRENCY_DEFINITIONS[currency].name} (${CURRENCY_DEFINITIONS[currency].symbol})`);
  }

  public setRegion(regionId: RegionId): void {
    this.config.update(c => ({ ...c, region: regionId }));
    const regionName = REGION_DEFINITIONS[regionId]?.name || regionId;
    this.showToast(`Switched cloud deployment region to ${regionName}`);
  }

  public setScaleFactor(scaleFactor: number): void {
    const factor = Math.max(1, Math.min(10, scaleFactor));
    this.config.update(c => ({ ...c, scaleFactor: factor }));
  }

  // Share and save actions
  public async saveSharedLink(): Promise<string> {
    const id = await this.estimateRepo.saveSharedEstimate(this.config());
    return id;
  }
}

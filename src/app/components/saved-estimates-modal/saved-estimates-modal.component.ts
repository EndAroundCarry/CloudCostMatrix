import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EstimatorStore } from '../../state/estimator.store';
import { SavedEstimateRecord } from '../../core/repositories/estimate.repository.interface';
import { CostCalculatorEngine } from '../../core/engine/cost-calculator.engine';
import { AUTH_SERVICE_TOKEN } from '../../core/repositories/auth.service.interface';

@Component({
  selector: 'app-saved-estimates-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    @if (store.isSavedEstimatesOpen()) {
      <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in" (click)="close()"></div>

      <!-- Right-side drawer panel -->
      <aside
        class="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col animate-slide-in"
        role="dialog" aria-modal="true" aria-label="Saved Architectures">

        <!-- Drawer Header -->
        <header class="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <mat-icon>bookmarks</mat-icon>
            </div>
            <div>
              <h2 class="text-lg font-bold text-white m-0">Saved Architectures</h2>
              <p class="text-xs text-slate-400 m-0">
                {{ store.savedEstimateCount() }} estimate{{ store.savedEstimateCount() === 1 ? '' : 's' }} in your library
                @if (authService.isAnonymous()) { · stored locally in this browser }
                @else { · synced to your account }
              </p>
            </div>
          </div>
          <button type="button" (click)="close()"
            class="text-slate-400 hover:text-white bg-transparent border-none cursor-pointer" aria-label="Close">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        @if (authService.isAnonymous()) {
          <div class="mx-6 mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 flex items-center gap-3">
            <mat-icon class="!text-lg text-blue-400">cloud_sync</mat-icon>
            <p class="text-[11px] text-slate-300 m-0 flex-1">
              Signed in as a guest — architectures stay in this browser only.
            </p>
            <button mat-stroked-button class="!h-8 !text-[11px] !border-blue-500/50 !text-blue-300 shrink-0" (click)="store.openAuthModal()">
              Sign In to Sync
            </button>
          </div>
        }

        <!-- Search & filter -->
        <div class="px-6 py-3 border-b border-slate-800/80">
          <div class="relative">
            <mat-icon class="!text-base absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">search</mat-icon>
            <input
              type="search"
              placeholder="Search saved architectures by name or spec…"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              class="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500">
          </div>
        </div>

        <!-- Estimate list -->
        <div class="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          @if (loading()) {
            <div class="text-center text-slate-400 text-sm py-10">Loading your architectures…</div>
          } @else if (filteredEstimates().length === 0) {
            <div class="text-center py-12 border border-dashed border-slate-700 rounded-2xl">
              <mat-icon class="text-slate-600 !text-4xl">inventory_2</mat-icon>
              <p class="text-sm font-bold text-slate-300 mt-3 m-0">No saved architectures yet</p>
              <p class="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Tune the configurator, then click “Save current architecture” to keep this blueprint in your library.
              </p>
            </div>
          } @else {
            @for (rec of filteredEstimates(); track rec.id) {
              <div class="rounded-xl border border-slate-700/70 bg-slate-800/40 hover:border-slate-500 transition-colors overflow-hidden">
                <!-- Row header -->
                <div class="px-4 py-3 flex items-start justify-between gap-3">
                  <button type="button" (click)="store.loadEstimate(rec.id)"
                    class="text-left flex-1 bg-transparent border-none cursor-pointer group min-w-0">
                    <div class="flex items-center gap-2">
                      <mat-icon class="!text-base text-amber-400">account_tree</mat-icon>
                      <span class="font-bold text-white text-sm group-hover:text-blue-400 transition-colors truncate">{{ rec.name }}</span>
                    </div>
                    <div class="text-[11px] text-slate-500 mt-1">
                      Saved {{ rec.createdAt | date:'mediumDate' }}
                    </div>
                  </button>

                  <div class="flex items-center gap-0.5 shrink-0">
                    <button type="button" [title]="'Rename ' + rec.name" (click)="store.openRenameDialog(rec)"
                      class="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center bg-transparent border-none cursor-pointer">
                      <mat-icon class="!text-sm">edit</mat-icon>
                    </button>
                    <button type="button" [title]="'Duplicate & branch ' + rec.name" (click)="store.duplicateEstimate(rec.id)"
                      class="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center bg-transparent border-none cursor-pointer">
                      <mat-icon class="!text-sm">copy_all</mat-icon>
                    </button>
                    <button type="button" [title]="'Delete ' + rec.name" (click)="deleteEstimate(rec)"
                      class="w-7 h-7 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center bg-transparent border-none cursor-pointer">
                      <mat-icon class="!text-sm">delete_outline</mat-icon>
                    </button>
                  </div>
                </div>

                <!-- Thumbnail spec summary + TCO -->
                <div class="px-4 pb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 border-t border-slate-800/60 pt-2.5">
                  <span class="flex items-center gap-1"><mat-icon class="!text-xs text-blue-400">memory</mat-icon>
                    {{ rec.config.compute.count }}× {{ rec.config.compute.vCpu }} vCPU / {{ rec.config.compute.ramGb }} GB</span>
                  <span class="flex items-center gap-1"><mat-icon class="!text-xs text-purple-400">storage</mat-icon>
                    {{ formatGb(rec.config.storage.capacityGb) }}</span>
                  <span class="flex items-center gap-1"><mat-icon class="!text-xs text-emerald-400">database</mat-icon>
                    {{ rec.config.database.engine }}</span>
                  <span class="ml-auto font-bold text-emerald-400 flex items-center gap-1">
                    <mat-icon class="!text-xs">savings</mat-icon>
                    From {{ store.formatMoney(minMonthly(rec)) }}/mo
                  </span>
                </div>

                <!-- Action bar -->
                <div class="px-4 pb-3 flex items-center gap-2">
                  <button mat-flat-button class="!h-8 !text-[11px] !bg-blue-600 !text-white font-bold" (click)="store.loadEstimate(rec.id)">
                    <mat-icon class="!text-sm !mr-1">play_arrow</mat-icon>
                    Load into Matrix
                  </button>
                  <button mat-stroked-button class="!h-8 !text-[11px] !border-slate-600 !text-slate-300" (click)="store.duplicateEstimate(rec.id)">
                    <mat-icon class="!text-sm !mr-1">fork_right</mat-icon>
                    Duplicate & Branch
                  </button>
                </div>
              </div>
            }
          }
        </div>

        <!-- Footer: Save current + compare action -->
        <footer class="px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button mat-flat-button class="!bg-gradient-to-r !from-amber-500 !to-orange-500 on-vivid font-black shadow-lg shadow-amber-500/20 flex-1"
            (click)="store.openSaveDialog()">
            <mat-icon class="!mr-1">bookmark_add</mat-icon>
            Save Current Architecture
          </button>
          <button mat-stroked-button class="!border-slate-600 !text-slate-200" (click)="store.openDiffModal()">
            <mat-icon class="!mr-1 text-sky-400">compare_arrows</mat-icon>
            A vs B Diff
          </button>
        </footer>
      </aside>
    }

    <!-- Inline Save/Rename name dialog -->
    @if (store.isSaveNameDialogOpen()) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
          <h3 class="text-base font-bold text-white m-0 flex items-center gap-2">
            <mat-icon class="text-amber-400">{{ store.estimateBeingNamed() ? 'edit' : 'bookmark_add' }}</mat-icon>
            {{ store.estimateBeingNamed() ? 'Rename Architecture' : 'Save Architecture' }}
          </h3>
          <p class="text-xs text-slate-400 mt-1 mb-4 m-0">
            {{ store.estimateBeingNamed() ? 'Give this saved architecture a clearer name.' : 'Name this architecture so you can reload or compare it later.' }}
          </p>
          <input
            type="text"
            #nameInput
            [value]="store.estimateBeingNamed()?.name || suggestedName()"
            (keydown.enter)="confirmName(nameInput.value)"
            class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 mb-4"
            placeholder="e.g. Current Monolith vs K8s Target">
          <div class="flex justify-end gap-2">
            <button mat-stroked-button class="!border-slate-600 !text-slate-300" (click)="cancelName()">Cancel</button>
            <button mat-flat-button class="!bg-blue-600 !text-white font-bold" (click)="confirmName(nameInput.value)">
              {{ store.estimateBeingNamed() ? 'Rename' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class SavedEstimatesModalComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly authService = inject(AUTH_SERVICE_TOKEN);

  readonly searchQuery = signal('');
  protected readonly loading = signal(false);

  protected readonly filteredEstimates = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.store.savedEstimates();
    return this.store.savedEstimates().filter((r) => {
      const c = r.config;
      const haystack = [
        r.name,
        r.tags?.join(' '),
        String(c.compute.count),
        String(c.compute.vCpu),
        c.database.engine,
        c.storage.tier,
        c.networking.egressGbPerMonth ? `${c.networking.egressGbPerMonth}gb` : ''
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  });

  suggestedName(): string {
    const bp = this.store.activeBlueprint();
    if (bp) return bp.name;
    const total = this.store.matrix().providers[this.store.matrix().cheapestMonthlyProvider].monthlyTotal;
    return `Architecture ~${this.store.formatMoney(total)}/mo`;
  }

  formatGb(gb: number): string {
    if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
    return `${gb.toLocaleString()} GB`;
  }

  minMonthly(rec: SavedEstimateRecord): number {
    const m = CostCalculatorEngine.calculateFullMatrix(rec.config);
    return m.providers[m.cheapestMonthlyProvider].monthlyTotal;
  }

  close(): void {
    this.store.isSavedEstimatesOpen.set(false);
  }

  async confirmName(value: string): Promise<void> {
    const beingNamed = this.store.estimateBeingNamed();
    if (beingNamed) {
      await this.store.renameEstimate(beingNamed, value);
    } else {
      await this.store.saveCurrentEstimate(value);
    }
  }

  cancelName(): void {
    this.store.isSaveNameDialogOpen.set(false);
    this.store.estimateBeingNamed.set(null);
  }

  async deleteEstimate(rec: SavedEstimateRecord): Promise<void> {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${rec.name}" from your library?`)) return;
    await this.store.deleteEstimate(rec.id);
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}

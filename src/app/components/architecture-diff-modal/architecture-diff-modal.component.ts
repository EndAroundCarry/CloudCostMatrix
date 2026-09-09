import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EstimatorStore } from '../../state/estimator.store';
import { ArchitectureDiffEngine, DiffRow } from '../../core/engine/architecture-diff.engine';
import { ArchitectureEstimateConfig } from '../../core/models/pricing.model';
import { CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { SERVICE_CATEGORY_METAS } from '../../core/models/service-category.enum';

interface DiffSelection {
  label: string;
  sublabel: string;
  isCurrent: boolean;
  config: ArchitectureEstimateConfig;
}

@Component({
  selector: 'app-architecture-diff-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    @if (store.isDiffModalOpen()) {
      <div class="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm" (click)="close()"></div>

      <div class="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 pointer-events-none">
        <div class="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl pointer-events-auto">
          
          <!-- Header -->
          <header class="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md px-5 sm:px-7 py-4 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <mat-icon>compare_arrows</mat-icon>
              </div>
              <div>
                <h2 class="text-lg font-bold text-white m-0">Architecture Scenario Diff</h2>
                <p class="text-xs text-slate-400 m-0">Compare two architectures side-by-side and quantify migration ROI.</p>
              </div>
            </div>
            <button type="button" (click)="close()" class="text-slate-400 hover:text-white bg-transparent border-none cursor-pointer" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          </header>

          <div class="px-5 sm:px-7 py-5 space-y-6">
            
            <!-- Selector row -->
            <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
              <!-- A selector -->
              <div>
                <label class="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Architecture A (Baseline)</label>
                <select [value]="selectedA().isCurrent ? 'current' : selectedA().label" (change)="onSelectA($event)"
                  class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-blue-500">
                  <option value="current">⚡ Current Configurator State</option>
                  @for (rec of store.savedEstimates(); track rec.id) {
                    <option [value]="rec.id">{{ rec.name }}</option>
                  }
                </select>
              </div>
              <div class="text-center text-slate-600 font-black text-xl hidden sm:block">VS</div>
              <!-- B selector -->
              <div>
                <label class="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Architecture B (Target)</label>
                <select [value]="selectedB().isCurrent ? 'current' : selectedB().label" (change)="onSelectB($event)"
                  class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-blue-500">
                  <option value="current">⚡ Current Configurator State</option>
                  @for (rec of store.savedEstimates(); track rec.id) {
                    <option [value]="rec.id">{{ rec.name }}</option>
                  }
                </select>
              </div>
            </div>

            @if (diff()) {
              @let d = diff()!;
              
              <!-- ROI verdict banner -->
              <div class="rounded-2xl p-5 border"
                [class.bg-gradient-to-r]="true"
                [class.from-emerald-950/60]="d.winner === 'B'"
                [class.to-slate-900]="d.winner === 'B'"
                [class.border-emerald-500/30]="d.winner === 'B'"
                [class.from-blue-950/60]="d.winner === 'A'"
                [class.border-blue-500/30]="d.winner === 'A'"
                [class.from-slate-800/60]="d.winner === 'TIE'"
                [class.border-slate-600]="d.winner === 'TIE'">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg"
                      [class.bg-emerald-500/20]="d.winner !== 'A'"
                      [class.text-emerald-400]="d.winner !== 'A'"
                      [class.bg-blue-500/20]="d.winner === 'A'"
                      [class.text-blue-400]="d.winner === 'A'">
                      @if (d.winner === 'B') { <mat-icon>emoji_events</mat-icon> }
                      @else if (d.winner === 'A') { <mat-icon>emoji_events</mat-icon> }
                      @else { <mat-icon>balance</mat-icon> }
                    </div>
                    <div>
                      <div class="text-xs font-bold uppercase tracking-wider"
                        [class.text-emerald-400]="d.winner !== 'A'"
                        [class.text-blue-400]="d.winner === 'A'"
                        [class.text-slate-400]="d.winner === 'TIE'">
                        {{ d.winner === 'TIE' ? 'Cost-Neutral Comparison' : d.winner === 'B' ? 'Scenario B Wins on TCO' : 'Scenario A Wins on TCO' }}
                      </div>
                      <div class="text-lg sm:text-xl font-black text-white leading-snug">
                        @if (d.winner !== 'TIE') {
                          Scenario {{ d.winner }} saves
                          <span class="[&.text-emerald-400]:text-emerald-400">{{ store.formatMoney(d.savingsPerMonth) }}</span>/month
                          ({{ store.formatMoney(d.savingsPerYear) }}/year · {{ store.formatMoney(d.savingsThreeYear) }} over 3 yrs)
                        } @else {
                          Monthly TCO within {{ store.formatMoney(1) }} of each other
                        }
                      </div>
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="text-[11px] text-slate-400">Cheapest provider delta</div>
                    <div class="text-xl font-black"
                      [class.text-emerald-400]="d.monthlyDelta <= 0"
                      [class.text-red-400]="d.monthlyDelta > 0">
                      {{ d.monthlyDelta <= 0 ? '−' : '+' }}{{ store.formatMoney(Math.abs(d.monthlyDelta)) }}/mo
                    </div>
                  </div>
                </div>
                <p class="text-xs text-slate-300 mt-3 border-t border-white/10 pt-3 m-0 leading-relaxed">{{ d.hotspotLabel }}</p>
              </div>

              <!-- Spec diff table -->
              <section class="rounded-2xl border border-slate-800 overflow-hidden">
                <h3 class="text-sm font-bold text-white px-5 py-3 bg-slate-800/40 border-b border-slate-800 m-0 flex items-center gap-2">
                  <mat-icon class="!text-base text-blue-400">list_alt</mat-icon>
                  Specification Diff
                </h3>
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th class="py-2.5 px-5 font-bold">Category</th>
                        <th class="py-2.5 px-3 font-bold">Attribute</th>
                        <th class="py-2.5 px-3 font-bold text-blue-300">Scenario A</th>
                        <th class="py-2.5 px-3 font-bold text-emerald-300">Scenario B</th>
                        <th class="py-2.5 px-3 font-bold text-center">Delta</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/60">
                      @for (row of d.rows; track row.label) {
                        <tr [class.bg-blue-500/[0.04]]="row.changed" class="hover:bg-slate-800/20 transition-colors">
                          <td class="py-2 px-5 text-slate-500 whitespace-nowrap">{{ categoryName(row) }}</td>
                          <td class="py-2 px-3 font-semibold text-slate-200 whitespace-nowrap">{{ row.label }}</td>
                          <td class="py-2 px-3 text-slate-300">{{ row.aValue }}</td>
                          <td class="py-2 px-3 text-slate-300">{{ row.bValue }}</td>
                          <td class="py-2 px-3 text-center">
                            @if (row.changed) {
                              <span class="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10px]">CHANGED</span>
                            } @else {
                              <span class="text-slate-600">=</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>

              <!-- Provider monthly deltas -->
              <section class="rounded-2xl border border-slate-800 overflow-hidden">
                <h3 class="text-sm font-bold text-white px-5 py-3 bg-slate-800/40 border-b border-slate-800 m-0 flex items-center gap-2">
                  <mat-icon class="!text-base text-emerald-400">payments</mat-icon>
                  Monthly TCO Delta by Provider
                </h3>
                <div class="grid gap-3 p-5" [style.grid-template-columns]="'repeat(auto-fit, minmax(180px, 1fr))'">
                  @for (pd of d.providerDeltas; track pd.provider) {
                    <div class="rounded-xl bg-slate-800/50 border border-slate-700/60 p-4">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="w-2.5 h-2.5 rounded-full" [style.background]="providerMetas[pd.provider].primaryColor"></span>
                        <span class="text-xs font-bold text-white">{{ providerMetas[pd.provider].shortName }}</span>
                      </div>
                      <div class="flex items-baseline justify-between text-xs text-slate-400">
                        <span>A: <strong class="text-slate-200">{{ store.formatMoney(pd.aMonthly) }}</strong></span>
                        <span>B: <strong class="text-slate-200">{{ store.formatMoney(pd.bMonthly) }}</strong></span>
                      </div>
                      <div class="mt-2 text-sm font-black"
                        [class.text-emerald-400]="pd.delta <= 0"
                        [class.text-red-400]="pd.delta > 0">
                        {{ pd.delta <= 0 ? '−' : '+' }}{{ store.formatMoney(Math.abs(pd.delta)) }}/mo
                        <span class="text-[10px] font-semibold text-slate-500">({{ pd.deltaPercent }}%)</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- 3-year projection summary -->
                <div class="px-5 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div class="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
                    <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">3-Year TCO Delta</div>
                    <div class="text-lg font-black mt-1" [class.text-emerald-400]="d.threeYearDelta <= 0" [class.text-red-400]="d.threeYearDelta > 0">
                      {{ d.threeYearDelta <= 0 ? '−' : '+' }}{{ store.formatMoney(Math.abs(d.threeYearDelta)) }}
                    </div>
                  </div>
                  <div class="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
                    <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Annualized Savings</div>
                    <div class="text-lg font-black mt-1 text-emerald-400">{{ store.formatMoney(d.savingsPerYear) }}</div>
                  </div>
                  <div class="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
                    <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cost Swing (A → B)</div>
                    <div class="text-lg font-black mt-1" [class.text-red-400]="d.monthlyDelta > 0" [class.text-emerald-400]="d.monthlyDelta <= 0">
                      {{ d.monthlyDelta > 0 ? '+' : '−' }}{{ d.savingsPercent }}%
                    </div>
                  </div>
                </div>
              </section>

              <!-- Export diff summary -->
              <div class="flex flex-wrap gap-2 justify-end">
                <button mat-stroked-button class="!border-slate-600 !text-slate-300" (click)="copySummary(d, selectedA(), selectedB())">
                  <mat-icon class="!mr-1 text-sky-400 !text-sm">content_copy</mat-icon>
                  Copy Diff Summary
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class ArchitectureDiffModalComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly providerMetas = PROVIDER_METAS;
  protected readonly Math = Math;

  private readonly aId = computed<string | null>(() => this.store.diffEstimateAId());
  private readonly bId = computed<string | null>(() => this.store.diffEstimateBId());

  protected readonly selectedA = computed<DiffSelection>(() => this.resolveSelection(this.aId(), this.store.config()));
  protected readonly selectedB = computed<DiffSelection>(() => {
    const saved = this.store.savedEstimates();
    const defaultId = saved.length ? saved[0].id : null;
    return this.resolveSelection(this.bId() ?? defaultId, this.store.config());
  });

  protected readonly diff = computed(() => {
    const a = this.selectedA();
    const b = this.selectedB();
    const cfgA = a.config;
    const cfgB = b.config;
    // Don't compare a scenario against an identical copy of itself (e.g. two
    // "current" states) — show the diff engine anyway; identical configs yield
    // a TIE banner which is still informative.
    return ArchitectureDiffEngine.compute(cfgA, cfgB);
  });

  private resolveSelection(id: string | null, fallback: ArchitectureEstimateConfig): DiffSelection {
    const saved = this.store.savedEstimates();
    const rec = id ? saved.find((r) => r.id === id) : undefined;
    if (rec) {
      return {
        label: rec.id,
        sublabel: rec.name,
        isCurrent: false,
        config: rec.config
      };
    }
    return {
      label: 'current',
      sublabel: 'Current Configurator State',
      isCurrent: true,
      config: fallback
    };
  }

  onSelectA(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.selectDiffEstimate('A', val === 'current' ? null : val);
  }

  onSelectB(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.selectDiffEstimate('B', val === 'current' ? null : val);
  }

  categoryName(row: DiffRow): string {
    return SERVICE_CATEGORY_METAS[row.category].name.split('/')[0];
  }

  copySummary(d: ReturnType<typeof ArchitectureDiffEngine.compute>, a: DiffSelection, b: DiffSelection): void {
    const lines = [
      'CloudCostMatrix — Architecture A vs B Diff Summary',
      '==============================================',
      `A: ${a.sublabel}`,
      `B: ${b.sublabel}`,
      '',
      ...d.rows.map((r) => `${r.label}:  A=${r.aValue}  B=${r.bValue}${r.changed ? '  ⚠ changed' : ''}`),
      '',
      'Provider Monthly TCO (A → B):',
      ...d.providerDeltas.map(
        (pd) => `  ${pd.provider}: $${pd.aMonthly} → $${pd.bMonthly} (${pd.delta >= 0 ? '+' : ''}${pd.deltaPercent}%)`
      ),
      '',
      `Best monthly delta: ${d.monthlyDelta >= 0 ? '+' : '−'}$${Math.abs(d.monthlyDelta)}/mo`,
      `3-year delta: ${d.threeYearDelta >= 0 ? '+' : '−'}$${Math.abs(d.threeYearDelta)}`,
      `Winner: ${d.winner === 'TIE' ? 'Tie' : `Scenario ${d.winner} (${d.savingsPercent}% cheaper)`}`,
      '',
      'Generated with CloudCostMatrix (free multi-cloud TCO calculator)'
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    this.store.showToast('Copied architecture diff summary!');
  }

  close(): void {
    this.store.closeDiffModal();
  }
}

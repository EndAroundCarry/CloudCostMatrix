import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EstimatorStore } from '../../state/estimator.store';
import { PROVIDER_METAS, ProviderMeta, normalizeSelectedProviders } from '../../core/models/cloud-provider.enum';

interface ProviderTierGroup {
  tier: ProviderMeta['tier'];
  label: string;
  providers: ProviderMeta[];
}

const TIER_LABELS: Record<ProviderMeta['tier'], string> = {
  HYPERSCALER: 'Hyperscalers',
  CHALLENGER: 'Challengers',
  DEVELOPER: 'Developer Clouds'
};

@Component({
  selector: 'app-provider-picker',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 shadow-lg" role="group" aria-label="Choose which cloud providers to compare">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h3 class="text-sm font-bold text-white m-0 flex items-center gap-2">
            <mat-icon class="!text-base text-blue-400">tune</mat-icon>
            <span>Providers to Compare</span>
          </h3>
          <p class="text-[11px] text-slate-400 m-0 mt-0.5">{{ selected().length }} of {{ allProviders.length }} selected — icon and label always identify a provider, color is secondary.</p>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <button type="button" (click)="store.selectDefaultProviders()"
            class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors">
            Big 3
          </button>
          <button type="button" (click)="selectCheapest3()"
            class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors">
            Cheapest 3
          </button>
          <button type="button" (click)="store.selectAllProviders()"
            class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-colors">
            All {{ allProviders.length }}
          </button>
        </div>
      </div>

      <div class="space-y-3">
        @for (group of groups; track group.tier) {
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{{ group.label }}</div>
            <div class="flex flex-wrap gap-1.5">
              @for (meta of group.providers; track meta.id) {
                @let isOn = selected().includes(meta.id);
                <button
                  type="button"
                  [attr.aria-pressed]="isOn"
                  [matTooltip]="meta.headline"
                  (click)="store.toggleProvider(meta.id)"
                  class="inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer"
                  [style.background-color]="isOn ? meta.badgeBg : 'transparent'"
                  [style.border-color]="isOn ? meta.badgeBorder : 'var(--border-color)'"
                  [style.color]="isOn ? meta.primaryColor : 'var(--text-muted)'">
                  <span class="w-5 h-5 rounded-full flex items-center justify-center"
                    [style.background-color]="isOn ? meta.primaryColor : 'transparent'">
                    <mat-icon class="!text-xs" [style.color]="isOn ? '#fff' : 'var(--text-muted)'">{{ meta.icon }}</mat-icon>
                  </span>
                  <span>{{ meta.shortName }}</span>
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class ProviderPickerComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly allProviders = Object.values(PROVIDER_METAS);

  protected readonly groups: ProviderTierGroup[] = (['HYPERSCALER', 'CHALLENGER', 'DEVELOPER'] as const).map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    providers: this.allProviders.filter((m) => m.tier === tier)
  }));

  protected readonly selected = () => normalizeSelectedProviders(this.store.config().selectedProviders);

  selectCheapest3(): void {
    this.store.selectCheapestProviders(3);
  }
}

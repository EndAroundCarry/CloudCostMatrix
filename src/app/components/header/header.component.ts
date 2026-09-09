import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { EstimatorStore } from '../../state/estimator.store';
import { ThemeService } from '../../core/services/theme.service';
import { AUTH_SERVICE_TOKEN } from '../../core/repositories/auth.service.interface';
import { 
  CurrencyCode, 
  CURRENCY_DEFINITIONS, 
  RegionId, 
  REGION_DEFINITIONS 
} from '../../core/models/pricing.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule, MatMenuModule],
  template: `
    <header class="sticky top-0 z-50 backdrop-blur-md bg-slate-900/90 border-b border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Logo & Title -->
        <a routerLink="/" class="flex items-center gap-3 group no-underline">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <mat-icon class="on-accent">dataset</mat-icon>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-lg text-white tracking-tight">CloudCostMatrix</span>
              <!-- Live Pricing Freshness Badge -->
              <span
                [matTooltip]="pricingTooltip()"
                matTooltipPosition="below"
                class="text-[10px] px-2 py-0.5 rounded-full font-bold cursor-help border flex items-center gap-1"
                [class.bg-emerald-500/15]="store.pricingMode() === 'live'"
                [class.text-emerald-400]="store.pricingMode() === 'live'"
                [class.border-emerald-500/30]="store.pricingMode() === 'live'"
                [class.bg-blue-500/15]="store.pricingMode() === 'seed'"
                [class.text-blue-400]="store.pricingMode() === 'seed'"
                [class.border-blue-500/30]="store.pricingMode() === 'seed'">
                <span class="w-1.5 h-1.5 rounded-full animate-pulse"
                      [class.bg-emerald-400]="store.pricingMode() === 'live'"
                      [class.bg-blue-400]="store.pricingMode() === 'seed'"></span>
                {{ store.pricingLabel() }}
              </span>
            </div>
            <p class="text-xs text-slate-400 hidden sm:block m-0">9-Provider Multi-Cloud TCO Estimator</p>
          </div>
        </a>

        <!-- Quick Provider Badges & Nav -->
        <div class="hidden lg:flex items-center gap-2">
          <a routerLink="/compare/aws-vs-azure" routerLinkActive="!bg-blue-600 !text-white !border-blue-500" class="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline border border-slate-700">
            AWS vs Azure
          </a>
          <a routerLink="/compare/aws-vs-gcp" routerLinkActive="!bg-blue-600 !text-white !border-blue-500" class="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline border border-slate-700">
            AWS vs GCP
          </a>
          <a routerLink="/compare/azure-vs-gcp" routerLinkActive="!bg-blue-600 !text-white !border-blue-500" class="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline border border-slate-700">
            Azure vs GCP
          </a>
        </div>

        <!-- Region & Currency Selector Controls + Action Buttons -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Region Dropdown -->
          <div class="relative hidden sm:block">
            <select 
              [value]="store.config().region" 
              (change)="onRegionChange($event)"
              class="appearance-none bg-slate-800/90 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold pr-7 focus:outline-none focus:border-blue-500 cursor-pointer">
              @for (reg of regionList; track reg.id) {
                <option [value]="reg.id">{{ reg.flag }} {{ reg.shortLocation }} ({{ reg.pricingMultiplier }}x)</option>
              }
            </select>
            <mat-icon class="!text-xs absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</mat-icon>
          </div>

          <!-- Currency Dropdown -->
          <div class="relative">
            <select 
              [value]="store.selectedCurrency()" 
              (change)="onCurrencyChange($event)"
              class="appearance-none bg-slate-800/90 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold pr-6 focus:outline-none focus:border-blue-500 cursor-pointer">
              @for (cur of currencyList; track cur.code) {
                <option [value]="cur.code">{{ cur.symbol }} {{ cur.code }}</option>
              }
            </select>
            <mat-icon class="!text-xs absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</mat-icon>
          </div>

          <!-- Theme toggle -->
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="themeService.isLight() ? 'Switch to dark mode' : 'Switch to light mode'"
            [matTooltip]="themeService.isLight() ? 'Switch to dark mode' : 'Switch to light mode'"
            class="!text-slate-300 hover:!text-white"
            (click)="themeService.toggle()">
            <mat-icon>{{ themeService.isLight() ? 'dark_mode' : 'light_mode' }}</mat-icon>
          </button>

          <button 
            mat-stroked-button 
            class="!border-slate-700 !text-slate-200 !bg-slate-800/50 hover:!bg-slate-700 relative"
            (click)="openSavedEstimates()">
            <mat-icon class="!mr-1 text-amber-400">bookmarks</mat-icon>
            <span class="hidden sm:inline">Saved Architectures</span>
            @if (store.savedEstimateCount() > 0) {
              <span class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 on-vivid text-[10px] font-black flex items-center justify-center shadow">
                {{ store.savedEstimateCount() }}
              </span>
            }
          </button>

          <button 
            mat-stroked-button 
            class="!border-slate-700 !text-slate-200 !bg-slate-800/50 hover:!bg-slate-700"
            (click)="openShareModal()">
            <mat-icon class="!mr-1 text-sky-400">share</mat-icon>
            <span class="hidden sm:inline">Share</span>
          </button>

          @if (authService.isAuthenticated() && !authService.isAnonymous()) {
            <button
              mat-stroked-button
              [matMenuTriggerFor]="accountMenu"
              class="!border-slate-700 !text-slate-200 !bg-slate-800/50 hover:!bg-slate-700">
              <mat-icon class="!mr-1 text-emerald-400">account_circle</mat-icon>
              <span class="hidden sm:inline max-w-[8rem] truncate align-middle">
                {{ authService.currentUser()?.displayName || authService.currentUser()?.email }}
              </span>
              <mat-icon class="!ml-0.5 !text-base">expand_more</mat-icon>
            </button>
            <mat-menu #accountMenu="matMenu">
              <button mat-menu-item (click)="openSavedEstimates()">
                <mat-icon class="text-amber-500">dashboard</mat-icon>
                <span>Dashboard</span>
              </button>
              <button mat-menu-item (click)="store.signOut()">
                <mat-icon class="text-red-400">logout</mat-icon>
                <span>Sign Out</span>
              </button>
            </mat-menu>
          } @else {
            <button
              mat-flat-button
              class="!bg-gradient-to-r !from-blue-600 !to-indigo-600 !text-white shadow-md shadow-blue-500/20"
              (click)="store.openAuthModal()">
              <mat-icon class="!mr-1">cloud_sync</mat-icon>
              <span class="hidden sm:inline">Sign In</span>
            </button>
          }
        </div>

      </div>
    </header>
  `
})
export class HeaderComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly authService = inject(AUTH_SERVICE_TOKEN);
  protected readonly themeService = inject(ThemeService);

  readonly regionList = Object.values(REGION_DEFINITIONS);
  readonly currencyList = Object.values(CURRENCY_DEFINITIONS);

  onRegionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as RegionId;
    this.store.setRegion(val);
  }

  onCurrencyChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as CurrencyCode;
    this.store.setCurrency(val);
  }

  pricingTooltip(): string {
    const mode = this.store.pricingMode();
    if (mode === 'live') {
      const stamp = this.store.pricingLastSyncedAt();
      const date = stamp ? new Date(stamp).toUTCString() : 'unknown';
      const liveSources = Object.entries(this.store.pricingSources())
        .filter(([, v]) => v.startsWith('live'))
        .map(([k]) => k);
      return `Live pricing feed synced ${date}\nLive sources: ${liveSources.join(', ') || 'none'} · Remaining providers use the 2026 seed benchmark\nApp bundled at build-time — zero runtime cost.`;
    }
    return 'Benchmark 2026 catalog (seed). Run scripts/sync-prices.mjs to fetch live cloud price feeds.';
  }

  openShareModal(): void {
    this.store.isShareModalOpen.set(true);
  }

  openSavedEstimates(): void {
    this.store.isSavedEstimatesOpen.set(true);
  }
}

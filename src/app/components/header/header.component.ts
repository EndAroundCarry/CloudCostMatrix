import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EstimatorStore } from '../../state/estimator.store';
import { AUTH_SERVICE_TOKEN } from '../../core/repositories/auth.service.interface';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <header class="sticky top-0 z-50 backdrop-blur-md bg-slate-900/90 border-b border-slate-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <!-- Logo & Title -->
        <a routerLink="/" class="flex items-center gap-3 group no-underline">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <mat-icon class="text-white">dataset</mat-icon>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-lg text-white tracking-tight">CloudCostMatrix</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">2026 Live</span>
            </div>
            <p class="text-xs text-slate-400 hidden sm:block m-0">AWS vs. Azure vs. GCP TCO Estimator</p>
          </div>
        </a>

        <!-- Quick Provider Badges & Nav -->
        <div class="hidden md:flex items-center gap-3">
          <a routerLink="/compare/aws-vs-azure" class="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline border border-slate-700">
            AWS vs Azure
          </a>
          <a routerLink="/compare/aws-vs-gcp" class="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline border border-slate-700">
            AWS vs GCP
          </a>
          <a routerLink="/compare/azure-vs-gcp" class="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors no-underline border border-slate-700">
            Azure vs GCP
          </a>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 sm:gap-3">
          <button 
            mat-stroked-button 
            class="!border-slate-700 !text-slate-200 !bg-slate-800/50 hover:!bg-slate-700"
            (click)="openShareModal()">
            <mat-icon class="!mr-1 text-sky-400">share</mat-icon>
            <span>Share</span>
          </button>

          <button 
            mat-flat-button 
            class="!bg-gradient-to-r !from-blue-600 !to-indigo-600 !text-white shadow-md shadow-blue-500/20"
            (click)="handleAuthClick()">
            @if (authService.isAuthenticated() && !authService.isAnonymous()) {
              <span class="flex items-center gap-1">
                <mat-icon class="!mr-1">account_circle</mat-icon>
                <span>Dashboard</span>
              </span>
            } @else {
              <span class="flex items-center gap-1">
                <mat-icon class="!mr-1">cloud_sync</mat-icon>
                <span>Sign In</span>
              </span>
            }
          </button>
        </div>

      </div>
    </header>
  `
})
export class HeaderComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly authService = inject(AUTH_SERVICE_TOKEN);

  openShareModal(): void {
    this.store.isShareModalOpen.set(true);
  }

  async handleAuthClick(): Promise<void> {
    if (this.authService.isAuthenticated() && !this.authService.isAnonymous()) {
      this.store.showToast('Logged in to your cloud estimate dashboard.');
    } else {
      await this.authService.signInWithGoogle();
      this.store.showToast('Signed in successfully with Google!');
    }
  }
}

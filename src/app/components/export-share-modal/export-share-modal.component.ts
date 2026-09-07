import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EstimatorStore } from '../../state/estimator.store';
import { ExportService } from '../../core/services/export.service';

@Component({
  selector: 'app-export-share-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    @if (store.isShareModalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
        
        <div class="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
          
          <!-- Close Button -->
          <button 
            type="button" 
            (click)="store.isShareModalOpen.set(false)"
            class="absolute top-4 right-4 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer">
            <mat-icon>close</mat-icon>
          </button>

          <!-- Modal Header -->
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <mat-icon>share</mat-icon>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white m-0">Share & Export Estimate</h3>
              <p class="text-xs text-slate-400 m-0">Zero login required. Instant link, team exports & CSV download.</p>
            </div>
          </div>

          <!-- Share Link Box -->
          <div class="mb-5">
            <label class="text-xs font-bold text-slate-300 block mb-1.5">Shareable Direct Link (No signup needed)</label>
            <div class="flex items-center gap-2">
              <input 
                type="text" 
                readonly 
                [value]="store.shareableUrl()" 
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500 truncate">
              <button 
                mat-flat-button 
                class="!bg-blue-600 !text-white !h-9 text-xs font-bold"
                (click)="copyLink()">
                <mat-icon class="!text-sm !mr-1">content_copy</mat-icon>
                Copy
              </button>
            </div>
            <span class="text-[11px] text-slate-400 mt-1 block">
              💡 The entire spec is compressed into this link. Anyone opening it will see your exact calculations.
            </span>
          </div>

          <!-- Download Reports -->
          <div class="pt-4 border-t border-slate-800 space-y-4">
            <div class="text-xs font-bold text-slate-300">Download Data Reports</div>
            
            <div class="grid grid-cols-2 gap-3">
              <button 
                mat-stroked-button 
                class="!border-slate-700 !text-slate-200 !bg-slate-800/60 hover:!bg-slate-700 !h-11"
                (click)="downloadCsv()">
                <mat-icon class="text-emerald-400 !mr-1.5">table_view</mat-icon>
                <span>Export CSV</span>
              </button>

              <button 
                mat-stroked-button 
                class="!border-slate-700 !text-slate-200 !bg-slate-800/60 hover:!bg-slate-700 !h-11"
                (click)="printExecutivePdf()">
                <mat-icon class="text-rose-400 !mr-1.5">picture_as_pdf</mat-icon>
                <span>Executive PDF</span>
              </button>
            </div>
          </div>

          <!-- Team Collaboration Exports -->
          <div class="pt-4 border-t border-slate-800 space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-xs font-bold text-slate-300">Team Collaboration</div>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">NEW</span>
            </div>

            <button 
              mat-stroked-button 
              class="!border-slate-700 !text-slate-200 !bg-slate-800/60 hover:!bg-slate-700 !h-11 w-full justify-start"
              (click)="copyForSlack()">
              <mat-icon class="!mr-1.5 text-amber-400">forum</mat-icon>
              <span class="text-left">Copy for Slack / Teams</span>
            </button>
            <p class="text-[11px] text-slate-500 mt-1 mb-0">
              Monospace verdict summary with per-provider monthly/3-yr TCO and the share link — ready to paste.
            </p>

            <button 
              mat-stroked-button 
              class="!border-slate-700 !text-slate-200 !bg-slate-800/60 hover:!bg-slate-700 !h-11 w-full justify-start"
              (click)="copyMarkdownRfc()">
              <mat-icon class="!mr-1.5 text-emerald-400">code</mat-icon>
              <span class="text-left">Copy Markdown RFC Table</span>
            </button>
            <p class="text-[11px] text-slate-500 mt-1 mb-0">
              GitHub-flavored markdown (GFM) with provider table & full spec — paste into PRs, ADRs, or Notion docs.
            </p>
          </div>

        </div>

      </div>
    }
  `
})
export class ExportShareModalComponent {
  protected readonly store = inject(EstimatorStore);
  protected readonly exportService = inject(ExportService);

  copyLink(): void {
    navigator.clipboard.writeText(this.store.shareableUrl());
    this.store.showToast('Copied shareable link to clipboard!');
  }

  downloadCsv(): void {
    this.exportService.exportCsv(this.store.matrix());
    this.store.showToast('Downloaded CSV comparison report!');
  }

  copyForSlack(): void {
    const text = this.exportService.buildSlackSummary(this.store.matrix(), this.store.shareableUrl());
    navigator.clipboard.writeText(text);
    this.store.showToast('Copied Slack/Teams summary to clipboard!');
  }

  copyMarkdownRfc(): void {
    const md = this.exportService.buildMarkdownRfc(this.store.matrix());
    navigator.clipboard.writeText(md);
    this.store.showToast('Copied Markdown RFC table to clipboard!');
  }

  printExecutivePdf(): void {
    this.exportService.printExecutivePdf(this.store.matrix());
    this.store.showToast('Opening executive print preview — choose "Save as PDF".');
  }
}

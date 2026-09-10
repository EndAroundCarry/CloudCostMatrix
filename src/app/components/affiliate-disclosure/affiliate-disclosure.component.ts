import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * One-sentence, page-level affiliate disclosure — the second of the three FTC
 * disclosure layers (the first is the per-link "Affiliate link" micro-label
 * in AffiliateCtaComponent; the third is the full /disclosure page). Drop
 * this above the first affiliate CTA on any page that has one.
 */
@Component({
  selector: 'app-affiliate-disclosure',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <p class="text-[11px] text-slate-500 flex items-center gap-1.5 m-0">
      <mat-icon class="!text-xs">info</mat-icon>
      <span>
        Some links on this page are affiliate links — we may earn a commission if you sign up. This never affects the prices shown or the ranking, which is computed from published list prices.
        <a routerLink="/disclosure" class="text-slate-400 hover:text-white underline">Full disclosure</a>
      </span>
    </p>
  `
})
export class AffiliateDisclosureComponent {}

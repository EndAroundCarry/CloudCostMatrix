import { Component, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CloudProvider, PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { AFFILIATE_LINKS, resolveProviderCta } from '../../core/affiliate/affiliate.config';
import { AnalyticsService } from '../../core/analytics/analytics.service';

export type AffiliateCtaVariant = 'primary' | 'inline' | 'row';

const VARIANT_CLASSES: Record<AffiliateCtaVariant, string> = {
  primary: 'px-4 py-2 rounded-xl text-sm',
  inline: 'px-2.5 py-1 rounded-lg text-xs',
  row: 'px-2.5 py-1 rounded-lg text-xs'
};

/**
 * A single provider CTA button — resolves to a real affiliate link when one is
 * configured (`AFFILIATE_LINKS`), or falls back to the provider's plain
 * pricing page otherwise, so this renders correctly whether or not any
 * referral program has been signed up for yet.
 *
 * FTC "clear and conspicuous, close to the link" disclosure: a paid link
 * always carries an inline "Affiliate link" micro-label right next to it —
 * this is NOT satisfied by a footer disclaimer alone, and every instance of
 * this component enforces that on its own regardless of where it's placed.
 */
@Component({
  selector: 'app-affiliate-cta',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    @let cta = resolvedCta();
    <a
      [href]="cta.href"
      target="_blank"
      [attr.rel]="cta.rel"
      (click)="onClick()"
      [class]="'no-underline inline-flex items-center gap-1.5 font-bold transition-all ' + variantClasses()"
      [style.background-color]="variant() === 'primary' ? meta().primaryColor : meta().badgeBg"
      [style.color]="variant() === 'primary' ? '#fff' : meta().primaryColor"
      [style.border]="variant() !== 'primary' ? ('1px solid ' + meta().badgeBorder) : 'none'">
      <mat-icon class="!text-sm">{{ meta().icon }}</mat-icon>
      <span>{{ cta.label }}</span>
      @if (cta.offer) {
        <span class="opacity-80">· {{ cta.offer }}</span>
      }
      <mat-icon class="!text-xs opacity-70">open_in_new</mat-icon>
    </a>
    @if (cta.isPaid) {
      <span
        class="ml-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide cursor-help"
        matTooltip="We may earn a commission if you sign up via this link. It never affects the prices shown or the ranking — see /methodology.">
        Affiliate link
      </span>
    }
  `
})
export class AffiliateCtaComponent {
  private readonly analytics = inject(AnalyticsService);

  readonly provider = input.required<CloudProvider>();
  readonly variant = input<AffiliateCtaVariant>('inline');
  /** Free-text tag for analytics — where on the site this CTA was clicked, e.g. 'matrix-hero', 'compare-verdict'. */
  readonly context = input<string>('');

  protected readonly meta = computed(() => PROVIDER_METAS[this.provider()]);
  protected readonly resolvedCta = computed(() => resolveProviderCta(this.provider()));
  protected readonly variantClasses = computed(() => VARIANT_CLASSES[this.variant()]);

  onClick(): void {
    const p = this.provider();
    this.analytics.trackAffiliateClick(p, this.context(), this.resolvedCta().isPaid, !!AFFILIATE_LINKS[p].url);
  }
}

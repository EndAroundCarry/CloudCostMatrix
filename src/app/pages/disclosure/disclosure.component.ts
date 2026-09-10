import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PROVIDER_METAS } from '../../core/models/cloud-provider.enum';
import { AFFILIATE_LINKS, activeAffiliatePrograms } from '../../core/affiliate/affiliate.config';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';

@Component({
  selector: 'app-disclosure',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <article class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
        <a routerLink="/" class="hover:text-white transition-colors">Home</a>
        <span aria-hidden="true">/</span>
        <span class="text-slate-200" aria-current="page">Affiliate Disclosure</span>
      </nav>

      <header>
        <h1 class="text-3xl font-extrabold text-white tracking-tight m-0">Affiliate Disclosure</h1>
        <p class="mt-3 text-sm text-slate-300 leading-relaxed m-0">
          In accordance with FTC guidelines on endorsements and testimonials, this page discloses CloudCostMatrix's
          commercial relationships with the cloud providers it compares.
        </p>
      </header>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-4">
        <p class="text-sm text-slate-300 leading-relaxed m-0">
          Some "Visit provider" links on this site are affiliate or referral links. If you sign up for a paid plan
          through one of those links, CloudCostMatrix may earn a commission at no additional cost to you. Every such
          link is individually labeled <span class="text-slate-400 font-semibold">"Affiliate link"</span> at the
          point of use — not just here.
        </p>
        <p class="text-sm text-slate-300 leading-relaxed m-0">
          <strong class="text-white">This never affects the numbers.</strong> Cost estimates, rankings, and
          "cheapest provider" verdicts are computed by the pricing engine from published list-price catalogs — see
          the <a routerLink="/methodology" class="text-blue-400 hover:text-white underline">Methodology</a> page.
          No affiliate relationship influences which provider is shown as cheapest, and providers we have no
          commercial relationship with are compared on exactly the same basis as those we do.
        </p>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h2 class="text-base font-bold text-white tracking-tight mb-4 flex items-center gap-2 m-0">
          <mat-icon class="text-sky-400">handshake</mat-icon>
          <span>Current affiliate relationships</span>
        </h2>
        @if (activePrograms.length > 0) {
          <ul class="space-y-2 text-sm text-slate-300">
            @for (link of activePrograms; track link.provider) {
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" [style.background-color]="providerMetas[link.provider].primaryColor"></span>
                <strong class="text-white">{{ providerMetas[link.provider].name }}</strong>
                <span class="text-slate-500">— {{ link.program }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="text-sm text-slate-400 m-0">
            CloudCostMatrix does not currently have any active affiliate or referral relationships with any of the 9
            providers it compares. Every "Visit provider" link on the site currently points to that provider's plain,
            non-commission pricing page.
          </p>
        }
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <h2 class="text-base font-bold text-white tracking-tight mb-3 flex items-center gap-2 m-0">
          <mat-icon class="text-slate-400">link_off</mat-icon>
          <span>Link attributes</span>
        </h2>
        <p class="text-xs text-slate-400 leading-relaxed m-0">
          Every outbound provider link on this site — affiliate or not — carries <code class="text-slate-300">rel="nofollow"</code> so
          this site never passes search-ranking credit to the providers it compares. Affiliate links additionally carry
          <code class="text-slate-300">rel="sponsored"</code> per Google's own guidance for paid links.
        </p>
      </section>
    </article>
  `
})
export class DisclosureComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  readonly providerMetas = PROVIDER_METAS;
  readonly affiliateLinks = AFFILIATE_LINKS;
  readonly activePrograms = activeAffiliatePrograms();

  ngOnInit(): void {
    const canonicalUrl = 'https://cloudcostmatrix.com/disclosure';
    this.seoService.updateTags({
      title: 'Affiliate Disclosure',
      description: 'CloudCostMatrix\'s FTC-compliant affiliate disclosure: which cloud providers we have referral relationships with, and how that never affects the pricing rankings shown on the site.',
      canonicalUrl,
      robotsMeta: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
      structuredDataJson: SchemaGenerator.generateBreadcrumbSchema([
        { name: 'Home', url: 'https://cloudcostmatrix.com/' },
        { name: 'Affiliate Disclosure', url: canonicalUrl }
      ])
    });
  }
}

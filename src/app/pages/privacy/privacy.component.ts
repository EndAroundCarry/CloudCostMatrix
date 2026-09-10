import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SeoService } from '../../core/services/seo.service';
import { SchemaGenerator } from '../../core/seo/schema-generator';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <article class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <nav class="flex items-center gap-2 text-xs text-slate-400 font-semibold" aria-label="Breadcrumb">
        <a routerLink="/" class="hover:text-white transition-colors">Home</a>
        <span aria-hidden="true">/</span>
        <span class="text-slate-200" aria-current="page">Privacy</span>
      </nav>

      <header>
        <h1 class="text-3xl font-extrabold text-white tracking-tight m-0">Privacy</h1>
        <p class="mt-3 text-sm text-slate-300 leading-relaxed m-0">
          What CloudCostMatrix collects, why, and how to avoid it. The short version: the calculator runs entirely in
          your browser, and the only third-party data collection is privacy-limited, cookie-based analytics.
        </p>
      </header>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-4">
        <h2 class="text-base font-bold text-white tracking-tight mb-4 flex items-center gap-2 m-0">
          <mat-icon class="text-blue-400">calculate</mat-icon>
          <span>The estimator itself needs no account</span>
        </h2>
        <p class="text-sm text-slate-300 leading-relaxed m-0">
          Every cost calculation, comparison, and share link is computed locally in your browser from a pricing catalog
          bundled with the site. Changing the configuration sends nothing to our servers. Share links encode your
          configuration in the URL itself (<code class="text-slate-300">?c=…</code>), so opening one never transmits it
          anywhere either.
        </p>
        <p class="text-sm text-slate-300 leading-relaxed m-0">
          If you choose to save an architecture, we create an anonymous account for you (via Firebase Authentication)
          and store that estimate in Google Cloud Firestore, keyed to that anonymous ID. Saving is optional — you can
          use the whole site without it. Signing in with Google or email attaches your saved estimates to that
          account instead, so they sync across devices.
        </p>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-4">
        <h2 class="text-base font-bold text-white tracking-tight mb-4 flex items-center gap-2 m-0">
          <mat-icon class="text-emerald-400">analytics</mat-icon>
          <span>Analytics (Google Analytics 4)</span>
        </h2>
        <p class="text-sm text-slate-300 leading-relaxed m-0">
          We use Google Analytics 4 (loaded via Firebase, measurement ID
          <code class="text-slate-300">{{ measurementId }}</code>) to understand which pages and comparisons are used.
          It sets cookies and reports aggregated, non-identifying usage: page views, which providers you toggle, which
          exports you take, and whether you clicked an outbound provider link.
        </p>
        <ul class="space-y-3 text-sm text-slate-300 leading-relaxed">
          <li>
            <strong class="text-white">IP anonymization is on.</strong> GA4 truncates IP addresses by default and this
            site sets <code class="text-slate-300">anonymize_ip</code> explicitly.
          </li>
          <li>
            <strong class="text-white">Google Signals is off.</strong> We do not enable cross-device advertising
            features, remarketing audiences, or ads personalization
            (<code class="text-slate-300">allow_google_signals: false</code>).
          </li>
          <li>
            <strong class="text-white">Analytics is never loaded during static rendering.</strong> It initializes only
            in a real browser, only after the page renders, and it checks that cookies and IndexedDB are even
            available — in strict privacy modes it simply does not start.
          </li>
          <li>
            <strong class="text-white">We never send your cost configuration</strong> as an analytics event. No vCPU
            counts, no RAM sizes, no egress volumes, no saved-estimate names.
          </li>
        </ul>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-4">
        <h2 class="text-base font-bold text-white tracking-tight mb-4 flex items-center gap-2 m-0">
          <mat-icon class="text-sky-400">handshake</mat-icon>
          <span>Affiliate links</span>
        </h2>
        <p class="text-sm text-slate-300 leading-relaxed m-0">
          Some outbound "Visit provider" links may be affiliate or referral links that can earn us a commission at no
          cost to you. They never influence rankings, and each one is labeled at the point of use. See the
          <a routerLink="/disclosure" class="text-blue-400 hover:text-white underline">Affiliate Disclosure</a> for the
          full detail.
        </p>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-4">
        <h2 class="text-base font-bold text-white tracking-tight mb-4 flex items-center gap-2 m-0">
          <mat-icon class="text-slate-400">settings</mat-icon>
          <span>How to opt out</span>
        </h2>
        <ul class="space-y-3 text-sm text-slate-300 leading-relaxed">
          <li>Block or clear cookies for this site in your browser settings, or browse in a private/strict mode — analytics will not initialize.</li>
          <li>Use the official <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener nofollow" class="text-blue-400 hover:text-white underline">Google Analytics opt-out browser add-on</a>.</li>
          <li>
            Do not use "Save architecture" and do not sign in: then nothing at all is stored on our side, and the site
            is fully functional.
          </li>
        </ul>
      </section>

      <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 space-y-3">
        <h2 class="text-base font-bold text-white tracking-tight flex items-center gap-2 m-0">
          <mat-icon class="text-amber-400">shield</mat-icon>
          <span>Hosting & data location</span>
        </h2>
        <p class="text-sm text-slate-300 leading-relaxed m-0">
          The site is served as static files from Google Firebase Hosting. Authentication and saved estimates use
          Firebase Authentication and Firestore in Google Cloud (US). Those providers process data under Google's own
          terms. We hold no other personal data, sell nothing, and share nothing beyond what is described here.
        </p>
        <p class="text-xs text-slate-400 m-0">Last updated: {{ lastUpdated }}.</p>
      </section>
    </article>
  `
})
export class PrivacyComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  readonly measurementId = 'G-51NGFYL4Y3';
  readonly lastUpdated = '10 September 2026';

  ngOnInit(): void {
    const canonicalUrl = 'https://cloudcostmatrix.com/privacy';
    this.seoService.updateTags({
      title: 'Privacy — CloudCostMatrix',
      description: 'CloudCostMatrix privacy policy: the estimator runs locally in your browser, analytics are IP-anonymized with Google Signals disabled, and no cost configuration is ever sent as an event.',
      canonicalUrl,
      robotsMeta: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
      structuredDataJson: SchemaGenerator.generateBreadcrumbSchema([
        { name: 'Home', url: 'https://cloudcostmatrix.com/' },
        { name: 'Privacy', url: canonicalUrl }
      ])
    });
  }
}

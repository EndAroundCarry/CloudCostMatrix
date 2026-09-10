import { Injectable, PLATFORM_ID, afterNextRender, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { getFirebaseApp } from '../../infrastructure/firebase/firebase-app';
import { PRICING_MODE } from '../engine/catalog/pricing-catalog.resolver';
import { CloudProvider } from '../models/cloud-provider.enum';

/**
 * Every custom event this app fires, named up front so a call site can't typo
 * an event name that then silently never shows up in GA4 (which does not
 * validate event names — a typo just vanishes with no error, anywhere).
 */
export type CcmEvent =
  | 'affiliate_click'
  | 'provider_toggle'
  | 'blueprint_apply'
  | 'export'
  | 'share'
  | 'estimate_save'
  | 'commitment_change'
  | 'region_change'
  | 'currency_change'
  | 'comparison_view';

interface QueuedEvent {
  name: CcmEvent | 'page_view';
  params: Record<string, unknown>;
}

const MAX_QUEUE = 50;

/**
 * Thin wrapper around Firebase Analytics (GA4). Firebase's own `measurementId`
 * is already provisioned in firebase.config.ts — this service is what turns it
 * on, with three mandatory gates:
 *
 *  1. isPlatformBrowser — getAnalytics() touches document.cookie / navigator /
 *     window.gtag and must never execute during prerender.
 *  2. afterNextRender() — browser-only by contract, and runs AFTER hydration
 *     completes, so it can never perturb the initial client-render DOM diff.
 *  3. await isSupported() — returns false when cookies/IndexedDB are
 *     unavailable (Brave strict mode, Safari private browsing, some
 *     extensions). Skipping this check is the single most common
 *     Firebase-Analytics-in-Angular bug: init() throws, and because this runs
 *     inside a root-provided service constructor, an uncaught throw here can
 *     take the whole app down for exactly the privacy-conscious visitors this
 *     audience disproportionately is.
 *
 * `firebase/analytics` is dynamically imported (~30kB gzipped) so a visitor
 * who never triggers analytics — including every prerendered page — never
 * pays for it in the initial bundle.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  private analyticsInstance: import('firebase/analytics').Analytics | null = null;
  private analyticsModule: typeof import('firebase/analytics') | null = null;
  private ready = false;
  private readonly queue: QueuedEvent[] = [];

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return; // gate 1 — never during prerender
    afterNextRender(() => void this.init());          // gate 2 — never during/before hydration
  }

  private async init(): Promise<void> {
    try {
      const mod = await import('firebase/analytics');
      if (!(await mod.isSupported())) return;          // gate 3 — cookies/IndexedDB unavailable
      this.analyticsModule = mod;
      this.analyticsInstance = mod.getAnalytics(getFirebaseApp());
      mod.setDefaultEventParameters({ pricing_mode: PRICING_MODE });
      this.ready = true;

      // Flush anything queued between bootstrap and this promise resolving.
      for (const evt of this.queue.splice(0, this.queue.length)) {
        this.emit(evt.name, evt.params);
      }

      // The landing navigation's NavigationEnd has already fired by the time
      // this resolves — fire it once manually, then subscribe for the rest.
      this.emit('page_view', { page_path: this.router.url, page_title: this.safeTitle() });
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => this.emit('page_view', { page_path: e.urlAfterRedirects, page_title: this.safeTitle() }));
    } catch {
      // Analytics is enhancement, never a requirement — swallow and stay silent.
    }
  }

  private safeTitle(): string {
    return typeof document !== 'undefined' ? document.title : '';
  }

  /** Public tracking entry point. Safe to call before init resolves — events queue. */
  public track(name: CcmEvent, params: Record<string, unknown> = {}): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.ready) {
      this.emit(name, params);
      return;
    }
    if (this.queue.length < MAX_QUEUE) this.queue.push({ name, params });
  }

  private emit(name: CcmEvent | 'page_view', params: Record<string, unknown>): void {
    if (!this.ready || !this.analyticsInstance || !this.analyticsModule) return;
    // Firebase's `logEvent` typing overloads several reserved GA4 event names
    // (e.g. 'share') with their own specific parameter shapes, which fights
    // our custom event taxonomy's params. We deliberately bypass that overload
    // resolution here — the event names above are our own, not GA4's built-ins.
    this.analyticsModule.logEvent(this.analyticsInstance, name as string, params);
  }

  // ---- Convenience wrappers for the most common events -------------------

  public trackAffiliateClick(provider: CloudProvider, context: string, isPaid: boolean, hasLink: boolean): void {
    this.track('affiliate_click', { provider, context, is_paid: isPaid, has_link: hasLink });
  }

  public trackProviderToggle(provider: CloudProvider, selected: boolean, selectionSize: number): void {
    this.track('provider_toggle', { provider, selected, selection_size: selectionSize });
  }

  public trackExport(format: 'csv' | 'slack' | 'markdown' | 'pdf'): void {
    this.track('export', { format });
  }

  public trackComparisonView(slug: string, isCurated: boolean, winner: CloudProvider | null): void {
    this.track('comparison_view', { slug, is_curated: isCurated, winner: winner ?? undefined });
  }
}

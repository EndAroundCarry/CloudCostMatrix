import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { EstimatorStore } from './estimator.store';
import { UrlStateService } from '../core/services/url-state.service';
import { AUTH_SERVICE_TOKEN } from '../core/repositories/auth.service.interface';
import { ESTIMATE_REPOSITORY_TOKEN } from '../core/repositories/estimate.repository.interface';
import { AnalyticsService } from '../core/analytics/analytics.service';
import { NoopAuthService } from '../infrastructure/noop/noop-auth.service';
import { NoopEstimateRepository } from '../infrastructure/noop/noop-estimate.repository';
import { DEFAULT_SELECTED_PROVIDERS } from '../core/models/cloud-provider.enum';
import { ARCHITECTURE_BLUEPRINTS } from '../core/models/blueprints.model';

const analyticsStub = {
  trackEstimateSave: () => {},
  trackBlueprintApply: () => {},
  trackProviderToggle: () => {},
  trackCommitmentChange: () => {},
  trackCurrencyChange: () => {},
  trackRegionChange: () => {}
};

@Component({ selector: 'app-test-host', standalone: true, template: '' })
class TestHost {}

/**
 * Guards the hydration contract for EstimatorStore.
 *
 * The store's initial state must be a pure function of compile-time constants,
 * because that same state is what the server rendered into the prerendered
 * HTML. If the constructor reads browser-only state (a ?c= share link, a
 * restored Firebase session), the client's first render disagrees with that
 * HTML and Angular hydration fails with NG0500. These tests pin that contract:
 * the constructor must do neither read, and both must still happen right after
 * the first render.
 */
describe('EstimatorStore hydration safety', () => {
  const sharedConfig = {
    ...ARCHITECTURE_BLUEPRINTS[1].config,
    selectedProviders: [...DEFAULT_SELECTED_PROVIDERS]
  };

  let decodeSpy: ReturnType<typeof vi.fn>;
  let originalSearch: string;

  beforeEach(() => {
    originalSearch = window.location.search;
    decodeSpy = vi.fn().mockReturnValue(sharedConfig);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: UrlStateService, useValue: { decodeFromUrl: decodeSpy, encodeToUrl: () => '', buildShareUrl: () => '' } },
        { provide: AUTH_SERVICE_TOKEN, useClass: NoopAuthService },
        { provide: ESTIMATE_REPOSITORY_TOKEN, useClass: NoopEstimateRepository },
        { provide: AnalyticsService, useValue: analyticsStub }
      ]
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', window.location.pathname + originalSearch);
    TestBed.resetTestingModule();
  });

  it('does not read the ?c= share link during construction', () => {
    window.history.replaceState({}, '', '/?c=some-shared-payload');

    const store = TestBed.inject(EstimatorStore);

    // This is the whole point: at first-render time the store must still hold
    // the compile-time default, matching what the server prerendered.
    expect(decodeSpy).not.toHaveBeenCalled();
    expect(store.config().selectedProviders).toEqual([...DEFAULT_SELECTED_PROVIDERS]);
    expect(store.config().name).toBe(ARCHITECTURE_BLUEPRINTS[0].config.name);
  });

  it('does not load saved estimates during construction', () => {
    const store = TestBed.inject(EstimatorStore);
    expect(store.savedEstimates()).toEqual([]);
    expect(store.savedEstimateCount()).toBe(0);
  });

  it('applies the ?c= share link after the first render', () => {
    window.history.replaceState({}, '', '/?c=some-shared-payload');

    const store = TestBed.inject(EstimatorStore);
    expect(decodeSpy).not.toHaveBeenCalled();

    // Drive one render cycle, which flushes the afterNextRender callbacks.
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();

    expect(decodeSpy).toHaveBeenCalledWith('some-shared-payload');
    expect(store.config().name).toBe(sharedConfig.name);
  });
});

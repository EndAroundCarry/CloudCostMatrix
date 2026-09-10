import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';

const initializeAnalyticsMock = vi.fn().mockReturnValue({ mockAnalytics: true });
const isSupportedMock = vi.fn().mockResolvedValue(true);
const logEventMock = vi.fn();
const setDefaultEventParametersMock = vi.fn();

vi.mock('firebase/analytics', () => ({
  initializeAnalytics: initializeAnalyticsMock,
  isSupported: isSupportedMock,
  logEvent: logEventMock,
  setDefaultEventParameters: setDefaultEventParametersMock
}));

import { ANALYTICS_CONSENT_CONFIG, AnalyticsService } from './analytics.service';

describe('AnalyticsService — consent posture', () => {
  it('is the privacy-limited config promised on /privacy', () => {
    expect(ANALYTICS_CONSENT_CONFIG).toEqual({ anonymize_ip: true, allow_google_signals: false });
  });
});

describe('AnalyticsService — server platform', () => {
  beforeEach(() => {
    initializeAnalyticsMock.mockClear();
    isSupportedMock.mockClear();
    logEventMock.mockClear();
  });

  it('never initializes firebase/analytics when constructed on the server platform, and track() is a silent no-op', async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'server' }]
    }).compileComponents();

    const service = TestBed.inject(AnalyticsService);
    service.track('affiliate_click', { provider: 'AWS', context: 'test', is_paid: false, has_link: false });
    service.trackAffiliateClick('AWS' as any, 'test', false, false);

    // Give any stray microtask a chance to run before asserting nothing fired.
    await new Promise((r) => setTimeout(r, 0));

    expect(initializeAnalyticsMock).not.toHaveBeenCalled();
    expect(logEventMock).not.toHaveBeenCalled();
  });
});

describe('AnalyticsService — browser platform', () => {
  beforeEach(() => {
    initializeAnalyticsMock.mockClear();
    isSupportedMock.mockClear();
    logEventMock.mockClear();
    isSupportedMock.mockResolvedValue(true);
  });

  it('does not throw when isSupported() resolves false (Brave-strict / private mode)', async () => {
    isSupportedMock.mockResolvedValueOnce(false);
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'browser' }]
    }).compileComponents();

    expect(() => TestBed.inject(AnalyticsService)).not.toThrow();
  });
});

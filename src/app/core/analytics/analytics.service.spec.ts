import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';

const getAnalyticsMock = vi.fn();
const isSupportedMock = vi.fn().mockResolvedValue(true);
const logEventMock = vi.fn();
const setDefaultEventParametersMock = vi.fn();

vi.mock('firebase/analytics', () => ({
  getAnalytics: getAnalyticsMock,
  isSupported: isSupportedMock,
  logEvent: logEventMock,
  setDefaultEventParameters: setDefaultEventParametersMock
}));

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService — server platform', () => {
  beforeEach(() => {
    getAnalyticsMock.mockClear();
    isSupportedMock.mockClear();
    logEventMock.mockClear();
  });

  it('never imports firebase/analytics when constructed on the server platform, and track() is a silent no-op', async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'server' }]
    }).compileComponents();

    const service = TestBed.inject(AnalyticsService);
    service.track('affiliate_click', { provider: 'AWS', context: 'test', is_paid: false, has_link: false });
    service.trackAffiliateClick('AWS' as any, 'test', false, false);

    // Give any stray microtask a chance to run before asserting nothing fired.
    await new Promise((r) => setTimeout(r, 0));

    expect(getAnalyticsMock).not.toHaveBeenCalled();
    expect(logEventMock).not.toHaveBeenCalled();
  });
});

describe('AnalyticsService — browser platform', () => {
  beforeEach(() => {
    getAnalyticsMock.mockClear();
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

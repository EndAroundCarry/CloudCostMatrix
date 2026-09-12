import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { SeoService } from './seo.service';

describe('SeoService — robots directive', () => {
  let service: SeoService;
  let meta: Meta;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SeoService, { provide: DOCUMENT, useValue: document }]
    });
    service = TestBed.inject(SeoService);
    meta = TestBed.inject(Meta);
  });

  const robots = (): string => meta.getTag('name="robots"')?.content ?? '';

  it('applies an index directive when a page omits robotsMeta', () => {
    service.updateTags({ title: 'Home', description: 'desc' });
    expect(robots()).toContain('index, follow');
    expect(robots()).not.toContain('noindex');
  });

  it('honours an explicit robotsMeta', () => {
    service.updateTags({ title: '404', description: 'desc', robotsMeta: 'noindex, follow' });
    expect(robots()).toBe('noindex, follow');
  });

  it('clears a previously-set noindex when a later page omits robotsMeta', () => {
    service.updateTags({ title: 'Derived', description: 'desc', robotsMeta: 'noindex, follow' });
    expect(robots()).toContain('noindex');

    service.updateTags({ title: 'Home', description: 'desc' });
    expect(robots()).toContain('index, follow');
    expect(robots()).not.toContain('noindex');
  });
});

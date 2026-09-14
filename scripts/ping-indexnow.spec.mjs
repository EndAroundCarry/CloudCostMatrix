import { describe, it, expect } from 'vitest';
import { findIndexNowKey, sitemapUrls } from './ping-indexnow.mjs';

describe('ping-indexnow', () => {
  it('extracts every <loc> from a sitemap, trimmed', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://cloudcostmatrix.com/</loc></url>
  <url><loc>https://cloudcostmatrix.com/providers/aws</loc></url>
</urlset>`;
    expect(sitemapUrls(xml)).toEqual([
      'https://cloudcostmatrix.com/',
      'https://cloudcostmatrix.com/providers/aws'
    ]);
  });

  it('returns an empty list rather than throwing on a malformed sitemap', () => {
    expect(sitemapUrls('<urlset></urlset>')).toEqual([]);
  });

  it('finds the IndexNow key file and ignores the other public assets', () => {
    // Guards the discovery rule: robots.txt, llms.txt and sitemap.xml must never
    // be mistaken for a key, and a key must never be missed after a rotation.
    expect(findIndexNowKey('public')).toMatch(/^[a-f0-9]{32}$/i);
  });

  it('returns null when there is no key file', () => {
    expect(findIndexNowKey('scripts')).toBeNull();
  });
});

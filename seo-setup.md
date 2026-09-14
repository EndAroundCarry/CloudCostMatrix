# SEO setup — what is left to do

**Summary:** the code side is finished and gated on every deploy. Three things need you: two verification tokens for the
search consoles, submit the sitemap once, then request indexing. Coverage fills in over the following weeks; the
deploy pipeline already pings IndexNow for you.

## Done in code — nothing to do

- 122 prerendered pages, 76 indexable: 10 provider pages, 45 comparisons, 6 guides, 4 blueprints, 4 hubs, legal pages
- Unique title + description per page, self-canonical URLs, OG/Twitter tags, JSON-LD (WebSite, Organization, WebPage,
  FAQPage, BreadcrumbList, HowTo, ItemList) on every indexable page
- `sitemap.xml` generated from what actually shipped, `robots.txt`, `llms.txt`, real 404s, IndexNow ping on deploy
- `npm run verify:all` runs in CI before every deploy and fails on duplicate/missing meta, a wrong canonical, invalid
  structured data, or a sitemap that disagrees with the deployed HTML

## You — verify the consoles (~10 minutes, once)

1. **Google Search Console** — https://search.google.com/search-console → Add property → *URL prefix* →
   `https://cloudcostmatrix.com` → verify with the **HTML tag** method, then paste the token into `src/index.html`
   where `PASTE_GOOGLE_SEARCH_CONSOLE_TOKEN` sits (line ~18). Commit + deploy.
2. **Bing Webmaster Tools** — https://www.bing.com/webmasters → Add site → **import from Google Search Console**
   (fastest; carries verification over). Otherwise paste its `msvalidate.01` value into the matching placeholder.
3. **Submit the sitemap** once in each console: `https://cloudcostmatrix.com/sitemap.xml`.
4. **Request indexing** (URL Inspection → Request Indexing) for the home page and one provider page.

## Watch, in this order

1. **Pages / Coverage report** — expect 76 URLs. "Crawled – currently not indexed" on the generated comparison pages is
   the signal to watch: if a cluster of them stays unindexed for weeks, flip those pairs back to `noindex` in
   `provider-comparison.component.ts` (one-line change) instead of rewriting them.
2. **Structured data** — any error there is a regression in `schema-generator.ts`, not a config problem.
3. **Core Web Vitals** — meaningful after ~28 days of traffic.

# CloudCostMatrix — Maximum Discoverability (SEO) Plan

## Status

- [x] W0 — land this plan in the repo
- [x] W1 — full pair coverage + correct indexability
- [x] W2 — provider pages (`/providers/:slug`) + `/providers` hub
- [x] W3 — editorial upgrade for 8 high-value pairs
- [x] W4 — hub pages (`/compare`, `/guides`, `/blueprints`)
- [x] W5 — three new data-driven guides
- [x] W6 — technical hardening (verify-seo, CI gates, real 404s, schema, `llms.txt`)
- [x] W7 — IndexNow + your manual setup checklist

**Landed:** 122 prerendered pages, 76 indexable (from 26), all gated by `npm run verify:all` in CI.
Remaining manual work is tracked in `seo-setup.md`; deferred items are listed at the bottom of this file.

## Where we are

Already strong: static prerender (26 routes), `SeoService` (title/desc/robots/canonical/OG), `SchemaGenerator` (JSON-LD), `robots.txt`, generated `sitemap.xml`, real 404 page, one `<h1>` per page.

Missing / weak:

| Gap | Impact |
|---|---|
| Only 15 of 45 provider pairs indexable; other 30 are `noindex` + not prerendered (JS-only for crawlers) | ~30 long-tail "X vs Y" pages lost |
| No provider pages — no URL targets "AWS/… pricing calculator" queries | Biggest keyword space untouched |
| `/compare`, `/guides`, `/blueprints` return 404 (no hubs) | No crawl paths, weak internal linking |
| `verify-jsonld.mjs` orphaned, `verify-prerender.mjs` never run in CI | SEO regressions ship silently |
| Every unknown URL returns HTTP 200 (`**` → `index.csr.html` rewrite) | Soft-404s, wasted crawl signals |
| No GSC/Bing verification, no IndexNow, no `llms.txt` | Slow/no discovery of new pages |
| Static `index.html` title/desc still says "AWS vs Azure vs GCP" only | Off-target for the 10-provider reality |

## Decisions

1. **Index all 45 pairs.** One indexable URL per pair (curated slug if one exists, else canonical forward slug). Reverse orderings are prerendered (so no valid URL 404s) but `noindex` + canonical to the indexable URL. Generated pages get real, pair-specific content (computed verdict, cost scorecards, feature matrix, 5 data-derived FAQs) — not boilerplate.
2. **Provider pages at `/providers/:slug`** (10) + `/providers` hub.
3. **Hubs**: `/compare`, `/guides`, `/blueprints`.
4. **3 new data-driven guides** (object storage, managed Postgres, managed Kubernetes) via 3 new metrics in `provider-rankings.ts`.
5. **Real 404s**: drop the catch-all rewrite only after every valid URL is prerendered; add `public/404.html`.
6. **Free discovery plumbing**: IndexNow (Bing/Yandex/Seznam/Naver), `llms.txt`, GSC/Bing placeholder tags + a short setup doc.
7. **Not touching fonts/icons/typography or the Firebase/analytics setup** (per your standing preference). No perf refactors in this plan.

Target: ~26 → ~90 indexable URLs (85 pages + 3 hubs + legal).

---

## W0 — Land this plan in the repo

Copy to repo root as `seo-implementation-plan.md` and commit (`docs(seo): add phased SEO plan`), scoped alone, no generated churn. Every later phase is independently shippable/committable.

## W1 — Full pair coverage + correct indexability

Files:

- `src/app/core/seo/comparison-slug.ts` — add `allPairOrderings()` (every pair, both orders, for prerender params). Spec: 90 unique slugs, every entry parses and canonicalizes correctly.
- `src/app/pages/programmatic/comparison-pages.data.ts` — add `CURATED_PAIR_SLUGS: Map<'a|b', slug>` (unordered provider key → curated slug, for the 13 pair-shaped curated pages) + `indexableSlugForPair(a, b)` (curated slug, else `buildPairSlug` in canonical order). 3-provider curated pages are not pairs and stay out of the map.
- `src/app/app.routes.server.ts` — `compare/:slug` prerender params = curated slugs ∪ `allPairOrderings()` (deduped).
- `src/app/pages/programmatic/provider-comparison.component.ts`
  - `resolveSlug`: valid pair → `index` when the URL is the indexable slug, else `noindex, follow` + canonical to the indexable slug. Curated pages unchanged (indexed, self-canonical).
  - `buildDerivedPage(a, b)`: compute the reference matrix first, then build **5 data-derived FAQs with real numbers** (verdict $/mo + %, egress policy delta, hot-storage $/GB, K8s control-plane fee, cheapest instance each) and a **Related comparisons** block (≤6 links: curated pages touching either provider + the other pairs involving A or B).
  - Link provider names in the scorecards to `/providers/:slug` (works once W2 lands; until then plain text).
- `scripts/generate-sitemap.mjs` — include a route only if its prerendered HTML has no `noindex` robots meta (single source of truth = what actually shipped). Adjust priority bands: home `1.0`; hubs `0.9`; curated + indexable pairs `0.85`; providers/blueprints/guides `0.8`; legal `0.3`.
- `scripts/verify-prerender.mjs` — raise `MIN_EXPECTED_ROUTES` (~110); assert one non-curated pair (e.g. `gcp-vs-ibm`) is prerendered **and** indexable, and its reverse is `noindex`.
- Specs: curated→pair mapping, indexable-slug resolution, derived FAQ generation.

Verify: `npm run build` → `prerendered-routes.json` ≈ 110; `public/sitemap.xml` gains ~30 pair URLs; spot-check a generated page's HTML (title, canonical, `index, follow`, real numbers in FAQs).

## W2 — Provider pages (biggest new keyword surface)

Files:

- **New** `src/app/pages/providers/provider-pages.data.ts` — per provider (10): title, metaDescription, keywords, 3 authored FAQs, editorial intro. Everything else is derived.
- **New** `src/app/pages/providers/provider-detail.component.ts` (`/providers/:slug`) renders, from the real catalogs:
  - Breadcrumb (Home / Providers / {name}); H1 + intro + tier badge + freshness label (`getProviderFreshness`) with source link.
  - "Typical workload costs" table: entry app (`ENTRY_COMPUTE_SPEC`), SaaS MVP + e-commerce blueprint configs, egress-heavy config — monthly total + category breakdown per config.
  - Instance table (`compute[]`: shape, vCPU/RAM, on-demand, 1-yr, 3-yr, spot), storage-tier table (capability-gated with `notes`), managed-DB table, networking (egress tiers, free allowance, LB, static IP), Kubernetes control-plane fee.
  - Optimization tip + per-category savings tips (`PROVIDER_METAS`), rankings position (from `rankProviders`), "cheapest {provider} instance" line.
  - Link blocks: the 9 pairs involving this provider, curated comparisons, relevant guides; affiliate CTA; FAQ (3 authored + 3 data-derived).
  - JSON-LD: `WebPage` + `BreadcrumbList` + `FAQPage` + `ItemList`.
- **New** `src/app/pages/providers/providers-hub.component.ts` (`/providers`) — all 10 cards (tier, headline, entry price, links) + `ItemList` schema.
- `src/app/app.routes.ts` + `app.routes.server.ts` — `/providers` static, `providers/:slug` prerender params from `PROVIDER_METAS[*].slug`.
- `src/app/app.ts` (footer) — add Providers column (10 links) + hubs; `home.component.ts` — add a short "Browse providers & comparisons" section before the FAQ.
- Title discipline: keep pre-suffix titles ≤ 45 chars (e.g. `AWS Pricing & Cost Calculator (2026)`), unique per provider.
- Specs: unique titles/descriptions across the 10, FAQ non-empty, derived tables non-empty for all 10.

Verify: build; 11 new prerendered pages; each has self-canonical, one h1, valid JSON-LD; `npm run verify:jsonld`.

## W3 — Editorial upgrade for 8 high-value pairs

Add hand-written `COMPARISON_PAGES` entries (same shape as existing: slugTitle, headline, summary, metaDescription, keywords, ~4 FAQs, 3-4 editorial rows, `referenceConfig` override where it changes the story):
`azure-vs-oracle`, `gcp-vs-oracle`, `aws-vs-ibm`, `digitalocean-vs-azure`, `digitalocean-vs-gcp`, `linode-vs-azure`, `ovhcloud-vs-azure`, `aws-vs-alibaba`.

Any claim beyond what the catalogs/capabilities encode gets checked against the provider's own pricing page during implementation — same standard as `provider-verification.ts`. New entries replace their generated counterpart automatically (W1's `indexableSlugForPair` picks the curated slug up), and the sitemap re-labels them as curated.

Verify: build; the 8 slugs now render editorial content; their generated counterparts are `noindex` + canonical to them.

## W4 — Hub pages

- **New** `compare-hub.component.ts` (`/compare`) — featured curated grid (with summaries) + all 45 pairs grouped by provider; `ItemList`.
- **New** `guides-hub.component.ts` (`/guides`), **New** `blueprints-hub.component.ts` (`/blueprints`).
- Routes + prerender (static routes, covered by `**`), footer/home/404 links updated to point at hubs, sitemap priorities via W1's banding.
- Specs: hub HTML lists every entity (no silent omissions when providers are added).

## W5 — Three new data-driven guides

- `src/app/core/seo/provider-rankings.ts` — new metrics: `objectStorage` (10 TB hot storage/mo), `managedPostgres` (2 vCPU/8 GB + 100 GB, single-AZ), `kubernetes` (control plane + 3 × 2 vCPU/4 GB workers, 730 h).
- `src/app/pages/guides/guide-pages.data.ts` — 3 entries in the existing editorial style (ranking caption, caveats, 4 FAQs, related slugs): cheapest object storage, cheapest managed PostgreSQL, cheapest managed Kubernetes (EKS vs AKS vs GKE vs 7 more).
- Existing guide component/tab strip handles the rest; `GUIDE_SLUGS` flows into prerender + sitemap automatically.
- Specs: each metric ranks all 10 providers, cheapest-first, values match direct engine calls.

## W6 — Technical hardening (run this after W1 so no URL 404s)

- **New** `scripts/verify-seo.mjs` + `package.json` (`verify:seo`, `verify:all`) — assert per prerendered page: exactly one unique `<title>`; description present, 50–165 chars, unique; exactly one canonical that equals the page URL (unless `noindex`); robots meta present; `og:title/description/image/url` + `twitter:card` present; exactly one `<h1>`; one JSON-LD block (unless `noindex`); no `undefined`/`NaN`; **sitemap ⊆ indexable pages and all sitemap URLs exist as files**.
- `.github/workflows/price-sync-cron.yml` — after the build step, before deploy: `npm run verify:prerender && npm run verify:jsonld && npm run verify:seo` (today none of them run in CI).
- `firebase.json` — remove the `**` → `index.csr.html` rewrite (real 404s now that every valid URL is prerendered); add `Cache-Control: no-cache` for `**/*.html`.
- **New** `public/404.html` — small branded static page with `noindex` + links to home/providers/compare.
- **New** `public/llms.txt` — site summary + key URLs (providers, comparisons, guides, methodology).
- `src/index.html` — rewrite static title/description for 10 providers (titles ≤ 62 chars with suffix); add `og:locale` + `hreflang="x-default"`; add clearly-marked commented placeholders for `google-site-verification` / `msvalidate.01`.
- `schema-generator.ts` — add `WebSite` node (with `@id`s for Organization/WebSite), `generateItemListSchema()`, `Organization`: real logo (`/icon-512.png`) + `sameAs: [GitHub repo]`; wire `WebSite` into the home graph and `ItemList` into the hubs.
- `verify-jsonld.mjs` — extend `REQUIRED_BY_TYPE` for `WebSite`/`ItemList`.

Verify: `npm run build`, all three verify scripts green, then `npx firebase emulators:start --only hosting` and check: unknown URL → 404 status + `404.html`; valid pair renders prerendered HTML; headers correct.

## W7 — Indexing plumbing + your manual checklist

- **New** `public/<indexnow-key>.txt` (fresh 32-hex key) + `scripts/ping-indexnow.mjs` (+ spec) — POSTs the sitemap URL list to `api.indexnow.org` after deploy; add the CI step right after the Firebase deploy (same run condition).
- **New** `seo-setup.md` (≤30 lines, committed): "done in code" vs "only you can do" — exact GSC/Bing verification steps, where to paste the tokens, sitemap submission, and what to watch in Coverage over the first weeks.

## Deferred (and why)

- **Self-hosting fonts / trimming Inter weights / dropping unused icon families** — the current font + icon setup is intentional and stays.
- **Making `firebase/app` lazy** — Firebase auth/firestore/analytics are already dynamically imported; only `initializeApp` is eager, so the payoff doesn't justify touching auth/save flows.
- **Per-page OG images** — needs new build deps (satori/resvg) + binary assets committed; revisit if you start promoting links on social/Slack.
- **301 redirects for reversed pairs at hosting level** — would require build-time mutation of `firebase.json`; prerender + `noindex` + canonical achieves the same consolidation with generated config.
- **RSS feed** — guides/blueprints are not time-ordered; no feed consumer worth serving.
- **Service worker / offline PWA** — no search benefit, real cache-staleness risk.

## Risk + monitoring

Opening 30 generated pages is a deliberate scaled-content trade: each is data-computed and unique (numbers, verdict, FAQs), non-curated pairs are canonical-consolidated, and nothing duplicates a curated page. Watch GSC "Crawled – currently not indexed" and index bloat after W7; if a generated cluster underperforms, flipping those pairs back to `noindex` is a one-line change in `resolveSlug`.

## Global verification

```bash
npm test && npm run test:scripts
npm run build                     # ng build + sitemap generation
npm run verify:prerender
npm run verify:jsonld
npm run verify:seo                # added in W6
npx firebase emulators:start --only hosting   # 404 status, headers, clean URLs
```

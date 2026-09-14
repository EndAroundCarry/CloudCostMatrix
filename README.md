# CloudCostMatrix

A free, real-time multi-cloud infrastructure cost estimator — compare Compute, Storage, Managed Database, Networking/Egress, and Kubernetes pricing side-by-side across **10 cloud providers**: AWS, Microsoft Azure, Google Cloud, Oracle Cloud Infrastructure, IBM Cloud, DigitalOcean, Alibaba Cloud, Linode (Akamai), OVHcloud, and Vultr.

No signup required — architectures save locally in your browser, share instantly via a compressed URL, and the whole pricing catalog is compiled into the app at build time (zero runtime API cost, zero backend).

## How pricing works

Every number is directional, not a quote — see **[/methodology](https://cloudcostmatrix.com/methodology)** for exactly how the engine calculates costs, and **[/disclosure](https://cloudcostmatrix.com/disclosure)** for the affiliate-link policy.

A price-sync pipeline (`scripts/sync-prices.mjs`, extracted per-provider fetchers in `scripts/fetchers/`) pulls live rates from each provider's public pricing API on a schedule **and on every push to `main`** (see `.github/workflows/price-sync-cron.yml`):

| Provider | Status | Source |
|---|---|---|
| AWS | Live (object storage) | Price List Bulk API |
| Azure | Live (compute, storage + egress) | Retail Prices API |
| Google Cloud | Live (compute, storage + egress) | Cloud Billing Catalog API |
| Oracle Cloud | Live (compute, storage, egress) | cetools price list |
| Linode | Live (compute, database, storage) | v4 public API |
| DigitalOcean | Live (compute + bundled egress) | Droplet pricing page |
| OVHcloud | Live, FX-converted (compute + object storage) | Public Cloud catalog (EUR) + ECB FX |
| IBM | Live (compute, composed from component rates) | Global Catalog API |
| Vultr | Live (compute, managed database) | v2 plans + databases plans API |
| Alibaba | Seeded 2026 benchmark | see `/methodology` |

Every provider row in the app shows its own **Live / FX-converted / Verified / Estimate** freshness badge — never a blanket claim.

## Architecture

- **Angular 21**, standalone components, signals, zoneless-style state (`src/app/state/estimator.store.ts`).
- **Prerendered static output** (`outputMode: 'static'` + `@angular/ssr`) — every route ships as real HTML for crawlers; see `src/app/app.routes.server.ts`.
- **Firebase** (Auth + Firestore) for guest-first, cross-device saved architectures; swapped for no-op implementations during prerendering (`src/app/infrastructure/noop/`) so Firebase never executes server-side.
- **Cost engine** (`src/app/core/engine/cost-calculator.engine.ts`) is fully data-driven off the provider catalogs — no per-provider branching in the math.

## Discoverability (SEO)

The whole pair space is prerendered, but only one URL per pair is indexable — the curated page if there is one,
otherwise the canonical forward slug (`indexableSlugForPair` in `src/app/pages/programmatic/comparison-pages.data.ts`).
Every other ordering ships `noindex` + a canonical to that URL, and `scripts/generate-sitemap.mjs` reads the robots meta
out of the HTML that actually shipped, so the sitemap can never disagree with the deployed pages.

- 76 indexable URLs: provider pages (`/providers/:slug`), all 45 comparisons, guides, blueprints, and hubs.
- `scripts/verify-seo.mjs` asserts per-page uniqueness and correctness (title, description, canonical, OG/Twitter,
  one `<h1>`, JSON-LD, sitemap ↔ HTML coverage) and runs before every deploy via `npm run verify:all`.
- `scripts/verify-jsonld.mjs` separately validates every structured-data block and bans fabricated review markup.
- `scripts/ping-indexnow.mjs` submits the sitemap to IndexNow after a deploy; `public/llms.txt` covers AI crawlers.
- Remaining manual steps (Search Console + Bing verification) are tracked in `seo-setup.md`.

## Development

```bash
npm install
npm start              # dev server at http://localhost:4200
npm run build           # production build, including prerendering + sitemap
npm test                 # Angular/vitest unit suite
npm run test:scripts     # fixture-based tests for the price-sync fetchers and SEO scripts
npm run sync-prices       # refresh live-pricing-cache.json from live provider APIs
npm run verify:all        # prerender + structured data + per-page SEO checks (runs in CI before deploy)
npm run ping:indexnow     # submit the sitemap to IndexNow (--dry-run to preview)
```

## Deploying

Hosting is deployed automatically by `.github/workflows/price-sync-cron.yml`: every push to `main` runs `npm run build` and `firebase deploy --only hosting` (project `cloud-cost-matrix`), using a `FIREBASE_TOKEN` repo secret. Scheduled syncs deploy too, but only when a provider's prices actually moved — a timestamp-only sync skips the rebuild (`scripts/cache-content-diff.mjs`). To ship from your own machine instead:

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json` serves the prerendered files directly: every valid URL exists as real HTML, so there is no SPA fallback
rewrite and an unknown URL returns a genuine 404 (`public/404.html`) instead of a 200 that renders an empty shell.

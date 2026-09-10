# CloudCostMatrix

A free, real-time multi-cloud infrastructure cost estimator — compare Compute, Storage, Managed Database, Networking/Egress, and Kubernetes pricing side-by-side across **9 cloud providers**: AWS, Microsoft Azure, Google Cloud, Oracle Cloud Infrastructure, IBM Cloud, DigitalOcean, Alibaba Cloud, Linode (Akamai), and OVHcloud.

No signup required — architectures save locally in your browser, share instantly via a compressed URL, and the whole pricing catalog is compiled into the app at build time (zero runtime API cost, zero backend).

## How pricing works

Every number is directional, not a quote — see **[/methodology](https://cloudcostmatrix.com/methodology)** for exactly how the engine calculates costs, and **[/disclosure](https://cloudcostmatrix.com/disclosure)** for the affiliate-link policy.

A price-sync pipeline (`scripts/sync-prices.mjs`, extracted per-provider fetchers in `scripts/fetchers/`) pulls live rates from each provider's public pricing API on a schedule (see `.github/workflows/price-sync-cron.yml`):

| Provider | Status | Source |
|---|---|---|
| AWS | Live (object storage) | Price List Bulk API |
| Azure | Live (compute + egress) | Retail Prices API |
| Oracle Cloud | Live (compute, storage, egress) | cetools price list |
| Linode | Live (compute, database, storage) | v4 public API |
| GCP, IBM, DigitalOcean, Alibaba, OVHcloud | Seeded 2026 benchmark | see `/methodology` |

Every provider row in the app shows its own **Live / Verified / Estimate** freshness badge — never a blanket claim.

## Architecture

- **Angular 21**, standalone components, signals, zoneless-style state (`src/app/state/estimator.store.ts`).
- **Prerendered static output** (`outputMode: 'static'` + `@angular/ssr`) — every curated route ships as real HTML for crawlers; see `src/app/app.routes.server.ts`.
- **Firebase** (Auth + Firestore) for guest-first, cross-device saved architectures; swapped for no-op implementations during prerendering (`src/app/infrastructure/noop/`) so Firebase never executes server-side.
- **Cost engine** (`src/app/core/engine/cost-calculator.engine.ts`) is fully data-driven off the provider catalogs — no per-provider branching in the math.

## Development

```bash
npm install
npm start              # dev server at http://localhost:4200
npm run build           # production build, including prerendering
npm test                 # Angular/vitest unit suite
npm run test:scripts     # fixture-based tests for the price-sync fetchers
npm run sync-prices       # refresh live-pricing-cache.json from live provider APIs
npm run verify:prerender  # smoke-test the prerendered output after a build
```

## Deploying

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json` serves prerendered static files where they exist and falls back to the client-rendered shell (`index.csr.html`) for any URL that wasn't prerendered (e.g. an uncurated `/compare/:a-vs-:b` pair, which still resolves correctly client-side).

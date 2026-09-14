import { RenderMode, ServerRoute } from '@angular/ssr';
import { COMPARISON_SLUGS } from './pages/programmatic/comparison-pages.data';
import { GUIDE_SLUGS } from './pages/guides/guide-pages.data';
import { PROVIDER_PAGE_SLUGS } from './pages/providers/provider-pages.data';
import { ARCHITECTURE_BLUEPRINTS } from './core/models/blueprints.model';
import { allPairOrderings } from './core/seo/comparison-slug';

/**
 * outputMode: 'static' (angular.json) means every route here must be
 * enumerable at build time — there's no request-time data in this app (the
 * whole pricing catalog is compiled into the bundle), so that's never a
 * constraint.
 *
 * Every resolvable `/compare/:slug` is prerendered, not just the curated ones.
 * Prerendering the whole pair space is what allows the SPA catch-all rewrite to
 * be dropped (see firebase.json), so unknown URLs can return a real 404 instead
 * of a 200 that renders an empty shell for every crawler that doesn't run JS.
 *
 * Prerendering is deliberately NOT the same as indexing: only one ordering per
 * pair is indexable — the curated page if one exists, else the canonical
 * forward slug. Everything else ships `noindex` + a canonical to that URL, via
 * ProviderComparisonComponent's own slug resolution.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'compare/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      // Curated slugs cover the authored pages — including topical (…-egress)
      // and three-provider ones, which are not pairs at all; allPairOrderings()
      // adds every remaining pair URL in both orderings.
      return [...new Set([...COMPARISON_SLUGS, ...allPairOrderings()])].map((slug) => ({ slug }));
    }
  },
  {
    path: 'blueprints/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return ARCHITECTURE_BLUEPRINTS.map((b) => ({ slug: b.slug }));
    }
  },
  {
    path: 'guides/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return GUIDE_SLUGS.map((slug) => ({ slug }));
    }
  },
  {
    path: 'providers/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return PROVIDER_PAGE_SLUGS.map((slug) => ({ slug }));
    }
  },
  // Covers every other route declared in app.routes.ts that carries no
  // parameters — '', 'methodology', 'disclosure', and the '**' not-found
  // page itself — via Angular's build-time static route discovery.
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];

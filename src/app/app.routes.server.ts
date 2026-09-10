import { RenderMode, ServerRoute } from '@angular/ssr';
import { COMPARISON_SLUGS } from './pages/programmatic/comparison-pages.data';
import { GUIDE_SLUGS } from './pages/guides/guide-pages.data';
import { ARCHITECTURE_BLUEPRINTS } from './core/models/blueprints.model';

/**
 * outputMode: 'static' (angular.json) means every route here must be
 * enumerable at build time — there's no request-time data in this app (the
 * whole pricing catalog is compiled into the bundle), so that's never a
 * constraint.
 *
 * Only the curated comparison slugs are prerendered here. Any-pair URLs
 * (`/compare/oracle-vs-linode`, etc.) are handled client-side by
 * ProviderComparisonComponent's own slug resolution and are intentionally
 * NOT in this list — prerendering all 36 pairs would be easy to do,
 * but the whole point of the noindex+canonical machinery in
 * comparison-slug.ts is that those pages shouldn't be indexed pages in their
 * own right; they render fine on first client navigation, which is all they
 * need.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'compare/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return COMPARISON_SLUGS.map((slug) => ({ slug }));
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
  // Covers every other route declared in app.routes.ts that carries no
  // parameters — '', 'methodology', 'disclosure', and the '**' not-found
  // page itself — via Angular's build-time static route discovery.
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];

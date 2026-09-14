import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    // Directory pages. Declared before their `:slug` siblings so the static
    // segment always wins the match.
    path: 'compare',
    loadComponent: () => import('./pages/programmatic/compare-hub.component').then(m => m.CompareHubComponent)
  },
  {
    path: 'compare/:slug',
    loadComponent: () => import('./pages/programmatic/provider-comparison.component').then(m => m.ProviderComparisonComponent)
  },
  {
    path: 'blueprints',
    loadComponent: () => import('./pages/blueprints/blueprints-hub.component').then(m => m.BlueprintsHubComponent)
  },
  {
    path: 'blueprints/:slug',
    loadComponent: () => import('./pages/blueprints/blueprint-detail.component').then(m => m.BlueprintDetailComponent)
  },
  {
    path: 'guides',
    loadComponent: () => import('./pages/guides/guides-hub.component').then(m => m.GuidesHubComponent)
  },
  {
    // Ranked-list guides (egress pricing, startup costs, EU residency). Kept as
    // its own /guides/ pattern so /compare/ keeps one meaning per URL shape.
    path: 'guides/:slug',
    loadComponent: () => import('./pages/guides/guide-page.component').then(m => m.GuidePageComponent)
  },
  {
    // Provider directory + per-provider pricing pages. `/providers` is declared
    // before `/providers/:slug` so the static segment always wins.
    path: 'providers',
    loadComponent: () => import('./pages/providers/providers-hub.component').then(m => m.ProvidersHubComponent)
  },
  {
    path: 'providers/:slug',
    loadComponent: () => import('./pages/providers/provider-detail.component').then(m => m.ProviderDetailComponent)
  },
  {
    path: 'methodology',
    loadComponent: () => import('./pages/methodology/methodology.component').then(m => m.MethodologyComponent)
  },
  {
    path: 'disclosure',
    loadComponent: () => import('./pages/disclosure/disclosure.component').then(m => m.DisclosureComponent)
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy.component').then(m => m.PrivacyComponent)
  },
  {
    // A genuine 404 rather than the old silent `redirectTo: ''` — see
    // not-found.component.ts for why that mattered.
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];

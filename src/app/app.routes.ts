import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'compare/:slug',
    loadComponent: () => import('./pages/programmatic/provider-comparison.component').then(m => m.ProviderComparisonComponent)
  },
  {
    path: 'blueprints/:slug',
    loadComponent: () => import('./pages/blueprints/blueprint-detail.component').then(m => m.BlueprintDetailComponent)
  },
  {
    // Ranked-list guides (egress pricing, startup costs, EU residency). Kept as
    // its own /guides/ pattern so /compare/ keeps one meaning per URL shape.
    path: 'guides/:slug',
    loadComponent: () => import('./pages/guides/guide-page.component').then(m => m.GuidePageComponent)
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

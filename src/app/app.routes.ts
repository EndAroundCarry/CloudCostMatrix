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
    path: '**',
    redirectTo: ''
  }
];

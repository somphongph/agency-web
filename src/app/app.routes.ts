import { Routes } from '@angular/router';

import { DashboardService } from './dashboard/dashboard.service';

export const routes: Routes = [
  {
    path: '',
    title: 'Agency Dashboard',
    // Route-level provider: the service (and its 5s timer) is destroyed on leaving the page.
    providers: [DashboardService],
    loadComponent: () => import('./dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  { path: '**', redirectTo: '' },
];

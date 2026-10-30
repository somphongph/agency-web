import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';

import { DashboardService } from './dashboard.service';
import { DashboardTable } from './dashboard-table';

@Component({
  selector: 'app-dashboard-page',
  imports: [DashboardTable, DatePipe],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly dashboardService = inject(DashboardService);

  protected readonly data = this.dashboardService.data;
  protected readonly lastUpdated = this.dashboardService.lastUpdated;
  protected readonly isInitialLoading = this.dashboardService.isInitialLoading;
  protected readonly isRefreshing = this.dashboardService.isRefreshing;
  protected readonly error = this.dashboardService.error;
  protected readonly hasFatalError = this.dashboardService.hasFatalError;

  protected readonly rows = computed(() => {
    const dashboard = this.data();
    return dashboard ? [...dashboard.regions, dashboard.overall] : [];
  });

  constructor() {
    this.dashboardService.start();
  }

  protected retry(): void {
    this.dashboardService.refreshNow();
  }
}

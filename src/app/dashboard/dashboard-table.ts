import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import {
  DashboardColumn,
  PeriodKey,
  RegionRow,
  StatusKey,
  StatusGroupMeta,
} from './dashboard.models';

const GROUPS: StatusKey[] = ['submit', 'approved', 'pending'];
const PERIODS: PeriodKey[] = ['daily', 'mtd', 'ytd'];
const PERIOD_LABELS: Record<PeriodKey, string> = { daily: 'DAILY', mtd: 'MTD', ytd: 'YTD' };

@Component({
  selector: 'app-dashboard-table',
  imports: [DecimalPipe],
  templateUrl: './dashboard-table.html',
  styleUrl: './dashboard-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardTable {
  readonly rows = input.required<RegionRow[]>();
  readonly statusGroups = input.required<Record<StatusKey, StatusGroupMeta>>();

  protected readonly groups = GROUPS;
  protected readonly periodLabels = PERIOD_LABELS;
  protected readonly columns: DashboardColumn[] = GROUPS.flatMap((group) =>
    PERIODS.map((period) => ({ group, period })),
  );
  protected readonly groupColumns = computed(() => GROUPS.length * PERIODS.length * 2);
}

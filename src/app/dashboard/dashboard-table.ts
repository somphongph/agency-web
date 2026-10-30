import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
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
const METRICS = ['cases', 'anp'] as const;

/** How long a changed cell stays highlighted; matches the CSS animation. */
export const FLASH_MS = 900;

export type FlashDirection = 'up' | 'down';
type MetricKey = (typeof METRICS)[number];

function flashKey(
  region: string,
  group: StatusKey,
  period: PeriodKey,
  metric: MetricKey,
): string {
  return `${region}|${group}|${period}|${metric}`;
}

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

  /** Cells whose value changed in the latest snapshot, with the direction of the move. */
  private readonly flashed = signal<ReadonlyMap<string, FlashDirection>>(new Map());
  private readonly previous = new Map<string, number>();
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Compare every snapshot with the previous one so only real changes blink.
    effect(() => {
      const changed = this.diff(this.rows());
      this.flashed.set(changed);
      if (changed.size > 0) {
        this.scheduleReset();
      }
    });

    destroyRef.onDestroy(() => this.clearResetTimer());
  }

  protected flash(
    row: RegionRow,
    column: DashboardColumn,
    metric: MetricKey,
  ): FlashDirection | null {
    return this.flashed().get(flashKey(row.region, column.group, column.period, metric)) ?? null;
  }

  /** @returns the cells that changed since the previous snapshot, keyed by cell + metric. */
  private diff(rows: RegionRow[]): ReadonlyMap<string, FlashDirection> {
    const changed = new Map<string, FlashDirection>();

    for (const row of rows) {
      for (const group of GROUPS) {
        for (const period of PERIODS) {
          for (const metric of METRICS) {
            const key = flashKey(row.region, group, period, metric);
            const value = row[group][period][metric];
            const previous = this.previous.get(key);
            if (previous !== undefined && previous !== value) {
              changed.set(key, value > previous ? 'up' : 'down');
            }
            this.previous.set(key, value);
          }
        }
      }
    }

    return changed;
  }

  private scheduleReset(): void {
    this.clearResetTimer();
    this.resetTimer = setTimeout(() => this.flashed.set(new Map()), FLASH_MS);
  }

  private clearResetTimer(): void {
    if (this.resetTimer !== null) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }
}

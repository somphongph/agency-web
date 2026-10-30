import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  exhaustMap,
  finalize,
  map,
  merge,
  tap,
  timer,
} from 'rxjs';

import { DashboardResponse } from './dashboard.models';

export const REFRESH_INTERVAL_MS = 5_000;
export const DASHBOARD_ENDPOINT = '/api/v1/dashboard';

/**
 * Owns dashboard state and the 5 second refresh loop.
 *
 * Provided at route level (see app.routes.ts) so Angular destroys it — and with it the
 * timer — as soon as the user leaves the dashboard.
 */
@Injectable()
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  private readonly dataSignal = signal<DashboardResponse | null>(null);
  private readonly lastUpdatedSignal = signal<Date | null>(null);
  private readonly initialLoadingSignal = signal(true);
  private readonly refreshingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly manualRefresh$ = new Subject<void>();

  readonly data = this.dataSignal.asReadonly();
  readonly lastUpdated = this.lastUpdatedSignal.asReadonly();
  readonly isInitialLoading = this.initialLoadingSignal.asReadonly();
  readonly isRefreshing = this.refreshingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** True when the very first request already failed: no table to keep on screen. */
  readonly hasFatalError = computed(
    () => this.dataSignal() === null && !this.initialLoadingSignal() && this.errorSignal() !== null,
  );

  private started = false;

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    const trigger$ = merge(timer(0, REFRESH_INTERVAL_MS), this.manualRefresh$.pipe(map(() => 0)));
    trigger$
      .pipe(
        exhaustMap(() => this.load()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /** Used by the "try again" button after a first-load failure. */
  refreshNow(): void {
    this.manualRefresh$.next();
  }

  private load(): Observable<void> {
    this.refreshingSignal.set(true);

    return this.http.get<DashboardResponse>(DASHBOARD_ENDPOINT).pipe(
      tap((response) => {
        this.dataSignal.set(response);
        this.lastUpdatedSignal.set(new Date(response.updatedAt));
        this.errorSignal.set(null);
        this.initialLoadingSignal.set(false);
      }),
      catchError((error: unknown) => {
        // Keep the last successful data and the last successful timestamp.
        this.errorSignal.set(describeError(error));
        this.initialLoadingSignal.set(false);
        return EMPTY;
      }),
      finalize(() => this.refreshingSignal.set(false)),
      map(() => undefined),
    );
  }
}

function describeError(error: unknown): string {
  const status = (error as { status?: number } | null)?.status;
  return status
    ? `อัปเดตข้อมูลไม่สำเร็จ (HTTP ${status}) — ระบบจะลองใหม่อัตโนมัติทุก 5 วินาที`
    : 'อัปเดตข้อมูลไม่สำเร็จ — ระบบจะลองใหม่อัตโนมัติทุก 5 วินาที';
}

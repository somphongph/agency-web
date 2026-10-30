import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { EMPTY, catchError, finalize, tap } from 'rxjs';

import { ApiResponse, DashboardResponse } from './dashboard.models';
import {
  DASHBOARD_STREAM_FACTORY,
  DashboardStream,
  DashboardStreamHandlers,
} from './dashboard.stream';

export const DASHBOARD_STREAM_ENDPOINT = '/api/v1/dashboard/stream';
export const DASHBOARD_REFRESH_ENDPOINT = '/api/v1/dashboard/refresh';

/**
 * Owns dashboard state and the live connection.
 *
 * The data is pushed by the backend over Server-Sent Events: the stream sends the current
 * snapshot as soon as it opens, so no initial JSON call is needed. The only client-initiated
 * request is the explicit "new data" action, which asks the backend to randomize and push a
 * new snapshot to every connected browser.
 *
 * Provided at route level (see app.routes.ts) so Angular destroys it — and with it the
 * connection — as soon as the user leaves the dashboard.
 */
@Injectable()
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly streamFactory = inject(DASHBOARD_STREAM_FACTORY);

  private readonly dataSignal = signal<DashboardResponse | null>(null);
  private readonly lastUpdatedSignal = signal<Date | null>(null);
  private readonly initialLoadingSignal = signal(true);
  private readonly refreshingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly data = this.dataSignal.asReadonly();
  readonly lastUpdated = this.lastUpdatedSignal.asReadonly();
  readonly isInitialLoading = this.initialLoadingSignal.asReadonly();
  readonly isRefreshing = this.refreshingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** True when the very first payload never arrived: no table to keep on screen. */
  readonly hasFatalError = computed(
    () => this.dataSignal() === null && !this.initialLoadingSignal() && this.errorSignal() !== null,
  );

  private stream: DashboardStream | null = null;
  private started = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.closeStream());
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.connect();
  }

  /** Retry button: drop the dead connection and open a new one. */
  reconnect(): void {
    this.closeStream();
    this.errorSignal.set(null);
    this.initialLoadingSignal.set(true);
    this.connect();
  }

  /** Asks the backend for a fresh random dataset; it is pushed back over the stream. */
  requestNewData(): void {
    if (this.refreshingSignal()) {
      return;
    }
    this.refreshingSignal.set(true);

    this.http
      .post<ApiResponse<DashboardResponse>>(DASHBOARD_REFRESH_ENDPOINT, null)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((envelope) => this.apply(envelope)),
        catchError((error: unknown) => {
          this.errorSignal.set(describeError(error));
          return EMPTY;
        }),
        finalize(() => this.refreshingSignal.set(false)),
      )
      .subscribe();
  }

  private connect(): void {
    this.stream = this.streamFactory(DASHBOARD_STREAM_ENDPOINT, this.handlers());
  }

  private handlers(): DashboardStreamHandlers {
    return {
      onSnapshot: (envelope) => this.apply(envelope),
      onError: () => {
        // EventSource keeps reconnecting; keep the last good table and say so.
        this.errorSignal.set(
          'Lost the live connection — reconnecting automatically. Showing the last data received.',
        );
        this.initialLoadingSignal.set(false);
      },
    };
  }

  private apply(envelope: ApiResponse<DashboardResponse>): void {
    if (!envelope.success || envelope.data == null) {
      this.errorSignal.set(envelope.message || 'Unexpected response envelope');
      this.initialLoadingSignal.set(false);
      return;
    }

    this.dataSignal.set(envelope.data);
    this.lastUpdatedSignal.set(new Date(envelope.data.updatedAt));
    this.errorSignal.set(null);
    this.initialLoadingSignal.set(false);
  }

  private closeStream(): void {
    this.stream?.close();
    this.stream = null;
  }
}

function describeError(error: unknown): string {
  const status = (error as { status?: number } | null)?.status;
  return status
    ? `Could not request new data (HTTP ${status}) — try again.`
    : 'Could not request new data — try again.';
}

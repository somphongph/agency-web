import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { ApiResponse, DashboardResponse } from './dashboard.models';
import {
  DASHBOARD_STREAM_FACTORY,
  DashboardStream,
  DashboardStreamHandlers,
} from './dashboard.stream';

export const DASHBOARD_STREAM_ENDPOINT = '/api/v1/dashboard/stream';

/**
 * Owns dashboard state and the live connection.
 *
 * The data is pushed by the backend over Server-Sent Events: the stream sends the current
 * snapshot as soon as it opens, and every refresh (triggered from outside the UI, e.g. by an
 * operator or a scheduler) is pushed to all connected browsers.
 *
 * Provided at route level (see app.routes.ts) so Angular destroys it — and with it the
 * connection — as soon as the user leaves the dashboard.
 */
@Injectable()
export class DashboardService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly streamFactory = inject(DASHBOARD_STREAM_FACTORY);

  private readonly dataSignal = signal<DashboardResponse | null>(null);
  private readonly lastUpdatedSignal = signal<Date | null>(null);
  private readonly initialLoadingSignal = signal(true);
  private readonly errorSignal = signal<string | null>(null);

  readonly data = this.dataSignal.asReadonly();
  readonly lastUpdated = this.lastUpdatedSignal.asReadonly();
  readonly isInitialLoading = this.initialLoadingSignal.asReadonly();
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

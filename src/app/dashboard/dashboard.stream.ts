import { InjectionToken } from '@angular/core';

import { ApiResponse, DashboardResponse } from './dashboard.models';

/** Minimal surface of the live connection, so tests can substitute it. */
export interface DashboardStream {
  close(): void;
}

export interface DashboardStreamHandlers {
  /** A snapshot arrived (initial snapshot included). */
  onSnapshot: (envelope: ApiResponse<DashboardResponse>) => void;
  /** The connection dropped. EventSource reconnects on its own. */
  onError: () => void;
}

export type DashboardStreamFactory = (
  url: string,
  handlers: DashboardStreamHandlers,
) => DashboardStream;

/** Server-sent event name used by the backend (`SseEmitter.event().name("dashboard")`). */
export const DASHBOARD_EVENT_NAME = 'dashboard';

/**
 * Wraps `EventSource`. EventSource is not available in jsdom, and the tests need a
 * controllable connection, so the service never touches the browser API directly.
 */
export const DASHBOARD_STREAM_FACTORY = new InjectionToken<DashboardStreamFactory>(
  'DASHBOARD_STREAM_FACTORY',
  {
    providedIn: 'root',
    factory: (): DashboardStreamFactory => (url, handlers) => {
      const source = new EventSource(url);
      const onSnapshot = (event: MessageEvent<string>) => {
        try {
          handlers.onSnapshot(JSON.parse(event.data) as ApiResponse<DashboardResponse>);
        } catch {
          handlers.onError();
        }
      };
      source.addEventListener(DASHBOARD_EVENT_NAME, onSnapshot as EventListener);
      source.onerror = () => handlers.onError();

      return {
        close: () => {
          source.removeEventListener(DASHBOARD_EVENT_NAME, onSnapshot as EventListener);
          source.close();
        },
      };
    },
  },
);

import { ApiResponse, DashboardResponse } from '../dashboard.models';
import {
  DashboardStream,
  DashboardStreamFactory,
  DashboardStreamHandlers,
} from '../dashboard.stream';

/**
 * Stand-in for the browser's EventSource: the test decides when a snapshot (or a broken
 * connection) arrives, and can assert that the service closed the connection.
 */
export class FakeDashboardStream implements DashboardStream {
  closed = false;

  constructor(readonly handlers: DashboardStreamHandlers) {}

  emit(envelope: ApiResponse<DashboardResponse>): void {
    this.handlers.onSnapshot(envelope);
  }

  fail(): void {
    this.handlers.onError();
  }

  close(): void {
    this.closed = true;
  }
}

export class FakeDashboardStreamFactory {
  readonly streams: FakeDashboardStream[] = [];
  readonly urls: string[] = [];

  readonly factory: DashboardStreamFactory = (url, handlers) => {
    this.urls.push(url);
    const stream = new FakeDashboardStream(handlers);
    this.streams.push(stream);
    return stream;
  };

  get latest(): FakeDashboardStream {
    const stream = this.streams.at(-1);
    if (!stream) {
      throw new Error('The service never opened a stream');
    }
    return stream;
  }
}

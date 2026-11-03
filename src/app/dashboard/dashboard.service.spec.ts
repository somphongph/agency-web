import { TestBed } from '@angular/core/testing';

import { DASHBOARD_STREAM_ENDPOINT, DashboardService } from './dashboard.service';
import { DASHBOARD_STREAM_FACTORY } from './dashboard.stream';
import { sampleDashboard, sampleEnvelope, sampleErrorEnvelope } from './dashboard.fixture';
import { FakeDashboardStreamFactory } from './testing/fake-dashboard-stream';

describe('DashboardService', () => {
  let service: DashboardService;
  let streams: FakeDashboardStreamFactory;

  beforeEach(() => {
    streams = new FakeDashboardStreamFactory();
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        { provide: DASHBOARD_STREAM_FACTORY, useValue: streams.factory },
      ],
    });
    service = TestBed.inject(DashboardService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('opens the SSE stream on start', () => {
    service.start();
    service.start();

    expect(streams.streams).toHaveLength(1);
    expect(streams.urls).toEqual([DASHBOARD_STREAM_ENDPOINT]);
  });

  it('applies the pushed snapshot and its Bangkok timestamp', () => {
    service.start();
    expect(service.isInitialLoading()).toBe(true);

    streams.latest.emit(sampleEnvelope());

    expect(service.isInitialLoading()).toBe(false);
    expect(service.data()?.regions).toHaveLength(8);
    expect(service.data()?.overall.region).toBe('OVERALL');
    expect(service.lastUpdated()?.toISOString()).toBe('2026-10-30T06:45:02.000Z');
    expect(service.error()).toBeNull();
  });

  it('treats a success:false envelope as a failed load', () => {
    service.start();

    streams.latest.emit(sampleErrorEnvelope());

    expect(service.data()).toBeNull();
    expect(service.isInitialLoading()).toBe(false);
    expect(service.hasFatalError()).toBe(true);
    expect(service.error()).toBe('Internal server error.');
  });

  it('keeps the last good data when the connection drops, then recovers', () => {
    service.start();
    const first = sampleDashboard();
    streams.latest.emit(sampleEnvelope(first));

    streams.latest.fail();

    expect(service.data()).toEqual(first);
    expect(service.error()).toContain('Lost the live connection');
    expect(service.hasFatalError()).toBe(false);

    const recovered = sampleDashboard({ updatedAt: '2026-10-30T13:46:00+07:00' });
    streams.latest.emit(sampleEnvelope(recovered));

    expect(service.error()).toBeNull();
    expect(service.data()).toEqual(recovered);
    expect(service.lastUpdated()?.toISOString()).toBe('2026-10-30T06:46:00.000Z');
  });

  it('applies a snapshot that was pushed after an external refresh', () => {
    service.start();
    streams.latest.emit(sampleEnvelope());
    const before = service.data();

    streams.latest.emit(sampleEnvelope(sampleDashboard({ updatedAt: '2026-10-30T14:00:00+07:00' })));

    expect(service.data()).not.toEqual(before);
    expect(service.lastUpdated()?.toISOString()).toBe('2026-10-30T07:00:00.000Z');
    expect(service.error()).toBeNull();
  });

  it('reconnects with a new stream and shows the loading state again', () => {
    service.start();
    streams.latest.fail();
    expect(service.hasFatalError()).toBe(true);

    service.reconnect();

    expect(streams.streams[0].closed).toBe(true);
    expect(streams.streams).toHaveLength(2);
    expect(service.isInitialLoading()).toBe(true);
    expect(service.error()).toBeNull();

    streams.latest.emit(sampleEnvelope());
    expect(service.hasFatalError()).toBe(false);
    expect(service.data()?.regions).toHaveLength(8);
  });

  it('closes the stream when its injector is destroyed', () => {
    service.start();
    const stream = streams.latest;

    TestBed.resetTestingModule();

    expect(stream.closed).toBe(true);
  });
});

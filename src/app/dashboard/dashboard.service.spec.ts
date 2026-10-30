import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DASHBOARD_ENDPOINT, DashboardService, REFRESH_INTERVAL_MS } from './dashboard.service';
import { sampleDashboard, sampleEnvelope, sampleErrorEnvelope } from './dashboard.fixture';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [DashboardService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('loads once on start and exposes the parsed payload', () => {
    service.start();
    vi.advanceTimersByTime(0);

    const request = httpMock.expectOne(DASHBOARD_ENDPOINT);
    expect(request.request.method).toBe('GET');
    expect(service.isInitialLoading()).toBe(true);

    request.flush(sampleEnvelope());

    expect(service.isInitialLoading()).toBe(false);
    expect(service.data()?.regions).toHaveLength(8);
    expect(service.data()?.overall.region).toBe('OVERALL');
    expect(service.lastUpdated()?.toISOString()).toBe('2026-10-30T06:45:02.000Z');
    expect(service.error()).toBeNull();
  });

  it('treats a success:false envelope as a failed load', () => {
    service.start();
    vi.advanceTimersByTime(0);

    httpMock.expectOne(DASHBOARD_ENDPOINT).flush(sampleErrorEnvelope());

    expect(service.data()).toBeNull();
    expect(service.isInitialLoading()).toBe(false);
    expect(service.hasFatalError()).toBe(true);
    expect(service.error()).toContain('Failed to update the data');
  });

  it(`requests fresh data every ${REFRESH_INTERVAL_MS} ms`, () => {
    service.start();
    vi.advanceTimersByTime(0);
    httpMock.expectOne(DASHBOARD_ENDPOINT).flush(sampleEnvelope());

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS - 1);
    httpMock.expectNone(DASHBOARD_ENDPOINT);

    vi.advanceTimersByTime(1);
    httpMock
      .expectOne(DASHBOARD_ENDPOINT)
      .flush(sampleEnvelope(sampleDashboard({ updatedAt: '2026-10-30T13:45:07+07:00' })));

    expect(service.lastUpdated()?.toISOString()).toBe('2026-10-30T06:45:07.000Z');
  });

  it('keeps the last good data and timestamp when a refresh fails, then recovers', () => {
    const first = sampleDashboard();
    service.start();
    vi.advanceTimersByTime(0);
    httpMock.expectOne(DASHBOARD_ENDPOINT).flush(sampleEnvelope(first));

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    httpMock
      .expectOne(DASHBOARD_ENDPOINT)
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(service.error()).toContain('HTTP 500');
    expect(service.data()).toEqual(first);
    expect(service.lastUpdated()?.toISOString()).toBe('2026-10-30T06:45:02.000Z');
    expect(service.isInitialLoading()).toBe(false);

    const recovered = sampleDashboard({ updatedAt: '2026-10-30T13:46:00+07:00' });
    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    httpMock.expectOne(DASHBOARD_ENDPOINT).flush(sampleEnvelope(recovered));

    expect(service.error()).toBeNull();
    expect(service.data()).toEqual(recovered);
    expect(service.lastUpdated()?.toISOString()).toBe('2026-10-30T06:46:00.000Z');
  });

  it('does not stack requests when the API is slower than the refresh interval', () => {
    service.start();
    vi.advanceTimersByTime(0);
    const slowRequest = httpMock.expectOne(DASHBOARD_ENDPOINT);

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    httpMock.expectNone(DASHBOARD_ENDPOINT);

    slowRequest.flush(sampleEnvelope());
    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    httpMock.expectOne(DASHBOARD_ENDPOINT).flush(sampleEnvelope());
  });

  it('stops polling when its injector is destroyed', () => {
    service.start();
    vi.advanceTimersByTime(0);
    httpMock.expectOne(DASHBOARD_ENDPOINT).flush(sampleEnvelope());

    TestBed.resetTestingModule();
    vi.advanceTimersByTime(REFRESH_INTERVAL_MS * 4);

    httpMock.expectNone(DASHBOARD_ENDPOINT);
  });
});

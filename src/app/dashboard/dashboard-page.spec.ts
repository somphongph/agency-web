import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DASHBOARD_ENDPOINT, DashboardService, REFRESH_INTERVAL_MS } from './dashboard.service';
import { DashboardPage } from './dashboard-page';
import { sampleDashboard } from './dashboard.fixture';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      // Mirrors the route-level provider from app.routes.ts.
      .overrideComponent(DashboardPage, { set: { providers: [DashboardService] } })
      .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    httpMock.verify();
    vi.useRealTimers();
  });

  function loadFirstDashboard(): void {
    vi.advanceTimersByTime(0);
    httpMock.expectOne(DASHBOARD_ENDPOINT).flush(sampleDashboard());
    fixture.detectChanges();
  }

  it('shows a loading state before the first response arrives', () => {
    expect(el.querySelector('.loading')).not.toBeNull();
    expect(el.querySelector('app-dashboard-table')).toBeNull();
    expect(el.querySelector('.stamp--date')?.textContent?.trim()).toBe('--/--/----');
    expect(el.querySelector('.stamp--time')?.textContent?.trim()).toBe('--:--:--');
  });

  it('renders the table and the Bangkok update timestamp after loading', () => {
    loadFirstDashboard();

    expect(el.querySelector('.loading')).toBeNull();
    expect(el.querySelector('app-dashboard-table')).not.toBeNull();
    expect(el.textContent).toContain('BKK-A');
    expect(el.textContent).toContain('OVERALL');
    expect(el.querySelector('.stamp--date')?.textContent?.trim()).toBe('30/10/2026');
    expect(el.querySelector('.stamp--time')?.textContent?.trim()).toBe('13:45:02');
  });

  it('shows a warning but keeps the last good table when a refresh fails', () => {
    loadFirstDashboard();

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    httpMock
      .expectOne(DASHBOARD_ENDPOINT)
      .flush('down', { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();

    const banner = el.querySelector('.banner');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('HTTP 503');
    expect(banner?.textContent).toContain('ข้อมูลล่าสุด ณ 13:45:02');
    expect(el.querySelector('app-dashboard-table')).not.toBeNull();
    expect(el.querySelector('.stamp--time')?.textContent?.trim()).toBe('13:45:02');
  });

  it('clears the warning and refreshes itself once the API is back', () => {
    loadFirstDashboard();

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    httpMock
      .expectOne(DASHBOARD_ENDPOINT)
      .flush('down', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(el.querySelector('.banner')).not.toBeNull();

    vi.advanceTimersByTime(REFRESH_INTERVAL_MS);
    httpMock
      .expectOne(DASHBOARD_ENDPOINT)
      .flush(sampleDashboard({ updatedAt: '2026-10-30T13:46:00+07:00' }));
    fixture.detectChanges();

    expect(el.querySelector('.banner')).toBeNull();
    expect(el.querySelector('.stamp--time')?.textContent?.trim()).toBe('13:46:00');
  });

  it('offers a retry when the very first request fails', () => {
    vi.advanceTimersByTime(0);
    httpMock
      .expectOne(DASHBOARD_ENDPOINT)
      .flush('down', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.querySelector('.fatal')).not.toBeNull();
    expect(el.querySelector('app-dashboard-table')).toBeNull();

    const retryButton = el.querySelector<HTMLButtonElement>('button.retry');
    expect(retryButton).not.toBeNull();
    retryButton?.click();

    httpMock.expectOne(DASHBOARD_ENDPOINT).flush(sampleDashboard());
    fixture.detectChanges();

    expect(el.querySelector('.fatal')).toBeNull();
    expect(el.querySelector('app-dashboard-table')).not.toBeNull();
  });

  it('stops polling after the page is destroyed', () => {
    loadFirstDashboard();

    fixture.destroy();
    vi.advanceTimersByTime(REFRESH_INTERVAL_MS * 4);

    httpMock.expectNone(DASHBOARD_ENDPOINT);
  });
});

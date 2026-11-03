import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardService } from './dashboard.service';
import { DASHBOARD_STREAM_FACTORY } from './dashboard.stream';
import { DashboardPage } from './dashboard-page';
import { sampleDashboard, sampleEnvelope } from './dashboard.fixture';
import { FakeDashboardStreamFactory } from './testing/fake-dashboard-stream';

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let streams: FakeDashboardStreamFactory;
  let el: HTMLElement;

  beforeEach(async () => {
    streams = new FakeDashboardStreamFactory();
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [{ provide: DASHBOARD_STREAM_FACTORY, useValue: streams.factory }],
    })
      // Mirrors the route-level provider from app.routes.ts.
      .overrideComponent(DashboardPage, { set: { providers: [DashboardService] } })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  function push(envelope = sampleEnvelope()): void {
    streams.latest.emit(envelope);
    fixture.detectChanges();
  }

  it('shows a loading state before the first pushed snapshot', () => {
    expect(el.querySelector('.loading')).not.toBeNull();
    expect(el.querySelector('app-dashboard-table')).toBeNull();
    expect(el.querySelector('.stamp--date')?.textContent?.trim()).toBe('--/--/----');
    expect(el.querySelector('.stamp--time')?.textContent?.trim()).toBe('--:--:--');
  });

  it('renders the table and the Bangkok update timestamp after the first push', () => {
    push();

    expect(el.querySelector('.loading')).toBeNull();
    expect(el.querySelector('app-dashboard-table')).not.toBeNull();
    expect(el.textContent).toContain('BKK-A');
    expect(el.textContent).toContain('OVERALL');
    expect(el.querySelector('.stamp--date')?.textContent?.trim()).toBe('30/10/2026');
    expect(el.querySelector('.stamp--time')?.textContent?.trim()).toBe('13:45:02');
  });

  it('shows a warning but keeps the last good table when the connection drops', () => {
    push();

    streams.latest.fail();
    fixture.detectChanges();

    const banner = el.querySelector('.banner');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Lost the live connection');
    expect(banner?.textContent).toContain('Last updated at 13:45:02');
    expect(el.querySelector('app-dashboard-table')).not.toBeNull();
    expect(el.querySelector('.stamp--time')?.textContent?.trim()).toBe('13:45:02');
  });

  it('clears the warning as soon as the next snapshot arrives', () => {
    push();

    streams.latest.fail();
    fixture.detectChanges();
    expect(el.querySelector('.banner')).not.toBeNull();

    push(sampleEnvelope(sampleDashboard({ updatedAt: '2026-10-30T13:46:00+07:00' })));

    expect(el.querySelector('.banner')).toBeNull();
    expect(el.querySelector('.stamp--time')?.textContent?.trim()).toBe('13:46:00');
  });

  it('offers a retry that opens a fresh stream when the very first connect fails', () => {
    streams.latest.fail();
    fixture.detectChanges();

    expect(el.querySelector('.fatal')).not.toBeNull();
    expect(el.querySelector('app-dashboard-table')).toBeNull();

    const retryButton = el.querySelector<HTMLButtonElement>('button.retry');
    expect(retryButton).not.toBeNull();
    expect(retryButton?.textContent?.trim()).toBe('Retry');
    retryButton?.click();
    fixture.detectChanges();

    expect(streams.streams).toHaveLength(2);
    push();

    expect(el.querySelector('.fatal')).toBeNull();
    expect(el.querySelector('app-dashboard-table')).not.toBeNull();
  });

  it('does not render a control for pushing data (the backend owns refreshes)', () => {
    push();

    expect(el.querySelector('button.push')).toBeNull();
    expect(el.textContent).not.toContain('New data');
  });

  it('closes the connection after the page is destroyed', () => {
    push();

    fixture.destroy();

    expect(streams.latest.closed).toBe(true);
  });
});

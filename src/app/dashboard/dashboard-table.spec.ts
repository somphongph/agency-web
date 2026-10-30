import { TestBed } from '@angular/core/testing';

import { DashboardTable } from './dashboard-table';
import { RegionRow, StatusGroupMeta } from './dashboard.models';
import { STATUS_GROUPS, sampleDashboard, sampleRegion } from './dashboard.fixture';

describe('DashboardTable', () => {
  function render(
    rows: RegionRow[],
    statusGroups: Record<string, StatusGroupMeta> = STATUS_GROUPS,
  ): HTMLElement {
    const fixture = TestBed.createComponent(DashboardTable);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('statusGroups', statusGroups);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders every region plus the overall row with 18 data cells each', () => {
    const dashboard = sampleDashboard();
    const el = render([...dashboard.regions, dashboard.overall]);

    const rows = el.querySelectorAll('.data-row');
    expect(rows).toHaveLength(9);
    expect(el.querySelectorAll('.data-row')[8].classList).toContain('data-row--overall');
    expect(el.textContent).toContain('BKK-A');
    expect(el.textContent).toContain('Northeast');
    expect(el.querySelectorAll('.data-row')[0].querySelectorAll('.case-cell')).toHaveLength(9);
    expect(el.querySelectorAll('.data-row')[0].querySelectorAll('.anp-cell')).toHaveLength(9);
  });

  it('shows ANP with exactly two decimals and the mb unit, and groups case digits', () => {
    const row: RegionRow = {
      ...sampleRegion('BKK-A', 1),
      submit: {
        daily: { cases: 7, anp: 12.5 },
        mtd: { cases: 1234, anp: 5678.9 },
        ytd: { cases: 12345, anp: 98765.4 },
      },
    };
    const el = render([row]);
    const cells = Array.from(el.querySelectorAll<HTMLElement>('.anp-cell')).map((cell) =>
      cell.textContent?.replace(/\s+/g, ' ').trim(),
    );
    const cases = Array.from(el.querySelectorAll<HTMLElement>('.case-cell')).map((cell) =>
      cell.textContent?.trim(),
    );

    expect(cells[0]).toBe('12.50 mb');
    expect(cells[1]).toBe('5,678.90 mb');
    expect(cells[2]).toBe('98,765.40 mb');
    expect(cases[0]).toBe('7');
    expect(cases[1]).toBe('1,234');
    expect(cases[2]).toBe('12,345');
  });

  it('renders the status group headers with their status codes', () => {
    const el = render([sampleRegion('BKK-A')]);

    expect(el.querySelectorAll('.group-head')).toHaveLength(3);
    expect(el.textContent).toContain('SUBMIT');
    expect(el.textContent).toContain('Status 00,01,02');
    expect(el.textContent).toContain('APPROVED');
    expect(el.textContent).toContain('Status 40');
    expect(el.textContent).toContain('PENDING');
    expect(el.textContent).toContain('Status 20/21/29/30/31/33');
    expect(el.querySelectorAll('.period-head')).toHaveLength(9);
    expect(el.querySelectorAll('.metric-head')).toHaveLength(18);
  });
});

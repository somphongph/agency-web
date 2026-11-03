import {
  ApiResponse,
  DashboardResponse,
  Metric,
  PeriodMetrics,
  RegionRow,
  StatusGroupMeta,
} from './dashboard.models';

export const DASHBOARD_REGIONS = [
  'BKK-A',
  'BKK-B',
  'Central',
  'West',
  'South',
  'North',
  'Northeast',
  'Other',
];

export const STATUS_GROUPS: Record<'submit' | 'approved' | 'pending', StatusGroupMeta> = {
  submit: { label: 'SUBMIT', statusCodes: 'Status 00,01,02' },
  approved: { label: 'APPROVED', statusCodes: 'Status 40' },
  pending: { label: 'PENDING', statusCodes: 'Status 20/21/29/30/31/33' },
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function metric(cases: number, anp: number): Metric {
  return { cases, anp: round2(anp) };
}

function periodMetrics(seed: number): PeriodMetrics {
  return {
    daily: metric(seed * 2, seed * 10.5),
    mtd: metric(seed * 20, seed * 100.25),
    ytd: metric(seed * 200, seed * 1000.5),
  };
}

export function sampleRegion(region: string, seed = 1): RegionRow {
  return {
    region,
    submit: periodMetrics(seed),
    approved: periodMetrics(seed + 1),
    pending: periodMetrics(seed + 2),
  };
}

export function sampleDashboard(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    updatedAt: '2026-10-30T13:45:02+07:00',
    statusGroups: STATUS_GROUPS,
    regions: DASHBOARD_REGIONS.map((region, index) => sampleRegion(region, index + 1)),
    overall: sampleRegion('OVERALL', 20),
    ...overrides,
  };
}

/** Success payload exactly as it arrives on the wire, envelope included. */
export function sampleEnvelope(
  data: DashboardResponse = sampleDashboard(),
): ApiResponse<DashboardResponse> {
  return { success: true, type: 'success', message: 'Successful.', data };
}

/** What the backend returns when it fails, e.g. the 500 from ApiExceptionHandler. */
export function sampleErrorEnvelope(): ApiResponse<DashboardResponse> {
  return { success: false, type: 'internal_error', message: 'Internal server error.', data: null };
}

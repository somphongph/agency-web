export type StatusKey = 'submit' | 'approved' | 'pending';
export type PeriodKey = 'daily' | 'mtd' | 'ytd';

export interface Metric {
  cases: number;
  anp: number;
}

export interface PeriodMetrics {
  daily: Metric;
  mtd: Metric;
  ytd: Metric;
}

export interface RegionRow {
  region: string;
  submit: PeriodMetrics;
  approved: PeriodMetrics;
  pending: PeriodMetrics;
}

export interface StatusGroupMeta {
  label: string;
  statusCodes: string;
}

export interface DashboardResponse {
  updatedAt: string;
  statusGroups: Record<StatusKey, StatusGroupMeta>;
  regions: RegionRow[];
  overall: RegionRow;
}

/**
 * Envelope returned by every agency-api endpoint (see `ApiResponse` on the backend):
 * `{ success, type, message, data }`. Errors use the same shape with `success: false`
 * and `data: null`.
 */
export interface ApiResponse<T> {
  success: boolean;
  type: string;
  message: string;
  data: T | null;
}

/** Table column: one status group + one period. Rendered as a Case / ANP pair. */
export interface DashboardColumn {
  group: StatusKey;
  period: PeriodKey;
}

export interface ProviderStat {
  provider: string;
  day: string;
  pass_rate: number | null;
  error_rate: number | null;
  p50_latency_ms: number | null;
  p95_latency_ms: number | null;
  cost_per_correct_usd: number | null;
  call_count: number;
}

export interface TimeseriesRow extends ProviderStat {}

export interface Incident {
  id: string;
  provider: string;
  detected_at: string;
  metric: string;
  baseline: number;
  observed: number;
  delta: number;
  resolved_at: string | null;
}

export interface CategoryStat {
  provider: string;
  category: string;
  day: string;
  pass_rate: number | null;
  call_count: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  providers: () => get<ProviderStat[]>("/api/providers"),
  timeseries: () => get<TimeseriesRow[]>("/api/timeseries"),
  incidents: () => get<Incident[]>("/api/incidents"),
  categories: () => get<CategoryStat[]>("/api/categories"),
};

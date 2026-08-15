import { useCallback, useEffect, useState } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import AsyncPage from "../lib/AsyncPage";
import { api, type TimeseriesRow } from "../lib/apiClient";
import { getProviderColor } from "../lib/chartColors";

type Metric = "pass_rate" | "error_rate" | "p50_latency_ms" | "cost_per_correct_usd";

const METRIC_CONFIG: Record<Metric, { label: string; unit: string; domain?: [number, number] }> = {
  pass_rate:            { label: "Pass Rate",      unit: "%",  domain: [80, 100] },
  error_rate:           { label: "Error Rate",     unit: "%",  domain: [0, 20] },
  p50_latency_ms:       { label: "Latency (p50)",  unit: "ms" },
  cost_per_correct_usd: { label: "Cost / Correct", unit: "$" },
};

interface ChartPoint {
  day: string;
  [provider: string]: number | null | string;
}

function pivot(rows: TimeseriesRow[], metric: Metric): ChartPoint[] {
  const byDay = new Map<string, ChartPoint>();
  for (const row of rows) {
    const d = row.day.slice(0, 10);
    if (!byDay.has(d)) byDay.set(d, { day: d });
    byDay.get(d)![row.provider] = row[metric];
  }
  return Array.from(byDay.values()).sort((a, b) =>
    (a.day as string).localeCompare(b.day as string),
  );
}

function formatDay(d: string) {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PassRateChart() {
  const [rows, setRows] = useState<TimeseriesRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("pass_rate");

  const load = useCallback(() => {
    setErr(null);
    setRows(null);
    api.timeseries().then(setRows).catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(load, [load]);

  return (
    <AsyncPage
      title="Provider Metrics"
      data={rows}
      error={err}
      onRetry={load}
      emptyCheck={(d) => d.length === 0}
      loadingHint="Building metrics timeline…"
      emptyMessage="No timeseries data yet. Results accumulate after each daily probe run."
    >
      {(data) => {
        const providers = Array.from(
          new Set(data.map((r) => r.provider)),
        ).sort();
        const last7 = pivot(data, metric).slice(-7);
        const cfg = METRIC_CONFIG[metric];

        return (
          <Box>
            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={metric}
                onChange={(_, v) => { if (v) setMetric(v); }}
              >
                {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
                  <ToggleButton
                    key={m}
                    value={m}
                    sx={{ textTransform: "none", fontSize: 12 }}
                  >
                    {METRIC_CONFIG[m].label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={last7}
                margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e4e6ea"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatDay}
                  tick={{ fontSize: 11, fill: "#5c5f6a" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e4e6ea" }}
                />
                <YAxis
                  domain={cfg.domain ?? ["auto", "auto"]}
                  unit={cfg.unit}
                  tick={{ fontSize: 11, fill: "#5c5f6a" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(v) => `${v}${cfg.unit}`}
                  labelFormatter={(label) => formatDay(String(label))}
                  contentStyle={{
                    fontSize: 13,
                    border: "1px solid #e4e6ea",
                    borderRadius: 6,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                />
                {providers.map((p, i) => (
                  <Bar
                    key={p}
                    dataKey={p}
                    fill={getProviderColor(p, i)}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1.5, display: "block" }}
            >
              Last 7 days of daily measurements. Toggle metrics above to compare
              pass rate, error rate, latency, or cost.
            </Typography>
          </Box>
        );
      }}
    </AsyncPage>
  );
}

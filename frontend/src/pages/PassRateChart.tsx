import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  LineChart,
  Line,
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

interface ChartPoint {
  day: string;
  [provider: string]: number | null | string;
}

function toChartData(rows: TimeseriesRow[]): ChartPoint[] {
  const byDay = new Map<string, ChartPoint>();
  for (const row of rows) {
    const d = row.day.slice(0, 10);
    if (!byDay.has(d)) byDay.set(d, { day: d });
    byDay.get(d)![row.provider] = row.pass_rate;
  }
  return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
}

export default function PassRateChart() {
  const [rows, setRows] = useState<TimeseriesRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(null);
    setRows(null);
    api.timeseries().then(setRows).catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(load, [load]);

  return (
    <AsyncPage
      title="Pass Rate Over Time"
      data={rows}
      error={err}
      onRetry={load}
      emptyCheck={(d) => d.length === 0}
      emptyMessage="No timeseries data available yet."
    >
      {(data) => {
        const providers = Array.from(
          new Set(data.map((r) => r.provider)),
        ).sort();
        const chartData = toChartData(data);

        return (
          <Box>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e4e6ea"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#5c5f6a" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e4e6ea" }}
                />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: "#5c5f6a" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(v) => `${v}%`}
                  contentStyle={{
                    fontSize: 13,
                    border: "1px solid #e4e6ea",
                    borderRadius: 6,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  iconType="plainline"
                />
                {providers.map((p, i) => (
                  <Line
                    key={p}
                    type="monotone"
                    dataKey={p}
                    name={p}
                    stroke={getProviderColor(p, i)}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 4, strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1.5, display: "block" }}
            >
              Each line shows one provider's daily pass rate. All providers
              shown with equal visual weight.
            </Typography>
          </Box>
        );
      }}
    </AsyncPage>
  );
}

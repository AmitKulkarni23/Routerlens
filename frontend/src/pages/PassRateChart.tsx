import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
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
import { api, type TimeseriesRow } from "../lib/apiClient";

const COLORS = ["#1976d2", "#2e7d32", "#ed6c02", "#7b1fa2"];

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
  const [data, setData] = useState<ChartPoint[] | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.timeseries()
      .then((rows) => {
        const ps = Array.from(new Set(rows.map((r) => r.provider))).sort();
        setProviders(ps);
        setData(toChartData(rows));
      })
      .catch((e: Error) => setErr(e.message));
  }, []);

  if (err) return <Typography color="error">{err}</Typography>;
  if (!data) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Pass Rate Over Time</Typography>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
          {providers.map((p, i) => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <Typography variant="caption" color="text.secondary">
        Each line shows one provider's daily pass rate. All providers shown with equal visual weight — no ranking implied.
      </Typography>
    </Box>
  );
}

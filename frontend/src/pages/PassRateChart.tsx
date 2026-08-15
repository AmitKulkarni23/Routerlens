import { useCallback, useEffect, useState } from "react";
import { Box, Chip, Tooltip as MuiTooltip, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import AsyncPage from "../lib/AsyncPage";
import { api, type TimeseriesRow } from "../lib/apiClient";
import { getProviderColor } from "../lib/chartColors";

interface MetricConfig {
  label: string;
  unit: string;
  domain: [number | string, number | string];
  info: string;
}

const METRICS: Record<string, MetricConfig> = {
  pass_rate: {
    label: "Pass Rate",
    unit: "%",
    domain: [60, 100],
    info: "Percentage of calls where the model returned a correct, mechanically-graded answer. Higher is better.",
  },
  error_rate: {
    label: "Error Rate",
    unit: "%",
    domain: [0, "auto"],
    info: "Percentage of calls that failed at the API level (timeouts, 5xx, rate limits). Lower is better.",
  },
  p50_latency_ms: {
    label: "Latency (p50)",
    unit: "ms",
    domain: ["auto", "auto"],
    info: "Median response time in milliseconds — half of all calls complete faster than this. Lower is better.",
  },
  cost_per_correct_usd: {
    label: "Cost / Correct",
    unit: "$",
    domain: ["auto", "auto"],
    info: "Total spend divided by number of correct answers. Measures cost-effectiveness — lower is better.",
  },
};

interface ChartPoint {
  day: string;
  [provider: string]: number | null | string;
}

function pivot(rows: TimeseriesRow[], metric: string): ChartPoint[] {
  const byDay = new Map<string, ChartPoint>();
  for (const r of rows) {
    const d = r.day.slice(0, 10);
    if (!byDay.has(d)) byDay.set(d, { day: d });
    byDay.get(d)![r.provider] = r[metric as keyof TimeseriesRow] as number | null;
  }
  return Array.from(byDay.values()).sort((a, b) =>
    (a.day as string).localeCompare(b.day as string),
  );
}

function formatDay(d: string) {
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function MetricPanel({
  metric,
  config,
  rows,
  providers,
  hidden,
}: {
  metric: string;
  config: MetricConfig;
  rows: TimeseriesRow[];
  providers: string[];
  hidden: Set<string>;
}) {
  const data = pivot(rows, metric);
  const visible = providers.filter((p) => !hidden.has(p));

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {config.label}
        </Typography>
        <MuiTooltip
          title={config.info}
          arrow
          placement="top"
          slotProps={{
            tooltip: { sx: { maxWidth: 260, fontSize: "0.75rem", lineHeight: 1.5 } },
          }}
        >
          <InfoOutlinedIcon
            sx={{ fontSize: 15, color: "text.disabled", cursor: "help" }}
          />
        </MuiTooltip>
      </Box>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={formatDay}
            tick={{ fontSize: 10, fill: "#999" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={config.domain}
            unit={config.unit}
            tick={{ fontSize: 10, fill: "#999" }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            labelFormatter={(l) => formatDay(String(l))}
            formatter={(v) => `${v}${config.unit}`}
            contentStyle={{
              fontSize: 12,
              border: "1px solid #e4e6ea",
              borderRadius: 6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          />
          {visible.map((p) => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              stroke={getProviderColor(p, providers.indexOf(p))}
              strokeWidth={2}
              dot={false}
              connectNulls
              activeDot={{ r: 3, strokeWidth: 1.5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default function PassRateChart() {
  const [rows, setRows] = useState<TimeseriesRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setErr(null);
    setRows(null);
    api.timeseries().then(setRows).catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(load, [load]);

  const toggle = (provider: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };

  return (
    <AsyncPage
      title="Provider Metrics"
      data={rows}
      error={err}
      onRetry={load}
      emptyCheck={(d) => d.length === 0}
      loadingHint="Building metrics dashboard…"
      emptyMessage="No timeseries data yet. Results accumulate after each daily probe run."
    >
      {(data) => {
        const providers = Array.from(
          new Set(data.map((r) => r.provider)),
        ).sort();

        return (
          <Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              {Object.entries(METRICS).map(([key, config]) => (
                <MetricPanel
                  key={key}
                  metric={key}
                  config={config}
                  rows={data}
                  providers={providers}
                  hidden={hidden}
                />
              ))}
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 1,
                mt: 3,
                flexWrap: "wrap",
              }}
            >
              {providers.map((p, i) => {
                const color = getProviderColor(p, i);
                const isHidden = hidden.has(p);
                return (
                  <Chip
                    key={p}
                    label={p}
                    size="small"
                    clickable
                    onClick={() => toggle(p)}
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      borderWidth: 2,
                      borderStyle: "solid",
                      borderColor: color,
                      bgcolor: isHidden ? "transparent" : color,
                      color: isHidden ? color : "#fff",
                      opacity: isHidden ? 0.5 : 1,
                      transition: "all 0.15s ease",
                      "&:hover": {
                        bgcolor: isHidden ? `${color}18` : color,
                        opacity: 1,
                      },
                    }}
                  />
                );
              })}
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1.5, display: "block", textAlign: "center" }}
            >
              Click a provider to show/hide it across all charts.
            </Typography>
          </Box>
        );
      }}
    </AsyncPage>
  );
}

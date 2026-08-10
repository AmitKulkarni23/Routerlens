import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
} from "@mui/material";
import AsyncPage from "../lib/AsyncPage";
import { api, type ProviderStat } from "../lib/apiClient";
import { getProviderColor } from "../lib/chartColors";

function fmt(v: number | null, decimals = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(decimals);
}

function ProviderCard({
  stat,
  color,
}: {
  stat: ProviderStat;
  color: string;
}) {
  const passRate = stat.pass_rate;
  const isHealthy = passRate != null && passRate >= 80;
  const isDegraded = passRate != null && passRate < 60;

  return (
    <Card
      sx={{
        height: "100%",
        borderTop: `3px solid ${color}`,
        transition: "border-color 0.15s ease-out",
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "text.primary" }}
          >
            {stat.provider}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(stat.day).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </Typography>
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{
              fontSize: "2rem",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: isDegraded
                ? "error.main"
                : isHealthy
                  ? "text.primary"
                  : "warning.main",
            }}
          >
            {passRate != null ? `${fmt(passRate, 1)}%` : "—"}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", mt: 0.5, display: "block" }}
          >
            pass rate
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1.5,
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <MetricCell
            label="Error rate"
            value={stat.error_rate != null ? `${fmt(stat.error_rate)}%` : "—"}
          />
          <MetricCell
            label="Latency p50"
            value={
              stat.p50_latency_ms != null
                ? `${fmt(stat.p50_latency_ms, 0)}ms`
                : "—"
            }
          />
          <MetricCell
            label="Cost / correct"
            value={
              stat.cost_per_correct_usd != null
                ? `$${stat.cost_per_correct_usd}`
                : "—"
            }
          />
          <MetricCell label="Calls" value={String(stat.call_count)} />
        </Box>
      </CardContent>
    </Card>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontSize: "0.6875rem",
          display: "block",
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, color: "text.primary" }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function ProviderOverview() {
  const [stats, setStats] = useState<ProviderStat[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(null);
    setStats(null);
    api.providers().then(setStats).catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(load, [load]);

  return (
    <AsyncPage
      title="Provider Overview"
      data={stats}
      error={err}
      onRetry={load}
      emptyCheck={(d) => d.length === 0}
      emptyMessage="No provider data recorded yet."
    >
      {(data) => (
        <Grid container spacing={2.5}>
          {data.map((s, i) => (
            <Grid key={s.provider} size={{ xs: 12, sm: 6, md: 3 }}>
              <ProviderCard stat={s} color={getProviderColor(s.provider, i)} />
            </Grid>
          ))}
        </Grid>
      )}
    </AsyncPage>
  );
}

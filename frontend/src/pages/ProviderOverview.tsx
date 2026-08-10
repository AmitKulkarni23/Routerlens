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
  index,
}: {
  stat: ProviderStat;
  color: string;
  index: number;
}) {
  const passRate = stat.pass_rate;

  return (
    <Card
      sx={{
        height: "100%",
        opacity: 0,
        animation: "cardIn 0.35s ease-out forwards",
        animationDelay: `${index * 60}ms`,
        "@keyframes cardIn": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        transition: "box-shadow 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
        "&:hover": {
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        },
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: color,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "text.primary", flex: 1 }}
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
              color: "text.primary",
              fontVariantNumeric: "tabular-nums",
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
                ? `$${fmt(stat.cost_per_correct_usd, 4)}`
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
        sx={{
          fontWeight: 500,
          color: "text.primary",
          fontVariantNumeric: "tabular-nums",
        }}
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
      loadingHint="Fetching latest provider measurements…"
      emptyMessage="No probe results yet. The first daily run will populate this view."
    >
      {(data) => (
        <Grid container spacing={2.5}>
          {data.map((s, i) => (
            <Grid key={s.provider} size={{ xs: 12, sm: 6, md: 3 }}>
              <ProviderCard stat={s} color={getProviderColor(s.provider, i)} index={i} />
            </Grid>
          ))}
        </Grid>
      )}
    </AsyncPage>
  );
}

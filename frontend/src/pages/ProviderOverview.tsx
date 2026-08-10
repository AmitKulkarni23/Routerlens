import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
} from "@mui/material";
import { api, type ProviderStat } from "../lib/apiClient";

function fmt(v: number | null, unit = ""): string {
  if (v == null) return "—";
  return `${v}${unit}`;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

function ProviderCard({ stat }: { stat: ProviderStat }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>{stat.provider}</Typography>
        <StatRow label="Pass rate" value={fmt(stat.pass_rate, "%")} />
        <StatRow label="Error rate" value={fmt(stat.error_rate, "%")} />
        <StatRow label="Median latency" value={fmt(stat.p50_latency_ms, " ms")} />
        <StatRow label="Cost / correct" value={stat.cost_per_correct_usd != null ? `$${stat.cost_per_correct_usd}` : "—"} />
        <StatRow label="Calls" value={String(stat.call_count)} />
        <Typography variant="caption" color="text.secondary">
          {new Date(stat.day).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ProviderOverview() {
  const [stats, setStats] = useState<ProviderStat[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.providers().then(setStats).catch((e: Error) => setErr(e.message));
  }, []);

  if (err) return <Typography color="error">{err}</Typography>;
  if (!stats) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Provider Overview</Typography>
      <Grid container spacing={2}>
        {stats.map((s) => (
          <Grid key={s.provider} size={{ xs: 12, sm: 6, md: 3 }}>
            <ProviderCard stat={s} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

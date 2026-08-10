import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AsyncPage from "../lib/AsyncPage";
import { api, type CategoryStat } from "../lib/apiClient";

function cellBg(rate: number | null | undefined): string | undefined {
  if (rate == null) return undefined;
  const opacity = Math.min(0.08, (rate / 100) * 0.08);
  return `rgba(0, 0, 0, ${opacity.toFixed(3)})`;
}

export default function CategoryBreakdown() {
  const [stats, setStats] = useState<CategoryStat[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(null);
    setStats(null);
    api.categories().then(setStats).catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(load, [load]);

  return (
    <AsyncPage
      title="Category Breakdown"
      data={stats}
      error={err}
      onRetry={load}
      emptyCheck={(d) => d.length === 0}
      loadingHint="Loading category scores…"
      emptyMessage="No category data yet. Breakdown appears after the first probe run."
    >
      {(data) => {
        const providers = Array.from(
          new Set(data.map((s) => s.provider)),
        ).sort();
        const categories = Array.from(
          new Set(data.map((s) => s.category)),
        ).sort();

        const lookup = new Map<string, number | null>();
        for (const s of data) {
          lookup.set(`${s.category}:${s.provider}`, s.pass_rate);
        }

        return (
          <Box>
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ overflow: "auto" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    {providers.map((p) => (
                      <TableCell key={p} align="right">
                        {p}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat} hover>
                      <TableCell
                        sx={{ fontWeight: 500, color: "text.primary" }}
                      >
                        {cat}
                      </TableCell>
                      {providers.map((p) => {
                        const rate = lookup.get(`${cat}:${p}`);
                        return (
                          <TableCell
                            key={p}
                            align="right"
                            sx={{
                              bgcolor: cellBg(rate),
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {rate != null ? `${rate.toFixed(1)}%` : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1.5, display: "block" }}
            >
              Pass rate by category for the most recent measurement day.
              Subtle tints reflect magnitude only, not judgment.
            </Typography>
          </Box>
        );
      }}
    </AsyncPage>
  );
}

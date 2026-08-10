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

function cellColor(rate: number | null | undefined): string | undefined {
  if (rate == null) return undefined;
  if (rate >= 90) return "rgba(45, 106, 79, 0.08)";
  if (rate >= 70) return "rgba(45, 106, 79, 0.04)";
  if (rate >= 50) return "rgba(227, 100, 20, 0.06)";
  return "rgba(193, 18, 31, 0.06)";
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
      emptyMessage="No category data available yet."
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
                              bgcolor: cellColor(rate),
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
              Background tints indicate rate bands, not rankings.
            </Typography>
          </Box>
        );
      }}
    </AsyncPage>
  );
}

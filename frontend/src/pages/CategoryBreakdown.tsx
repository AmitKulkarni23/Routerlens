import { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { api, type CategoryStat } from "../lib/apiClient";

export default function CategoryBreakdown() {
  const [stats, setStats] = useState<CategoryStat[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.categories().then(setStats).catch((e: Error) => setErr(e.message));
  }, []);

  if (err) return <Typography color="error">{err}</Typography>;
  if (!stats) return <CircularProgress />;

  const providers = Array.from(new Set(stats.map((s) => s.provider))).sort();
  const categories = Array.from(new Set(stats.map((s) => s.category))).sort();

  function passRate(category: string, provider: string): string {
    const row = stats!.find((s) => s.category === category && s.provider === provider);
    return row?.pass_rate != null ? `${row.pass_rate}%` : "—";
  }

  if (stats.length === 0) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Category Breakdown</Typography>
        <Typography color="text.secondary">No data available.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Category Breakdown</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Category</strong></TableCell>
              {providers.map((p) => (
                <TableCell key={p} align="right"><strong>{p}</strong></TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat}>
                <TableCell>{cat}</TableCell>
                {providers.map((p) => (
                  <TableCell key={p} align="right">{passRate(cat, p)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Pass rate by category for the most recent measurement day. Columns have equal visual weight — no ranking implied.
      </Typography>
    </Box>
  );
}

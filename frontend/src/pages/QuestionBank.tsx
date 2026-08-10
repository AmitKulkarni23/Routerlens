import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Chip,
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
import { api, type QuestionBank as QBType } from "../lib/apiClient";

export default function QuestionBank() {
  const [bank, setBank] = useState<QBType | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(null);
    setBank(null);
    api.questionBank().then(setBank).catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(load, [load]);

  return (
    <AsyncPage
      title="Question Bank"
      data={bank}
      error={err}
      onRetry={load}
      loadingHint="Loading question bank…"
      emptyCheck={(d) => d.items.length === 0}
      emptyMessage="No items in question bank."
    >
      {(data) => {
        const categories = Array.from(
          new Set(data.items.map((i) => i.category)),
        ).sort();
        const countByCategory = new Map<string, number>();
        for (const item of data.items) {
          countByCategory.set(
            item.category,
            (countByCategory.get(item.category) ?? 0) + 1,
          );
        }

        return (
          <Box>
            <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {data.items.length} items across {categories.length} categories
              </Typography>
              <Typography variant="caption" color="text.secondary">
                · v{data.version}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 0.75, mb: 3, flexWrap: "wrap" }}>
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={`${cat} (${countByCategory.get(cat)})`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ overflow: "auto" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 100 }}>ID</TableCell>
                    <TableCell>Prompt</TableCell>
                    <TableCell sx={{ width: 120 }}>Expected</TableCell>
                    <TableCell sx={{ width: 80 }}>Grade</TableCell>
                    <TableCell sx={{ width: 80 }}>Difficulty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell
                        sx={{
                          fontFamily:
                            "ui-monospace, 'Cascadia Code', 'Fira Code', Consolas, monospace",
                          fontSize: "0.75rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.id}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8125rem" }}>
                        {item.prompt}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "ui-monospace, 'Cascadia Code', 'Fira Code', Consolas, monospace",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                        }}
                      >
                        {item.answer}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.grade}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.6875rem" }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {item.difficulty}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      }}
    </AsyncPage>
  );
}

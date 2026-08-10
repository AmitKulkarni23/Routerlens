import { useCallback, useEffect, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Breadcrumbs,
  Link,
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
import { api, type Failure } from "../lib/apiClient";
import { getProviderColor } from "../lib/chartColors";

function ResponseCell({ value }: { value: string | null }) {
  const text = value ?? "—";
  const truncated = text.length > 120;

  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      onClick={truncated ? () => setExpanded((v) => !v) : undefined}
      sx={{
        fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', Consolas, monospace",
        fontSize: "0.75rem",
        lineHeight: 1.5,
        whiteSpace: expanded ? "pre-wrap" : "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: expanded ? "none" : 360,
        cursor: truncated ? "pointer" : "default",
        wordBreak: expanded ? "break-all" : undefined,
      }}
    >
      {expanded ? text : text}
    </Box>
  );
}

export default function ProviderDetail() {
  const { name } = useParams<{ name: string }>();
  const [failures, setFailures] = useState<Failure[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!name) return;
    setErr(null);
    setFailures(null);
    api.failures(name).then(setFailures).catch((e: Error) => setErr(e.message));
  }, [name]);

  useEffect(load, [load]);

  const providerIndex = ["deepinfra", "groq", "novita", "together"].indexOf(
    (name ?? "").toLowerCase(),
  );
  const dotColor = getProviderColor(name ?? "", Math.max(providerIndex, 0));

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2, fontSize: "0.8125rem" }}>
        <Link component={RouterLink} to="/" underline="hover" color="text.secondary">
          Overview
        </Link>
        <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
          {name}
        </Typography>
      </Breadcrumbs>

      <AsyncPage
        title=""
        data={failures}
        error={err}
        onRetry={load}
        loadingHint={`Loading failures for ${name}…`}
        emptyCheck={(d) => d.length === 0}
        emptyMessage={`No failures recorded for ${name}. Every question answered correctly.`}
      >
        {(data) => {
          const byDate = new Map<string, Failure[]>();
          for (const f of data) {
            const day = f.created_at.slice(0, 10);
            if (!byDate.has(day)) byDate.set(day, []);
            byDate.get(day)!.push(f);
          }
          const dates = Array.from(byDate.keys()).sort().reverse();

          return (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: dotColor,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  {data.length} failed response{data.length !== 1 ? "s" : ""}
                </Typography>
              </Box>

              {dates.map((date) => (
                <Box key={date} sx={{ mb: 4 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      mb: 1,
                      display: "block",
                    }}
                  >
                    {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ overflow: "auto" }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Model responded</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {byDate.get(date)!.map((f, i) => (
                          <TableRow key={`${f.item_id}-${i}`} hover>
                            <TableCell
                              sx={{
                                fontFamily:
                                  "ui-monospace, 'Cascadia Code', 'Fira Code', Consolas, monospace",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {f.item_id}
                            </TableCell>
                            <TableCell sx={{ color: "text.secondary" }}>
                              {f.category}
                            </TableCell>
                            <TableCell>
                              <ResponseCell value={f.raw_response} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </Box>
          );
        }}
      </AsyncPage>
    </Box>
  );
}

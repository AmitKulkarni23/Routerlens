import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import AsyncPage from "../lib/AsyncPage";
import { api, type Incident } from "../lib/apiClient";

function severityColor(delta: number): "error" | "warning" | "default" {
  const mag = Math.abs(delta);
  if (mag >= 20) return "error";
  if (mag >= 10) return "warning";
  return "default";
}

function incidentSentence(inc: Incident): string {
  const date = new Date(inc.detected_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const dir = inc.delta < 0 ? "dropped" : "rose";
  const pts = Math.abs(inc.delta).toFixed(1);
  return `${inc.provider} ${inc.metric} ${dir} ${pts} pts on ${date}`;
}

export default function IncidentsFeed() {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setErr(null);
    setIncidents(null);
    api.incidents().then(setIncidents).catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(load, [load]);

  return (
    <AsyncPage
      title="Incidents"
      data={incidents}
      error={err}
      onRetry={load}
      emptyCheck={(d) => d.length === 0}
      emptyMessage="No incidents recorded. All providers operating within expected ranges."
    >
      {(data) => (
        <List disablePadding>
          {data.map((inc, i) => (
            <Box key={inc.id}>
              {i > 0 && <Divider />}
              <ListItem
                alignItems="flex-start"
                disableGutters
                sx={{ py: 1.5 }}
              >
                  <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, color: "text.primary" }}
                    >
                      {incidentSentence(inc)}
                    </Typography>
                  }
                  secondary={
                    inc.resolved_at
                      ? `Resolved ${new Date(inc.resolved_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                      : undefined
                  }
                />
                <Chip
                  label={
                    inc.resolved_at
                      ? "resolved"
                      : `open · ${Math.abs(inc.delta).toFixed(0)}pt`
                  }
                  size="small"
                  color={
                    inc.resolved_at
                      ? "default"
                      : severityColor(inc.delta)
                  }
                  variant={inc.resolved_at ? "outlined" : "filled"}
                  sx={{ ml: 1, flexShrink: 0, alignSelf: "center" }}
                />
              </ListItem>
            </Box>
          ))}
        </List>
      )}
    </AsyncPage>
  );
}

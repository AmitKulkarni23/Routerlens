import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { api, type Incident } from "../lib/apiClient";

function incidentSentence(inc: Incident): string {
  const date = new Date(inc.detected_at).toLocaleDateString();
  const dir = inc.delta < 0 ? "dropped" : "rose";
  const pts = Math.abs(inc.delta).toFixed(1);
  return `${inc.provider} ${inc.metric} ${dir} ${pts} points on ${date}`;
}

export default function IncidentsFeed() {
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.incidents().then(setIncidents).catch((e: Error) => setErr(e.message));
  }, []);

  if (err) return <Typography color="error">{err}</Typography>;
  if (!incidents) return <CircularProgress />;

  if (incidents.length === 0) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Incidents</Typography>
        <Typography color="text.secondary">No incidents recorded.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Incidents</Typography>
      <List disablePadding>
        {incidents.map((inc, i) => (
          <Box key={inc.id}>
            {i > 0 && <Divider />}
            <ListItem alignItems="flex-start" disableGutters>
              <ListItemText
                primary={incidentSentence(inc)}
                secondary={
                  inc.resolved_at
                    ? `Resolved ${new Date(inc.resolved_at).toLocaleDateString()}`
                    : undefined
                }
              />
              <Chip
                label={inc.resolved_at ? "resolved" : "open"}
                size="small"
                color={inc.resolved_at ? "default" : "warning"}
                sx={{ ml: 1 }}
              />
            </ListItem>
          </Box>
        ))}
      </List>
    </Box>
  );
}

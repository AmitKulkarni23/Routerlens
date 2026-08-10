import { Box, Button, CircularProgress, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface Props<T> {
  data: T | null;
  error: string | null;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
  emptyCheck?: (data: T) => boolean;
  emptyMessage?: string;
  title: string;
}

export default function AsyncPage<T>({
  data,
  error,
  onRetry,
  children,
  emptyCheck,
  emptyMessage = "No data available.",
  title,
}: Props<T>) {
  if (error) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          {title}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 8,
            gap: 2,
          }}
        >
          <Typography color="text.secondary" sx={{ fontSize: "0.9375rem" }}>
            Failed to load data.
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontFamily: "monospace" }}
          >
            {error}
          </Typography>
          {onRetry && (
            <Button
              variant="outlined"
              size="small"
              onClick={onRetry}
              sx={{ textTransform: "none" }}
            >
              Try again
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          {title}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            py: 8,
          }}
          role="status"
          aria-label="Loading"
        >
          <CircularProgress size={28} thickness={4} color="primary" />
        </Box>
      </Box>
    );
  }

  if (emptyCheck?.(data)) {
    return (
      <Box>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          {title}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            py: 8,
          }}
        >
          <Typography color="text.secondary">{emptyMessage}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        {title}
      </Typography>
      {children(data)}
    </Box>
  );
}

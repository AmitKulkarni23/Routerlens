import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { PanelState } from "@/types/chorus";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ResponsePanelProps {
  panel: PanelState;
}

export function ResponsePanel({ panel }: ResponsePanelProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(panel.content);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const isStreaming = panel.status === "streaming";
  const isDone = panel.status === "done";
  const isError = panel.status === "error";

  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "400px",
        border: "1px solid",
        borderColor: isError
          ? "#d62828"
          : isStreaming
            ? "rgba(94, 106, 210, 0.3)"
            : "#282d3d",
        boxShadow:
          isStreaming
            ? "0 0 0 1px rgba(94, 106, 210, 0.3), inset 0 0 32px rgba(94, 106, 210, 0.04)"
            : "none",
        backgroundColor: "#13161e",
        transition:
          "border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
        animation: isStreaming
          ? "none"
          : "none",
        "@keyframes streamingGlow": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgba(94, 106, 210, 0.3), inset 0 0 32px rgba(94, 106, 210, 0.04)",
          },
          "50%": {
            boxShadow:
              "0 0 0 1px rgba(94, 106, 210, 0.4), inset 0 0 32px rgba(94, 106, 210, 0.06)",
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          padding: "12px 16px",
          borderBottom: "1px solid #282d3d",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontSize: "0.65rem",
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#717486",
          }}
        >
          {panel.provider || panel.model_id.split("/")[0].toUpperCase()} /{" "}
          {panel.model_name}
        </Typography>

        {isDone && (
          <Button
            size="small"
            onClick={handleCopy}
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Copy
          </Button>
        )}
      </Box>

      {/* Content Area */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
        {panel.status === "idle" && (
          <Typography
            variant="body1"
            sx={{
              color: "#464d5d",
              fontFamily: '"Geist Mono", monospace',
              fontSize: "0.875rem",
            }}
          >
            Awaiting input...
          </Typography>
        )}

        {isError && (
          <Alert
            severity="error"
            sx={{
              backgroundColor: "rgba(214, 40, 40, 0.1)",
              borderColor: "#d62828",
              color: "#d62828",
            }}
          >
            {panel.error || "Stream failed"}
          </Alert>
        )}

        {(isStreaming || isDone) && (
          <>
            <MarkdownRenderer
              content={panel.content}
              showCursor={isStreaming && panel.content.length > 0}
            />
          </>
        )}

        {isStreaming && panel.content.length === 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress
              size={16}
              sx={{ color: "#5e6ad2" }}
            />
            <Typography
              variant="body1"
              sx={{
                color: "#717486",
                fontFamily: '"Geist Mono", monospace',
                fontSize: "0.875rem",
              }}
            >
              Streaming...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer with timing */}
      {isDone && (panel.ttfb_ms !== undefined || panel.duration_ms !== undefined) && (
        <Box
          sx={{
            padding: "12px 16px",
            borderTop: "1px solid #282d3d",
            display: "flex",
            gap: 2,
            justifyContent: "flex-end",
          }}
        >
          {panel.ttfb_ms !== undefined && (
            <Typography
              variant="caption"
              sx={{
                color: "#464d5d",
                fontFamily: '"Geist Mono", monospace',
                fontSize: "0.65rem",
              }}
            >
              TTFB: {panel.ttfb_ms}ms
            </Typography>
          )}
          {panel.duration_ms !== undefined && (
            <Typography
              variant="caption"
              sx={{
                color: "#464d5d",
                fontFamily: '"Geist Mono", monospace',
                fontSize: "0.65rem",
              }}
            >
              Duration: {panel.duration_ms}ms
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}

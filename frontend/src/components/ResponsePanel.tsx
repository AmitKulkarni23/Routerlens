import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import { PanelState } from "@/types/chorus";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ResponsePanelProps {
  panel: PanelState;
}

export function ResponsePanel({ panel }: ResponsePanelProps) {
  const [expanded, setExpanded] = useState(false);

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
  const hasContent = panel.content.length > 0 || isDone || isError;

  const headerLabel = `${panel.provider || panel.model_id.split("/")[0].toUpperCase()} / ${panel.model_name}`;

  const contentArea = (
    <>
      {panel.status === "idle" && (
        <Typography
          variant="body1"
          sx={{ color: "#464d5d", fontFamily: '"Geist Mono", monospace', fontSize: "0.875rem" }}
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
        <MarkdownRenderer
          content={panel.content}
          showCursor={isStreaming && panel.content.length > 0}
        />
      )}

      {isStreaming && panel.content.length === 0 && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Three pulsing dots */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  backgroundColor: "#5e6ad2",
                  animation: "pulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 0.3 },
                    "50%": { opacity: 1 },
                  },
                }}
              />
            ))}
          </Box>
          <Typography
            variant="body1"
            sx={{ color: "#717486", fontFamily: '"Geist Mono", monospace', fontSize: "0.875rem" }}
          >
            Streaming...
          </Typography>
        </Box>
      )}
    </>
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && hasContent) {
      e.preventDefault();
      setExpanded(true);
    }
  };

  return (
    <>
      <Paper
        role={hasContent ? "button" : undefined}
        tabIndex={hasContent ? 0 : undefined}
        aria-label={hasContent ? `Expand ${headerLabel}` : undefined}
        aria-expanded={expanded}
        title={hasContent ? "Click to expand" : undefined}
        onClick={() => hasContent && setExpanded(true)}
        onKeyDown={handleKeyDown}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "320px",
          overflow: "hidden",
          border: "1px solid",
          borderColor: isError
            ? "#d62828"
            : isStreaming
              ? "rgba(94, 106, 210, 0.3)"
              : "#282d3d",
          boxShadow: isStreaming
            ? "0 0 0 1px rgba(94, 106, 210, 0.3), inset 0 0 32px rgba(94, 106, 210, 0.04)"
            : "none",
          backgroundColor: "#13161e",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
          cursor: hasContent ? "pointer" : "default",
          "&:hover": hasContent ? { borderColor: isError ? "#d62828" : isStreaming ? "rgba(94,106,210,0.3)" : "#3d4460" } : {},
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
              userSelect: "none",
            }}
          >
            {headerLabel}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isDone && (
              <Button
                size="small"
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
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
        </Box>

        {/* Content */}
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
          {contentArea}
        </Box>

        {/* Footer */}
        {isDone && (panel.ttfb_ms !== undefined || panel.duration_ms !== undefined) && (
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              padding: "10px 16px",
              borderTop: "1px solid #282d3d",
              display: "flex",
              gap: 3,
              justifyContent: "flex-end",
            }}
          >
            {panel.ttfb_ms !== undefined && (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <Typography
                  variant="caption"
                  sx={{ color: "#464d5d", fontFamily: '"Geist Mono", monospace', fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  First byte
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "#2fa649", fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem", fontWeight: 500 }}
                >
                  {panel.ttfb_ms}ms
                </Typography>
              </Box>
            )}
            {panel.duration_ms !== undefined && (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <Typography
                  variant="caption"
                  sx={{ color: "#464d5d", fontFamily: '"Geist Mono", monospace', fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  Total time
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "#2fa649", fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem", fontWeight: 500 }}
                >
                  {panel.duration_ms}ms
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Expand dialog */}
      <Dialog
        open={expanded}
        onClose={() => setExpanded(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#13161e",
            border: "1px solid #282d3d",
            maxHeight: "80vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            padding: "12px 16px",
            borderBottom: "1px solid #282d3d",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.65rem",
              fontFamily: '"Geist Mono", monospace',
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#717486",
            }}
          >
            {headerLabel}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
            <IconButton
              size="small"
              onClick={() => setExpanded(false)}
              sx={{ color: "#717486", "&:hover": { color: "#eae8f0" } }}
            >
              ✕
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ padding: "20px 24px" }}>
          {contentArea}
        </DialogContent>
      </Dialog>
    </>
  );
}

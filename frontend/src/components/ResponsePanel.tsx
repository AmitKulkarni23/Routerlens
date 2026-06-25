import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
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
          <CircularProgress size={16} sx={{ color: "#5e6ad2" }} />
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

  return (
    <>
      <Paper
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "280px",
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
            cursor: hasContent ? "pointer" : "default",
            "&:hover": hasContent
              ? { backgroundColor: "rgba(255,255,255,0.02)" }
              : {},
          }}
          onClick={() => hasContent && setExpanded(true)}
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
            {hasContent && (
              <Button
                size="small"
                onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#464d5d",
                  minWidth: 0,
                  padding: "2px 6px",
                  "&:hover": { color: "#eae8f0" },
                }}
              >
                ⤢
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
                sx={{ color: "#464d5d", fontFamily: '"Geist Mono", monospace', fontSize: "0.65rem" }}
              >
                TTFB: {panel.ttfb_ms}ms
              </Typography>
            )}
            {panel.duration_ms !== undefined && (
              <Typography
                variant="caption"
                sx={{ color: "#464d5d", fontFamily: '"Geist Mono", monospace', fontSize: "0.65rem" }}
              >
                Duration: {panel.duration_ms}ms
              </Typography>
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

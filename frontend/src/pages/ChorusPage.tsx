import { useEffect, useState } from "react";
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  Button,
  Divider,
  Chip,
  Stack,
} from "@mui/material";
import { ModelSummary } from "@/types/models";
import { fetchModels, getFallbackModels } from "@/api/models";
import { useChorus } from "@/hooks/useChorus";
import { ModelSelector } from "@/components/ModelSelector";
import { PromptInput } from "@/components/PromptInput";
import { ResponsePanel } from "@/components/ResponsePanel";

type Phase = "setup" | "compare";

const SIDEBAR_WIDTH = 260;

export function ChorusPage() {
  const [models, setModels] = useState<ModelSummary[]>(getFallbackModels());
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const { panels, isStreaming, submit } = useChorus();

  useEffect(() => {
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const response = await fetchModels();
        setModels(response.models);
        setModelError(null);
      } catch {
        setModelError("Could not load full model list. Using fallback models.");
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
  }, []);

  const handleModelSelectionChange = (modelId: string, checked: boolean) => {
    const next = new Set(selectedModels);
    if (checked) next.add(modelId);
    else next.delete(modelId);
    setSelectedModels(next);
  };

  const handleSubmit = async () => {
    if (selectedModels.size < 2 || !prompt.trim()) return;
    const modelNames = new Map<string, string>();
    models.forEach((m) => modelNames.set(m.id, m.name));
    setSubmittedPrompt(prompt);
    setPhase("compare");
    await submit(prompt, Array.from(selectedModels), modelNames);
  };

  const handleReset = () => {
    setPhase("setup");
    setSubmittedPrompt("");
    setSelectedModels(new Set());
    setPrompt("");
  };

  // ── Setup phase ──────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          backgroundColor: "#0d0f13",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: { xs: 2, sm: 4, md: 6 },
          paddingTop: { xs: 4, sm: 6, md: 8 },
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 560 }}>
          {modelError && (
            <Alert severity="info" sx={{ marginBottom: 3, fontSize: "0.8rem" }}>
              {modelError}
            </Alert>
          )}
          {loadingModels ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "200px",
              }}
            >
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <ModelSelector
                models={models}
                selected={selectedModels}
                onSelectionChange={handleModelSelectionChange}
              />
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                onSubmit={handleSubmit}
                disabled={isStreaming}
                selectedCount={selectedModels.size}
              />
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // ── Compare phase ─────────────────────────────────────────────────────────
  const panelList = Array.from(panels.values());

  return (
    <Box
      sx={{
        display: "flex",
        height: "calc(100vh - 64px)",
        backgroundColor: "#0d0f13",
        overflow: "hidden",
      }}
    >
      {/* Sidebar — slides in */}
      <Box
        sx={{
          width: `${SIDEBAR_WIDTH}px`,
          flexShrink: 0,
          borderRight: "1px solid #282d3d",
          backgroundColor: "#0d0f13",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideInLeft 0.32s cubic-bezier(0.4, 0, 0.2, 1) both",
          "@keyframes slideInLeft": {
            from: { transform: "translateX(-100%)", opacity: 0 },
            to: { transform: "translateX(0)", opacity: 1 },
          },
        }}
      >
        {/* Reset */}
        <Box sx={{ padding: "12px 16px", flexShrink: 0 }}>
          <Button
            size="small"
            onClick={handleReset}
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: "0.65rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#717486",
              padding: "4px 8px",
              minWidth: 0,
              "&:hover": { color: "#eae8f0", backgroundColor: "#1a1f2e" },
            }}
          >
            ← New
          </Button>
        </Box>

        <Divider sx={{ borderColor: "#282d3d" }} />

        {/* Prompt */}
        <Box sx={{ padding: "12px 16px", flexShrink: 0 }}>
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontFamily: '"Geist Mono", monospace',
              color: "#464d5d",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "6px",
            }}
          >
            Prompt
          </Typography>
          <Typography
            sx={{
              fontSize: "0.8rem",
              fontFamily: '"Geist", sans-serif',
              color: "#eae8f0",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {submittedPrompt}
          </Typography>
        </Box>

        <Divider sx={{ borderColor: "#282d3d" }} />

        {/* Model status list */}
        <Box sx={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontFamily: '"Geist Mono", monospace',
              color: "#464d5d",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "10px",
            }}
          >
            Models ({panelList.length})
          </Typography>
          <Stack spacing={1.5}>
            {panelList.map((panel) => (
              <Box key={panel.model_id}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontFamily: '"Geist", sans-serif',
                      color: "#eae8f0",
                      lineHeight: 1.3,
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {panel.model_name}
                  </Typography>
                  {panel.status === "streaming" && (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: "#5e6ad2",
                        flexShrink: 0,
                        animation: "pulse 1.5s ease-in-out infinite",
                        "@keyframes pulse": {
                          "0%, 100%": { opacity: 1 },
                          "50%": { opacity: 0.3 },
                        },
                      }}
                    />
                  )}
                  {panel.status === "done" && (
                    <Chip
                      label={panel.duration_ms ? `${panel.duration_ms}ms` : "done"}
                      size="small"
                      sx={{
                        height: "16px",
                        fontSize: "0.58rem",
                        fontFamily: '"Geist Mono", monospace',
                        backgroundColor: "rgba(47,166,73,0.12)",
                        color: "#2fa649",
                        border: "none",
                        "& .MuiChip-label": { padding: "0 6px" },
                      }}
                    />
                  )}
                  {panel.status === "error" && (
                    <Chip
                      label="error"
                      size="small"
                      sx={{
                        height: "16px",
                        fontSize: "0.58rem",
                        fontFamily: '"Geist Mono", monospace',
                        backgroundColor: "rgba(214,40,40,0.12)",
                        color: "#d62828",
                        border: "none",
                        "& .MuiChip-label": { padding: "0 6px" },
                      }}
                    />
                  )}
                </Box>
                <Typography
                  sx={{
                    fontSize: "0.65rem",
                    fontFamily: '"Geist Mono", monospace',
                    color: "#464d5d",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginTop: "2px",
                  }}
                >
                  {panel.provider ?? panel.model_id.split("/")[0]}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Main viewport — all responses */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          padding: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {panelList.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              color: "#464d5d",
              fontFamily: '"Geist Mono", monospace',
              fontSize: "0.875rem",
            }}
          >
            Waiting for responses…
          </Box>
        ) : (
          panelList.map((panel) => (
            <ResponsePanel key={panel.model_id} panel={panel} />
          ))
        )}
      </Box>
    </Box>
  );
}

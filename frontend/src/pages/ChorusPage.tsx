import { useEffect, useState } from "react";
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  Tabs,
  Tab,
  Button,
  Tooltip,
} from "@mui/material";
import { ModelSummary } from "@/types/models";
import { fetchModels, getFallbackModels } from "@/api/models";
import { useChorus } from "@/hooks/useChorus";
import { ModelSelector } from "@/components/ModelSelector";
import { PromptInput } from "@/components/PromptInput";
import { ResponsePanel } from "@/components/ResponsePanel";

type Phase = "setup" | "compare";

const NAV_WIDTH = 220;

export function ChorusPage() {
  const [models, setModels] = useState<ModelSummary[]>(getFallbackModels());
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
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

    const orderedIds = Array.from(selectedModels);
    setSubmittedPrompt(prompt);
    setPhase("compare");
    setActiveModelId(orderedIds[0]);

    await submit(prompt, orderedIds, modelNames);
  };

  const handleReset = () => {
    setPhase("setup");
    setActiveModelId(null);
    setSubmittedPrompt("");
    setSelectedModels(new Set());
    setPrompt("");
  };

  const panelList = Array.from(panels.values());

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

  // Compare phase
  const activePanel = activeModelId ? panels.get(activeModelId) : null;

  return (
    <Box
      sx={{
        display: "flex",
        height: "calc(100vh - 64px)",
        backgroundColor: "#0d0f13",
        overflow: "hidden",
      }}
    >
      {/* Sliding left nav */}
      <Box
        sx={{
          width: `${NAV_WIDTH}px`,
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
        {/* Reset button */}
        <Box
          sx={{
            padding: "12px 16px",
            borderBottom: "1px solid #282d3d",
            flexShrink: 0,
          }}
        >
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

        {/* Prompt preview */}
        <Tooltip title={submittedPrompt} placement="right" arrow>
          <Box
            sx={{
              padding: "10px 16px",
              borderBottom: "1px solid #282d3d",
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.65rem",
                fontFamily: '"Geist Mono", monospace',
                color: "#464d5d",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "4px",
              }}
            >
              Prompt
            </Typography>
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontFamily: '"Geist", sans-serif',
                color: "#717486",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                lineHeight: 1.4,
              }}
            >
              {submittedPrompt}
            </Typography>
          </Box>
        </Tooltip>

        {/* Vertical model tabs */}
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <Tabs
            orientation="vertical"
            value={activeModelId}
            onChange={(_, v) => setActiveModelId(v)}
            sx={{
              "& .MuiTabs-indicator": {
                left: 0,
                right: "auto",
                width: "2px",
                backgroundColor: "#5e6ad2",
              },
              "& .MuiTab-root": {
                alignItems: "flex-start",
                textAlign: "left",
                fontFamily: '"Geist", sans-serif',
                fontSize: "0.8rem",
                fontWeight: 400,
                textTransform: "none",
                color: "#717486",
                padding: "10px 16px",
                minHeight: 0,
                letterSpacing: 0,
                "&.Mui-selected": {
                  color: "#eae8f0",
                  backgroundColor: "#1a1f2e",
                },
                "&:hover:not(.Mui-selected)": {
                  color: "#eae8f0",
                  backgroundColor: "rgba(26,31,46,0.5)",
                },
              },
            }}
          >
            {panelList.map((panel) => (
              <Tab
                key={panel.model_id}
                value={panel.model_id}
                label={
                  <Box sx={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        fontFamily: '"Geist Mono", monospace',
                        color: "inherit",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        opacity: 0.6,
                        lineHeight: 1,
                      }}
                    >
                      {panel.provider ?? panel.model_id.split("/")[0]}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.8rem",
                        fontFamily: '"Geist", sans-serif',
                        color: "inherit",
                        lineHeight: 1.2,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {panel.model_name}
                    </Typography>
                    {panel.status === "streaming" && (
                      <Box
                        sx={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: "#5e6ad2",
                          marginTop: "4px",
                          animation: "pulse 1.5s ease-in-out infinite",
                          "@keyframes pulse": {
                            "0%, 100%": { opacity: 1 },
                            "50%": { opacity: 0.3 },
                          },
                        }}
                      />
                    )}
                    {panel.status === "done" && (
                      <Typography
                        sx={{
                          fontSize: "0.6rem",
                          fontFamily: '"Geist Mono", monospace',
                          color: "#2fa649",
                          marginTop: "2px",
                        }}
                      >
                        {panel.duration_ms ? `${panel.duration_ms}ms` : "done"}
                      </Typography>
                    )}
                    {panel.status === "error" && (
                      <Typography
                        sx={{
                          fontSize: "0.6rem",
                          fontFamily: '"Geist Mono", monospace',
                          color: "#d62828",
                          marginTop: "2px",
                        }}
                      >
                        error
                      </Typography>
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>
      </Box>

      {/* Main response area */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          padding: 3,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {activePanel ? (
          <ResponsePanel panel={activePanel} />
        ) : (
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
            Select a model
          </Box>
        )}
      </Box>
    </Box>
  );
}

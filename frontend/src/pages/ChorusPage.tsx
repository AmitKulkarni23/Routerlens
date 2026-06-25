import { useEffect, useState } from "react";
import { Box, Container, Alert, CircularProgress } from "@mui/material";
import { ModelSummary } from "@/types/models";
import { fetchModels, getFallbackModels } from "@/api/models";
import { useChorus } from "@/hooks/useChorus";
import { ModelSelector } from "@/components/ModelSelector";
import { PromptInput } from "@/components/PromptInput";
import { ResponseGrid } from "@/components/ResponseGrid";

export function ChorusPage() {
  const [models, setModels] = useState<ModelSummary[]>(getFallbackModels());
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState("");
  const { panels, isStreaming, submit } = useChorus();

  // Load models on mount
  useEffect(() => {
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const response = await fetchModels();
        setModels(response.models);
        setModelError(null);
      } catch (error) {
        console.error("Failed to load models:", error);
        setModelError(
          "Could not load full model list. Using fallback models."
        );
      } finally {
        setLoadingModels(false);
      }
    };

    loadModels();
  }, []);

  const handleModelSelectionChange = (modelId: string, checked: boolean) => {
    const newSelected = new Set(selectedModels);
    if (checked) {
      newSelected.add(modelId);
    } else {
      newSelected.delete(modelId);
    }
    setSelectedModels(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedModels.size < 2 || !prompt.trim()) {
      return;
    }

    // Create model name map for display
    const modelNames = new Map<string, string>();
    models.forEach((model) => {
      modelNames.set(model.id, model.name);
    });

    await submit(prompt, Array.from(selectedModels), modelNames);
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "calc(100vh - 64px)",
        backgroundColor: "#0d0f13",
        padding: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Container maxWidth="lg">
        {modelError && (
          <Alert
            severity="info"
            sx={{ marginBottom: 2 }}
          >
            {modelError}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            gap: 3,
            flexWrap: { xs: "wrap", md: "nowrap" },
          }}
        >
          {/* Left Column: Model Selector & Prompt Input */}
          <Box
            sx={{
              width: { xs: "100%", md: "auto", lg: "auto" },
              flexShrink: { md: 0 },
              minWidth: { md: "320px", lg: "320px" },
              position: { md: "sticky", lg: "sticky" },
              top: 68,
              height: "fit-content",
              maxHeight: "calc(100vh - 100px)",
              overflowY: "auto",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {loadingModels && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100px",
                  }}
                >
                  <CircularProgress size={24} />
                </Box>
              )}

              {!loadingModels && (
                <>
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
                </>
              )}
            </Box>
          </Box>

          {/* Right Column: Response Grid */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              width: { xs: "100%", md: "auto" },
            }}
          >
            <ResponseGrid panels={panels} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

import { useState, useCallback, useRef } from "react";
import { PanelState, SseEvent } from "@/types/chorus";
import { streamChorus } from "@/api/chorus";

export function useChorus() {
  const [panels, setPanels] = useState<Map<string, PanelState>>(new Map());
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const submit = useCallback(
    async (
      prompt: string,
      modelIds: string[],
      modelNames: Map<string, string>
    ) => {
      // Initialize panels to "streaming" state
      const newPanels = new Map<string, PanelState>();
      for (const modelId of modelIds) {
        newPanels.set(modelId, {
          model_id: modelId,
          model_name: modelNames.get(modelId) || modelId,
          status: "streaming",
          content: "",
        });
      }
      setPanels(newPanels);
      setIsStreaming(true);

      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        await streamChorus({ prompt, model_ids: modelIds }, (event: SseEvent) => {
          if (event.type === "token") {
            setPanels((prev) => {
              const updated = new Map(prev);
              const panel = updated.get(event.model_id);
              if (panel) {
                updated.set(event.model_id, {
                  ...panel,
                  content: panel.content + event.content,
                });
              }
              return updated;
            });
          } else if (event.type === "model_done") {
            setPanels((prev) => {
              const updated = new Map(prev);
              const panel = updated.get(event.model_id);
              if (panel) {
                updated.set(event.model_id, {
                  ...panel,
                  status: "done",
                  ttfb_ms: event.ttfb_ms,
                  duration_ms: event.duration_ms,
                });
              }
              return updated;
            });
          } else if (event.type === "model_error") {
            setPanels((prev) => {
              const updated = new Map(prev);
              const panel = updated.get(event.model_id);
              if (panel) {
                updated.set(event.model_id, {
                  ...panel,
                  status: "error",
                  error: event.error,
                });
              }
              return updated;
            });
          } else if (event.type === "done") {
            setIsStreaming(false);
          }
        });
      } catch (error) {
        console.error("Stream failed:", error);
        // Mark all panels as error
        setPanels((prev) => {
          const updated = new Map(prev);
          updated.forEach((panel) => {
            if (panel.status === "streaming") {
              updated.set(panel.model_id, {
                ...panel,
                status: "error",
                error:
                  error instanceof Error ? error.message : "Connection lost",
              });
            }
          });
          return updated;
        });
        setIsStreaming(false);
      }
    },
    []
  );

  return { panels, isStreaming, submit };
}

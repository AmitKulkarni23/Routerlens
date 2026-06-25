export interface ChorusRequest {
  prompt: string;
  model_ids: string[];
}

export type PanelStatus = "idle" | "streaming" | "done" | "error";

export interface PanelState {
  model_id: string;
  model_name: string;
  provider?: string;
  status: PanelStatus;
  content: string;
  error?: string;
  ttfb_ms?: number;
  duration_ms?: number;
}

export type SseEvent =
  | { type: "token"; model_id: string; content: string }
  | {
      type: "model_done";
      model_id: string;
      ttfb_ms: number;
      duration_ms: number;
    }
  | { type: "model_error"; model_id: string; error: string; status_code?: number }
  | { type: "done" };

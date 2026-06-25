import { ChorusRequest, SseEvent } from "@/types/chorus";

export async function streamChorus(
  request: ChorusRequest,
  onEvent: (event: SseEvent) => void
): Promise<void> {
  const response = await fetch("/api/chorus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse complete SSE events from buffer (split on "\n\n")
    const events = buffer.split("\n\n");
    buffer = events.pop()!; // keep incomplete event in buffer

    for (const raw of events) {
      if (!raw.trim()) continue;

      // Parse event type from "event: <type>" line
      const eventTypeMatch = raw.match(/^event: (.+)$/m);
      const eventType = eventTypeMatch?.[1];

      // Parse data from "data: <json>" line
      const dataMatch = raw.match(/^data: (.+)$/m);
      const dataStr = dataMatch?.[1];

      if (eventType && dataStr) {
        try {
          const data = JSON.parse(dataStr);
          onEvent({ type: eventType, ...data } as SseEvent);
        } catch (e) {
          console.error("Failed to parse SSE event data:", e, dataStr);
        }
      }
    }
  }

  // Flush any remaining data in decoder
  const remaining = decoder.decode(undefined, { stream: false });
  if (remaining) {
    buffer += remaining;
    const lastEvent = buffer.trim();
    if (lastEvent) {
      const eventTypeMatch = lastEvent.match(/^event: (.+)$/m);
      const dataMatch = lastEvent.match(/^data: (.+)$/m);
      const eventType = eventTypeMatch?.[1];
      const dataStr = dataMatch?.[1];
      if (eventType && dataStr) {
        try {
          const data = JSON.parse(dataStr);
          onEvent({ type: eventType, ...data } as SseEvent);
        } catch (e) {
          console.error("Failed to parse final SSE event:", e);
        }
      }
    }
  }
}

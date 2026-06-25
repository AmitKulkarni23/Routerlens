import { ModelSummary, ModelsResponse } from "@/types/models";

const FALLBACK_MODELS: ModelSummary[] = [
  {
    id: "google/gemma-2-9b-it:free",
    name: "Gemma 2 9B IT",
    provider: "google",
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct:free",
    name: "Llama 3.1 8B Instruct",
    provider: "meta-llama",
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B Instruct",
    provider: "mistralai",
  },
];

let cachedModels: ModelSummary[] | null = null;
let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

export function getFallbackModels(): ModelSummary[] {
  return FALLBACK_MODELS;
}

export function getCachedModels(): ModelSummary[] | null {
  return cachedModels;
}

export async function fetchModels(): Promise<ModelsResponse> {
  try {
    const response = await fetch("/api/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: ModelsResponse = await response.json();
    // Strip redundant "(free)" / "(Free)" suffixes — the UI communicates free-tier at the section level
    data.models = data.models.map((m) => ({
      ...m,
      name: m.name.replace(/\s*\(free\)\s*$/i, "").trim(),
    }));
    cachedModels = data.models;
    return data;
  } catch (error) {
    console.error("Failed to fetch models:", error);

    // Schedule retry after 30s
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
    }
    retryTimeoutId = setTimeout(() => {
      fetchModels().catch(console.error);
    }, 30000);

    throw error;
  }
}

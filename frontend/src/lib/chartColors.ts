export const PROVIDER_COLORS: Record<string, string> = {
  Groq: "#4361ee",
  DeepInfra: "#7b2d8e",
  Novita: "#0077b6",
  Together: "#6c584c",
};

export const PROVIDER_COLOR_LIST = [
  "#4361ee",
  "#7b2d8e",
  "#0077b6",
  "#6c584c",
  "#9e6c47",
  "#3a5a40",
];

export function getProviderColor(provider: string, index: number): string {
  return (
    PROVIDER_COLORS[provider] ??
    PROVIDER_COLOR_LIST[index % PROVIDER_COLOR_LIST.length]
  );
}

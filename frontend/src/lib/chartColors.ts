export const PROVIDER_COLORS: Record<string, string> = {
  deepinfra: "#e63946",
  groq: "#2a9d8f",
  novita: "#e9c46a",
  together: "#264653",
};

export const PROVIDER_COLOR_LIST = [
  "#e63946",
  "#2a9d8f",
  "#e9c46a",
  "#264653",
  "#f4a261",
  "#606c38",
];

export function getProviderColor(provider: string, index: number): string {
  return (
    PROVIDER_COLORS[provider.toLowerCase()] ??
    PROVIDER_COLORS[provider] ??
    PROVIDER_COLOR_LIST[index % PROVIDER_COLOR_LIST.length]
  );
}

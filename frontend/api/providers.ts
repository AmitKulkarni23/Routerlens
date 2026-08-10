import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./_lib/supabase.js";

// Returns the most recent day's stats for each provider.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase
    .from("daily_provider_stats")
    .select("provider, day, pass_rate, error_rate, p50_latency_ms, p95_latency_ms, cost_per_correct_usd, call_count")
    .order("day", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Keep only the latest day per provider.
  const seen = new Set<string>();
  const latest = (data ?? []).filter((row) => {
    if (seen.has(row.provider)) return false;
    seen.add(row.provider);
    return true;
  });

  res.status(200).json(latest);
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./_lib/supabase.js";

// Returns all daily_provider_stats rows ordered by day asc, for charting.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase
    .from("daily_provider_stats")
    .select("provider, day, pass_rate, error_rate, p50_latency_ms, p95_latency_ms, cost_per_correct_usd, call_count")
    .order("day", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data ?? []);
}

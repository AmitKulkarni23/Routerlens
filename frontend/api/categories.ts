import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./_lib/supabase";

// Returns daily_provider_category_stats for the most recent available day.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase
    .from("daily_provider_category_stats")
    .select("provider, category, day, pass_rate, call_count")
    .order("day", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Scope to most recent day.
  const mostRecentDay = data?.[0]?.day ?? null;
  const filtered = mostRecentDay
    ? (data ?? []).filter((r) => r.day === mostRecentDay)
    : [];

  res.status(200).json(filtered);
}

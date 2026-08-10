import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./_lib/supabase";

// Returns all incidents ordered by detected_at desc.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabase
    .from("incidents_public")
    .select("id, provider, detected_at, metric, baseline, observed, delta, resolved_at")
    .order("detected_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data ?? []);
}

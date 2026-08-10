import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const provider = req.query.provider as string | undefined;
  if (!provider) return res.status(400).json({ error: "provider query param required" });

  const { data, error } = await supabase
    .from("failures_public")
    .select("item_id, category, provider, raw_response, created_at")
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data ?? []);
}

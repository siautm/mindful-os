import { requireUserId } from "./_lib/auth.js";
import { handleOptions, sendJson } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase.js";

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  const userId = await requireUserId(req, res);
  if (!userId) return;

  const db = getSupabaseAdmin();

  try {
    if (req.method === "GET") {
      const { data, error } = await db
        .from("focus_presets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      sendJson(res, 200, { items: data ?? [] });
      return;
    }

    // Snapshot write from current UI model
    if (req.method === "POST") {
      const presets = Array.isArray(req.body?.presets) ? req.body.presets : [];
      const rows = presets.map((p: any) => ({
        id: String(p.id),
        user_id: userId,
        name: String(p.name ?? "Preset"),
        duration: Math.max(1, Number(p.duration ?? 25)),
        updated_at: new Date().toISOString(),
      }));

      const keepIds = new Set(rows.map((x: any) => x.id));
      const { data: existing, error: existingErr } = await db
        .from("focus_presets")
        .select("id")
        .eq("user_id", userId);
      if (existingErr) throw existingErr;
      const removeIds = (existing ?? [])
        .map((x: any) => String(x.id))
        .filter((id: string) => !keepIds.has(id));
      if (removeIds.length > 0) {
        const { error } = await db.from("focus_presets").delete().eq("user_id", userId).in("id", removeIds);
        if (error) throw error;
      }

      if (rows.length > 0) {
        const { error } = await db.from("focus_presets").upsert(rows);
        if (error) throw error;
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message ?? "Focus presets API failed" });
  }
}

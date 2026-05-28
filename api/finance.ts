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
        .from("finance_entries")
        .select("*")
        .eq("user_id", userId)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      sendJson(res, 200, { items: data ?? [] });
      return;
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const payload = {
        id: String(body.id ?? "").trim() || `${Date.now()}`,
        user_id: userId,
        type: body.type === "income" ? "income" : "expense",
        amount: Number(body.amount ?? 0),
        category: String(body.category ?? "").trim(),
        description: String(body.description ?? ""),
        entry_date: String(body.date ?? ""),
      };

      if (!payload.category || !payload.entry_date || !Number.isFinite(payload.amount) || payload.amount <= 0) {
        sendJson(res, 400, { error: "type, amount, category, date are required" });
        return;
      }

      const { data, error } = await db.from("finance_entries").upsert(payload).select("*").single();
      if (error) throw error;
      sendJson(res, 201, { item: data });
      return;
    }

    if (req.method === "PATCH") {
      const body = req.body ?? {};
      const id = String(body.id ?? "");
      if (!id) {
        sendJson(res, 400, { error: "id is required" });
        return;
      }

      const patch: Record<string, unknown> = {};
      if (body.type !== undefined) patch.type = body.type === "income" ? "income" : "expense";
      if (body.amount !== undefined) patch.amount = Number(body.amount);
      if (body.category !== undefined) patch.category = String(body.category).trim();
      if (body.description !== undefined) patch.description = String(body.description ?? "");
      if (body.date !== undefined) patch.entry_date = String(body.date);
      patch.updated_at = new Date().toISOString();

      const { data, error } = await db
        .from("finance_entries")
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;
      sendJson(res, 200, { item: data });
      return;
    }

    if (req.method === "DELETE") {
      const id = typeof req.query?.id === "string" ? req.query.id : String((req.body ?? {}).id ?? "");
      if (!id) {
        sendJson(res, 400, { error: "id is required" });
        return;
      }
      const { error } = await db.from("finance_entries").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message ?? "Finance API failed" });
  }
}

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
      const limit = Math.min(Number(req.query?.limit ?? 100), 500);
      const { data, error } = await db
        .from("focus_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      sendJson(res, 200, { items: data ?? [] });
      return;
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const payload = {
        user_id: userId,
        task_id: body.taskId ? String(body.taskId) : null,
        task_title: body.taskTitle ? String(body.taskTitle) : null,
        duration: Number(body.duration ?? 25),
        completed: Boolean(body.completed ?? true),
        date: body.date ? String(body.date) : new Date().toISOString(),
      };
      const { data, error } = await db
        .from("focus_sessions")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      sendJson(res, 201, { item: data });
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message ?? "Focus sessions API failed" });
  }
}


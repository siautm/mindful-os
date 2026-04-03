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
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      sendJson(res, 200, { items: data ?? [] });
      return;
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const payload = {
        user_id: userId,
        title: String(body.title ?? "").trim(),
        description: String(body.description ?? ""),
        urgency: Number(body.urgency ?? 5),
        importance: Number(body.importance ?? 5),
        priority: Number(body.priority ?? 5),
        due_date: body.dueDate ? String(body.dueDate) : null,
        completed: Boolean(body.completed ?? false),
        estimated_minutes: Number(body.estimatedMinutes ?? 25),
      };
      if (!payload.title) {
        sendJson(res, 400, { error: "title is required" });
        return;
      }
      const { data, error } = await db.from("tasks").insert(payload).select("*").single();
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
      if (body.title !== undefined) patch.title = String(body.title);
      if (body.description !== undefined) patch.description = String(body.description);
      if (body.urgency !== undefined) patch.urgency = Number(body.urgency);
      if (body.importance !== undefined) patch.importance = Number(body.importance);
      if (body.priority !== undefined) patch.priority = Number(body.priority);
      if (body.completed !== undefined) patch.completed = Boolean(body.completed);
      if (body.dueDate !== undefined) patch.due_date = body.dueDate ? String(body.dueDate) : null;
      if (body.estimatedMinutes !== undefined) patch.estimated_minutes = Number(body.estimatedMinutes);

      const { data, error } = await db
        .from("tasks")
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
      const id =
        typeof req.query?.id === "string"
          ? req.query.id
          : String((req.body ?? {}).id ?? "");
      if (!id) {
        sendJson(res, 400, { error: "id is required" });
        return;
      }
      const { error } = await db.from("tasks").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message ?? "Task API failed" });
  }
}


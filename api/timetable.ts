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
        .from("timetable_entries")
        .select("*")
        .eq("user_id", userId)
        .order("day", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      sendJson(res, 200, { items: data ?? [] });
      return;
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const payload = {
        id: String(body.id ?? `${Date.now()}`),
        user_id: userId,
        course_name: String(body.courseName ?? "").trim(),
        course_code: String(body.courseCode ?? ""),
        day: String(body.day ?? "Monday"),
        start_time: String(body.startTime ?? ""),
        end_time: String(body.endTime ?? ""),
        location: String(body.location ?? ""),
        instructor: String(body.instructor ?? ""),
      };
      if (!payload.course_name || !payload.start_time || !payload.end_time) {
        sendJson(res, 400, { error: "courseName, startTime, endTime are required" });
        return;
      }
      const { data, error } = await db.from("timetable_entries").upsert(payload).select("*").single();
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
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.courseName !== undefined) patch.course_name = String(body.courseName).trim();
      if (body.courseCode !== undefined) patch.course_code = String(body.courseCode ?? "");
      if (body.day !== undefined) patch.day = String(body.day);
      if (body.startTime !== undefined) patch.start_time = String(body.startTime);
      if (body.endTime !== undefined) patch.end_time = String(body.endTime);
      if (body.location !== undefined) patch.location = String(body.location ?? "");
      if (body.instructor !== undefined) patch.instructor = String(body.instructor ?? "");
      const { data, error } = await db
        .from("timetable_entries")
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
      const id = typeof req.query?.id === "string" ? req.query.id : String(req.body?.id ?? "");
      if (!id) {
        sendJson(res, 400, { error: "id is required" });
        return;
      }
      const { error } = await db.from("timetable_entries").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message ?? "Timetable API failed" });
  }
}

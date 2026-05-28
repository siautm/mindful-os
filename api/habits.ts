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
      const [{ data: habits, error: hErr }, { data: days, error: dErr }] = await Promise.all([
        db.from("habits").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        db.from("habit_completions").select("*").eq("user_id", userId).order("ymd", { ascending: false }),
      ]);
      if (hErr) throw hErr;
      if (dErr) throw dErr;
      sendJson(res, 200, {
        habits:
          (habits ?? []).map((h) => ({
            id: h.id,
            name: h.name,
            description: h.description ?? "",
            createdAt: h.created_at,
          })) ?? [],
        habitDays:
          (days ?? []).map((x) => ({
            habitId: x.habit_id,
            date: x.ymd,
          })) ?? [],
      });
      return;
    }

    // Snapshot write from current UI model
    if (req.method === "POST") {
      const habits = Array.isArray(req.body?.habits) ? req.body.habits : [];
      const habitDays = Array.isArray(req.body?.habitDays) ? req.body.habitDays : [];

      const habitRows = habits.map((h: any) => ({
        id: String(h.id),
        user_id: userId,
        name: String(h.name ?? "Habit"),
        description: String(h.description ?? ""),
        created_at: h.createdAt ? String(h.createdAt) : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const dayRows = habitDays
        .filter((x: any) => typeof x?.habitId === "string" && typeof x?.date === "string")
        .map((x: any) => ({
          user_id: userId,
          habit_id: String(x.habitId),
          ymd: String(x.date),
        }));

      const keepHabitIds = new Set(habitRows.map((x: any) => x.id));

      const { data: existingHabits, error: exHabitsErr } = await db
        .from("habits")
        .select("id")
        .eq("user_id", userId);
      if (exHabitsErr) throw exHabitsErr;
      const removeHabitIds = (existingHabits ?? [])
        .map((x: any) => String(x.id))
        .filter((id: string) => !keepHabitIds.has(id));
      if (removeHabitIds.length > 0) {
        const { error } = await db.from("habits").delete().eq("user_id", userId).in("id", removeHabitIds);
        if (error) throw error;
      }

      // Reset day rows for user (simple and deterministic)
      const { error: wipeDaysErr } = await db.from("habit_completions").delete().eq("user_id", userId);
      if (wipeDaysErr) throw wipeDaysErr;

      if (habitRows.length > 0) {
        const { error } = await db.from("habits").upsert(habitRows);
        if (error) throw error;
      }
      if (dayRows.length > 0) {
        const { error } = await db.from("habit_completions").upsert(dayRows);
        if (error) throw error;
      }

      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message ?? "Habits API failed" });
  }
}

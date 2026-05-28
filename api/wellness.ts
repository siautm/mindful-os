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
      const [checkinsRes, sleepRes, medRes, exRes, weightRes] = await Promise.all([
        db.from("checkins").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(365),
        db.from("sleep_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }).limit(1000),
        db.from("meditation_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }).limit(1000),
        db.from("exercise_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }).limit(1000),
        db.from("weight_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }).limit(1000),
      ]);
      if (checkinsRes.error) throw checkinsRes.error;
      if (sleepRes.error) throw sleepRes.error;
      if (medRes.error) throw medRes.error;
      if (exRes.error) throw exRes.error;
      if (weightRes.error) throw weightRes.error;

      sendJson(res, 200, {
        checkIns: (checkinsRes.data ?? []).map((x: any) => ({
          id: String(x.id),
          date: String(x.date),
          mood: String(x.mood ?? "neutral"),
          energy: Number(x.energy ?? 3),
          intention: String(x.intention ?? ""),
          gratitude: String(x.gratitude ?? ""),
          note: String(x.note ?? ""),
        })),
        sleepEntries: (sleepRes.data ?? []).map((x: any) => ({
          id: String(x.id),
          date: String(x.entry_date),
          bedTime: String(x.bed_time ?? ""),
          wakeTime: x.wake_time ? String(x.wake_time) : undefined,
          duration: x.duration != null ? Number(x.duration) : undefined,
          quality: x.quality != null ? Number(x.quality) : undefined,
          notes: String(x.notes ?? ""),
        })),
        meditationEntries: (medRes.data ?? []).map((x: any) => ({
          id: String(x.id),
          date: String(x.entry_date),
          duration: Number(x.duration ?? 0),
          type: String(x.type ?? "mindfulness"),
          notes: String(x.notes ?? ""),
        })),
        exerciseEntries: (exRes.data ?? []).map((x: any) => ({
          id: String(x.id),
          date: String(x.entry_date),
          type: String(x.type ?? ""),
          duration: x.duration != null ? Number(x.duration) : undefined,
          times: Number(x.times ?? 1),
          calories: x.calories != null ? Number(x.calories) : undefined,
          notes: String(x.notes ?? ""),
        })),
        weightEntries: (weightRes.data ?? []).map((x: any) => ({
          id: String(x.id),
          date: String(x.entry_date),
          weight: Number(x.weight ?? 0),
          unit: String(x.unit ?? "kg"),
          bodyFat: x.body_fat != null ? Number(x.body_fat) : undefined,
          notes: String(x.notes ?? ""),
        })),
      });
      return;
    }

    if (req.method === "POST") {
      const checkIns = Array.isArray(req.body?.checkIns) ? req.body.checkIns : [];
      const sleepEntries = Array.isArray(req.body?.sleepEntries) ? req.body.sleepEntries : [];
      const meditationEntries = Array.isArray(req.body?.meditationEntries) ? req.body.meditationEntries : [];
      const exerciseEntries = Array.isArray(req.body?.exerciseEntries) ? req.body.exerciseEntries : [];
      const weightEntries = Array.isArray(req.body?.weightEntries) ? req.body.weightEntries : [];

      const toUuid = (id: string) => {
        const v = String(id ?? "").trim();
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
          ? v
          : null;
      };

      // checkins snapshot
      const { error: delCheckinsErr } = await db.from("checkins").delete().eq("user_id", userId);
      if (delCheckinsErr) throw delCheckinsErr;
      const checkinRows = checkIns
        .map((x: any) => ({
          id: toUuid(String(x.id ?? "")) ?? crypto.randomUUID(),
          user_id: userId,
          date: x.date ? String(x.date) : new Date().toISOString(),
          mood: String(x.mood ?? "neutral"),
          energy: Number(x.energy ?? 3),
          intention: String(x.intention ?? ""),
          gratitude: String(x.gratitude ?? ""),
          note: String(x.note ?? ""),
        }))
        ;
      if (checkinRows.length > 0) {
        const { error } = await db.from("checkins").upsert(checkinRows);
        if (error) throw error;
      }

      const wipeAndUpsert = async (table: string, rows: any[]) => {
        const { error: delErr } = await db.from(table).delete().eq("user_id", userId);
        if (delErr) throw delErr;
        if (rows.length > 0) {
          const { error } = await db.from(table).upsert(rows);
          if (error) throw error;
        }
      };

      await wipeAndUpsert(
        "sleep_entries",
        sleepEntries.map((x: any) => ({
          id: String(x.id ?? `${Date.now()}`),
          user_id: userId,
          entry_date: x.date ? String(x.date) : new Date().toISOString(),
          bed_time: String(x.bedTime ?? ""),
          wake_time: x.wakeTime ? String(x.wakeTime) : null,
          duration: x.duration != null ? Number(x.duration) : null,
          quality: x.quality != null ? Number(x.quality) : null,
          notes: String(x.notes ?? ""),
          updated_at: new Date().toISOString(),
        }))
      );

      await wipeAndUpsert(
        "meditation_entries",
        meditationEntries.map((x: any) => ({
          id: String(x.id ?? `${Date.now()}`),
          user_id: userId,
          entry_date: x.date ? String(x.date) : new Date().toISOString(),
          duration: Number(x.duration ?? 0),
          type: String(x.type ?? "mindfulness"),
          notes: String(x.notes ?? ""),
          updated_at: new Date().toISOString(),
        }))
      );

      await wipeAndUpsert(
        "exercise_entries",
        exerciseEntries.map((x: any) => ({
          id: String(x.id ?? `${Date.now()}`),
          user_id: userId,
          entry_date: x.date ? String(x.date) : new Date().toISOString(),
          type: String(x.type ?? ""),
          duration: x.duration != null ? Number(x.duration) : null,
          times: Math.max(1, Number(x.times ?? 1)),
          calories: x.calories != null ? Number(x.calories) : null,
          notes: String(x.notes ?? ""),
          updated_at: new Date().toISOString(),
        }))
      );

      await wipeAndUpsert(
        "weight_entries",
        weightEntries.map((x: any) => ({
          id: String(x.id ?? `${Date.now()}`),
          user_id: userId,
          entry_date: x.date ? String(x.date) : new Date().toISOString(),
          weight: Number(x.weight ?? 0),
          unit: String(x.unit ?? "kg"),
          body_fat: x.bodyFat != null ? Number(x.bodyFat) : null,
          notes: String(x.notes ?? ""),
          updated_at: new Date().toISOString(),
        }))
      );

      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message ?? "Wellness API failed" });
  }
}

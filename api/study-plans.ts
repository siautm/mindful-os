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
      const [{ data: plans, error: plansErr }, { data: parts, error: partsErr }] = await Promise.all([
        db.from("study_plans").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        db.from("study_plan_parts").select("*").eq("user_id", userId).order("part_order", { ascending: true }),
      ]);
      if (plansErr) throw plansErr;
      if (partsErr) throw partsErr;

      const partsByPlan = new Map<string, any[]>();
      for (const p of parts ?? []) {
        const list = partsByPlan.get(p.plan_id) ?? [];
        list.push(p);
        partsByPlan.set(p.plan_id, list);
      }

      const items = (plans ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        durationHours: Number(p.duration_hours ?? 1),
        createdAt: p.created_at,
        parts: (partsByPlan.get(p.id) ?? []).map((x) => ({
          id: x.id,
          title: x.title,
          detail: x.detail ?? "",
          order: Number(x.part_order ?? 0),
          completed: Boolean(x.completed),
        })),
      }));
      sendJson(res, 200, { items });
      return;
    }

    // Snapshot upsert from current UI model: { plans: StudyPlan[] }
    if (req.method === "POST") {
      const incoming = Array.isArray(req.body?.plans) ? req.body.plans : [];
      const planRows = incoming.map((p: any) => ({
        id: String(p.id),
        user_id: userId,
        name: String(p.name ?? "Untitled Plan"),
        description: String(p.description ?? ""),
        duration_hours: Number(p.durationHours ?? 1),
        created_at: p.createdAt ? String(p.createdAt) : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const partRows = incoming.flatMap((p: any) =>
        (Array.isArray(p.parts) ? p.parts : []).map((part: any) => ({
          id: String(part.id),
          user_id: userId,
          plan_id: String(p.id),
          title: String(part.title ?? "Part"),
          detail: String(part.detail ?? ""),
          part_order: Number(part.order ?? 0),
          completed: Boolean(part.completed),
          updated_at: new Date().toISOString(),
        }))
      );

      const keepPlanIds = new Set(planRows.map((x: any) => x.id));
      const keepPartIds = new Set(partRows.map((x: any) => x.id));

      const { data: existingPlans, error: existingPlansErr } = await db
        .from("study_plans")
        .select("id")
        .eq("user_id", userId);
      if (existingPlansErr) throw existingPlansErr;

      const existingPlanIds = (existingPlans ?? []).map((x: any) => String(x.id));
      const removePlanIds = existingPlanIds.filter((id: string) => !keepPlanIds.has(id));
      if (removePlanIds.length > 0) {
        const { error } = await db.from("study_plans").delete().eq("user_id", userId).in("id", removePlanIds);
        if (error) throw error;
      }

      const { data: existingParts, error: existingPartsErr } = await db
        .from("study_plan_parts")
        .select("id")
        .eq("user_id", userId);
      if (existingPartsErr) throw existingPartsErr;

      const existingPartIds = (existingParts ?? []).map((x: any) => String(x.id));
      const removePartIds = existingPartIds.filter((id: string) => !keepPartIds.has(id));
      if (removePartIds.length > 0) {
        const { error } = await db
          .from("study_plan_parts")
          .delete()
          .eq("user_id", userId)
          .in("id", removePartIds);
        if (error) throw error;
      }

      if (planRows.length > 0) {
        const { error } = await db.from("study_plans").upsert(planRows);
        if (error) throw error;
      }
      if (partRows.length > 0) {
        const { error } = await db.from("study_plan_parts").upsert(partRows);
        if (error) throw error;
      }

      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  } catch (error: any) {
    sendJson(res, 500, { error: error?.message ?? "Study plans API failed" });
  }
}

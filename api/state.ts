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
        .from("app_state")
        .select("state_key, state_value")
        .eq("user_id", userId);
      if (error) throw error;

      const state: Record<string, unknown> = {};
      for (const row of data ?? []) {
        state[row.state_key] = row.state_value;
      }
      sendJson(res, 200, { state });
      return;
    }

    if (req.method === "POST") {
      const key = String(req.body?.key ?? "").trim();
      const value = req.body?.value;
      if (!key) {
        sendJson(res, 400, { error: "key is required" });
        return;
      }

      const { data, error } = await db
        .from("app_state")
        .upsert(
          { user_id: userId, state_key: key, state_value: value ?? null },
          { onConflict: "user_id,state_key" }
        )
        .select("state_key")
        .single();
      if (error) throw error;

      sendJson(res, 200, { ok: true, key: data?.state_key ?? key });
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  } catch (error: any) {
    const code = error?.code ? String(error.code) : undefined;
    if (code === "42P01") {
      sendJson(res, 500, {
        error:
          "Supabase table app_state is missing. Run supabase/schema.sql in Supabase SQL Editor, then redeploy.",
      });
      return;
    }
    sendJson(res, 500, { error: error?.message ?? "State API failed" });
  }
}


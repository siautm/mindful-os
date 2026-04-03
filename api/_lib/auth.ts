import { getSupabaseAdmin } from "./supabase.js";
import { getBearerToken, sendJson } from "./http.js";

export async function requireUserId(req: any, res: any): Promise<string | null> {
  const token = getBearerToken(req);
  if (!token) {
    sendJson(res, 401, {
      error: "Missing Authorization bearer token.",
    });
    return null;
  }

  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) {
      sendJson(res, 401, {
        error: "Invalid or expired auth token.",
        detail: error?.message ?? null,
      });
      return null;
    }
    return data.user.id;
  } catch (error) {
    sendJson(res, 500, { error: "Failed to verify auth token.", detail: String(error) });
    return null;
  }
}


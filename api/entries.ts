import { requireUserId } from "./_lib/auth.js";
import { handleOptions, sendJson } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase.js";

/** Hidden default type — UI only uses title, photo, tags, metadata. */
export const DEFAULT_ENTRY_TYPE = "record";

const DEFAULT_TYPES = [
  { id: DEFAULT_ENTRY_TYPE, type_key: "record", label: "Record", sort_order: 0 },
] as const;

async function ensureDefaultCatalog(db: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data: existing } = await db.from("entry_types").select("id").eq("user_id", userId).limit(1);
  if ((existing ?? []).length > 0) return;

  for (const t of DEFAULT_TYPES) {
    await db.from("entry_types").upsert({
      id: t.id,
      user_id: userId,
      type_key: t.type_key,
      label: t.label,
      sort_order: t.sort_order,
    });
  }
}

function collectKeyCatalog(
  types: Array<{ id: string }>,
  fields: Array<{ type_id: string; field_key: string }>,
  entries: Array<{ type_id: string; metadata: Record<string, unknown> }>
): Record<string, string[]> {
  const catalog: Record<string, Set<string>> = {};
  for (const t of types) catalog[t.id] = new Set();
  for (const f of fields) {
    const k = String(f.field_key ?? "").trim();
    if (k && catalog[f.type_id]) catalog[f.type_id].add(k);
  }
  for (const e of entries) {
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(meta)) {
      const key = k.trim();
      if (key && catalog[e.type_id]) catalog[e.type_id].add(key);
    }
  }
  const out: Record<string, string[]> = {};
  for (const [typeId, set] of Object.entries(catalog)) {
    out[typeId] = Array.from(set).sort((a, b) => a.localeCompare(b));
  }
  return out;
}

function mapEntry(row: Record<string, unknown>) {
  const photoRaw = row.photo_url;
  return {
    id: String(row.id),
    typeId: String(row.type_id),
    title: String(row.title ?? ""),
    note: String(row.note ?? ""),
    photoUrl: photoRaw != null && String(photoRaw).trim() ? String(photoRaw) : undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    isPinned: Boolean(row.is_pinned),
    entryAt: String(row.entry_at ?? row.created_at ?? new Date().toISOString()),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export default async function handler(req: any, res: any) {
  if (handleOptions(req, res)) return;
  const userId = await requireUserId(req, res);
  if (!userId) return;

  const db = getSupabaseAdmin();

  try {
    if (req.method === "GET") {
      await ensureDefaultCatalog(db, userId);

      const [typesRes, fieldsRes, presetsRes, entriesRes] = await Promise.all([
        db.from("entry_types").select("*").eq("user_id", userId).order("sort_order"),
        db.from("entry_type_fields").select("*").eq("user_id", userId).order("sort_order"),
        db.from("entry_type_presets").select("*").eq("user_id", userId),
        db.from("entries").select("*").eq("user_id", userId).order("is_pinned", { ascending: false }).order("updated_at", { ascending: false }),
      ]);
      if (typesRes.error) throw typesRes.error;
      if (fieldsRes.error) throw fieldsRes.error;
      if (presetsRes.error) throw presetsRes.error;
      if (entriesRes.error) throw entriesRes.error;

      const types = (typesRes.data ?? []).map((t) => ({
        id: t.id,
        typeKey: t.type_key,
        label: t.label,
        sortOrder: t.sort_order,
      }));
      const entries = (entriesRes.data ?? []).map((e) => mapEntry(e as Record<string, unknown>));
      const keyCatalog = collectKeyCatalog(
        types,
        fieldsRes.data ?? [],
        (entriesRes.data ?? []) as Array<{ type_id: string; metadata: Record<string, unknown> }>
      );

      sendJson(res, 200, {
        types,
        fields: (fieldsRes.data ?? []).map((f) => ({
          id: f.id,
          typeId: f.type_id,
          fieldKey: f.field_key,
          label: f.label,
          valueKind: f.value_kind,
          allowPreset: f.allow_preset,
          sortOrder: f.sort_order,
        })),
        presets: (presetsRes.data ?? []).map((p) => ({
          typeId: p.type_id,
          fieldKey: p.field_key,
          value: p.preset_value,
        })),
        keyCatalog,
        entries,
      });
      return;
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const action = String(body.action ?? "create_entry");

      if (action === "remember_key") {
        const typeId = String(body.typeId ?? DEFAULT_ENTRY_TYPE);
        const fieldKey = String(body.fieldKey ?? "").trim().toLowerCase().replace(/\s+/g, "_");
        const label = String(body.label ?? body.fieldKey ?? fieldKey).trim();
        if (!typeId || !fieldKey) {
          sendJson(res, 400, { error: "typeId and fieldKey required" });
          return;
        }
        const { error } = await db.from("entry_type_fields").upsert({
          id: `${typeId}_${fieldKey}`,
          user_id: userId,
          type_id: typeId,
          field_key: fieldKey,
          label: label || fieldKey,
          value_kind: "text",
          allow_preset: false,
          sort_order: 99,
        });
        if (error) throw error;
        sendJson(res, 200, { ok: true });
        return;
      }

      if (action === "create_type") {
        const typeKey = String(body.typeKey ?? "").trim().toLowerCase().replace(/\s+/g, "_");
        const label = String(body.label ?? "").trim();
        if (!typeKey || !label) {
          sendJson(res, 400, { error: "typeKey and label required" });
          return;
        }
        const typeId = typeKey;
        await db.from("entry_types").upsert({
          id: typeId,
          user_id: userId,
          type_key: typeKey,
          label,
          sort_order: Number(body.sortOrder ?? 99),
        });
        const fields = Array.isArray(body.fields) ? body.fields : [];
        for (let i = 0; i < fields.length; i++) {
          const f = fields[i] as Record<string, unknown>;
          const fieldKey = String(f.fieldKey ?? "").trim();
          if (!fieldKey) continue;
          await db.from("entry_type_fields").upsert({
            id: `${typeId}_${fieldKey}`,
            user_id: userId,
            type_id: typeId,
            field_key: fieldKey,
            label: String(f.label ?? fieldKey),
            value_kind: String(f.valueKind ?? "text"),
            allow_preset: Boolean(f.allowPreset),
            sort_order: i,
          });
        }
        sendJson(res, 201, { ok: true, typeId });
        return;
      }

      const typeId = String(body.typeId ?? DEFAULT_ENTRY_TYPE);
      const title = String(body.title ?? "").trim();
      if (!title) {
        sendJson(res, 400, { error: "title required" });
        return;
      }

      const metadata =
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : {};

      const payload: Record<string, unknown> = {
        id: String(body.id ?? "").trim() || `${Date.now()}`,
        user_id: userId,
        type_id: typeId,
        title,
        note: "",
        tags: Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [],
        metadata,
        is_pinned: Boolean(body.isPinned),
        entry_at: body.entryAt ? String(body.entryAt) : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (body.photoUrl !== undefined) {
        const url = String(body.photoUrl ?? "").trim();
        payload.photo_url = url || null;
      }

      const { data, error } = await db.from("entries").upsert(payload).select("*").single();
      if (error) throw error;
      sendJson(res, 201, { item: mapEntry(data as Record<string, unknown>) });
      return;
    }

    if (req.method === "PATCH") {
      const body = req.body ?? {};
      const id = String(body.id ?? "");
      if (!id) {
        sendJson(res, 400, { error: "id required" });
        return;
      }
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.title !== undefined) patch.title = String(body.title).trim();
      if (body.tags !== undefined) {
        patch.tags = Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [];
      }
      if (body.metadata !== undefined) patch.metadata = body.metadata;
      if (body.isPinned !== undefined) patch.is_pinned = Boolean(body.isPinned);
      if (body.entryAt !== undefined) patch.entry_at = String(body.entryAt);
      if (body.photoUrl !== undefined) {
        const url = String(body.photoUrl ?? "").trim();
        patch.photo_url = url || null;
      }

      const { data, error } = await db
        .from("entries")
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;
      sendJson(res, 200, { item: mapEntry(data as Record<string, unknown>) });
      return;
    }

    if (req.method === "DELETE") {
      const id = typeof req.query?.id === "string" ? req.query.id : String((req.body ?? {}).id ?? "");
      if (!id) {
        sendJson(res, 400, { error: "id required" });
        return;
      }
      const { error } = await db.from("entries").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method Not Allowed" });
  } catch (error: any) {
    const code = error?.code ? String(error.code) : undefined;
    if (code === "42P01") {
      sendJson(res, 500, {
        error: "Entries tables missing. Run supabase/schema_entries.sql and rls_policies_entries.sql in Supabase.",
      });
      return;
    }
    sendJson(res, 500, { error: error?.message ?? "Entries API failed" });
  }
}

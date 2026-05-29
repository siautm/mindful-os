import { requireUserId } from "./_lib/auth.js";
import { handleOptions, sendJson } from "./_lib/http.js";
import { getSupabaseAdmin } from "./_lib/supabase.js";

const DEFAULT_CATALOG = [
  {
    id: "recipe",
    type_key: "recipe",
    label: "Recipe",
    sort_order: 0,
    fields: [
      { id: "recipe_ingredients", field_key: "ingredients", label: "Ingredients", value_kind: "list", allow_preset: false, sort_order: 0 },
      { id: "recipe_cook_time", field_key: "cook_time", label: "Cook time (min)", value_kind: "number", allow_preset: true, sort_order: 1 },
      { id: "recipe_steps", field_key: "steps", label: "Steps", value_kind: "mindmap_list", allow_preset: false, sort_order: 2 },
      { id: "recipe_allergy", field_key: "allergy", label: "Allergy notes", value_kind: "list", allow_preset: true, sort_order: 3 },
      { id: "recipe_dislike_by", field_key: "dislike_by", label: "Disliked by (this entry only)", value_kind: "text", allow_preset: false, sort_order: 4 },
    ],
    presets: [{ field_key: "allergy", preset_value: [] }, { field_key: "cook_time", preset_value: null }],
  },
  {
    id: "book_note",
    type_key: "book_note",
    label: "Book notes",
    sort_order: 1,
    fields: [
      { id: "book_author", field_key: "author", label: "Author", value_kind: "text", allow_preset: false, sort_order: 0 },
      { id: "book_rating", field_key: "rating", label: "Rating (1-5)", value_kind: "number", allow_preset: false, sort_order: 1 },
      { id: "book_quotes", field_key: "quotes", label: "Quotes", value_kind: "list", allow_preset: false, sort_order: 2 },
    ],
    presets: [],
  },
  {
    id: "learning",
    type_key: "learning",
    label: "Learning",
    sort_order: 2,
    fields: [
      { id: "learning_source", field_key: "source", label: "Source", value_kind: "text", allow_preset: false, sort_order: 0 },
      { id: "learning_url", field_key: "url", label: "URL", value_kind: "text", allow_preset: false, sort_order: 1 },
      { id: "learning_key_points", field_key: "key_points", label: "Key points", value_kind: "mindmap_list", allow_preset: false, sort_order: 2 },
    ],
    presets: [],
  },
] as const;

async function ensureDefaultCatalog(db: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  const { data: existing } = await db.from("entry_types").select("id").eq("user_id", userId).limit(1);
  if ((existing ?? []).length > 0) return;

  for (const t of DEFAULT_CATALOG) {
    await db.from("entry_types").upsert({
      id: t.id,
      user_id: userId,
      type_key: t.type_key,
      label: t.label,
      sort_order: t.sort_order,
    });
    for (const f of t.fields) {
      await db.from("entry_type_fields").upsert({
        id: f.id,
        user_id: userId,
        type_id: t.id,
        field_key: f.field_key,
        label: f.label,
        value_kind: f.value_kind,
        allow_preset: f.allow_preset,
        sort_order: f.sort_order,
      });
    }
    for (const p of t.presets) {
      await db.from("entry_type_presets").upsert({
        user_id: userId,
        type_id: t.id,
        field_key: p.field_key,
        preset_value: p.preset_value,
        updated_at: new Date().toISOString(),
      });
    }
  }
}

function mapEntry(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    typeId: String(row.type_id),
    title: String(row.title ?? ""),
    note: String(row.note ?? ""),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    isPinned: Boolean(row.is_pinned),
    entryAt: String(row.entry_at ?? row.created_at ?? new Date().toISOString()),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mergePresetsIntoMetadata(
  metadata: Record<string, unknown>,
  typeId: string,
  fields: Array<{ type_id: string; field_key: string; allow_preset: boolean }>,
  presets: Array<{ type_id: string; field_key: string; preset_value: unknown }>
) {
  const next = { ...metadata };
  for (const f of fields) {
    if (f.type_id !== typeId || !f.allow_preset) continue;
    if (next[f.field_key] !== undefined) continue;
    const p = presets.find((x) => x.type_id === typeId && x.field_key === f.field_key);
    if (p) next[f.field_key] = p.preset_value;
  }
  return next;
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

      sendJson(res, 200, {
        types: (typesRes.data ?? []).map((t) => ({
          id: t.id,
          typeKey: t.type_key,
          label: t.label,
          sortOrder: t.sort_order,
        })),
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
        entries: (entriesRes.data ?? []).map((e) => mapEntry(e as Record<string, unknown>)),
      });
      return;
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const action = String(body.action ?? "create_entry");

      if (action === "update_preset") {
        const typeId = String(body.typeId ?? "");
        const fieldKey = String(body.fieldKey ?? "");
        if (!typeId || !fieldKey) {
          sendJson(res, 400, { error: "typeId and fieldKey required" });
          return;
        }
        const { error } = await db.from("entry_type_presets").upsert({
          user_id: userId,
          type_id: typeId,
          field_key: fieldKey,
          preset_value: body.value ?? null,
          updated_at: new Date().toISOString(),
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

      const typeId = String(body.typeId ?? "");
      const title = String(body.title ?? "").trim();
      if (!typeId || !title) {
        sendJson(res, 400, { error: "typeId and title required" });
        return;
      }

      const [fieldsRes, presetsRes] = await Promise.all([
        db.from("entry_type_fields").select("type_id, field_key, allow_preset").eq("user_id", userId).eq("type_id", typeId),
        db.from("entry_type_presets").select("type_id, field_key, preset_value").eq("user_id", userId).eq("type_id", typeId),
      ]);
      if (fieldsRes.error) throw fieldsRes.error;
      if (presetsRes.error) throw presetsRes.error;

      const metadataIn = (body.metadata && typeof body.metadata === "object" ? body.metadata : {}) as Record<string, unknown>;
      const metadata = mergePresetsIntoMetadata(metadataIn, typeId, fieldsRes.data ?? [], presetsRes.data ?? []);

      const payload = {
        id: String(body.id ?? "").trim() || `${Date.now()}`,
        user_id: userId,
        type_id: typeId,
        title,
        note: String(body.note ?? ""),
        tags: Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [],
        metadata,
        is_pinned: Boolean(body.isPinned),
        entry_at: body.entryAt ? String(body.entryAt) : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

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
      if (body.note !== undefined) patch.note = String(body.note ?? "");
      if (body.tags !== undefined) {
        patch.tags = Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean) : [];
      }
      if (body.metadata !== undefined) patch.metadata = body.metadata;
      if (body.isPinned !== undefined) patch.is_pinned = Boolean(body.isPinned);
      if (body.entryAt !== undefined) patch.entry_at = String(body.entryAt);
      if (body.typeId !== undefined) patch.type_id = String(body.typeId);

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

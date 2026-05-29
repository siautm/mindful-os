import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft,
  BookMarked,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useStorageHydration } from "../lib/useStorageHydration";
import { toast } from "sonner";
import {
  applyPresetsToMetadata,
  emptyMetadataForFields,
  entrySearchBlob,
  mindmapListToText,
  parseMindmapListText,
  readEntriesCache,
  saveEntriesCache,
  type EntryCatalog,
  type EntryTypeField,
  type KnowledgeEntry,
} from "../lib/entryTypes";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || "";
const ENTRIES_ENDPOINT = `${API_BASE}/api/entries`;

function MindmapPreview({ value }: { value: unknown }) {
  const text = mindmapListToText(value);
  if (!text) return <p className="text-xs text-gray-500 italic">No steps yet</p>;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm space-y-2">
      {text.split("\n").map((line, i) => (
        <div
          key={i}
          className={line.startsWith("  -") ? "ml-6 text-gray-600" : "font-medium text-gray-900"}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

export function Entries() {
  const { session } = useAuth();
  const [catalog, setCatalog] = useState<EntryCatalog>({ types: [], fields: [], presets: [] });
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeEntry | null>(null);
  const [draft, setDraft] = useState<Partial<KnowledgeEntry>>({});
  const [tagInput, setTagInput] = useState("");
  const [mindmapDrafts, setMindmapDrafts] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      const cached = readEntriesCache();
      if (cached.catalog) setCatalog(cached.catalog);
      setEntries(cached.entries);
      return;
    }
    try {
      const res = await fetch(ENTRIES_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        types?: EntryCatalog["types"];
        fields?: EntryCatalog["fields"];
        presets?: EntryCatalog["presets"];
        entries?: KnowledgeEntry[];
      };
      const nextCatalog: EntryCatalog = {
        types: json.types ?? [],
        fields: json.fields ?? [],
        presets: json.presets ?? [],
      };
      const nextEntries = json.entries ?? [];
      setCatalog(nextCatalog);
      setEntries(nextEntries);
      saveEntriesCache(nextCatalog, nextEntries);
    } catch {
      const cached = readEntriesCache();
      if (cached.catalog) setCatalog(cached.catalog);
      setEntries(cached.entries);
      toast.error("Could not load entries from cloud.");
    }
  }, [session?.access_token]);

  useStorageHydration(loadAll);

  const typeLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of catalog.types) m.set(t.id, t.label);
    return m;
  }, [catalog.types]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== "all" && e.typeId !== typeFilter) return false;
      if (!q) return true;
      return entrySearchBlob(e, typeLabelById.get(e.typeId) ?? "").includes(q);
    });
  }, [entries, query, typeFilter, typeLabelById]);

  const fieldsForType = useCallback(
    (typeId: string) => catalog.fields.filter((f) => f.typeId === typeId).sort((a, b) => a.sortOrder - b.sortOrder),
    [catalog.fields]
  );

  async function apiJson(method: string, body?: Record<string, unknown>) {
    const token = session?.access_token;
    if (!token) throw new Error("Not signed in");
    const res = await fetch(ENTRIES_ENDPOINT, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json();
  }

  function openCreate(typeId?: string) {
    const tid = typeId ?? catalog.types[0]?.id ?? "recipe";
    const meta = applyPresetsToMetadata(
      emptyMetadataForFields(catalog.fields, tid),
      tid,
      catalog.fields,
      catalog.presets
    );
    setEditing(null);
    setDraft({
      typeId: tid,
      title: "",
      note: "",
      tags: [],
      metadata: meta,
      isPinned: false,
      entryAt: new Date().toISOString(),
    });
    setMindmapDrafts({});
    setEditorOpen(true);
  }

  function openEdit(entry: KnowledgeEntry) {
    setEditing(entry);
    setDraft({ ...entry });
    const drafts: Record<string, string> = {};
    for (const f of fieldsForType(entry.typeId)) {
      if (f.valueKind === "mindmap_list") {
        drafts[f.fieldKey] = mindmapListToText(entry.metadata[f.fieldKey]);
      }
    }
    setMindmapDrafts(drafts);
    setEditorOpen(true);
  }

  function setMetaField(key: string, value: unknown) {
    setDraft((d) => ({
      ...d,
      metadata: { ...(d.metadata ?? {}), [key]: value },
    }));
  }

  async function saveEntry() {
    const title = String(draft.title ?? "").trim();
    const typeId = String(draft.typeId ?? "");
    if (!title || !typeId) {
      toast.error("Type and title are required");
      return;
    }

    const metadata = { ...(draft.metadata ?? {}) };
    for (const f of fieldsForType(typeId)) {
      if (f.valueKind === "mindmap_list" && mindmapDrafts[f.fieldKey] !== undefined) {
        metadata[f.fieldKey] = parseMindmapListText(mindmapDrafts[f.fieldKey]);
      }
    }

    const payload = {
      id: editing?.id,
      typeId,
      title,
      note: String(draft.note ?? ""),
      tags: draft.tags ?? [],
      metadata,
      isPinned: Boolean(draft.isPinned),
      entryAt: draft.entryAt ?? new Date().toISOString(),
    };

    try {
      if (editing) {
        await apiJson("PATCH", { id: editing.id, ...payload });
        toast.success("Entry updated");
      } else {
        await apiJson("POST", payload);
        toast.success("Entry created");
      }
      setEditorOpen(false);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function deleteEntry(id: string) {
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${ENTRIES_ENDPOINT}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Entry deleted");
      await loadAll();
    } catch {
      toast.error("Delete failed");
    }
  }

  async function savePreset(typeId: string, fieldKey: string, value: unknown) {
    try {
      await apiJson("POST", { action: "update_preset", typeId, fieldKey, value });
      toast.success("Preset saved for future entries");
      await loadAll();
    } catch {
      toast.error("Could not save preset");
    }
  }

  function renderMetadataField(field: EntryTypeField) {
    const typeId = String(draft.typeId ?? "");
    const value = draft.metadata?.[field.fieldKey];

    if (field.valueKind === "mindmap_list") {
      return (
        <div key={field.id} className="space-y-2">
          <Label>{field.label}</Label>
          <Textarea
            rows={6}
            placeholder={"1. Add water\n2. Add sauce\n  - stir slowly"}
            value={mindmapDrafts[field.fieldKey] ?? mindmapListToText(value)}
            onChange={(e) =>
              setMindmapDrafts((m) => ({ ...m, [field.fieldKey]: e.target.value }))
            }
          />
          <MindmapPreview value={parseMindmapListText(mindmapDrafts[field.fieldKey] ?? "")} />
        </div>
      );
    }

    if (field.valueKind === "list") {
      const listVal = Array.isArray(value) ? (value as string[]).join(", ") : "";
      return (
        <div key={field.id} className="space-y-2">
          <Label>{field.label}</Label>
          <Input
            value={listVal}
            placeholder="comma separated"
            onChange={(e) =>
              setMetaField(
                field.fieldKey,
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
          />
          {field.allowPreset && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const list = Array.isArray(draft.metadata?.[field.fieldKey])
                  ? (draft.metadata![field.fieldKey] as string[])
                  : [];
                void savePreset(typeId, field.fieldKey, list);
              }}
            >
              Save as preset for new {typeLabelById.get(typeId)} entries
            </Button>
          )}
        </div>
      );
    }

    if (field.valueKind === "number") {
      return (
        <div key={field.id} className="space-y-2">
          <Label>{field.label}</Label>
          <Input
            type="number"
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) =>
              setMetaField(field.fieldKey, e.target.value === "" ? null : Number(e.target.value))
            }
          />
          {field.allowPreset && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => savePreset(typeId, field.fieldKey, value ?? null)}
            >
              Save as preset
            </Button>
          )}
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
        <Label>
          {field.label}
          {!field.allowPreset && field.fieldKey === "dislike_by" ? " (this entry only)" : ""}
        </Label>
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setMetaField(field.fieldKey, e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BookMarked className="size-8 text-violet-600 shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Entries</h1>
            <p className="text-sm text-gray-600">Recipes, book notes, learning — searchable knowledge base</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="size-4 mr-1" />
              Dashboard
            </Link>
          </Button>
          <Dialog open={presetOpen} onOpenChange={setPresetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="size-4 mr-1" />
                Presets
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Type presets</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-600">
                Presets apply when you create a new entry. You can still override per entry (e.g. dislike_by).
              </p>
              {catalog.types.map((t) => (
                <div key={t.id} className="border rounded-lg p-3 space-y-2">
                  <p className="font-medium">{t.label}</p>
                  {fieldsForType(t.id)
                    .filter((f) => f.allowPreset)
                    .map((f) => {
                      const preset = catalog.presets.find(
                        (p) => p.typeId === t.id && p.fieldKey === f.fieldKey
                      );
                      return (
                        <div key={f.id} className="text-sm space-y-1">
                          <Label>{f.label}</Label>
                          <Input
                            defaultValue={
                              Array.isArray(preset?.value)
                                ? (preset!.value as string[]).join(", ")
                                : preset?.value != null
                                  ? String(preset.value)
                                  : ""
                            }
                            onBlur={(e) => {
                              const v =
                                f.valueKind === "list"
                                  ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                                  : f.valueKind === "number"
                                    ? e.target.value === ""
                                      ? null
                                      : Number(e.target.value)
                                    : e.target.value;
                              void savePreset(t.id, f.fieldKey, v);
                            }}
                          />
                        </div>
                      );
                    })}
                  {fieldsForType(t.id).filter((f) => f.allowPreset).length === 0 && (
                    <p className="text-xs text-gray-500">No preset fields for this type.</p>
                  )}
                </div>
              ))}
            </DialogContent>
          </Dialog>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => openCreate()}>
            <Plus className="size-4 mr-1" />
            New
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search title, note, tags, metadata…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={typeFilter === "all" ? "default" : "outline"}
              onClick={() => setTypeFilter("all")}
            >
              All
            </Button>
            {catalog.types.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={typeFilter === t.id ? "default" : "outline"}
                onClick={() => setTypeFilter(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-12 border border-dashed rounded-xl">
          No entries yet. Create your first recipe or note.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((e) => (
            <li key={e.id}>
              <Card className="hover:border-violet-200 transition-colors cursor-pointer" onClick={() => openEdit(e)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {e.isPinned && <Pin className="size-4 text-amber-500 shrink-0" />}
                        <span className="truncate">{e.title}</span>
                      </CardTitle>
                      <p className="text-sm text-violet-700 mt-0.5">{typeLabelById.get(e.typeId)}</p>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {new Date(e.entryAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {e.note && <p className="text-sm text-gray-700 line-clamp-2">{e.note}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {e.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit entry" : "New entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm"
                value={draft.typeId ?? ""}
                onChange={(e) => {
                  const typeId = e.target.value;
                  const meta = applyPresetsToMetadata(
                    emptyMetadataForFields(catalog.fields, typeId),
                    typeId,
                    catalog.fields,
                    catalog.presets
                  );
                  setDraft((d) => ({ ...d, typeId, metadata: meta }));
                  setMindmapDrafts({});
                }}
              >
                {catalog.types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={draft.title ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                rows={4}
                value={draft.note ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  placeholder="Add tag"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const t = tagInput.trim();
                      if (!t) return;
                      setDraft((d) => ({ ...d, tags: [...(d.tags ?? []), t] }));
                      setTagInput("");
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {(draft.tags ?? []).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      setDraft((d) => ({ ...d, tags: (d.tags ?? []).filter((x) => x !== tag) }))
                    }
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>

            {draft.typeId && (
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-medium text-gray-800">Metadata</p>
                {fieldsForType(String(draft.typeId)).map((f) => renderMetadataField(f))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={() => void saveEntry()}>
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraft((d) => ({ ...d, isPinned: !d.isPinned }))}
              >
                {draft.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => {
                    void deleteEntry(editing.id);
                    setEditorOpen(false);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

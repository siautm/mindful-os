import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, BookMarked, Pin, PinOff, Plus, Search, Trash2, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useStorageHydration } from "../lib/useStorageHydration";
import { toast } from "sonner";
import {
  buildKeySuggestions,
  entrySearchBlob,
  metadataToRows,
  readEntriesCache,
  rowsToMetadata,
  saveEntriesCache,
  type EntryCatalog,
  type KnowledgeEntry,
  type MetadataRow,
} from "../lib/entryTypes";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || "";
const ENTRIES_ENDPOINT = `${API_BASE}/api/entries`;

const emptyCatalog = (): EntryCatalog => ({
  types: [],
  fields: [],
  presets: [],
  keyCatalog: {},
});

export function Entries() {
  const { session } = useAuth();
  const [catalog, setCatalog] = useState<EntryCatalog>(emptyCatalog);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeEntry | null>(null);
  const [draft, setDraft] = useState<Partial<KnowledgeEntry>>({});
  const [metadataRows, setMetadataRows] = useState<MetadataRow[]>([]);
  const [tagInput, setTagInput] = useState("");

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
        keyCatalog?: Record<string, string[]>;
        entries?: KnowledgeEntry[];
      };
      const nextCatalog: EntryCatalog = {
        types: json.types ?? [],
        fields: json.fields ?? [],
        presets: [],
        keyCatalog: json.keyCatalog ?? {},
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

  const keySuggestions = useCallback(
    (typeId: string) => {
      const fromApi = catalog.keyCatalog[typeId] ?? [];
      const merged = buildKeySuggestions(typeId, catalog.fields, entries);
      return Array.from(new Set([...fromApi, ...merged])).sort((a, b) => a.localeCompare(b));
    },
    [catalog.keyCatalog, catalog.fields, entries]
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

  async function rememberKeys(typeId: string, keys: string[]) {
    const unique = Array.from(new Set(keys.map((k) => k.trim()).filter(Boolean)));
    for (const fieldKey of unique) {
      try {
        await apiJson("POST", { action: "remember_key", typeId, fieldKey, label: fieldKey });
      } catch {
        /* non-blocking */
      }
    }
  }

  function openCreate(typeId?: string) {
    const tid = typeId ?? catalog.types[0]?.id ?? "recipe";
    setEditing(null);
    setDraft({
      typeId: tid,
      title: "",
      note: "",
      tags: [],
      metadata: {},
      isPinned: false,
      entryAt: new Date().toISOString(),
    });
    setMetadataRows([]);
    setEditorOpen(true);
  }

  function openEdit(entry: KnowledgeEntry) {
    setEditing(entry);
    setDraft({ ...entry });
    setMetadataRows(metadataToRows(entry.metadata));
    setEditorOpen(true);
  }

  function addMetadataRow() {
    setMetadataRows((rows) => [
      ...rows,
      { id: `row-${Date.now()}`, key: "", value: "" },
    ]);
  }

  function updateMetadataRow(id: string, patch: Partial<MetadataRow>) {
    setMetadataRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeMetadataRow(id: string) {
    setMetadataRows((rows) => rows.filter((r) => r.id !== id));
  }

  async function saveEntry() {
    const title = String(draft.title ?? "").trim();
    const typeId = String(draft.typeId ?? "");
    if (!title || !typeId) {
      toast.error("Type and title are required");
      return;
    }

    const metadata = rowsToMetadata(metadataRows);
    const keys = Object.keys(metadata);

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
      await rememberKeys(typeId, keys);
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

  const draftTypeId = String(draft.typeId ?? "");
  const suggestions = draftTypeId ? keySuggestions(draftTypeId) : [];
  const datalistId = `entry-key-suggestions-${draftTypeId}`;

  return (
    <div className="px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:p-8 md:pb-8 space-y-6 w-full min-w-0 max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BookMarked className="size-8 text-violet-600 shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Entries</h1>
            <p className="text-sm text-gray-600">Add your own fields — ingredients, steps, notes…</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="size-4 mr-1" />
              Dashboard
            </Link>
          </Button>
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
              <Card
                className="hover:border-violet-200 transition-colors cursor-pointer"
                onClick={() => openEdit(e)}
              >
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
                  {Object.keys(e.metadata ?? {}).length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {Object.keys(e.metadata).slice(0, 4).join(" · ")}
                      {Object.keys(e.metadata).length > 4 ? " …" : ""}
                    </p>
                  )}
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
                  setDraft((d) => ({ ...d, typeId: e.target.value }));
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
                rows={3}
                value={draft.note ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                value={tagInput}
                placeholder="Add tag, press Enter"
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

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Metadata</p>
                  <p className="text-xs text-gray-500">
                    Add fields yourself. Pick a saved name or type a new one (e.g. ingredients, steps).
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addMetadataRow}>
                  <Plus className="size-4 mr-1" />
                  Add field
                </Button>
              </div>

              {metadataRows.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-2">No metadata yet — tap Add field.</p>
              ) : (
                <ul className="space-y-3">
                  {metadataRows.map((row) => (
                    <li
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-[minmax(0,9rem)_1fr_auto] gap-2 items-start rounded-lg border border-gray-200 p-2 bg-gray-50/80"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Field</Label>
                        <Input
                          list={datalistId}
                          placeholder="e.g. ingredients"
                          value={row.key}
                          onChange={(e) => updateMetadataRow(row.id, { key: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Content</Label>
                        <Textarea
                          rows={3}
                          placeholder="Value for this field"
                          value={row.value}
                          onChange={(e) => updateMetadataRow(row.id, { value: e.target.value })}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-gray-500 hover:text-red-600 sm:mt-6"
                        aria-label="Remove field"
                        onClick={() => removeMetadataRow(row.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <datalist id={datalistId}>
                {suggestions.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>

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

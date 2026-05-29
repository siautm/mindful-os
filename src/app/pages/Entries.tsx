import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Card, CardContent } from "../components/ui/card";
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
        <button
          type="button"
          onClick={() => openCreate()}
          className="w-full rounded-2xl border border-dashed border-violet-200/80 bg-white/60 py-14 text-center text-sm text-gray-500 transition-all duration-200 hover:border-violet-300 hover:bg-violet-50/40 hover:text-violet-700 active:scale-[0.99]"
        >
          <Plus className="size-5 mx-auto mb-2 text-violet-400" />
          No entries yet — tap to create one
        </button>
      ) : (
        <ul className="space-y-3">
          {filtered.map((e) => {
            const metaKeys = Object.keys(e.metadata ?? {});
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => openEdit(e)}
                  className="w-full text-left rounded-2xl border border-white/80 bg-white shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200/90 hover:shadow-md hover:ring-violet-100 active:translate-y-0 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60"
                >
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          {e.isPinned && <Pin className="size-4 text-amber-500 shrink-0" />}
                          <span className="truncate">{e.title}</span>
                        </h3>
                        <span className="inline-block mt-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                          {typeLabelById.get(e.typeId)}
                        </span>
                      </div>
                      <time className="text-xs text-gray-400 shrink-0 tabular-nums">
                        {new Date(e.entryAt).toLocaleDateString()}
                      </time>
                    </div>
                    {e.note && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-3 leading-relaxed">{e.note}</p>
                    )}
                    {metaKeys.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2 tracking-wide">
                        {metaKeys.slice(0, 4).join(" · ")}
                        {metaKeys.length > 4 ? " …" : ""}
                      </p>
                    )}
                    {e.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {e.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border-violet-100/80 shadow-xl">
          <DialogHeader className="pb-0">
            <DialogTitle className="text-xl">{editing ? "Edit entry" : "New entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
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

            <div className="space-y-3 pt-1">
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full border-violet-200/90 text-violet-700 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 active:scale-95"
                  onClick={addMetadataRow}
                >
                  <Plus className="size-4 mr-1" />
                  Add field
                </Button>
              </div>

              {metadataRows.length > 0 && (
                <ul className="space-y-3">
                  {metadataRows.map((row, index) => (
                    <li
                      key={row.id}
                      className="group relative rounded-2xl border border-violet-100/70 bg-gradient-to-b from-white to-violet-50/20 p-4 shadow-sm ring-1 ring-black/[0.02] transition-all duration-200 hover:border-violet-200 hover:shadow-md focus-within:border-violet-300 focus-within:shadow-md focus-within:ring-violet-100/80"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 size-8 rounded-full text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100"
                        aria-label="Remove field"
                        onClick={() => removeMetadataRow(row.id)}
                      >
                        <X className="size-4" />
                      </Button>
                      <Input
                        list={datalistId}
                        placeholder="Field name"
                        value={row.key}
                        onChange={(e) => updateMetadataRow(row.id, { key: e.target.value })}
                        className="border-0 bg-transparent px-0 pr-10 text-sm font-semibold text-gray-900 shadow-none placeholder:font-normal placeholder:text-gray-400 focus-visible:ring-0"
                      />
                      <Textarea
                        rows={3}
                        placeholder="Content…"
                        value={row.value}
                        onChange={(e) => updateMetadataRow(row.id, { value: e.target.value })}
                        className="mt-2 min-h-[4.5rem] resize-y rounded-xl border-violet-100/60 bg-white/80 text-sm leading-relaxed shadow-none transition-colors focus-visible:border-violet-200 focus-visible:ring-violet-200/50"
                      />
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

            <div className="flex flex-wrap gap-2 pt-1 border-t border-violet-100/60">
              <Button
                className="flex-1 rounded-xl bg-violet-600 shadow-sm transition-all hover:bg-violet-700 active:scale-[0.98]"
                onClick={() => void saveEntry()}
              >
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

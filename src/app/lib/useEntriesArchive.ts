import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useStorageHydration } from "./useStorageHydration";
import {
  buildAllKeySuggestions,
  DEFAULT_ENTRY_TYPE,
  type EntryCatalog,
  type KnowledgeEntry,
} from "./entryTypes";
import { buildEntryMetadata, VISUAL_PAGES_KEY, type VisualPage } from "./visualPages";
import { parseEntriesQuery, entryMatchesSearch } from "./entriesSearch";
import { sortEntries, type EntriesSortMode } from "./entriesSort";
import { pushRecentMetaKey } from "./recentMetaKeys";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || "";
const ENTRIES_ENDPOINT = `${API_BASE}/api/entries`;
export const ENTRIES_PAGE_SIZE = 24;

const emptyCatalog = (): EntryCatalog => ({
  types: [],
  fields: [],
  presets: [],
  keyCatalog: {},
});

export function newEntryId(): string {
  return `${Date.now()}`;
}

export function useEntriesArchive() {
  const { session } = useAuth();
  const [catalog, setCatalog] = useState<EntryCatalog>(emptyCatalog);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<EntriesSortMode>("updated");
  const [page, setPage] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const isSignedIn = Boolean(session?.access_token);

  const loadAll = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setCatalog(emptyCatalog());
      setEntries([]);
      return;
    }
    try {
      const res = await fetch(ENTRIES_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        types?: EntryCatalog["types"];
        fields?: EntryCatalog["fields"];
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
    } catch {
      setCatalog(emptyCatalog());
      setEntries([]);
      toast.error("Could not load records from cloud. Check connection and sign-in.");
    }
  }, [session?.access_token]);

  useStorageHydration(loadAll);

  const allTags = useMemo(
    () => Array.from(new Set(entries.flatMap((e) => e.tags))).sort((a, b) => a.localeCompare(b)),
    [entries]
  );

  const catalogKeySuggestions = useMemo(
    () => buildAllKeySuggestions(catalog.keyCatalog, catalog.fields, entries),
    [catalog.keyCatalog, catalog.fields, entries]
  );

  const keySuggestions = catalogKeySuggestions;

  const parsedQuery = useMemo(() => parseEntriesQuery(query), [query]);

  const filtered = useMemo(() => {
    const list = entries.filter((e) =>
      entryMatchesSearch(e.title, e.tags, parsedQuery.titleQuery, parsedQuery.tagFromQuery, selectedTags)
    );
    return sortEntries(list, sortMode);
  }, [entries, parsedQuery, selectedTags, sortMode]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ENTRIES_PAGE_SIZE));

  const safePage = Math.min(page, Math.max(0, pageCount - 1));

  const paged = useMemo(() => {
    const start = safePage * ENTRIES_PAGE_SIZE;
    return filtered.slice(start, start + ENTRIES_PAGE_SIZE);
  }, [filtered, safePage]);

  const searchNoResults = useMemo(() => {
    const hasFilter =
      query.trim().length > 0 || selectedTags.length > 0 || !!parsedQuery.tagFromQuery;
    return hasFilter && filtered.length === 0;
  }, [query, selectedTags, parsedQuery.tagFromQuery, filtered.length]);

  const dataPointCount = useMemo(
    () => entries.reduce((acc, e) => acc + Object.keys(e.metadata ?? {}).length, 0),
    [entries]
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

  const rememberKeys = useCallback(async (keys: string[]) => {
    const unique = Array.from(new Set(keys.map((k) => k.trim()).filter(Boolean)));
    for (const fieldKey of unique) {
      pushRecentMetaKey(fieldKey);
      try {
        await apiJson("POST", {
          action: "remember_key",
          typeId: DEFAULT_ENTRY_TYPE,
          fieldKey,
          label: fieldKey,
        });
      } catch {
        /* non-blocking */
      }
    }
  }, [session?.access_token]);

  const persistEntry = useCallback(
    async (
      draft: KnowledgeEntry,
      metadataPairs: { key: string; value: string }[],
      visualPages: VisualPage[],
      isNew: boolean
    ) => {
      const title = draft.title.trim();
      if (!title) {
        toast.error("Title is required");
        return false;
      }
      const metadata = buildEntryMetadata(metadataPairs, visualPages);
      const payload = {
        id: draft.id,
        typeId: draft.typeId || DEFAULT_ENTRY_TYPE,
        title,
        tags: draft.tags,
        metadata,
        photoUrl: draft.photoUrl ?? "",
        isPinned: draft.isPinned,
        entryAt: draft.entryAt,
      };
      try {
        if (isNew) {
          await apiJson("POST", payload);
          toast.success("Record created");
        } else {
          await apiJson("PATCH", { ...payload, id: draft.id });
          toast.success("Record saved");
        }
        await rememberKeys(Object.keys(metadata).filter((k) => k !== VISUAL_PAGES_KEY));
        await loadAll();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
        return false;
      }
    },
    [loadAll, rememberKeys, session?.access_token]
  );

  const toggleLock = useCallback(
    (entryId: string): boolean | null => {
      const fromList = entries.find((e) => e.id === entryId);
      if (!fromList) return null;
      if (!session?.access_token) {
        toast.error("Sign in to lock records");
        return null;
      }
      const next = !fromList.isPinned;
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, isPinned: next } : e)));
      void apiJson("PATCH", { id: entryId, isPinned: next }).catch(async () => {
        toast.error("Could not update lock");
        await loadAll();
      });
      return next;
    },
    [entries, loadAll, session?.access_token]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      try {
        const token = session?.access_token;
        if (!token) throw new Error("Not signed in");
        const res = await fetch(`${ENTRIES_ENDPOINT}?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Delete failed");
        toast.success("Record deleted");
        await loadAll();
        return true;
      } catch {
        toast.error("Delete failed");
        return false;
      }
    },
    [loadAll, session?.access_token]
  );

  const bulkLock = useCallback(
    async (lock: boolean) => {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const e = entries.find((x) => x.id === id);
        if (!e || e.isPinned === lock) continue;
        try {
          await apiJson("PATCH", { id, isPinned: lock });
        } catch {
          /* continue */
        }
      }
      toast.success(lock ? "Records sealed" : "Records unlocked");
      setSelectedIds(new Set());
      setBulkMode(false);
      await loadAll();
    },
    [entries, selectedIds, loadAll, session?.access_token]
  );

  const bulkAddTag = useCallback(
    async (tag: string) => {
      const t = tag.trim();
      if (!t) return;
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const e = entries.find((x) => x.id === id);
        if (!e || e.tags.includes(t)) continue;
        const tags = [...e.tags, t];
        try {
          await apiJson("PATCH", { id, tags });
        } catch {
          /* continue */
        }
      }
      toast.success(`Tag “${t}” added`);
      setSelectedIds(new Set());
      setBulkMode(false);
      await loadAll();
    },
    [entries, selectedIds, loadAll, session?.access_token]
  );

  const exportSelectedJson = useCallback(() => {
    const picked = entries.filter((e) => selectedIds.has(e.id));
    const blob = new Blob([JSON.stringify(picked, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindos-records-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${picked.length} record(s)`);
  }, [entries, selectedIds]);

  const toggleTagFilter = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setPage(0);
  }, []);

  const setQueryAndResetPage = useCallback((q: string) => {
    setQuery(q);
    setPage(0);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return {
    isSignedIn,
    catalog,
    entries,
    query,
    setQuery: setQueryAndResetPage,
    selectedTags,
    sortMode,
    setSortMode: (m: EntriesSortMode) => {
      setSortMode(m);
      setPage(0);
    },
    page,
    setPage,
    pageCount,
    bulkMode,
    setBulkMode,
    selectedIds,
    setSelectedIds,
    toggleSelect,
    loadAll,
    allTags,
    keySuggestions,
    filtered,
    paged,
    searchNoResults,
    dataPointCount,
    persistEntry,
    toggleLock,
    deleteEntry,
    bulkLock,
    bulkAddTag,
    exportSelectedJson,
    toggleTagFilter,
    clearTagFilters: () => {
      setSelectedTags([]);
      setPage(0);
    },
  };
}

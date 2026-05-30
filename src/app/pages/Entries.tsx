import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Activity, Database } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useStorageHydration } from "../lib/useStorageHydration";
import { toast } from "sonner";
import {
  buildAllKeySuggestions,
  DEFAULT_ENTRY_TYPE,
  entrySearchBlob,
  pairsToMetadata,
  readEntriesCache,
  saveEntriesCache,
  type EntryCatalog,
  type KnowledgeEntry,
} from "../lib/entryTypes";
import { RecordCard } from "../components/entries/RecordCard";
import { RecordViewer } from "../components/entries/RecordViewer";
import { ScanAnimation } from "../components/entries/ScanAnimation";
import { CreateRecordButton } from "../components/entries/CreateRecordButton";
import { HolographicGrid } from "../components/entries/HolographicGrid";
import { ImageZoomModal } from "../components/entries/ImageZoomModal";
import { QuitEntriesButton } from "../components/entries/QuitEntriesButton";
import { EntriesSearchBar } from "../components/entries/EntriesSearchBar";
import { BlastDoorShutter } from "../components/entries/BlastDoorShutter";
import { clipSm } from "../components/entries/styles";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || "";
const ENTRIES_ENDPOINT = `${API_BASE}/api/entries`;
const SCAN_MS = 800;

const emptyCatalog = (): EntryCatalog => ({
  types: [],
  fields: [],
  presets: [],
  keyCatalog: {},
});

function newEntryId(): string {
  return `${Date.now()}`;
}

export function Entries() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [isQuitting, setIsQuitting] = useState(false);
  const [catalog, setCatalog] = useState<EntryCatalog>(emptyCatalog);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewerEntry, setViewerEntry] = useState<KnowledgeEntry | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [isNewDraft, setIsNewDraft] = useState(false);

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

  useEffect(() => {
    const id = requestAnimationFrame(() => setDoorsOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const searchNoResults = useMemo(() => {
    const hasFilter = query.trim().length > 0 || selectedTags.length > 0;
    return hasFilter && filtered.length === 0;
  }, [query, selectedTags, filtered.length]);

  const allTags = useMemo(
    () => Array.from(new Set(entries.flatMap((e) => e.tags))).sort((a, b) => a.localeCompare(b)),
    [entries]
  );

  const keySuggestions = useMemo(
    () => buildAllKeySuggestions(catalog.keyCatalog, catalog.fields, entries),
    [catalog.keyCatalog, catalog.fields, entries]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesTags =
        selectedTags.length === 0 || selectedTags.some((tag) => e.tags.includes(tag));
      if (!matchesTags) return false;
      if (!q) return true;
      return entrySearchBlob(e).includes(q);
    });
  }, [entries, query, selectedTags]);

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

  async function rememberKeys(keys: string[]) {
    const unique = Array.from(new Set(keys.map((k) => k.trim()).filter(Boolean)));
    for (const fieldKey of unique) {
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
  }

  function openWithScan(entry: KnowledgeEntry, isNew: boolean) {
    setIsScanning(true);
    setIsNewDraft(isNew);
    window.setTimeout(() => {
      setIsScanning(false);
      setViewerEntry(entry);
    }, SCAN_MS);
  }

  function handleCreate() {
    const entry: KnowledgeEntry = {
      id: newEntryId(),
      typeId: DEFAULT_ENTRY_TYPE,
      title: "New Record",
      note: "",
      tags: [],
      metadata: {},
      isPinned: false,
      entryAt: new Date().toISOString(),
    };
    openWithScan(entry, true);
  }

  function handleOpen(entry: KnowledgeEntry) {
    openWithScan({ ...entry }, false);
  }

  async function persistEntry(
    draft: KnowledgeEntry,
    metadataPairs: { key: string; value: string }[]
  ) {
    const title = draft.title.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }

    const metadata = pairsToMetadata(metadataPairs);
    const typeId = draft.typeId || DEFAULT_ENTRY_TYPE;
    const payload = {
      id: draft.id,
      typeId,
      title,
      tags: draft.tags,
      metadata,
      photoUrl: draft.photoUrl ?? "",
      isPinned: draft.isPinned,
      entryAt: draft.entryAt,
    };

    setSaving(true);
    try {
      if (isNewDraft) {
        await apiJson("POST", payload);
        toast.success("Record created");
      } else {
        await apiJson("PATCH", { ...payload, id: draft.id });
        toast.success("Record saved");
      }
      await rememberKeys(Object.keys(metadata));
      setViewerEntry(null);
      setIsNewDraft(false);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleLock(entryId: string) {
    const fromList = entries.find((e) => e.id === entryId);
    const current = viewerEntry?.id === entryId ? viewerEntry : fromList;
    if (!current) return;
    const next = !current.isPinned;

    if (viewerEntry?.id === entryId) {
      setViewerEntry({ ...viewerEntry, isPinned: next });
    }

    if (!fromList) return;

    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, isPinned: next } : e)));

    try {
      await apiJson("PATCH", { id: entryId, isPinned: next });
    } catch {
      toast.error("Could not update lock");
      await loadAll();
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
      toast.success("Record deleted");
      setViewerEntry(null);
      setIsNewDraft(false);
      await loadAll();
    } catch {
      toast.error("Delete failed");
    }
  }

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleQuit = () => {
    if (isQuitting) return;
    setIsQuitting(true);
    setContentVisible(false);
    setDoorsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[30] h-[100dvh] overflow-y-auto overflow-x-hidden bg-slate-950">
      <BlastDoorShutter
        isOpen={doorsOpen}
        onOpenComplete={() => setContentVisible(true)}
        onCloseComplete={() => navigate("/")}
      />

      <HolographicGrid />

      <motion.div
        className="relative min-h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: contentVisible ? 1 : 0 }}
        transition={{ duration: 0.45, delay: contentVisible ? 0.1 : 0 }}
      >
      <QuitEntriesButton onQuit={handleQuit} disabled={isQuitting || !contentVisible} />

      <div className="relative bg-slate-900/70 backdrop-blur-md border-b border-cyan-500/20 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 pl-[5.5rem] sm:pl-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <Database className="w-9 h-9 sm:w-10 sm:h-10 text-cyan-400" />
                <div
                  className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyan-400 animate-pulse"
                  style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold text-slate-100 tracking-tight truncate">
                  Knowledge Records
                </h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-[10px] text-cyan-400/90 font-mono tracking-widest">MINDOS ARCHIVE</p>
                  <div className="w-px h-3 bg-cyan-500/30 hidden sm:block" />
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-teal-400 animate-pulse" />
                    <span className="text-[10px] text-slate-500 font-mono">ONLINE</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 sm:gap-6">
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono">{entries.length}</div>
                <div className="text-[9px] text-slate-500 font-mono tracking-widest">RECORDS</div>
              </div>
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-bold text-teal-400 font-mono">{dataPointCount}</div>
                <div className="text-[9px] text-slate-500 font-mono tracking-widest">DATA POINTS</div>
              </div>
            </div>
          </div>

          <EntriesSearchBar
            value={query}
            onChange={setQuery}
            matchCount={filtered.length}
            totalCount={entries.length}
            noResults={searchNoResults}
          />

          {allTags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-[10px] font-mono text-cyan-500/80 tracking-widest">FILTER BY TAGS</div>
                {selectedTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="text-[9px] font-mono text-slate-500 hover:text-cyan-400 underline"
                  >
                    CLEAR ALL
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTagFilter(tag)}
                      className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border transition-all ${
                        isSelected
                          ? "bg-cyan-600 text-white border-cyan-500 shadow-sm shadow-cyan-500/25"
                          : "bg-slate-800/80 text-cyan-200/90 border-cyan-500/30 hover:border-cyan-400/50 hover:bg-slate-800"
                      }`}
                      style={{ clipPath: clipSm }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 relative">
        {filtered.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="text-cyan-400/80 text-xs font-mono tracking-widest mb-2">NO RECORDS FOUND</div>
            <p className="text-slate-500 text-sm font-mono mb-6">
              {query || selectedTags.length > 0 ? "ADJUST SEARCH PARAMETERS" : "CREATE YOUR FIRST RECORD"}
            </p>
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 h-8 bg-cyan-500/25"
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((entry, i) => (
                <RecordCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  onClick={() => handleOpen(entry)}
                  onToggleLock={(e) => {
                    e.stopPropagation();
                    void toggleLock(entry.id);
                  }}
                  onImageClick={(e) => {
                    e.stopPropagation();
                    if (entry.photoUrl) {
                      setZoomedImage({ url: entry.photoUrl, title: entry.title });
                    }
                  }}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <CreateRecordButton onClick={handleCreate} />

      <AnimatePresence>{isScanning && <ScanAnimation />}</AnimatePresence>

      <AnimatePresence>
        {viewerEntry && (
          <RecordViewer
            key={viewerEntry.id}
            entry={viewerEntry}
            keySuggestions={keySuggestions}
            saving={saving}
            onClose={() => {
              setViewerEntry(null);
              setIsNewDraft(false);
            }}
            onSave={(draft, pairs) => void persistEntry(draft, pairs)}
            onDelete={
              isNewDraft
                ? () => {
                    setViewerEntry(null);
                    setIsNewDraft(false);
                  }
                : () => void deleteEntry(viewerEntry.id)
            }
            onToggleLock={() => void toggleLock(viewerEntry.id)}
            onViewPhoto={(url, t) => setZoomedImage({ url, title: t })}
          />
        )}
      </AnimatePresence>

      {zoomedImage && (
        <ImageZoomModal
          imageUrl={zoomedImage.url}
          title={zoomedImage.title}
          isOpen={!!zoomedImage}
          onClose={() => setZoomedImage(null)}
        />
      )}
      </motion.div>
    </div>
  );
}

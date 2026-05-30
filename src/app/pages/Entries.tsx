import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Activity, Database } from "lucide-react";
import { DEFAULT_ENTRY_TYPE, type KnowledgeEntry } from "../lib/entryTypes";
import { newEntryId, useEntriesArchive } from "../lib/useEntriesArchive";
import { RecordCard } from "../components/entries/RecordCard";
import { RecordViewer } from "../components/entries/RecordViewer";
import { ScanAnimation } from "../components/entries/ScanAnimation";
import { CreateRecordButton } from "../components/entries/CreateRecordButton";
import { HolographicGrid } from "../components/entries/HolographicGrid";
import { ImageZoomModal } from "../components/entries/ImageZoomModal";
import { QuitEntriesButton } from "../components/entries/QuitEntriesButton";
import {
  EntriesSearchBar,
  type EntriesSearchBarHandle,
} from "../components/entries/EntriesSearchBar";
import { BlastDoorShutter } from "../components/entries/BlastDoorShutter";
import { EntriesToolbar } from "../components/entries/EntriesToolbar";
import { EntriesBulkBar } from "../components/entries/EntriesBulkBar";
import { clipSm } from "../components/entries/styles";
import { ENTRIES_UI_BUILD, SHOW_ENTRIES_BUILD } from "../components/entries/buildStamp";
const SCAN_NEW_MS = 220;

export function Entries() {
  const navigate = useNavigate();
  const searchRef = useRef<EntriesSearchBarHandle>(null);
  const archive = useEntriesArchive();

  const [doorsOpen, setDoorsOpen] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [isQuitting, setIsQuitting] = useState(false);
  const [viewerEntry, setViewerEntry] = useState<KnowledgeEntry | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [isNewDraft, setIsNewDraft] = useState(false);
  const [viewerDirty, setViewerDirty] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDoorsOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (viewerEntry) return;
        searchRef.current?.clear();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerEntry]);

  const openRecord = useCallback((entry: KnowledgeEntry, isNew: boolean) => {
    if (isNew) {
      setIsScanning(true);
      setIsNewDraft(true);
      window.setTimeout(() => {
        setIsScanning(false);
        setViewerEntry(entry);
        setViewerDirty(false);
      }, SCAN_NEW_MS);
      return;
    }
    setIsNewDraft(false);
    setViewerEntry(entry);
    setViewerDirty(false);
  }, []);

  const handleCreate = () => {
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
    openRecord(entry, true);
  };

  const handleOpen = (entry: KnowledgeEntry) => {
    if (archive.bulkMode) return;
    openRecord({ ...entry }, false);
  };

  const closeViewer = useCallback(() => {
    setViewerEntry(null);
    setIsNewDraft(false);
    setViewerDirty(false);
  }, []);

  const handleQuit = () => {
    if (isQuitting) return;
    if (viewerDirty) {
      const ok = window.confirm("You have unsaved changes. Leave archive anyway?");
      if (!ok) return;
    }
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
                    {SHOW_ENTRIES_BUILD && (
                      <>
                        <div className="w-px h-3 bg-cyan-500/30 hidden sm:block" />
                        <span className="text-[10px] text-teal-400/70 font-mono tracking-wider">
                          {ENTRIES_UI_BUILD}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 sm:gap-6">
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono">
                    {archive.entries.length}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono tracking-widest">RECORDS</div>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-teal-400 font-mono">
                    {archive.dataPointCount}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono tracking-widest">DATA POINTS</div>
                </div>
              </div>
            </div>

          {!archive.isSignedIn && (
            <div
              className="mb-4 px-4 py-3 border border-amber-500/40 bg-amber-950/30 text-amber-200/90 text-xs font-mono tracking-wide"
              style={{ clipPath: clipSm }}
            >
              Sign in to load and save records from cloud (Supabase). Data is not stored in this browser.
            </div>
          )}

          <EntriesSearchBar
            ref={searchRef}
            value={archive.query}
            onChange={archive.setQuery}
            matchCount={archive.filtered.length}
            totalCount={archive.entries.length}
            noResults={archive.searchNoResults}
          />

            <EntriesToolbar
              sortMode={archive.sortMode}
              onSortChange={archive.setSortMode}
              bulkMode={archive.bulkMode}
              onBulkModeChange={(on) => {
                archive.setBulkMode(on);
                if (!on) archive.setSelectedIds(new Set());
              }}
              page={archive.page}
              pageCount={archive.pageCount}
              totalFiltered={archive.filtered.length}
              onPageChange={archive.setPage}
            />

            {archive.allTags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-[10px] font-mono text-cyan-500/80 tracking-widest">FILTER BY TAGS</div>
                  {archive.selectedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={archive.clearTagFilters}
                      className="text-[9px] font-mono text-slate-500 hover:text-cyan-400 underline"
                    >
                      CLEAR ALL
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {archive.allTags.map((tag) => {
                    const isSelected = archive.selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => archive.toggleTagFilter(tag)}
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
          {archive.filtered.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <div className="text-cyan-400/80 text-xs font-mono tracking-widest mb-2">NO RECORDS FOUND</div>
              <p className="text-slate-500 text-sm font-mono mb-6">
                {archive.query || archive.selectedTags.length > 0
                  ? "ADJUST SEARCH PARAMETERS"
                  : "CREATE YOUR FIRST RECORD"}
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
                {archive.paged.map((entry, i) => (
                  <RecordCard
                    key={entry.id}
                    entry={entry}
                    index={i}
                    bulkMode={archive.bulkMode}
                    selected={archive.selectedIds.has(entry.id)}
                    onClick={() => handleOpen(entry)}
                    onToggleSelect={(e) => {
                      e.stopPropagation();
                      archive.toggleSelect(entry.id);
                    }}
                    onToggleLock={(e) => {
                      e.stopPropagation();
                      void archive.toggleLock(entry.id);
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

        <CreateRecordButton onClick={handleCreate} disabled={!archive.isSignedIn} />

        {archive.bulkMode && (
          <EntriesBulkBar
            count={archive.selectedIds.size}
            onLock={() => void archive.bulkLock(true)}
            onUnlock={() => void archive.bulkLock(false)}
            onAddTag={(tag) => void archive.bulkAddTag(tag)}
            onExport={archive.exportSelectedJson}
            onCancel={() => {
              archive.setBulkMode(false);
              archive.setSelectedIds(new Set());
            }}
          />
        )}

        <AnimatePresence>{isScanning && <ScanAnimation />}</AnimatePresence>

        <AnimatePresence>
          {viewerEntry && (
            <RecordViewer
              key={viewerEntry.id}
              entry={viewerEntry}
              isNewDraft={isNewDraft}
              keySuggestions={archive.keySuggestions}
              saving={saving}
              onDirtyChange={setViewerDirty}
              onClose={closeViewer}
              onSave={async (draft, pairs, visualPages) => {
                setSaving(true);
                const ok = await archive.persistEntry(draft, pairs, visualPages, isNewDraft);
                setSaving(false);
                if (ok) closeViewer();
              }}
              onDelete={
                isNewDraft
                  ? closeViewer
                  : async () => {
                      if (await archive.deleteEntry(viewerEntry.id)) closeViewer();
                    }
              }
              onToggleLock={() => {
                if (!viewerEntry) return;
                const next = archive.toggleLock(viewerEntry.id);
                if (next !== null) setViewerEntry({ ...viewerEntry, isPinned: next });
              }}
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

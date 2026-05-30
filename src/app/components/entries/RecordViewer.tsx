import { motion } from "motion/react";
import { X, Plus, Trash2, Tag, Lock, ImagePlus, Loader2, ZoomIn, Copy } from "lucide-react";
import { LockToggleButton } from "./LockToggleButton";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KnowledgeEntry } from "../../lib/entryTypes";
import { compressImageFile } from "../../lib/compressImage";
import { draftsEqual, snapshotFromEntry, type EntryDraftSnapshot } from "../../lib/entriesDraft";
import {
  metadataPairsForEditor,
  newVisualPage,
  parseVisualPagesFromMetadata,
  type VisualPage,
  type VisualType,
} from "../../lib/visualPages";
import { RecordViewerPager } from "./RecordViewerPager";
import { VisualPageEditor } from "./visual/VisualPageEditor";
import { VisualTypePicker } from "./visual/VisualTypePicker";
import { active, clipSm, clipXl, locked } from "./styles";

const photoClip = "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)";
const fieldText = "text-slate-200 placeholder:text-slate-500";

interface RecordViewerProps {
  entry: KnowledgeEntry;
  isNewDraft: boolean;
  keySuggestions: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (
    draft: KnowledgeEntry,
    metadataPairs: { key: string; value: string }[],
    visualPages: VisualPage[]
  ) => void;
  onDelete?: () => void;
  onToggleLock: () => void;
  onViewPhoto: (url: string, title: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function RecordViewer({
  entry,
  isNewDraft,
  keySuggestions,
  saving,
  onClose,
  onSave,
  onDelete,
  onToggleLock,
  onViewPhoto,
  onDirtyChange,
}: RecordViewerProps) {
  const isLocked = entry.isPinned;
  const theme = isLocked ? locked : active;
  const [title, setTitle] = useState(entry.title);
  const [tags, setTags] = useState<string[]>(entry.tags);
  const [photoUrl, setPhotoUrl] = useState(entry.photoUrl ?? "");
  const [metadata, setMetadata] = useState(() => metadataPairsForEditor(entry.metadata));
  const [visualPages, setVisualPages] = useState<VisualPage[]>(() =>
    parseVisualPagesFromMetadata(entry.metadata)
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newMetaKey, setNewMetaKey] = useState("");
  const [newMetaValue, setNewMetaValue] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const datalistId = "entry-metadata-keys";

  const baselineVisual = useMemo(
    () => parseVisualPagesFromMetadata(entry.metadata),
    [entry.id, entry.metadata]
  );

  const baseline = useMemo(
    (): EntryDraftSnapshot =>
      snapshotFromEntry(entry, {
        metadata: metadataPairsForEditor(entry.metadata),
      }),
    [entry]
  );

  useEffect(() => {
    setTitle(entry.title);
    setTags(entry.tags);
    setPhotoUrl(entry.photoUrl ?? "");
    setMetadata(metadataPairsForEditor(entry.metadata));
    setVisualPages(parseVisualPagesFromMetadata(entry.metadata));
    setPageIndex(0);
    setShowTypePicker(false);
  }, [entry.id]);

  const currentSnapshot = useMemo(
    (): EntryDraftSnapshot => ({
      title: title.trim(),
      tags,
      photoUrl: photoUrl.trim(),
      metadata,
      savedAt: "",
    }),
    [title, tags, photoUrl, metadata]
  );

  const isDirty = useMemo(() => {
    if (!draftsEqual(baseline, currentSnapshot)) return true;
    return JSON.stringify(visualPages) !== JSON.stringify(baselineVisual);
  }, [baseline, currentSnapshot, visualPages, baselineVisual]);

  const totalPages = 1 + visualPages.length;
  const pageLabels = useMemo(
    () => ["RECORD", ...visualPages.map((p, i) => p.title || `VISUAL ${i + 1}`)],
    [visualPages]
  );
  const activeVisualIndex = pageIndex - 1;

  const handleAddVisual = () => {
    if (isLocked) return;
    setShowTypePicker(true);
    if (pageIndex === 0) setPageIndex(0);
  };

  const handlePickVisualType = (type: VisualType) => {
    const page = newVisualPage(type, visualPages.length);
    setVisualPages((prev) => [...prev, page]);
    setShowTypePicker(false);
    setPageIndex(visualPages.length + 1);
  };

  const handleRemoveVisual = () => {
    if (isLocked || activeVisualIndex < 0) return;
    setVisualPages((prev) => prev.filter((_, i) => i !== activeVisualIndex));
    setPageIndex(Math.max(0, pageIndex - 1));
  };

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const requestClose = useCallback(() => {
    if (isDirty && !isLocked) {
      const ok = window.confirm("Discard unsaved changes to this record?");
      if (!ok) return;
    }
    onClose();
  }, [isDirty, isLocked, onClose]);

  const handleMetaChange = (index: number, field: "key" | "value", value: string) => {
    if (isLocked) return;
    setMetadata((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDeleteMeta = (index: number) => {
    if (isLocked) return;
    setMetadata((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddMeta = () => {
    if (isLocked || !newMetaKey.trim()) return;
    setMetadata((prev) => [...prev, { key: newMetaKey.trim(), value: newMetaValue }]);
    setNewMetaKey("");
    setNewMetaValue("");
  };

  const handleAddTag = () => {
    if (isLocked || !newTag.trim() || tags.includes(newTag.trim())) return;
    setTags((prev) => [...prev, newTag.trim()]);
    setNewTag("");
  };

  const handlePhotoFile = async (file: File | undefined) => {
    if (isLocked || !file) return;
    if (!file.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressImageFile(file);
      setPhotoUrl(dataUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not process image");
    }
  };

  const handleSave = () => {
    if (isLocked) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onSave(
      {
        ...entry,
        title: trimmedTitle,
        tags,
        photoUrl: photoUrl.trim() || undefined,
        isPinned: entry.isPinned,
      },
      metadata,
      visualPages
    );
  };

  const copyMetaRow = async (key: string, value: string) => {
    const text = `${key}: ${value}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const displayTitle = title.trim() || "Untitled";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={requestClose}
    >
      <motion.div
        className={`relative backdrop-blur-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border ${
          isLocked ? `${locked.modalBorder} bg-slate-900/98` : "border-cyan-500/35 bg-slate-900/95"
        }`}
        style={{ clipPath: clipXl }}
        onClick={(e) => e.stopPropagation()}
        initial={{ scaleX: 0, scaleY: 0 }}
        animate={{ scaleX: [0, 1, 1], scaleY: [0, 0, 1] }}
        exit={{ scaleY: [1, 0, 0], scaleX: [1, 1, 0] }}
        transition={{ duration: 0.5, times: [0, 0.3, 1], ease: "easeInOut" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-viewer-title"
      >
        {isLocked && (
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.1] mix-blend-overlay z-0"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              backgroundSize: "100px",
            }}
          />
        )}

        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${theme.tracer} via-transparent to-transparent`} />
          <div className={`absolute top-0 right-0 w-0.5 h-full bg-gradient-to-b ${theme.tracer} via-transparent to-transparent`} />
          <div className={`absolute bottom-0 right-0 w-full h-0.5 bg-gradient-to-l ${theme.tracer} via-transparent to-transparent`} />
          <div className={`absolute bottom-0 left-0 w-0.5 h-full bg-gradient-to-t ${theme.tracer} via-transparent to-transparent`} />
        </div>

        <div
          className={`relative border-b p-6 flex items-start justify-between bg-gradient-to-r shrink-0 ${
            isLocked ? `border-b ${locked.headerBorder}` : "border-cyan-400/20 from-cyan-950/30 to-transparent"
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-1 h-6 shrink-0 ${isLocked ? locked.accentBar : "bg-cyan-400"}`} />
              <div
                className={`text-[10px] font-mono tracking-widest ${isLocked ? locked.accentText : "text-cyan-600"}`}
              >
                RECORD {entry.id.slice(0, 12)}
              </div>
              {isDirty && !isLocked && (
                <span className="text-[9px] font-mono text-amber-400/90 tracking-wider">UNSAVED</span>
              )}
              {isLocked && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono tracking-wider ${locked.badge}`}
                  style={{ clipPath: clipSm }}
                >
                  <Lock className="w-3 h-3" />
                  RESTRICTED
                </div>
              )}
            </div>

            <div className="flex items-start gap-4">
              <div className="shrink-0 space-y-2">
                {photoUrl ? (
                  <button
                    type="button"
                    onClick={() => onViewPhoto(photoUrl, displayTitle)}
                    className="relative w-20 h-20 overflow-hidden group/photo block"
                    style={{ clipPath: photoClip }}
                    title="View photo"
                  >
                    <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                      <ZoomIn className="w-6 h-6 text-white" />
                      <span className="text-[8px] font-mono text-white/90 tracking-wider">VIEW</span>
                    </div>
                  </button>
                ) : (
                  <div
                    className={`w-20 h-20 border border-dashed flex items-center justify-center ${
                      isLocked ? `${locked.thumbFrame}` : "border-cyan-400/40"
                    }`}
                    style={{ clipPath: photoClip }}
                  >
                    <ImagePlus className={`w-7 h-7 ${isLocked ? locked.thumbIcon : "text-cyan-400/50"}`} />
                  </div>
                )}
                {!isLocked && (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handlePhotoFile(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-[9px] font-mono text-cyan-600 hover:text-cyan-500 w-full text-center"
                    >
                      UPLOAD
                    </button>
                  </>
                )}
              </div>
              <input
                id="record-viewer-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLocked}
                className={`flex-1 text-2xl font-semibold bg-transparent border-none outline-none min-w-0 ${fieldText} ${
                  isLocked ? "cursor-not-allowed opacity-60" : "focus:text-cyan-300"
                }`}
                placeholder="Record Title"
              />
            </div>
            {!isLocked && (
              <input
                type="url"
                value={photoUrl.startsWith("data:") ? "" : photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Or paste image URL…"
                className={`mt-2 w-full text-xs font-mono px-2 py-1.5 border border-cyan-400/20 bg-cyan-400/5 focus:outline-none focus:border-cyan-400 ${fieldText}`}
                style={{ clipPath: clipSm }}
              />
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <LockToggleButton
              isLocked={isLocked}
              onClick={onToggleLock}
              iconClassName="w-5 h-5"
              className={`p-2 transition-colors ${isLocked ? locked.lockHover : "hover:bg-cyan-400/10 text-cyan-600"}`}
            />
            <button
              type="button"
              onClick={requestClose}
              className="p-2 hover:bg-cyan-400/10 transition-colors"
              style={{ clipPath: clipSm }}
              aria-label="Close record"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 min-h-0">
          {showTypePicker ? (
            <VisualTypePicker onPick={handlePickVisualType} onCancel={() => setShowTypePicker(false)} />
          ) : pageIndex > 0 && activeVisualIndex >= 0 && visualPages[activeVisualIndex] ? (
            <div className="flex flex-col min-h-[320px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-cyan-500 tracking-widest">
                  VISUAL PAGE · {visualPages[activeVisualIndex].title}
                </span>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleRemoveVisual}
                    className="flex items-center gap-1 px-2 py-1 text-[9px] font-mono text-red-400 border border-red-500/30 hover:bg-red-950/40"
                    style={{ clipPath: clipSm }}
                  >
                    <Trash2 className="w-3 h-3" />
                    REMOVE PAGE
                  </button>
                )}
              </div>
              <VisualPageEditor
                page={visualPages[activeVisualIndex]}
                centerTitle={displayTitle}
                isLocked={isLocked}
                onChange={(next) =>
                  setVisualPages((prev) => prev.map((p, i) => (i === activeVisualIndex ? next : p)))
                }
              />
            </div>
          ) : (
          <>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1 h-4 ${isLocked ? locked.accentBar : "bg-cyan-400"}`} />
              <Tag className={`w-3.5 h-3.5 ${isLocked ? "text-slate-500" : "text-cyan-500"}`} />
              <span
                className={`text-[11px] font-mono tracking-widest ${isLocked ? locked.accentLabel : "text-slate-400"}`}
              >
                CLASSIFICATION TAGS
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, idx) => (
                <div
                  key={`${tag}-${idx}`}
                  className={`px-3 py-1.5 text-xs font-mono uppercase border flex items-center gap-2 group ${theme.tag}`}
                  style={{ clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)" }}
                >
                  {tag}
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => setTags((t) => t.filter((_, i) => i !== idx))}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!isLocked && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="Add classification tag..."
                  className={`flex-1 px-3 py-2 text-sm border border-cyan-400/20 bg-cyan-400/5 focus:outline-none focus:border-cyan-400 font-mono ${fieldText}`}
                  style={{ clipPath: clipSm }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-cyan-500 text-white hover:bg-cyan-600"
                  style={{ clipPath: clipSm }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-1 h-4 ${isLocked ? locked.accentBar : "bg-cyan-400"}`} />
              <span
                className={`text-[11px] font-mono tracking-widest ${isLocked ? locked.accentLabel : "text-slate-400"}`}
              >
                DATA PARAMETERS
              </span>
            </div>
            <div className="space-y-2.5 mb-3">
              {metadata.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center group">
                  <div
                    className={`w-1.5 h-1.5 shrink-0 ${isLocked ? locked.accentBar : "bg-cyan-400"}`}
                    style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
                  />
                  <input
                    type="text"
                    list={datalistId}
                    value={item.key}
                    onChange={(e) => handleMetaChange(idx, "key", e.target.value)}
                    disabled={isLocked}
                    placeholder="PARAMETER"
                    className={`w-1/3 min-w-0 px-3 py-2 text-xs border font-mono uppercase tracking-wide ${fieldText} ${
                      isLocked
                        ? `${locked.inputDisabled} cursor-not-allowed opacity-70`
                        : "border-cyan-500/30 bg-slate-950/50 focus:outline-none focus:border-cyan-400"
                    }`}
                    style={{ clipPath: clipSm }}
                  />
                  <span className={`font-mono shrink-0 ${isLocked ? "text-slate-500" : "text-cyan-400"}`}>:</span>
                  <input
                    type="text"
                    value={item.value}
                    onChange={(e) => handleMetaChange(idx, "value", e.target.value)}
                    disabled={isLocked}
                    placeholder="Value"
                    className={`flex-1 min-w-0 px-3 py-2 text-sm border ${fieldText} ${
                      isLocked
                        ? `${locked.inputDisabledValue} cursor-not-allowed opacity-70`
                        : "border-slate-700/50 bg-slate-950/30 focus:outline-none focus:border-cyan-400"
                    }`}
                    style={{ clipPath: clipSm }}
                  />
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={() => void copyMetaRow(item.key, item.value)}
                      className="p-2 text-slate-500 hover:text-cyan-400 shrink-0"
                      style={{ clipPath: clipSm }}
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDeleteMeta(idx)}
                      className="p-2 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 shrink-0"
                      style={{ clipPath: clipSm }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!isLocked && (
              <div className="flex gap-2">
                <input
                  type="text"
                  list={datalistId}
                  value={newMetaKey}
                  onChange={(e) => setNewMetaKey(e.target.value)}
                  placeholder="NEW PARAMETER..."
                  className={`w-1/3 min-w-0 px-3 py-2 text-xs border border-cyan-400/20 bg-cyan-400/5 focus:outline-none focus:border-cyan-400 font-mono uppercase ${fieldText}`}
                  style={{ clipPath: clipSm }}
                />
                <input
                  type="text"
                  value={newMetaValue}
                  onChange={(e) => setNewMetaValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMeta()}
                  placeholder="New value..."
                  className={`flex-1 min-w-0 px-3 py-2 text-sm border border-slate-700/50 bg-slate-950/30 focus:outline-none focus:border-cyan-400 ${fieldText}`}
                  style={{ clipPath: clipSm }}
                />
                <button
                  type="button"
                  onClick={handleAddMeta}
                  className="px-4 py-2 bg-cyan-500 text-white hover:bg-cyan-600 shrink-0"
                  style={{ clipPath: clipSm }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
            <datalist id={datalistId}>
              {keySuggestions.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </div>
          </>
          )}
        </div>

        <RecordViewerPager
          pageIndex={showTypePicker ? 0 : pageIndex}
          totalPages={showTypePicker ? totalPages : totalPages}
          pageLabels={pageLabels}
          onPageChange={(i) => {
            setShowTypePicker(false);
            setPageIndex(i);
          }}
          onAddVisual={handleAddVisual}
          canAddVisual={!isLocked && !showTypePicker}
        />

        {!isLocked && (
          <div className="shrink-0 border-t border-cyan-500/20 p-4 flex gap-2 bg-slate-950/60 relative z-10">
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={handleSave}
              className="flex-1 py-3 bg-cyan-600 text-white font-mono text-sm tracking-wider hover:bg-cyan-500 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ clipPath: clipSm }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isNewDraft ? "CREATE RECORD" : "SAVE RECORD"}
            </button>
            {onDelete && (
              <button
                type="button"
                disabled={saving}
                onClick={onDelete}
                className="px-4 py-3 border border-red-400/40 text-red-400 hover:bg-red-950/40 font-mono text-sm"
                style={{ clipPath: clipSm }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

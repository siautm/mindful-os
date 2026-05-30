import { motion } from "motion/react";
import { Check, ChevronRight, FileImage, Lock, ZoomIn } from "lucide-react";
import type { KnowledgeEntry } from "../../lib/entryTypes";
import { LockToggleButton } from "./LockToggleButton";
import { active, clipLg, locked } from "./styles";

const thumbClip =
  "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)";

const METAL_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

interface RecordCardProps {
  entry: KnowledgeEntry;
  index?: number;
  bulkMode?: boolean;
  selected?: boolean;
  onClick: () => void;
  onToggleLock: (e: React.MouseEvent) => void;
  onImageClick: (e: React.MouseEvent) => void;
  onToggleSelect?: (e: React.MouseEvent) => void;
}

export function RecordCard({
  entry,
  index = 0,
  bulkMode = false,
  selected = false,
  onClick,
  onToggleLock,
  onImageClick,
  onToggleSelect,
}: RecordCardProps) {
  const isLocked = entry.isPinned;
  const theme = isLocked ? locked : active;

  const thumb = entry.photoUrl ? (
    <button
      type="button"
      onClick={onImageClick}
      className="relative w-12 h-12 shrink-0 overflow-hidden group/img"
      style={{ clipPath: thumbClip }}
      aria-label={`View photo for ${entry.title}`}
    >
      <img src={entry.photoUrl} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
        <ZoomIn className="w-5 h-5 text-white" />
      </div>
      <div
        className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r ${theme.tracer} to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity`}
      />
    </button>
  ) : (
    <div
      className={`w-12 h-12 shrink-0 flex items-center justify-center border ${theme.thumbFrame}`}
      style={{ clipPath: thumbClip }}
      aria-hidden
    >
      <FileImage className={`w-5 h-5 ${theme.thumbIcon}`} />
    </div>
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (bulkMode && onToggleSelect) onToggleSelect(e as unknown as React.MouseEvent);
      else onClick();
    }
  };

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      aria-label={`Open record ${entry.title}${isLocked ? ", restricted" : ""}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 360, damping: 28, delay: index * 0.035 }}
      onClick={(e) => {
        if (bulkMode && onToggleSelect) onToggleSelect(e);
        else onClick();
      }}
      onKeyDown={handleKeyDown}
      className={`relative backdrop-blur-sm cursor-pointer group overflow-hidden w-full max-w-sm mx-auto border outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${theme.cardBg} ${theme.cardBorder} ${selected ? "ring-2 ring-teal-400/70" : ""}`}
      style={{ clipPath: clipLg }}
      whileHover={{ scale: bulkMode ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isLocked && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.18] mix-blend-overlay"
          style={{ backgroundImage: METAL_GRAIN, backgroundSize: "120px 120px" }}
        />
      )}

      <div className="absolute inset-0 opacity-40 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r ${theme.tracer} via-transparent to-transparent`} />
        <div className={`absolute top-0 right-0 w-px h-full bg-gradient-to-b ${theme.tracer} via-transparent to-transparent`} />
        <div className={`absolute bottom-0 right-0 w-full h-px bg-gradient-to-l ${theme.tracer} via-transparent to-transparent`} />
        <div className={`absolute bottom-0 left-0 w-px h-full bg-gradient-to-t ${theme.tracer} via-transparent to-transparent`} />
      </div>

      <div
        className={`absolute top-0 right-0 w-16 h-16 ${theme.corner} transition-colors pointer-events-none`}
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
      />

      {bulkMode && (
        <div className="absolute top-3 left-3 z-10">
          <div
            className={`w-5 h-5 flex items-center justify-center border ${selected ? "bg-teal-500 border-teal-300" : "bg-slate-900/80 border-slate-600"}`}
            style={{ clipPath: "polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)" }}
          >
            {selected && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
      )}

      {isLocked && !bulkMode && (
        <div className="absolute top-3 right-3 z-10">
          <div
            className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono tracking-wider ${locked.badge}`}
            style={{ clipPath: "polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)" }}
          >
            <Lock className="w-3 h-3" />
            RESTRICTED
          </div>
        </div>
      )}

      <div
        className={`relative border border-transparent ${theme.innerHover} transition-all p-5`}
        style={{ clipPath: clipLg }}
      >
        <div className={`text-[10px] font-mono ${theme.id} mb-3 tracking-wider truncate`}>
          {entry.id.slice(0, 14)}
        </div>

        <div className="flex gap-3 items-start mb-4">
          {thumb}
          <div className="flex-1 min-w-0 min-h-12 flex flex-col justify-center">
            <h3 className={`font-semibold text-base tracking-tight ${theme.title} line-clamp-2`}>
              {entry.title}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5 min-h-[22px] items-center">
              {entry.tags.length > 0 ? (
                <>
                  {entry.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider border ${theme.tag}`}
                      style={{
                        clipPath:
                          "polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {entry.tags.length > 3 && (
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-mono">
                      +{entry.tags.length - 3}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[10px] font-mono text-slate-600 tracking-wider">NO TAGS</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-700/80">
          <LockToggleButton
            isLocked={isLocked}
            onClick={onToggleLock}
            className={`p-1.5 transition-colors ${theme.lockBtn}`}
          />
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5" aria-hidden>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-0.5 transition-all ${theme.bars}`}
                  style={{ height: `${8 + i * 2}px` }}
                />
              ))}
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${theme.chevron}`} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

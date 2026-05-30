import { motion } from "motion/react";
import { ChevronRight, Lock, LockOpen, ZoomIn } from "lucide-react";
import type { KnowledgeEntry } from "../../lib/entryTypes";
import { entryToMetadataPairs } from "../../lib/entryTypes";
import { active, clipLg, clipSm, locked } from "./styles";

interface RecordCardProps {
  entry: KnowledgeEntry;
  index?: number;
  onClick: () => void;
  onToggleLock: (e: React.MouseEvent) => void;
  onImageClick: (e: React.MouseEvent) => void;
}

/** Reference-original card layout (thumbnail + title + tags + metadata preview). */
export function RecordCard({
  entry,
  index = 0,
  onClick,
  onToggleLock,
  onImageClick,
}: RecordCardProps) {
  const isLocked = entry.isPinned;
  const theme = isLocked ? locked : active;
  const metadata = entryToMetadataPairs(entry.metadata);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 360, damping: 28, delay: index * 0.035 }}
      onClick={onClick}
      className={`relative backdrop-blur-sm cursor-pointer group overflow-hidden w-full max-w-sm mx-auto border ${theme.cardBg} ${theme.cardBorder}`}
      style={{ clipPath: clipLg }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
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

      {isLocked && (
        <div className="absolute top-3 left-3 z-10">
          <div
            className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono tracking-wider ${locked.badge}`}
            style={{ clipPath: "polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)" }}
          >
            <Lock className="w-3 h-3" />
            LOCKED
          </div>
        </div>
      )}

      <div
        className={`relative border border-transparent group-hover:border-cyan-400/30 transition-all p-5`}
        style={{ clipPath: clipLg }}
      >
        <div className={`text-[10px] font-mono ${theme.id} mb-3 tracking-wider truncate`}>
          {entry.id.slice(0, 14)}
        </div>

        <div className="flex items-center gap-3 mb-3">
          {entry.photoUrl ? (
            <button
              type="button"
              onClick={onImageClick}
              className="relative w-12 h-12 flex-shrink-0 overflow-hidden group/img"
              style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}
            >
              <img src={entry.photoUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="w-5 h-5 text-white" />
              </div>
              <div
                className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r ${theme.tracer} to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity`}
              />
            </button>
          ) : null}

          <h3 className={`font-semibold text-base tracking-tight ${theme.title} flex-1 line-clamp-2`}>
            {entry.title}
          </h3>
        </div>

        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {entry.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider border ${theme.tag}`}
                style={{ clipPath: "polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)" }}
              >
                {tag}
              </span>
            ))}
            {entry.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-mono">
                +{entry.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {metadata.length > 0 && (
          <div className="text-xs space-y-1.5 font-mono mb-4">
            {metadata.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center min-w-0">
                <div
                  className={`w-1 h-1 shrink-0 ${isLocked ? "bg-amber-400" : "bg-cyan-400"}`}
                  style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
                />
                <span className={`uppercase tracking-wide text-[9px] min-w-[4rem] shrink-0 ${theme.metaKey}`}>
                  {item.key}
                </span>
                <span className={`truncate text-[11px] ${theme.metaVal}`}>{item.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/80">
          <button
            type="button"
            onClick={onToggleLock}
            className={`p-1.5 transition-all ${
              isLocked
                ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-400"
                : "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400"
            }`}
            style={{ clipPath: clipSm }}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-0.5 transition-all ${
                    isLocked ? "bg-amber-400/30 group-hover:bg-amber-400/60" : "bg-cyan-400/30 group-hover:bg-cyan-400/60"
                  }`}
                  style={{ height: `${8 + i * 2}px` }}
                />
              ))}
            </div>
            <ChevronRight
              className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                isLocked ? "text-amber-500" : "text-cyan-500"
              }`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

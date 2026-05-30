import { motion } from "motion/react";
import { ChevronRight, Lock, LockOpen, ZoomIn } from "lucide-react";
import type { KnowledgeEntry } from "../../lib/entryTypes";
import { entryToMetadataPairs } from "../../lib/entryTypes";
import { clipLg, clipSm } from "./styles";

interface RecordCardProps {
  entry: KnowledgeEntry;
  onClick: () => void;
  onToggleLock: (e: React.MouseEvent) => void;
  onImageClick: (e: React.MouseEvent) => void;
}

export function RecordCard({ entry, onClick, onToggleLock, onImageClick }: RecordCardProps) {
  const isLocked = entry.isPinned;
  const metadata = entryToMetadataPairs(entry.metadata);

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`relative backdrop-blur-sm cursor-pointer group overflow-hidden w-full max-w-sm mx-auto ${
        isLocked ? "bg-red-950/20 border-red-500/30" : "bg-white/80 border-gray-200/50"
      }`}
      style={{ clipPath: clipLg }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="absolute inset-0 opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div
          className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r ${isLocked ? "from-red-500" : "from-cyan-400"} via-transparent to-transparent`}
        />
        <div
          className={`absolute top-0 right-0 w-px h-full bg-gradient-to-b ${isLocked ? "from-red-500" : "from-cyan-400"} via-transparent to-transparent`}
        />
        <div
          className={`absolute bottom-0 right-0 w-full h-px bg-gradient-to-l ${isLocked ? "from-red-500" : "from-cyan-400"} via-transparent to-transparent`}
        />
        <div
          className={`absolute bottom-0 left-0 w-px h-full bg-gradient-to-t ${isLocked ? "from-red-500" : "from-cyan-400"} via-transparent to-transparent`}
        />
      </div>

      <div
        className={`absolute top-0 right-0 w-16 h-16 ${isLocked ? "bg-red-500/10 group-hover:bg-red-500/20" : "bg-cyan-400/10 group-hover:bg-cyan-400/20"} transition-colors pointer-events-none`}
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
      />

      {isLocked && (
        <div className="absolute top-3 left-3 z-10">
          <div
            className="flex items-center gap-1 px-2 py-1 bg-red-500/90 text-white text-[9px] font-mono tracking-wider"
            style={{ clipPath: "polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)" }}
          >
            <Lock className="w-3 h-3" />
            LOCKED
          </div>
        </div>
      )}

      <div
        className={`relative border ${isLocked ? "border-red-500/30" : "border-gray-200/50 group-hover:border-cyan-400/50"} transition-all p-5`}
        style={{ clipPath: clipLg }}
      >
        <div className={`text-[10px] font-mono ${isLocked ? "text-red-500" : "text-cyan-600"} mb-3 tracking-wider`}>
          {entry.id.slice(0, 12)}
        </div>

        <div className="flex items-center gap-3 mb-3">
          {entry.photoUrl && (
            <button
              type="button"
              onClick={onImageClick}
              className="relative w-12 h-12 flex-shrink-0 overflow-hidden group/img"
              style={{ clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}
            >
              <img src={entry.photoUrl} alt={entry.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="w-5 h-5 text-white" />
              </div>
            </button>
          )}
          <h3
            className={`font-semibold text-base tracking-tight ${isLocked ? "text-red-900" : "text-gray-900"} flex-1 line-clamp-2`}
          >
            {entry.title}
          </h3>
        </div>

        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {entry.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider border ${
                  isLocked
                    ? "bg-red-500/10 text-red-700 border-red-400/30"
                    : "bg-cyan-500/10 text-cyan-700 border-cyan-400/30"
                }`}
                style={{ clipPath: "polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)" }}
              >
                {tag}
              </span>
            ))}
            {entry.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-500/10 text-gray-600 text-[9px] font-mono">
                +{entry.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {metadata.length > 0 && (
          <div className="text-xs text-gray-600 space-y-1.5 font-mono mb-4">
            {metadata.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center min-w-0">
                <div
                  className={`w-1 h-1 shrink-0 ${isLocked ? "bg-red-500" : "bg-cyan-400"}`}
                  style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
                />
                <span
                  className={`uppercase tracking-wide text-[9px] min-w-[4.5rem] shrink-0 ${isLocked ? "text-red-600/70" : "text-cyan-600/70"}`}
                >
                  {item.key}
                </span>
                <span className="text-gray-700 truncate text-[11px]">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200/50">
          <button
            type="button"
            onClick={onToggleLock}
            className={`p-1.5 transition-all ${
              isLocked
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-600"
                : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-600"
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
                    isLocked ? "bg-red-400/30 group-hover:bg-red-400/60" : "bg-cyan-400/30 group-hover:bg-cyan-400/60"
                  }`}
                  style={{ height: `${8 + i * 2}px` }}
                />
              ))}
            </div>
            <ChevronRight
              className={`w-4 h-4 ${isLocked ? "text-red-500 group-hover:text-red-400" : "text-cyan-500 group-hover:text-cyan-400"} group-hover:translate-x-1 transition-transform`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

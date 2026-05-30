import { motion } from "motion/react";
import { ImageIcon, Lock, ZoomIn } from "lucide-react";
import type { KnowledgeEntry } from "../../lib/entryTypes";
import { active, clipLg, locked } from "./styles";

interface RecordCardProps {
  entry: KnowledgeEntry;
  index?: number;
  onClick: () => void;
  onPreviewImage?: (e: React.MouseEvent) => void;
}

export function RecordCard({ entry, index = 0, onClick, onPreviewImage }: RecordCardProps) {
  const isLocked = entry.isPinned;
  const theme = isLocked ? locked : active;
  const hasPhoto = Boolean(entry.photoUrl);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 30, delay: index * 0.04 }}
      onClick={onClick}
      className={`relative cursor-pointer group overflow-hidden w-full border shadow-sm hover:shadow-lg hover:shadow-teal-500/10 ${theme.cardBg} ${theme.cardBorder}`}
      style={{ clipPath: clipLg }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="absolute inset-0 opacity-30 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none z-[1]">
        <div className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r ${theme.tracer} via-transparent to-transparent`} />
        <div className={`absolute top-0 right-0 w-px h-full bg-gradient-to-b ${theme.tracer} via-transparent to-transparent`} />
        <div className={`absolute bottom-0 right-0 w-full h-px bg-gradient-to-l ${theme.tracer} via-transparent to-transparent`} />
        <div className={`absolute bottom-0 left-0 w-px h-full bg-gradient-to-t ${theme.tracer} via-transparent to-transparent`} />
      </div>

      <div
        className={`absolute top-0 right-0 w-20 h-20 ${theme.corner} transition-colors pointer-events-none z-[1]`}
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
      />

      {isLocked && (
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono tracking-wider shadow-sm ${locked.badge}`}
            style={{ clipPath: "polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)" }}
          >
            <Lock className="w-3 h-3" />
            LOCKED
          </div>
        </div>
      )}

      <div className="relative flex flex-col" style={{ clipPath: clipLg }}>
        {/* Cover preview */}
        <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-slate-100 to-teal-50/80 overflow-hidden">
          {hasPhoto ? (
            <>
              <img
                src={entry.photoUrl}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewImage?.(e);
                }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-black/0 hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300"
                aria-label="Preview image"
              >
                <ZoomIn className="w-8 h-8 text-white drop-shadow-md" />
                <span className="text-[10px] font-mono text-white/95 tracking-widest">PREVIEW</span>
              </button>
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
              <ImageIcon className="w-10 h-10 opacity-40" />
              <span className="text-[10px] font-mono tracking-widest opacity-60">NO IMAGE</span>
            </div>
          )}
        </div>

        <div className="relative p-5 flex flex-col gap-3 min-h-[5.5rem]">
          <h3 className={`font-semibold text-lg leading-snug tracking-tight ${theme.title} line-clamp-2 pr-2`}>
            {entry.title}
          </h3>

          {entry.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border ${theme.tag}`}
                  style={{ clipPath: "polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] font-mono text-slate-400 tracking-wider">NO TAGS</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

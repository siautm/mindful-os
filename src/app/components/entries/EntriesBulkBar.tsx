import { Download, Lock, LockOpen, Tag } from "lucide-react";
import { useState } from "react";
import { clipSm } from "./styles";

interface EntriesBulkBarProps {
  count: number;
  onLock: () => void;
  onUnlock: () => void;
  onAddTag: (tag: string) => void;
  onExport: () => void;
  onCancel: () => void;
}

export function EntriesBulkBar({
  count,
  onLock,
  onUnlock,
  onAddTag,
  onExport,
  onCancel,
}: EntriesBulkBarProps) {
  const [tag, setTag] = useState("");

  if (count === 0) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[42] flex flex-wrap items-center gap-2 px-4 py-3 bg-slate-900/95 border border-cyan-500/40 backdrop-blur-md shadow-xl max-w-[95vw]"
      style={{ clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)" }}
    >
      <span className="text-[10px] font-mono text-cyan-300 mr-1">{count} SELECTED</span>
      <button type="button" onClick={onLock} className="p-2 text-slate-300 hover:bg-slate-800" style={{ clipPath: clipSm }} title="Seal">
        <Lock className="w-4 h-4" />
      </button>
      <button type="button" onClick={onUnlock} className="p-2 text-slate-300 hover:bg-slate-800" style={{ clipPath: clipSm }} title="Unlock">
        <LockOpen className="w-4 h-4" />
      </button>
      <input
        type="text"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        placeholder="Tag…"
        className="w-24 px-2 py-1 text-xs font-mono border border-slate-600 bg-slate-950 text-slate-200"
        style={{ clipPath: clipSm }}
      />
      <button
        type="button"
        onClick={() => {
          onAddTag(tag);
          setTag("");
        }}
        className="p-2 text-cyan-400 hover:bg-cyan-950"
        style={{ clipPath: clipSm }}
        title="Add tag"
      >
        <Tag className="w-4 h-4" />
      </button>
      <button type="button" onClick={onExport} className="p-2 text-teal-400 hover:bg-teal-950" style={{ clipPath: clipSm }} title="Export JSON">
        <Download className="w-4 h-4" />
      </button>
      <button type="button" onClick={onCancel} className="text-[9px] font-mono text-slate-500 hover:text-cyan-400 ml-1">
        CANCEL
      </button>
    </div>
  );
}

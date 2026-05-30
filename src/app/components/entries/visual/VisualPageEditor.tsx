import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import {
  parseVisualInput,
  VISUAL_FORMAT_HINTS,
  VISUAL_TYPE_LABELS,
  type VisualPage,
  type VisualType,
} from "../../../lib/visualPages";
import { VisualDiagram } from "./VisualDiagram";
import { clipSm } from "../styles";

const TYPES: VisualType[] = ["flowmap", "bubblemap", "bracemap", "treemap"];

interface VisualPageEditorProps {
  page: VisualPage;
  diagramTitle: string;
  isLocked: boolean;
  onChange: (page: VisualPage) => void;
  onDone?: () => void;
  embedded?: boolean;
}

export function VisualPageEditor({ page, diagramTitle, isLocked, onChange, onDone, embedded }: VisualPageEditorProps) {
  const center = diagramTitle.trim() || "Untitled";
  const parsed = useMemo(
    () => parseVisualInput(page.type, page.sourceText, center),
    [page.type, page.sourceText, center]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="flex items-center gap-1 px-2 py-1 text-[9px] font-mono text-slate-400 border border-slate-700 hover:text-cyan-300 hover:border-cyan-500/40"
            style={{ clipPath: clipSm }}
          >
            <ArrowLeft className="w-3 h-3" />
            BACK TO VIEW
          </button>
        )}
        <span className="text-[10px] font-mono text-cyan-500 tracking-widest">DIAGRAM TYPE</span>
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            disabled={isLocked}
            onClick={() => onChange({ ...page, type: t })}
            className={`px-2 py-1 text-[9px] font-mono tracking-wider border transition-colors ${
              page.type === t
                ? "bg-cyan-600/30 border-cyan-400/60 text-cyan-100"
                : "border-slate-700 text-slate-500 hover:border-cyan-500/40"
            }`}
            style={{ clipPath: clipSm }}
          >
            {VISUAL_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col min-h-[200px]">
          <label className="text-[10px] font-mono text-slate-500 tracking-widest mb-1">INPUT FORMAT</label>
          <pre className="text-[9px] font-mono text-slate-600 mb-2 whitespace-pre-wrap border border-slate-800 p-2 bg-slate-950/50">
            {VISUAL_FORMAT_HINTS[page.type]}
          </pre>
          <textarea
            value={page.sourceText}
            onChange={(e) => onChange({ ...page, sourceText: e.target.value })}
            disabled={isLocked}
            placeholder="Type or paste your list here…"
            className="flex-1 min-h-[160px] w-full p-3 text-sm font-mono text-slate-200 placeholder:text-slate-600 border border-cyan-500/25 bg-slate-950/60 focus:outline-none focus:border-cyan-400 resize-none"
            style={{ clipPath: clipSm }}
          />
        </div>

        <div className="flex flex-col min-h-[200px] border border-cyan-500/20 bg-slate-950/40">
          {!embedded && (
            <div className="text-[10px] font-mono text-cyan-500/80 tracking-widest px-3 py-2 border-b border-cyan-500/15 bg-slate-950/60">
              PREVIEW · {VISUAL_TYPE_LABELS[page.type]}
            </div>
          )}
          <div className="flex-1 overflow-auto p-2">
            <VisualDiagram parsed={parsed} />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  parseVisualInput,
  VISUAL_FORMAT_HINTS,
  VISUAL_TYPE_LABELS,
  type VisualPage,
  type VisualType,
} from "../../../lib/visualPages";
import { VisualDiagram } from "./VisualDiagram";

const TYPES: VisualType[] = ["flowmap", "bubblemap", "bracemap", "treemap"];

const TYPE_SHORT: Record<VisualType, string> = {
  flowmap: "FLOW",
  bubblemap: "BUBBLE",
  bracemap: "BRACE",
  treemap: "TREE",
};

interface VisualPageEditorProps {
  page: VisualPage;
  diagramTitle: string;
  isLocked: boolean;
  onChange: (page: VisualPage) => void;
  onDone?: () => void;
  embedded?: boolean;
}

export function VisualPageEditor({
  page,
  diagramTitle,
  isLocked,
  onChange,
  embedded,
}: VisualPageEditorProps) {
  const center = diagramTitle.trim() || "Untitled";
  const parsed = useMemo(
    () => parseVisualInput(page.type, page.sourceText, center),
    [page.type, page.sourceText, center]
  );

  if (embedded) {
    return <EmbeddedEditor page={page} isLocked={isLocked} onChange={onChange} parsed={parsed} />;
  }

  return (
    <FullEditor page={page} diagramTitle={diagramTitle} isLocked={isLocked} onChange={onChange} parsed={parsed} />
  );
}

function TypeChips({
  page,
  isLocked,
  onChange,
  compact,
}: {
  page: VisualPage;
  isLocked: boolean;
  onChange: (page: VisualPage) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {TYPES.map((t) => (
        <button
          key={t}
          type="button"
          disabled={isLocked}
          onClick={() => onChange({ ...page, type: t })}
          className={`px-2 py-0.5 text-[9px] font-mono tracking-wider transition-colors ${
            page.type === t
              ? "text-cyan-200 border-b border-cyan-400"
              : "text-slate-500 hover:text-slate-300 border-b border-transparent"
          }`}
        >
          {compact ? TYPE_SHORT[t] : VISUAL_TYPE_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

function EmbeddedEditor({
  page,
  isLocked,
  onChange,
  parsed,
}: {
  page: VisualPage;
  isLocked: boolean;
  onChange: (page: VisualPage) => void;
  parsed: ReturnType<typeof parseVisualInput>;
}) {
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="flex flex-col gap-3 -m-1">
      <TypeChips page={page} isLocked={isLocked} onChange={onChange} compact />

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowHint((v) => !v)}
          className="text-[9px] font-mono text-slate-500 hover:text-cyan-400"
        >
          {showHint ? "Hide format" : "Format help"}
        </button>
      </div>

      {showHint && (
        <pre className="text-[9px] font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">
          {VISUAL_FORMAT_HINTS[page.type]}
        </pre>
      )}

      <textarea
        value={page.sourceText}
        onChange={(e) => onChange({ ...page, sourceText: e.target.value })}
        disabled={isLocked}
        placeholder={"#chapter\n1. item\n2. item"}
        spellCheck={false}
        className="w-full min-h-[140px] p-3 text-sm font-mono text-slate-200 placeholder:text-slate-600 bg-transparent border-0 border-b border-cyan-500/20 focus:outline-none focus:border-cyan-400/60 resize-y"
      />

      <div className="pt-2 border-t border-slate-800/80">
        <p className="text-[9px] font-mono text-slate-600 tracking-widest mb-2">PREVIEW</p>
        <div className="overflow-auto max-h-[200px] -mx-1 px-1">
          {page.sourceText.trim() ? (
            <VisualDiagram parsed={parsed} className="w-full scale-[0.98] origin-top-left" />
          ) : (
            <p className="text-[10px] font-mono text-slate-600 py-6 text-center">Preview appears as you type</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FullEditor({
  page,
  isLocked,
  onChange,
  parsed,
}: {
  page: VisualPage;
  diagramTitle: string;
  isLocked: boolean;
  onChange: (page: VisualPage) => void;
  parsed: ReturnType<typeof parseVisualInput>;
}) {
  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <TypeChips page={page} isLocked={isLocked} onChange={onChange} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <textarea
          value={page.sourceText}
          onChange={(e) => onChange({ ...page, sourceText: e.target.value })}
          disabled={isLocked}
          className="min-h-[200px] w-full p-3 text-sm font-mono text-slate-200 border border-cyan-500/25 bg-slate-950/60 focus:outline-none focus:border-cyan-400 resize-none"
        />
        <div className="min-h-[200px] overflow-auto border border-cyan-500/15 p-3">
          <VisualDiagram parsed={parsed} />
        </div>
      </div>
    </div>
  );
}

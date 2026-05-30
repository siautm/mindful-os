import { VISUAL_TYPE_LABELS, type VisualType } from "../../../lib/visualPages";
import { clipSm } from "../styles";

const TYPES: VisualType[] = ["flowmap", "bubblemap", "bracemap", "treemap"];

interface VisualTypePickerProps {
  onPick: (type: VisualType) => void;
  onCancel?: () => void;
  hideCancel?: boolean;
}

export function VisualTypePicker({ onPick, onCancel, hideCancel }: VisualTypePickerProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[280px] p-6 gap-4">
      <p className="text-[11px] font-mono text-cyan-500 tracking-widest">SELECT DIAGRAM TYPE</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onPick(t)}
            className="px-4 py-3 text-left border border-cyan-500/30 hover:bg-cyan-950/50 transition-colors"
            style={{ clipPath: clipSm }}
          >
            <span className="block text-xs font-mono text-cyan-200 tracking-wider">{VISUAL_TYPE_LABELS[t]}</span>
            <span className="block text-[9px] font-mono text-slate-500 mt-1">
              {t === "flowmap" && "Sequential steps"}
              {t === "bubblemap" && "Ideas around a topic"}
              {t === "bracemap" && "Chapters & notes"}
              {t === "treemap" && "Categories & items"}
            </span>
          </button>
        ))}
      </div>
      {!hideCancel && onCancel && (
        <button type="button" onClick={onCancel} className="text-[10px] font-mono text-slate-500 hover:text-slate-300">
          CANCEL
        </button>
      )}
    </div>
  );
}

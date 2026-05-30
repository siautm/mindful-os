import { useMemo } from "react";
import { motion } from "motion/react";
import { X, ZoomIn } from "lucide-react";
import { parseVisualInput, type VisualPage } from "../../lib/visualPages";
import { VisualDiagram } from "./visual/VisualDiagram";
import { clipSm, clipXl } from "./styles";

interface DiagramZoomModalProps {
  page: VisualPage;
  diagramTitle: string;
  onClose: () => void;
}

export function DiagramZoomModal({ page, diagramTitle, onClose }: DiagramZoomModalProps) {
  const parsed = useMemo(
    () => parseVisualInput(page.type, page.sourceText, diagramTitle.trim() || "Untitled"),
    [page, diagramTitle]
  );

  return (
    <motion.div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative max-w-[95vw] max-h-[90vh] w-full border border-cyan-500/35 bg-slate-900/98 flex flex-col overflow-hidden"
        style={{ clipPath: clipXl }}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        <div className="flex items-center justify-between p-3 border-b border-cyan-500/20 shrink-0">
          <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-500 tracking-widest">
            <ZoomIn className="w-4 h-4" />
            DIAGRAM ZOOM
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-cyan-400/10"
            style={{ clipPath: clipSm }}
            aria-label="Close zoom"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-8 min-h-[50vh]">
          <VisualDiagram parsed={parsed} className="min-w-max mx-auto" />
        </div>
      </motion.div>
    </motion.div>
  );
}

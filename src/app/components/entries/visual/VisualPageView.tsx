import { useMemo } from "react";
import { parseVisualInput, type VisualPage } from "../../../lib/visualPages";
import { VisualDiagram } from "./VisualDiagram";

interface VisualPageViewProps {
  page: VisualPage;
  diagramTitle: string;
  isLocked: boolean;
  /** Hide chrome when shown inside record card back */
  embedded?: boolean;
  onEdit?: () => void;
}

export function VisualPageView({ page, diagramTitle, embedded }: VisualPageViewProps) {
  const center = diagramTitle.trim() || "Untitled";
  const parsed = useMemo(
    () => parseVisualInput(page.type, page.sourceText, center),
    [page.type, page.sourceText, center]
  );

  const isEmpty = !page.sourceText.trim();

  if (embedded) {
    if (isEmpty) {
      return (
        <p className="text-center text-slate-500 text-xs font-mono py-12">No diagram content yet — tap EDIT below</p>
      );
    }
    return <VisualDiagram parsed={parsed} className="w-full" />;
  }

  return (
    <div className="flex flex-col h-full min-h-[min(60vh,480px)]">
      <div className="flex-1 flex items-center justify-center overflow-auto min-h-[280px]">
        {isEmpty ? (
          <p className="text-slate-500 text-xs font-mono">No diagram yet</p>
        ) : (
          <VisualDiagram parsed={parsed} className="w-full" />
        )}
      </div>
    </div>
  );
}

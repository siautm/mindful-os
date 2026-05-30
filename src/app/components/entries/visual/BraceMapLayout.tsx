import type { ReactNode } from "react";
import type { BraceData, BraceNode, BraceSection } from "../../../lib/visualPages";

const cellBase =
  "inline-flex items-center justify-center font-mono text-cyan-100 border border-cyan-500/55 bg-slate-900/90 text-center leading-tight";

function BraceCell({
  children,
  variant = "item",
}: {
  children: ReactNode;
  variant?: "topic" | "chapter" | "item";
}) {
  if (variant === "topic") {
    return (
      <div
        className={`${cellBase} text-xs sm:text-sm font-semibold min-w-[2.75rem] min-h-[2.75rem] max-w-[120px] px-2`}
      >
        {children}
      </div>
    );
  }
  if (variant === "chapter") {
    return (
      <div className={`${cellBase} text-[10px] sm:text-xs min-h-[2.5rem] px-3 py-1.5 min-w-[5.5rem] max-w-[140px] shrink-0`}>
        {children}
      </div>
    );
  }
  return (
    <div className={`${cellBase} text-[10px] min-w-[2.35rem] min-h-[2.35rem] max-w-[88px] px-1.5 shrink-0`}>
      {children}
    </div>
  );
}

/** Right-opening curly brace; topic sits to the left. */
function CurlyBrace({ height, narrow = false }: { height: number; narrow?: boolean }) {
  const w = narrow ? 28 : 40;
  const h = Math.max(height, 48);
  const mid = h / 2;
  const tip = Math.max(6, h * 0.06);
  const d = `M ${w * 0.2} ${mid} C ${w * 0.2} ${tip}, ${w * 0.88} ${tip}, ${w * 0.92} ${mid} C ${w * 0.88} ${h - tip}, ${w * 0.2} ${h - tip}, ${w * 0.2} ${mid}`;

  return (
    <svg
      className="text-cyan-400/80 shrink-0"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      aria-hidden
    >
      <path d={d} stroke="currentColor" strokeWidth={narrow ? 2 : 2.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BracePart({ node }: { node: BraceNode }) {
  if (!node.children.length) {
    return <BraceCell variant="item">{node.label}</BraceCell>;
  }

  const childH = Math.max(node.children.length * 40 + (node.children.length - 1) * 6, 44);

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <BraceCell variant="item">{node.label}</BraceCell>
      <CurlyBrace height={childH} narrow />
      <div className="flex items-center gap-1.5 flex-wrap">
        {node.children.map((child) =>
          child.children.length ? (
            <BracePart key={child.id} node={child} />
          ) : (
            <BraceCell key={child.id} variant="item">
              {child.label}
            </BraceCell>
          )
        )}
      </div>
    </div>
  );
}

function SectionRow({ section }: { section: BraceSection }) {
  return (
    <div className="flex items-center gap-2 min-h-[2.75rem] flex-wrap">
      <BraceCell variant="chapter">{section.title}</BraceCell>
      {section.items.map((item) => (
        <BracePart key={item.id} node={item} />
      ))}
    </div>
  );
}

export function BraceMapLayout({ data, className = "" }: { data: BraceData; className?: string }) {
  const { topic, sections } = data;
  const rowGap = 10;
  const rowH = 44;
  const braceH = Math.max(sections.length * rowH + Math.max(0, sections.length - 1) * rowGap, 72);

  if (!sections.some((s) => s.items.length > 0)) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center p-6 w-full overflow-x-auto ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex items-center shrink-0" style={{ minHeight: braceH }}>
          <BraceCell variant="topic">{topic}</BraceCell>
        </div>

        <div className="flex items-center shrink-0" style={{ minHeight: braceH }}>
          <CurlyBrace height={braceH} />
        </div>

        <div className="flex flex-col justify-center" style={{ gap: rowGap }}>
          {sections.map((sec) => (
            <SectionRow key={sec.id} section={sec} />
          ))}
        </div>
      </div>
    </div>
  );
}

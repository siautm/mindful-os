import type { ReactNode } from "react";
import type { BraceData, BraceNode, BraceSection } from "../../../lib/visualPages";

const ROW_GAP = 10;
const LEAF_ROW_H = 36;
const BRANCH_ROW_H = 44;

const cellBase =
  "inline-flex items-center justify-center font-mono text-cyan-100 border border-cyan-500/60 bg-slate-900/90 text-center leading-tight shrink-0";

function TopicCell({ children }: { children: ReactNode }) {
  return (
    <div className={`${cellBase} text-xs sm:text-sm font-semibold min-w-[2.75rem] min-h-[2.75rem] max-w-[120px] px-2`}>
      {children}
    </div>
  );
}

function ChapterCell({ children }: { children: ReactNode }) {
  return (
    <div className={`${cellBase} text-[10px] sm:text-xs min-h-[2.5rem] px-3 py-1.5 min-w-[5rem] max-w-[150px]`}>
      {children}
    </div>
  );
}

function ItemCell({ children }: { children: ReactNode }) {
  return (
    <div className={`${cellBase} text-[10px] min-w-[2.35rem] min-h-[2.35rem] max-w-[96px] px-1.5`}>{children}</div>
  );
}

function LeafBar({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-mono text-slate-200 px-2.5 py-1 min-w-[5rem] max-w-[200px] border border-cyan-500/25 bg-cyan-950/30 text-left">
      {children}
    </div>
  );
}

/** Vertical oval brace (HUD style from reference). */
function OvalBrace({ height, width = 22 }: { height: number; width?: number }) {
  const h = Math.max(height, 48);
  const rx = width / 2 - 1;
  const ry = h / 2 - 3;
  return (
    <svg
      className="text-cyan-400/85 shrink-0"
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      fill="none"
      aria-hidden
    >
      <ellipse cx={width / 2} cy={h / 2} rx={rx} ry={ry} stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function measureBranch(node: BraceNode): number {
  if (!node.children.length) return BRANCH_ROW_H;
  const allLeaves = node.children.every((c) => !c.children.length);
  if (allLeaves && node.children.length > 0) {
    return Math.max(BRANCH_ROW_H, node.children.length * LEAF_ROW_H + (node.children.length - 1) * 4);
  }
  return (
    node.children.reduce((sum, c) => sum + measureBranch(c), 0) +
    (node.children.length - 1) * ROW_GAP
  );
}

/** Chapter row: title + horizontal item squares (reference layout). */
function ChapterPointsRow({ title, items }: { title: string; items: BraceNode[] }) {
  return (
    <div className="flex items-center gap-2 min-h-[2.75rem]">
      <ChapterCell>{title}</ChapterCell>
      <div className="flex items-center gap-1.5 flex-wrap">
        {items.map((it) => (
          <ItemCell key={it.id}>{it.label}</ItemCell>
        ))}
      </div>
    </div>
  );
}

/** Nested branch: label + oval + vertical children (Water on Earth style). */
function BraceBranch({ node, depth }: { node: BraceNode; depth: number }) {
  if (!node.children.length) {
    return depth <= 1 ? <ChapterCell>{node.label}</ChapterCell> : <ItemCell>{node.label}</ItemCell>;
  }

  const allLeaves = node.children.every((c) => !c.children.length);

  if (allLeaves && depth === 1) {
    return <ChapterPointsRow title={node.label} items={node.children} />;
  }

  if (allLeaves && depth >= 2) {
    const h = Math.max(node.children.length * LEAF_ROW_H + (node.children.length - 1) * 4, 44);
    return (
      <div className="flex items-center gap-2">
        <ChapterCell>{node.label}</ChapterCell>
        <OvalBrace height={h} width={18} />
        <div className="flex flex-col justify-center gap-1">
          {node.children.map((c) => (
            <LeafBar key={c.id}>{c.label}</LeafBar>
          ))}
        </div>
      </div>
    );
  }

  const colH = measureBranch(node);
  return (
    <div className="flex items-center gap-2">
      <ChapterCell>{node.label}</ChapterCell>
      <OvalBrace height={colH} width={depth >= 2 ? 18 : 22} />
      <div className="flex flex-col justify-center" style={{ gap: ROW_GAP }}>
        {node.children.map((child) =>
          child.children.length ? (
            <BraceBranch key={child.id} node={child} depth={depth + 1} />
          ) : (
            <div key={child.id} className="flex items-center min-h-[2.35rem]">
              <ItemCell>{child.label}</ItemCell>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function SectionRow({ section }: { section: BraceSection }) {
  const { title, items } = section;
  if (!items.length) {
    return (
      <div className="flex items-center min-h-[2.75rem]">
        <ChapterCell>{title}</ChapterCell>
      </div>
    );
  }

  const allFlat = items.every((it) => !it.children.length);
  if (allFlat) {
    return <ChapterPointsRow title={title} items={items} />;
  }

  const branch: BraceNode = { id: section.id, label: title, children: items };
  return <BraceBranch node={branch} depth={1} />;
}

export function BraceMapLayout({ data, className = "" }: { data: BraceData; className?: string }) {
  const { topic, sections } = data;

  if (!sections.length) return null;

  const columnH =
    sections.reduce((sum, sec) => {
      const rowH = sec.items.every((i) => !i.children.length)
        ? BRANCH_ROW_H
        : measureBranch({ id: sec.id, label: sec.title, children: sec.items });
      return sum + rowH;
    }, 0) +
    Math.max(0, sections.length - 1) * ROW_GAP;

  return (
    <div className={`flex items-center justify-center p-6 w-full overflow-x-auto ${className}`}>
      <div className="flex items-center gap-2">
        <div className="flex items-center shrink-0" style={{ minHeight: columnH }}>
          <TopicCell>{topic}</TopicCell>
        </div>

        <div className="flex items-center shrink-0" style={{ minHeight: columnH }}>
          <OvalBrace height={columnH} />
        </div>

        <div className="flex flex-col justify-center" style={{ gap: ROW_GAP }}>
          {sections.map((sec) => (
            <SectionRow key={sec.id} section={sec} />
          ))}
        </div>
      </div>
    </div>
  );
}

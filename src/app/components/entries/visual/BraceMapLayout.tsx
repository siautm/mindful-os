import type { ReactNode } from "react";
import type { BraceData, BraceNode, BraceSection } from "../../../lib/visualPages";

const ROW_GAP = 10;
const LEAF_ROW_H = 34;
const BRANCH_ROW_H = 44;
const CONNECT_W = 32;

const strokeW = 1.75;

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

function SubCell({ children }: { children: ReactNode }) {
  return (
    <div className={`${cellBase} text-[10px] min-h-[2.35rem] px-2.5 py-1 min-w-[4.5rem] max-w-[130px]`}>{children}</div>
  );
}

function LeafBar({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-mono text-slate-200 px-2.5 py-1 min-h-[2rem] min-w-[4rem] max-w-[200px] border border-cyan-500/25 bg-cyan-950/30 text-left shrink-0 flex items-center">
      {children}
    </div>
  );
}

function leafColumnHeight(count: number) {
  if (count <= 0) return BRANCH_ROW_H;
  return count * LEAF_ROW_H + Math.max(0, count - 1) * 4;
}

export function measureBraceNode(node: BraceNode): number {
  if (!node.children.length) return BRANCH_ROW_H;
  const childHeights = node.children.map(measureBraceNode);
  return childHeights.reduce((a, b) => a + b, 0) + Math.max(0, childHeights.length - 1) * ROW_GAP;
}

/** Curved lines: parent midpoint → each child row center (by measured heights). */
function VerticalTreeLines({ childHeights, width = CONNECT_W }: { childHeights: number[]; width?: number }) {
  if (!childHeights.length) return null;

  const gap = ROW_GAP;
  const totalH = Math.max(
    childHeights.reduce((a, b) => a + b, 0) + Math.max(0, childHeights.length - 1) * gap,
    40
  );
  const parentY = totalH / 2;

  let y = 0;
  const childYs = childHeights.map((ch) => {
    const cy = y + ch / 2;
    y += ch + gap;
    return cy;
  });

  return (
    <svg
      className="shrink-0 text-cyan-400/80"
      width={width}
      height={totalH}
      viewBox={`0 0 ${width} ${totalH}`}
      fill="none"
      aria-hidden
    >
      {childYs.map((cy, i) => (
        <path
          key={i}
          d={`M 0 ${parentY} C ${width * 0.4} ${parentY}, ${width * 0.62} ${cy}, ${width} ${cy}`}
          stroke="currentColor"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function BraceBranch({ node, depth }: { node: BraceNode; depth: number }) {
  const Label = depth <= 1 ? ChapterCell : SubCell;

  if (!node.children.length) {
    return (
      <div className="flex items-center min-h-[2.5rem]">
        <Label>{node.label}</Label>
      </div>
    );
  }

  const allLeaves = node.children.every((c) => !c.children.length);

  if (allLeaves) {
    const colH = leafColumnHeight(node.children.length);
    return (
      <div className="flex items-center">
        <Label>{node.label}</Label>
        <VerticalTreeLines
          childHeights={node.children.map(() => LEAF_ROW_H)}
          width={depth >= 2 ? 26 : CONNECT_W}
        />
        <div className="flex flex-col justify-center gap-1">
          {node.children.map((c) => (
            <LeafBar key={c.id}>{c.label}</LeafBar>
          ))}
        </div>
      </div>
    );
  }

  const childHeights = node.children.map(measureBraceNode);
  return (
    <div className="flex items-center">
      <Label>{node.label}</Label>
      <VerticalTreeLines childHeights={childHeights} width={depth >= 2 ? 26 : CONNECT_W} />
      <div className="flex flex-col justify-center" style={{ gap: ROW_GAP }}>
        {node.children.map((child) => (
          <BraceBranch key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}

function SectionRow({ section }: { section: BraceSection }) {
  const branch: BraceNode = { id: section.id, label: section.title, children: section.items };
  return <BraceBranch node={branch} depth={1} />;
}

export function BraceMapLayout({ data, className = "" }: { data: BraceData; className?: string }) {
  const { topic, sections } = data;

  if (!sections.length) return null;

  const sectionHeights = sections.map((sec) =>
    measureBraceNode({ id: sec.id, label: sec.title, children: sec.items })
  );
  const columnH =
    sectionHeights.reduce((a, b) => a + b, 0) + Math.max(0, sections.length - 1) * ROW_GAP;

  return (
    <div className={`flex items-center justify-center p-6 w-full overflow-x-auto ${className}`}>
      <div className="flex items-center">
        <div className="flex items-center shrink-0" style={{ minHeight: columnH }}>
          <TopicCell>{topic}</TopicCell>
        </div>

        <VerticalTreeLines childHeights={sectionHeights} />

        <div className="flex flex-col justify-center" style={{ gap: ROW_GAP }}>
          {sections.map((sec) => (
            <SectionRow key={sec.id} section={sec} />
          ))}
        </div>
      </div>
    </div>
  );
}

import { entryToMetadataPairs, rowsToMetadata, type MetadataRow } from "./entryTypes";

export const VISUAL_PAGES_KEY = "__visualPages";

export type VisualType = "flowmap" | "bubblemap" | "bracemap" | "treemap";

export interface VisualPage {
  id: string;
  type: VisualType;
  title: string;
  sourceText: string;
}

export interface FlowData {
  nodes: { id: string; label: string }[];
}

export interface BubbleData {
  center: string;
  items: { id: string; label: string }[];
}

export interface BraceNode {
  id: string;
  label: string;
  children: BraceNode[];
}

export interface BraceSection {
  id: string;
  title: string;
  items: BraceNode[];
}

export interface BraceData {
  topic: string;
  sections: BraceSection[];
}

export interface TreeGroup {
  id: string;
  title: string;
  items: { id: string; label: string }[];
}

export interface TreeData {
  root: string;
  groups: TreeGroup[];
}

export type ParsedVisual =
  | { type: "flowmap"; data: FlowData }
  | { type: "bubblemap"; data: BubbleData }
  | { type: "bracemap"; data: BraceData }
  | { type: "treemap"; data: TreeData };

export const VISUAL_TYPE_LABELS: Record<VisualType, string> = {
  flowmap: "FLOW MAP",
  bubblemap: "BUBBLE MAP",
  bracemap: "BRACE MAP",
  treemap: "TREE MAP",
};

export const VISUAL_FORMAT_HINTS: Record<VisualType, string> = {
  flowmap: `Steps (one per line):
1. boil the water
2. stir the sauce
3. serve`,
  bubblemap: `Traits / ideas around the title (center):
1. salty
2. creamy
3. fast`,
  bracemap: `Chapters (#) + points (numbered). Indent for sub-parts:
# chapter1
1. point a
2. point b
# chapter2
1. part name
  1. detail
  2. detail`,
  treemap: `Categories (# headers) + items:
# Sauces
1. tomato
2. cream
# Tools
1. pan
2. whisk`,
};

function uid(prefix: string, n: number) {
  return `${prefix}-${n}`;
}

function parseItemLine(line: string): string | null {
  const m = line.match(/^(?:\d+[\.\)]\s*|\d+\s+|[-*•]\s+)(.+)$/);
  if (m) return m[1].trim();
  return null;
}

function isSectionLine(line: string): string | null {
  const hash = line.match(/^#+\s*(.+)$/);
  if (hash) return hash[1].trim();
  if (line.endsWith(":") && line.length > 1 && !parseItemLine(line)) {
    return line.slice(0, -1).trim();
  }
  return null;
}

export function parseVisualInput(type: VisualType, sourceText: string, centerTitle: string): ParsedVisual {
  const rawLines = sourceText.split(/\r?\n/);
  const lines = rawLines.map((l) => l.trim());

  if (type === "flowmap") {
    const nodes: FlowData["nodes"] = [];
    let n = 0;
    for (const line of lines) {
      if (!line) continue;
      const item = parseItemLine(line) ?? (/^#/.test(line) ? null : line);
      if (!item) continue;
      nodes.push({ id: uid("flow", n++), label: item });
    }
    return { type: "flowmap", data: { nodes } };
  }

  if (type === "bubblemap") {
    const items: BubbleData["items"] = [];
    let n = 0;
    for (const line of lines) {
      if (!line || /^#/.test(line)) continue;
      const item = parseItemLine(line) ?? line;
      if (!item) continue;
      items.push({ id: uid("bub", n++), label: item });
    }
    return { type: "bubblemap", data: { center: centerTitle, items } };
  }

  const sections = parseSectionedLines(lines);

  if (type === "bracemap") {
    const braceSections = parseBraceMapSections(rawLines);
    return {
      type: "bracemap",
      data: {
        topic: centerTitle,
        sections: braceSections.length
          ? braceSections
          : [{ id: "sec-0", title: "Notes", items: [] }],
      },
    };
  }

  const groups: TreeGroup[] = sections.map((s) => ({
    id: s.id,
    title: s.title,
    items: s.items.map((n) => ({ id: n.id, label: n.label })),
  }));
  return {
    type: "treemap",
    data: { root: centerTitle, groups: groups.length ? groups : [{ id: "g0", title: "Items", items: [] }] },
  };
}

export function parseVisualPagesFromMetadata(metadata: Record<string, unknown> | undefined): VisualPage[] {
  const raw = metadata?.[VISUAL_PAGES_KEY];
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return (raw as VisualPage[]).filter((p) => p?.id && p?.type);
  }
  if (typeof raw === "string") {
    try {
      const arr = JSON.parse(raw) as VisualPage[];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function metadataPairsForEditor(metadata: Record<string, unknown> | undefined): { key: string; value: string }[] {
  return entryToMetadataPairs(metadata).filter((p) => p.key !== VISUAL_PAGES_KEY);
}

export function buildEntryMetadata(
  pairs: { key: string; value: string }[],
  visualPages: VisualPage[]
): Record<string, unknown> {
  const rows: MetadataRow[] = pairs.map((p, i) => ({
    id: `row-${i}`,
    key: p.key,
    value: p.value,
  }));
  const meta: Record<string, unknown> = { ...rowsToMetadata(rows) };
  if (visualPages.length > 0) {
    meta[VISUAL_PAGES_KEY] = visualPages;
  }
  return meta;
}

function parseSectionedLines(lines: string[]): BraceSection[] {
  const sections: BraceSection[] = [];
  let current: BraceSection | null = null;
  let itemIdx = 0;

  for (const line of lines) {
    if (!line) continue;
    const sectionTitle = isSectionLine(line);
    if (sectionTitle) {
      current = { id: uid("sec", sections.length), title: sectionTitle, items: [] };
      sections.push(current);
      itemIdx = 0;
      continue;
    }
    const item = parseItemLine(line);
    if (!item) continue;
    if (!current) {
      current = { id: uid("sec", sections.length), title: "Section", items: [] };
      sections.push(current);
    }
    current.items.push({ id: uid("it", itemIdx++), label: item, children: [] });
  }
  return sections;
}

/** Brace map: # chapters, numbered points; 2-space indent nests under previous point. */
export function parseBraceMapSections(rawLines: string[]): BraceSection[] {
  const sections: BraceSection[] = [];
  let current: BraceSection | null = null;
  const stack: BraceNode[] = [];
  let nodeIdx = 0;

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const indent = raw.length - raw.trimStart().length;
    const depth = Math.min(Math.floor(indent / 2), 4);

    const hash = trimmed.match(/^(#+)\s*(.+)$/);
    if (hash) {
      const level = hash[1].length;
      const title = hash[2].trim();
      if (level === 1) {
        current = { id: uid("sec", sections.length), title, items: [] };
        sections.push(current);
        stack.length = 0;
      } else if (current) {
        const sub: BraceNode = { id: uid("node", nodeIdx++), label: title, children: [] };
        current.items.push(sub);
        stack.length = 0;
        stack[0] = sub;
      }
      continue;
    }

    const item = parseItemLine(trimmed);
    if (!item) continue;
    if (!current) {
      current = { id: uid("sec", sections.length), title: "Section", items: [] };
      sections.push(current);
    }

    const node: BraceNode = { id: uid("node", nodeIdx++), label: item, children: [] };
    if (depth === 0) {
      current.items.push(node);
      stack.length = 0;
      stack[0] = node;
    } else {
      const parent = stack[depth - 1] ?? stack[stack.length - 1];
      if (parent) {
        parent.children.push(node);
        stack[depth] = node;
        stack.length = depth + 1;
      } else {
        current.items.push(node);
        stack[0] = node;
      }
    }
  }

  return sections;
}

export function newVisualPage(type: VisualType, index: number): VisualPage {
  return {
    id: `vis-${Date.now()}-${index}`,
    type,
    title: VISUAL_TYPE_LABELS[type],
    sourceText: "",
  };
}

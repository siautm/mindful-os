import type { KnowledgeEntry } from "./entryTypes";

export type EntriesSortMode = "updated" | "created" | "title";

function sortTime(e: KnowledgeEntry): number {
  const raw = e.updatedAt ?? e.entryAt ?? e.createdAt ?? "";
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

function createdTime(e: KnowledgeEntry): number {
  const raw = e.createdAt ?? e.entryAt ?? "";
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

export function sortEntries(list: KnowledgeEntry[], mode: EntriesSortMode): KnowledgeEntry[] {
  const copy = [...list];
  copy.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    if (mode === "title") {
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    }
    if (mode === "created") {
      return createdTime(b) - createdTime(a);
    }
    return sortTime(b) - sortTime(a);
  });
  return copy;
}

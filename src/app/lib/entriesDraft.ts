import type { KnowledgeEntry } from "./entryTypes";
import { entryToMetadataPairs } from "./entryTypes";

const DRAFT_PREFIX = "mindful_entry_draft_";

export interface EntryDraftSnapshot {
  title: string;
  tags: string[];
  photoUrl: string;
  metadata: { key: string; value: string }[];
  savedAt: string;
}

export function saveEntryDraft(entryId: string, snapshot: EntryDraftSnapshot): void {
  try {
    localStorage.setItem(`${DRAFT_PREFIX}${entryId}`, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function readEntryDraft(entryId: string): EntryDraftSnapshot | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${entryId}`);
    return raw ? (JSON.parse(raw) as EntryDraftSnapshot) : null;
  } catch {
    return null;
  }
}

export function clearEntryDraft(entryId: string): void {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${entryId}`);
  } catch {
    /* ignore */
  }
}

export function snapshotFromEntry(
  entry: KnowledgeEntry,
  overrides?: Partial<EntryDraftSnapshot>
): EntryDraftSnapshot {
  return {
    title: overrides?.title ?? entry.title,
    tags: overrides?.tags ?? entry.tags,
    photoUrl: overrides?.photoUrl ?? entry.photoUrl ?? "",
    metadata: overrides?.metadata ?? entryToMetadataPairs(entry.metadata),
    savedAt: new Date().toISOString(),
  };
}

export function draftsEqual(a: EntryDraftSnapshot, b: EntryDraftSnapshot): boolean {
  return (
    a.title === b.title &&
    a.photoUrl === b.photoUrl &&
    JSON.stringify(a.tags) === JSON.stringify(b.tags) &&
    JSON.stringify(a.metadata) === JSON.stringify(b.metadata)
  );
}

/** Field value kinds for entry metadata. */
export type EntryFieldValueKind = "text" | "number" | "list" | "mindmap_list";

export interface MindmapListItem {
  id: string;
  text: string;
  children: string[];
}

export interface MindmapListValue {
  format: "mindmap_list";
  items: MindmapListItem[];
}

export interface EntryTypeField {
  id: string;
  typeId: string;
  fieldKey: string;
  label: string;
  valueKind: EntryFieldValueKind;
  allowPreset: boolean;
  sortOrder: number;
}

export interface EntryType {
  id: string;
  typeKey: string;
  label: string;
  sortOrder: number;
}

export interface EntryTypePreset {
  typeId: string;
  fieldKey: string;
  value: unknown;
}

export interface KnowledgeEntry {
  id: string;
  typeId: string;
  title: string;
  note: string;
  tags: string[];
  metadata: Record<string, unknown>;
  isPinned: boolean;
  entryAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EntryCatalog {
  types: EntryType[];
  fields: EntryTypeField[];
  presets: EntryTypePreset[];
}

const ENTRIES_CACHE_KEY = "mindful_entries_catalog";
const ENTRIES_LIST_KEY = "mindful_entries_list";

export function saveEntriesCache(catalog: EntryCatalog, entries: KnowledgeEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ENTRIES_CACHE_KEY, JSON.stringify(catalog));
    localStorage.setItem(ENTRIES_LIST_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

export function readEntriesCache(): { catalog: EntryCatalog | null; entries: KnowledgeEntry[] } {
  if (typeof localStorage === "undefined") return { catalog: null, entries: [] };
  try {
    const catalogRaw = localStorage.getItem(ENTRIES_CACHE_KEY);
    const entriesRaw = localStorage.getItem(ENTRIES_LIST_KEY);
    return {
      catalog: catalogRaw ? (JSON.parse(catalogRaw) as EntryCatalog) : null,
      entries: entriesRaw ? (JSON.parse(entriesRaw) as KnowledgeEntry[]) : [],
    };
  } catch {
    return { catalog: null, entries: [] };
  }
}

/** Copy type presets into metadata for fields that allow presets. */
export function applyPresetsToMetadata(
  typeId: string,
  metadata: Record<string, unknown>,
  fields: EntryTypeField[],
  presets: EntryTypePreset[]
): Record<string, unknown> {
  const next = { ...metadata };
  for (const field of fields.filter((f) => f.typeId === typeId && f.allowPreset)) {
    if (next[field.fieldKey] !== undefined) continue;
    const preset = presets.find((p) => p.typeId === typeId && p.fieldKey === field.fieldKey);
    if (preset?.value !== undefined) {
      next[field.fieldKey] = structuredClone(preset.value);
    }
  }
  return next;
}

export function parseMindmapListText(raw: string): MindmapListValue {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: MindmapListItem[] = [];
  let current: MindmapListItem | null = null;

  for (const line of lines) {
    const childMatch = line.match(/^[-*]\s+(.+)$/);
    if (childMatch && current) {
      current.children.push(childMatch[1].trim());
      continue;
    }
    const stepMatch = line.match(/^(?:\d+[\.\)]\s*|\d+\s+)(.+)$/);
    const text = stepMatch ? stepMatch[1].trim() : line;
    current = { id: `${Date.now()}-${items.length}`, text, children: [] };
    items.push(current);
  }

  return { format: "mindmap_list", items };
}

export function mindmapListToText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const v = value as MindmapListValue;
  if (!Array.isArray(v.items)) return "";
  return v.items
    .map((item, idx) => {
      const head = `${idx + 1}. ${item.text}`;
      const subs = (item.children ?? []).map((c) => `  - ${c}`).join("\n");
      return subs ? `${head}\n${subs}` : head;
    })
    .join("\n");
}

export function emptyMetadataForFields(fields: EntryTypeField[], typeId: string): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  for (const f of fields.filter((x) => x.typeId === typeId)) {
    if (f.valueKind === "list") meta[f.fieldKey] = [];
    else if (f.valueKind === "number") meta[f.fieldKey] = null;
    else if (f.valueKind === "mindmap_list") meta[f.fieldKey] = { format: "mindmap_list", items: [] };
    else meta[f.fieldKey] = "";
  }
  return meta;
}

export function entrySearchBlob(entry: KnowledgeEntry, typeLabel: string): string {
  const tagStr = entry.tags.join(" ");
  const metaStr = JSON.stringify(entry.metadata ?? {});
  return [entry.title, entry.note, typeLabel, tagStr, metaStr].join(" ").toLowerCase();
}

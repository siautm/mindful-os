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
  /** Suggested metadata keys per type (for datalist). */
  keyCatalog: Record<string, string[]>;
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
    const catalog = catalogRaw ? (JSON.parse(catalogRaw) as EntryCatalog) : null;
    if (catalog && !catalog.keyCatalog) catalog.keyCatalog = {};
    return {
      catalog,
      entries: entriesRaw ? (JSON.parse(entriesRaw) as KnowledgeEntry[]) : [],
    };
  } catch {
    return { catalog: null, entries: [] };
  }
}

export interface MetadataRow {
  id: string;
  key: string;
  value: string;
}

/** Turn stored metadata into editable key/value rows (values as text). */
export function metadataToRows(metadata: Record<string, unknown> | undefined): MetadataRow[] {
  if (!metadata || typeof metadata !== "object") return [];
  return Object.entries(metadata).map(([key, value], i) => ({
    id: `row-${i}-${key}`,
    key,
    value: metadataValueToText(value),
  }));
}

export function metadataValueToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object" && (value as MindmapListValue).format === "mindmap_list") {
    return mindmapListToText(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Build metadata object from rows; empty keys are skipped. */
export function rowsToMetadata(rows: MetadataRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    out[key] = row.value;
  }
  return out;
}

/** Suggested field names for a type (saved keys + keys used in entries). */
export function buildKeySuggestions(
  typeId: string,
  fields: EntryTypeField[],
  entries: KnowledgeEntry[]
): string[] {
  const set = new Set<string>();
  for (const f of fields) {
    if (f.typeId === typeId && f.fieldKey.trim()) set.add(f.fieldKey.trim());
  }
  for (const e of entries) {
    if (e.typeId !== typeId) continue;
    for (const k of Object.keys(e.metadata ?? {})) {
      if (k.trim()) set.add(k.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
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

export function entrySearchBlob(entry: KnowledgeEntry, typeLabel: string): string {
  const tagStr = entry.tags.join(" ");
  const metaStr = JSON.stringify(entry.metadata ?? {});
  return [entry.title, entry.note, typeLabel, tagStr, metaStr].join(" ").toLowerCase();
}

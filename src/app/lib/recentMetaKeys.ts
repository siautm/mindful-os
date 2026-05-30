const KEY = "mindful_entries_recent_meta_keys";
const MAX = 12;

export function readRecentMetaKeys(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function pushRecentMetaKey(key: string): void {
  const k = key.trim();
  if (!k) return;
  const prev = readRecentMetaKeys().filter((x) => x !== k);
  const next = [k, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function mergeMetaKeySuggestions(catalogKeys: string[], recent: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of [...recent, ...catalogKeys]) {
    const t = k.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

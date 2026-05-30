/** Parse search bar: `tag:foo` filters tag; remainder matches title only. */
export function parseEntriesQuery(raw: string): { titleQuery: string; tagFromQuery: string | null } {
  const trimmed = raw.trim();
  const tagMatch = trimmed.match(/(?:^|\s)tag:([^\s]+)/i);
  const tagFromQuery = tagMatch?.[1]?.toLowerCase() ?? null;
  const titleQuery = trimmed
    .replace(/(?:^|\s)tag:[^\s]+/gi, "")
    .trim()
    .toLowerCase();
  return { titleQuery, tagFromQuery };
}

export function entryMatchesSearch(
  title: string,
  tags: string[],
  titleQuery: string,
  tagFromQuery: string | null,
  selectedTags: string[]
): boolean {
  const tagFilters = [...selectedTags];
  if (tagFromQuery && !tagFilters.includes(tagFromQuery)) {
    tagFilters.push(tagFromQuery);
  }
  if (tagFilters.length > 0 && !tagFilters.some((t) => tags.includes(t))) {
    return false;
  }
  if (!titleQuery) return true;
  return title.toLowerCase().includes(titleQuery);
}

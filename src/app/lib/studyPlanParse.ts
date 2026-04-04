/**
 * Parse pasted course outlines into study plan parts.
 * Splits on lines like "Part 1: Title" or "---- Part 2: Foo ----".
 */

export type ParsedStudyPart = { title: string; detail: string };

function parseSegment(segment: string): ParsedStudyPart | null {
  const lines = segment
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^-{10,}$/.test(l));
  if (!lines.length) return null;
  const first = lines[0].replace(/^[-\s]+/g, "").replace(/[-\s]+$/g, "");
  const m = first.match(/^Part\s+\d+\s*:\s*(.+)$/i);
  const title = m ? m[1].trim() : first;
  const detail = lines.slice(1).join("\n").trim();
  if (!title) return null;
  return { title, detail };
}

export function parseStudyPlanBulkText(raw: string): ParsedStudyPart[] {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const segments = normalized.split(/\n(?=(?:\s*-{5,}\s*)?Part\s+\d+\s*:)/i);
  const out: ParsedStudyPart[] = [];
  for (const seg of segments) {
    const parsed = parseSegment(seg);
    if (parsed) out.push(parsed);
  }
  return out;
}

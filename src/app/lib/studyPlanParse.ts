/**
 * Parse pasted course outlines into study plan parts.
 *
 * Supports:
 * - Udemy-style blocks separated by blank lines (title line + lecture summary line(s))
 * - Sections split when a title line follows a line starting with "N lecture(s) •"
 * - Legacy "Part 1: Title" / dashed separators
 */

export type ParsedStudyPart = { title: string; detail: string };

/** Line begins with a lecture count summary, e.g. "5 lectures • 12min" or "1 lecture • 1min" */
const LECTURE_SUMMARY_START = /^\d+\s+lectures?\s*•/i;

function stripDashes(line: string): string {
  return line.replace(/^[-\s]+/, "").replace(/[-\s]+$/, "");
}

function isPartHeadingLine(line: string): boolean {
  return /^Part\s+\d+\s*:/i.test(stripDashes(line));
}

function parseBlockLines(blockLines: string[]): ParsedStudyPart | null {
  if (!blockLines.length) return null;
  const firstRaw = stripDashes(blockLines[0]);
  const partMatch = firstRaw.match(/^Part\s+\d+\s*:\s*(.+)$/i);
  const title = (partMatch ? partMatch[1] : firstRaw).trim();
  const detail = blockLines.slice(1).join("\n").trim();
  if (!title) return null;
  return { title, detail };
}

/**
 * Split non-empty lines into blocks: each block is one part (title + following lines).
 * A new block starts when:
 * - The line is a "Part N:" heading (and there is already content in the current block), or
 * - The line does not start with a lecture summary AND the previous line starts with one
 *   (typical Udemy: "Regression" after "…47min" line).
 */
function splitLinesIntoBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let cur: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const startsWithLectureSummary = LECTURE_SUMMARY_START.test(trimmed);
    const partHeading = isPartHeadingLine(trimmed);
    const last = cur[cur.length - 1];

    const startNew =
      cur.length > 0 &&
      (partHeading ||
        (!startsWithLectureSummary &&
          last != null &&
          LECTURE_SUMMARY_START.test(last)));

    if (startNew) {
      blocks.push(cur);
      cur = [];
    }
    cur.push(trimmed);
  }

  if (cur.length) blocks.push(cur);
  return blocks;
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .trim()
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function parseStudyPlanBulkText(raw: string): ParsedStudyPart[] {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = splitIntoParagraphs(normalized);
  const allBlocks: string[][] = [];

  if (paragraphs.length <= 1) {
    const lines = normalized.split("\n").map((l) => l.trim());
    const blocks = splitLinesIntoBlocks(lines);
    if (blocks.length) allBlocks.push(...blocks);
    else {
      const nonEmpty = lines.filter(Boolean);
      if (nonEmpty.length) allBlocks.push(nonEmpty);
    }
  } else {
    for (const para of paragraphs) {
      const lines = para.split("\n").map((l) => l.trim());
      const nonEmptyLines = lines.filter(Boolean);
      if (nonEmptyLines.length === 0) continue;
      if (nonEmptyLines.length === 1) {
        allBlocks.push(nonEmptyLines);
      } else {
        const sub = splitLinesIntoBlocks(nonEmptyLines);
        allBlocks.push(...(sub.length ? sub : [nonEmptyLines]));
      }
    }
  }

  const out: ParsedStudyPart[] = [];
  for (const b of allBlocks) {
    const parsed = parseBlockLines(b);
    if (parsed) out.push(parsed);
  }
  return out;
}

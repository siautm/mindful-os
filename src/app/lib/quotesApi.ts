export type QuoteLocale = "en" | "zh";

/** Same shape as `QuoteEntry` in storage (kept separate to avoid circular imports). */
export type FetchedQuote = { text: string; author: string };

const FALLBACK_EN: FetchedQuote[] = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
];

const FALLBACK_ZH: FetchedQuote[] = [
  { text: "千里之行，始于足下。", author: "老子" },
  { text: "不积跬步，无以至千里。", author: "荀子" },
  { text: "业精于勤，荒于嬉。", author: "韩愈" },
  { text: "博观而约取，厚积而薄发。", author: "苏轼" },
];

function randomFallback(locale: QuoteLocale): FetchedQuote {
  const list = locale === "zh" ? FALLBACK_ZH : FALLBACK_EN;
  return list[Math.floor(Math.random() * list.length)];
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchEnglishQuote(): Promise<FetchedQuote | null> {
  try {
    const r = await fetchWithTimeout("https://api.quotable.io/random?maxLength=220", 10_000);
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as { content?: string; author?: string };
    if (data.content?.trim()) {
      return { text: data.content.trim(), author: (data.author || "Unknown").trim() };
    }
  } catch {
    /* try backup */
  }
  try {
    const r = await fetchWithTimeout("https://dummyjson.com/quotes/random", 10_000);
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as { quote?: string; author?: string };
    if (data.quote?.trim()) {
      return { text: data.quote.trim(), author: (data.author || "Unknown").trim() };
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function fetchChineseQuote(): Promise<FetchedQuote | null> {
  try {
    const r = await fetchWithTimeout("https://v1.hitokoto.cn/?encode=json", 10_000);
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as {
      hitokoto?: string;
      from?: string;
      from_who?: string | null;
    };
    const text = data.hitokoto?.trim();
    if (!text) return null;
    const author = (data.from_who || data.from || "佚名").trim();
    return { text, author };
  } catch {
    return null;
  }
}

/**
 * Fetches a random quote for the given language (English: Quotable/DummyJSON, Chinese: Hitokoto).
 * Never throws; returns offline fallbacks if every network source fails.
 */
export async function fetchRandomQuote(locale: QuoteLocale): Promise<FetchedQuote> {
  const online =
    locale === "zh" ? await fetchChineseQuote() : await fetchEnglishQuote();
  if (online) return online;
  return randomFallback(locale);
}

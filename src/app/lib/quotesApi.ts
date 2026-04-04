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

const PREFETCH_KEY = "mindful_quote_prefetch_v1";
const PREFETCH_MAX_AGE_MS = 45 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

type PrefetchStore = Partial<
  Record<QuoteLocale, { text: string; author: string; at: number }>
>;

function readPrefetchStore(): PrefetchStore {
  try {
    const raw = localStorage.getItem(PREFETCH_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PrefetchStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePrefetchQuote(locale: QuoteLocale, q: FetchedQuote): void {
  try {
    const store = readPrefetchStore();
    store[locale] = { ...q, at: Date.now() };
    localStorage.setItem(PREFETCH_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

function readCachedPrefetch(locale: QuoteLocale): FetchedQuote | null {
  const row = readPrefetchStore()[locale];
  if (!row?.text?.trim()) return null;
  if (Date.now() - row.at > PREFETCH_MAX_AGE_MS) return null;
  return { text: row.text, author: row.author };
}

function randomFallback(locale: QuoteLocale): FetchedQuote {
  const list = locale === "zh" ? FALLBACK_ZH : FALLBACK_EN;
  return list[Math.floor(Math.random() * list.length)];
}

function randomFromFavorites(favorites: readonly { text: string; author: string }[]): FetchedQuote | null {
  if (!favorites.length) return null;
  const i = Math.floor(Math.random() * favorites.length);
  const f = favorites[i];
  return { text: f.text, author: f.author };
}

/** Instant quote: favorite → prefetch cache → built-in fallback (sync). */
export function getInstantQuote(
  locale: QuoteLocale,
  favorites: readonly { text: string; author: string }[]
): FetchedQuote {
  return (
    randomFromFavorites(favorites) ??
    readCachedPrefetch(locale) ??
    randomFallback(locale)
  );
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
  const parseQuotable = async (): Promise<FetchedQuote> => {
    const r = await fetchWithTimeout("https://api.quotable.io/random?maxLength=220", FETCH_TIMEOUT_MS);
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as { content?: string; author?: string };
    if (!data.content?.trim()) throw new Error("empty");
    return { text: data.content.trim(), author: (data.author || "Unknown").trim() };
  };
  const parseDummy = async (): Promise<FetchedQuote> => {
    const r = await fetchWithTimeout("https://dummyjson.com/quotes/random", FETCH_TIMEOUT_MS);
    if (!r.ok) throw new Error(String(r.status));
    const data = (await r.json()) as { quote?: string; author?: string };
    if (!data.quote?.trim()) throw new Error("empty");
    return { text: data.quote.trim(), author: (data.author || "Unknown").trim() };
  };
  try {
    return await Promise.any([parseQuotable(), parseDummy()]);
  } catch {
    return null;
  }
}

async function fetchChineseQuote(): Promise<FetchedQuote | null> {
  try {
    const r = await fetchWithTimeout("https://v1.hitokoto.cn/?encode=json", FETCH_TIMEOUT_MS);
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

/** API fetch; updates prefetch cache on success. Use for refresh and idle warmup. */
export async function fetchQuoteFromNetwork(locale: QuoteLocale): Promise<FetchedQuote> {
  const online = locale === "zh" ? await fetchChineseQuote() : await fetchEnglishQuote();
  const result = online ?? randomFallback(locale);
  if (online) writePrefetchQuote(locale, online);
  return result;
}

export async function fetchRandomQuote(locale: QuoteLocale): Promise<FetchedQuote> {
  return fetchQuoteFromNetwork(locale);
}

export function scheduleIdleQuotePrefetch(): void {
  const run = () => {
    void fetchQuoteFromNetwork("en").catch(() => {});
    void fetchQuoteFromNetwork("zh").catch(() => {});
  };
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(run, { timeout: 10_000 });
  } else {
    window.setTimeout(run, 2500);
  }
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { QuoteLocale, QuoteSourceTag } from "../lib/quotesApi";
import { QUOTE_SOURCE_TAGS } from "../lib/quotesApi";
import {
  getQuoteLocale,
  getQuoteTags,
  saveQuoteLocale,
  saveQuoteTags,
  STORAGE_HYDRATED_EVENT,
} from "../lib/storage";

interface QuoteLocaleContextValue {
  locale: QuoteLocale;
  setLocale: (locale: QuoteLocale) => void;
  toggleLocale: () => void;
  quoteTags: QuoteSourceTag[];
  setQuoteTags: (tags: QuoteSourceTag[]) => void;
  toggleQuoteTag: (tag: QuoteSourceTag) => void;
}

const QuoteLocaleContext = createContext<QuoteLocaleContextValue | undefined>(undefined);

export function QuoteLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<QuoteLocale>(() => getQuoteLocale());
  const [quoteTags, setQuoteTagsState] = useState<QuoteSourceTag[]>(() => getQuoteTags());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      setLocaleState(getQuoteLocale());
      setQuoteTagsState(getQuoteTags());
    };
    window.addEventListener(STORAGE_HYDRATED_EVENT, sync);
    return () => window.removeEventListener(STORAGE_HYDRATED_EVENT, sync);
  }, []);

  const setLocale = useCallback((next: QuoteLocale) => {
    setLocaleState(next);
    saveQuoteLocale(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "zh" : "en");
  }, [locale, setLocale]);

  const setQuoteTags = useCallback((next: QuoteSourceTag[]) => {
    const ensured =
      next.length > 0 ? next : [...QUOTE_SOURCE_TAGS];
    setQuoteTagsState(ensured);
    saveQuoteTags(ensured);
  }, []);

  const toggleQuoteTag = useCallback(
    (tag: QuoteSourceTag) => {
      const has = quoteTags.includes(tag);
      if (has && quoteTags.length <= 1) return;
      const next = has ? quoteTags.filter((t) => t !== tag) : [...quoteTags, tag];
      setQuoteTags(next);
    },
    [quoteTags, setQuoteTags]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      quoteTags,
      setQuoteTags,
      toggleQuoteTag,
    }),
    [locale, setLocale, toggleLocale, quoteTags, setQuoteTags, toggleQuoteTag]
  );

  return <QuoteLocaleContext.Provider value={value}>{children}</QuoteLocaleContext.Provider>;
}

export function useQuoteLocale() {
  const ctx = useContext(QuoteLocaleContext);
  if (!ctx) {
    throw new Error("useQuoteLocale must be used within QuoteLocaleProvider");
  }
  return ctx;
}

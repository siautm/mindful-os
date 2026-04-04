import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { QuoteLocale } from "../lib/quotesApi";
import { getQuoteLocale, saveQuoteLocale } from "../lib/storage";

interface QuoteLocaleContextValue {
  locale: QuoteLocale;
  setLocale: (locale: QuoteLocale) => void;
  toggleLocale: () => void;
}

const QuoteLocaleContext = createContext<QuoteLocaleContextValue | undefined>(undefined);

export function QuoteLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<QuoteLocale>(() => getQuoteLocale());

  const setLocale = useCallback((next: QuoteLocale) => {
    setLocaleState(next);
    saveQuoteLocale(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "zh" : "en");
  }, [locale, setLocale]);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale }),
    [locale, setLocale, toggleLocale]
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

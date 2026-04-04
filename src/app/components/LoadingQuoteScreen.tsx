import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";
import { fetchRandomQuote, type FetchedQuote } from "../lib/quotesApi";
import { useQuoteLocale } from "../contexts/QuoteLocaleContext";

interface LoadingQuoteScreenProps {
  onComplete: () => void;
}

export function LoadingQuoteScreen({ onComplete }: LoadingQuoteScreenProps) {
  const { locale, setLocale } = useQuoteLocale();
  const [quote, setQuote] = useState<FetchedQuote | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const q = await fetchRandomQuote(locale);
      if (!cancelled) setQuote(q);
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    const duration = 3000;
    const interval = 30;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 8 + 4,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  }));

  const loadingLabel = locale === "zh" ? "加载中…" : "Loading your dashboard...";
  const title = locale === "zh" ? "Mindful OS" : "Mindful OS";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 overflow-hidden"
      >
        <div className="absolute right-4 top-4 z-20 flex gap-1 rounded-full bg-black/15 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              locale === "en" ? "bg-white text-teal-800" : "text-white/80 hover:bg-white/10"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale("zh")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              locale === "zh" ? "bg-white text-teal-800" : "text-white/80 hover:bg-white/10"
            }`}
          >
            中文
          </button>
        </div>

        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-white/20 backdrop-blur-sm"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
            }}
          />
        ))}

        <div className="relative z-10 max-w-4xl mx-auto px-8 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 1 }}
            className="mb-8"
          >
            <div className="size-24 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center mx-auto shadow-2xl">
              <Sparkles className="size-12 text-white" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-5xl md:text-7xl font-bold text-white mb-4"
          >
            {title}
          </motion.h1>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20 mb-8 min-h-[200px] flex flex-col justify-center"
          >
            {quote ? (
              <>
                <motion.p
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.6 }}
                  className="text-2xl md:text-4xl italic text-white font-light mb-4 leading-relaxed"
                >
                  “{quote.text}”
                </motion.p>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                  className="text-xl md:text-2xl text-white/90 font-medium"
                >
                  — {quote.author}
                </motion.p>
              </>
            ) : (
              <div className="space-y-4 py-4">
                <div className="mx-auto h-8 w-3/4 max-w-md animate-pulse rounded-lg bg-white/20" />
                <div className="mx-auto h-8 w-1/2 max-w-sm animate-pulse rounded-lg bg-white/15" />
                <p className="text-sm text-white/70">{locale === "zh" ? "正在获取一言…" : "Fetching a quote…"}</p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.4 }}
            className="max-w-md mx-auto"
          >
            <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div
                className="h-full bg-white rounded-full shadow-lg"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <p className="text-white/80 text-sm mt-3">{loadingLabel}</p>
          </motion.div>
        </div>

        <div className="absolute top-1/4 left-1/4 size-96 bg-cyan-400/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 size-96 bg-emerald-400/30 rounded-full blur-3xl" />
      </motion.div>
    </AnimatePresence>
  );
}

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { FocusAmbientBackground } from "./FocusAmbientBackground";
import type { FocusAmbientPreset } from "../lib/storage";

interface FocusImmersiveOverlayProps {
  open: boolean;
  onClose: () => void;
  preset: FocusAmbientPreset;
  /** Countdown mm:ss */
  timeLeftLabel: string;
  /** e.g. "en-US" or "zh-CN" */
  clockLocale?: string;
}

function formatClock(date: Date, clockLocale: string): string {
  try {
    return date.toLocaleTimeString(clockLocale, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: clockLocale.startsWith("en"),
    });
  } catch {
    return date.toLocaleTimeString();
  }
}

export function FocusImmersiveOverlay({
  open,
  onClose,
  preset,
  timeLeftLabel,
  clockLocale = typeof navigator !== "undefined" && navigator.language.startsWith("zh")
    ? "zh-CN"
    : "en-US",
}: FocusImmersiveOverlayProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [open]);

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Focus mode"
    >
      <FocusAmbientBackground preset={preset} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-16">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-white/60">
          {clockLocale.startsWith("zh") ? "现在" : "Now"}
        </p>
        <p className="mb-12 font-mono text-3xl tabular-nums text-white/90 sm:text-4xl">
          {formatClock(now, clockLocale)}
        </p>

        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-white/60">
          {clockLocale.startsWith("zh") ? "剩余" : "Remaining"}
        </p>
        <p className="font-mono text-6xl font-light tabular-nums tracking-tight sm:text-8xl md:text-9xl">
          {timeLeftLabel}
        </p>
      </div>

      <div className="absolute right-4 top-4 z-20 sm:right-8 sm:top-8">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
          onClick={onClose}
        >
          <X className="mr-2 size-5" />
          {clockLocale.startsWith("zh") ? "退出专注视图" : "Exit focus view"}
        </Button>
      </div>
    </motion.div>,
    document.body
  );
}

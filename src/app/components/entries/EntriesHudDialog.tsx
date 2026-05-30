import { motion, AnimatePresence } from "motion/react";
import { clipSm, clipXl } from "./styles";

export interface EntriesHudDialogState {
  kind: "confirm" | "alert";
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface EntriesHudDialogProps {
  state: EntriesHudDialogState | null;
  onDismiss: () => void;
}

export function EntriesHudDialog({ state, onDismiss }: EntriesHudDialogProps) {
  const handleConfirm = () => {
    state?.onConfirm();
    onDismiss();
  };

  const handleCancel = () => {
    state?.onCancel?.();
    onDismiss();
  };

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
        >
          <motion.div
            role="alertdialog"
            aria-labelledby="hud-dialog-title"
            aria-describedby="hud-dialog-desc"
            className="max-w-md w-full border border-cyan-500/40 bg-slate-900/98 p-6 shadow-2xl shadow-cyan-950/50"
            style={{ clipPath: clipXl }}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-1 h-8 bg-cyan-400 mb-3" />
            <h2 id="hud-dialog-title" className="text-sm font-mono tracking-widest text-cyan-300 mb-2">
              {state.title}
            </h2>
            <p id="hud-dialog-desc" className="text-sm font-mono text-slate-300 leading-relaxed mb-6">
              {state.message}
            </p>
            <div className="flex gap-2 justify-end">
              {state.kind === "confirm" && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-[10px] font-mono tracking-wider border border-slate-600 text-slate-400 hover:bg-slate-800"
                  style={{ clipPath: clipSm }}
                >
                  {state.cancelLabel ?? "CANCEL"}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-4 py-2 text-[10px] font-mono tracking-wider border ${
                  state.kind === "confirm"
                    ? "border-cyan-500/50 bg-cyan-600 text-white hover:bg-cyan-500"
                    : "border-cyan-500/50 text-cyan-200 hover:bg-cyan-950/50"
                }`}
                style={{ clipPath: clipSm }}
              >
                {state.confirmLabel ?? (state.kind === "confirm" ? "CONFIRM" : "OK")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

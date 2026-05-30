import { Layers } from "lucide-react";
import { clipSm } from "./styles";

interface CardFlipButtonProps {
  side: "front" | "back";
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function CardFlipButton({ side, onClick, disabled, className = "" }: CardFlipButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={side === "front" ? "View diagram (back)" : "Back to record (front)"}
      aria-label={side === "front" ? "Flip to diagram side" : "Flip to record side"}
      className={`w-9 h-9 flex items-center justify-center border border-cyan-500/45 text-cyan-400 hover:bg-cyan-950/50 disabled:opacity-40 transition-colors ${className}`}
      style={{ clipPath: clipSm }}
    >
      <Layers className="w-4 h-4" />
    </button>
  );
}

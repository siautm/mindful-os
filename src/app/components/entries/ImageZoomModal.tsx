import { motion } from "motion/react";
import { X } from "lucide-react";
import { clipSm, clipXl } from "./styles";

interface ImageZoomModalProps {
  imageUrl: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageZoomModal({ imageUrl, title, isOpen, onClose }: ImageZoomModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-lg p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute top-8 left-8 w-24 h-24 border-l-2 border-t-2 border-cyan-400" />
      <div className="absolute top-8 right-8 w-24 h-24 border-r-2 border-t-2 border-cyan-400" />
      <div className="absolute bottom-8 left-8 w-24 h-24 border-l-2 border-b-2 border-cyan-400" />
      <div className="absolute bottom-8 right-8 w-24 h-24 border-r-2 border-b-2 border-cyan-400" />

      <motion.div
        className="relative max-w-5xl max-h-full"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={title}
          className="max-w-full max-h-[80vh] object-contain border-2 border-cyan-400/50"
          style={{ clipPath: clipXl }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-4 border-t border-cyan-400/30">
          <div className="text-cyan-400 font-mono text-sm tracking-wider">{title}</div>
        </div>
      </motion.div>

      <button
        type="button"
        onClick={onClose}
        className="absolute top-8 right-8 p-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-all z-10"
        style={{ clipPath: clipSm }}
      >
        <X className="w-6 h-6" />
      </button>
    </motion.div>
  );
}
